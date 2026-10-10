import { NextResponse } from 'next/server';
import {
  createServerUserProfile,
  isRequestAuthorizedAsSuperAdmin,
  adminDb,
  hasServiceAccount,
  getSharedClientFirestore,
} from '@/lib/firebaseAdmin';
import { sendAdminInvitationEmail } from '@/lib/emailService';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      password,
      status = 'active',
      businessId = '',
      shopId = '',
      modules = [],
      permissions = [],
      createdByUid = 'super_admin',
    } = body;

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

    // 3. Module Permissions Validation (Strict allowlist: ecommerce, clinic)
    const allowedModules = ['ecommerce', 'clinic'];
    const validModules = Array.isArray(modules)
      ? modules.filter((m: string) => allowedModules.includes(m))
      : [];

    if (validModules.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please select at least one module (E-commerce or Clinic / Doctor) for this Admin.',
          },
          requestId,
        },
        { status: 400 }
      );
    }

    // 4. Create Admin Account Server-Side via Firebase Admin SDK
    const userResult = await createServerUserProfile({
      email: email.trim().toLowerCase(),
      password: password || undefined,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      role: 'admin',
      status: status,
      businessId: businessId || '',
      shopId: shopId || '',
      modules: validModules,
      permissions: permissions,
      createdBy: createdByUid,
    });

    // 5. Link Admin to Business document in Firestore
    if (businessId) {
      const adminEntry = {
        uid: userResult.uid,
        fullName: userResult.fullName,
        email: userResult.email,
        modules: validModules,
        shopId: shopId || '',
        assignedAt: new Date().toISOString(),
      };

      try {
        if (hasServiceAccount() && adminDb) {
          const bizRef = adminDb.collection('businesses').doc(businessId);
          await bizRef.set(
            {
              adminCount: (await bizRef.get()).data()?.assignedAdmins?.length ? undefined : 1,
              assignedAdmins: (await bizRef.get()).data()?.assignedAdmins
                ? [...((await bizRef.get()).data()?.assignedAdmins || []).filter((a: any) => a.uid !== userResult.uid), adminEntry]
                : [adminEntry],
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } else {
          const clientDb = getSharedClientFirestore();
          await updateDoc(doc(clientDb, 'businesses', businessId), {
            assignedAdmins: arrayUnion(adminEntry),
            adminCount: increment(1),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (bizUpdateErr: any) {
        console.warn(`[Create Admin][${requestId}] Business doc update warning:`, bizUpdateErr.message);
      }
    }

    // 6. Send Invitation Email via Resend
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
        businessId: businessId || '',
        shopId: shopId || '',
        modules: validModules,
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

