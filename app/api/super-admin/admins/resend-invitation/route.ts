import { NextResponse } from 'next/server';
import { sendAdminInvitationEmail } from '@/lib/emailService';
import { isRequestAuthorizedAsSuperAdmin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    const body = await request.json();
    const { email, fullName, tempPassword } = body;

    // Explicit Super Admin authorization check
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

    const emailResult = await sendAdminInvitationEmail({
      toEmail: email.trim().toLowerCase(),
      fullName: fullName || 'Administrator',
      tempPassword: tempPassword || undefined,
      createdByName: 'Super Administrator',
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'RESEND_ERROR', message: emailResult.error || 'Failed to resend invitation email.' },
          requestId,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation email resent successfully to ${email}!`,
      requestId,
    });
  } catch (error: any) {
    console.error(`[Resend Email Error][${requestId}]`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Error sending email.' },
        requestId,
      },
      { status: 500 }
    );
  }
}
