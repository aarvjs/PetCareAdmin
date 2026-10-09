import { NextResponse } from 'next/server';
import { checkSuperAdminExists, createServerUserProfile } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const hasSuperAdmin = await checkSuperAdminExists();
    return NextResponse.json({
      success: true,
      hasSuperAdmin,
    });
  } catch (error: any) {
    console.error('[Bootstrap GET Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Failed to check Super Admin provision status.',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    // 1. One-Time Bootstrap Lock Check via Firebase Admin SDK
    const alreadyExists = await checkSuperAdminExists();
    if (alreadyExists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Public Super Admin setup is disabled. Super Admin account is already provisioned.',
          },
          requestId,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fullName, email, phone, password, confirmPassword } = body;

    // 2. Server-side Input Validation
    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Full Name is required.' },
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

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters.' },
          requestId,
        },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match.' },
          requestId,
        },
        { status: 400 }
      );
    }

    // 3. Create First Super Admin account safely using Firebase Admin SDK
    // Explicitly force role to 'super_admin' on server side (never trust client-supplied role)
    const createdUser = await createServerUserProfile({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      role: 'super_admin',
      status: 'active',
      createdBy: 'bootstrap',
    });

    return NextResponse.json({
      success: true,
      message: 'Super Admin account provisioned successfully! You can now log in.',
      user: {
        uid: createdUser.uid,
        email: createdUser.email,
        fullName: createdUser.fullName,
        role: 'super_admin',
      },
      requestId,
    });
  } catch (error: any) {
    console.error(`[Bootstrap POST Error][${requestId}]`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Failed to bootstrap Super Admin account.',
        },
        requestId,
      },
      { status: 500 }
    );
  }
}
