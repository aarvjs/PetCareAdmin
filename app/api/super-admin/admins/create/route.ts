import { NextResponse } from 'next/server';
import { createServerUserProfile, isRequestAuthorizedAsSuperAdmin } from '@/lib/firebaseAdmin';
import { sendAdminInvitationEmail } from '@/lib/emailService';

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    const body = await request.json();
    const { fullName, email, phone, password, status = 'active', permissions = [], createdByUid = 'super_admin' } = body;

    // 1. Explicit Super Admin authorization check
    const authCheck = await isRequestAuthorizedAsSuperAdmin(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: authCheck.error || 'Super Admin authorization required.' },
          requestId,
        },
        { status: authCheck.status || 403 }
      );
    }

    // 2. Server-side field validation
    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Admin Full Name is required.' },
          requestId,
        },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' },
          requestId,
        },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters.' },
          requestId,
        },
        { status: 400 }
      );
    }

    // 3. Create Admin Account Server-Side via Firebase Admin SDK
    const userResult = await createServerUserProfile({
      email: email.trim().toLowerCase(),
      password: password || undefined,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      role: 'admin',
      status: status,
      permissions: permissions,
      createdBy: createdByUid,
    });

    // 4. Send Invitation Email via Resend
    let emailResult: { success: boolean; error?: string | null } = { success: false, error: 'Email dispatch omitted' };

    try {
      emailResult = await sendAdminInvitationEmail({
        toEmail: userResult.email,
        fullName: userResult.fullName,
        tempPassword: password || userResult.tempPassword,
        createdByName: 'Super Administrator',
      });
    } catch (e: any) {
      console.warn(`[Create Admin][${requestId}] Resend invitation warning:`, e);
      emailResult = { success: false, error: e?.message || 'Resend API call failed' };
    }

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? `Admin account for ${userResult.fullName} created and invitation email delivered!`
        : `Admin account created for ${userResult.fullName}. (Invitation email delivery pending/failed: ${emailResult.error})`,
      user: {
        uid: userResult.uid,
        email: userResult.email,
        fullName: userResult.fullName,
        role: 'admin',
        status: userResult.status,
      },
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error,
      requestId,
    });
  } catch (error: any) {
    console.error(`[Create Admin Error][${requestId}]`, error);
    let statusCode = 500;
    let errorMsg = error.message || 'Failed to create Admin account.';

    if (error.message && error.message.includes('already registered')) {
      statusCode = 409;
      errorMsg = 'This email address is already registered in Firebase.';
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: 'PROVISIONING_ERROR', message: errorMsg },
        requestId,
      },
      { status: statusCode }
    );
  }
}
