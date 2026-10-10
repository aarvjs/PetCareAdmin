import { NextResponse } from 'next/server';
import { createServerUserProfile, isRequestAuthorizedAsSuperAdmin, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      fullName,
      phone,
      role,
      status = 'active',
      qualification,
      specialization,
      experience,
      availability,
      registrationNumber,
      permissions = [],
      createdByUid = 'super_admin',
    } = body;

    // 1. Explicit Super Admin authorization check
    const authCheck = await isRequestAuthorizedAsSuperAdmin(req, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || 'Super Admin authorization required.' },
        { status: authCheck.status || 403 }
      );
    }

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, password, full name, and role are required.' },
        { status: 400 }
      );
    }

    // Strict Multi-Business Rule: Super Admin must NOT create Doctor accounts
    if (role === 'doctor') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin cannot create Doctor accounts. Doctor creation is strictly restricted to authorized Clinic Admins for their assigned clinic.' },
        { status: 403 }
      );
    }

    // Default permissions based on role if not explicitly provided
    let defaultPermissions = permissions;
    if (!defaultPermissions || defaultPermissions.length === 0) {
      if (role === 'super_admin') {
        defaultPermissions = ['ALL_ACCESS'];
      } else if (role === 'admin') {
        defaultPermissions = [
          'dashboard', 'products', 'categories', 'orders', 'customers',
          'inventory', 'offers', 'doctors', 'services', 'vaccinations',
          'appointments', 'pets', 'banners', 'notifications', 'reports', 'settings'
        ];
      } else if (role === 'doctor') {
        defaultPermissions = [
          'dashboard', 'appointments', 'pets', 'services', 'vaccinations',
          'medical-records', 'profile', 'settings'
        ];
      }
    }

    // Create User via Firebase Admin SDK
    const createdUser = await createServerUserProfile({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      role: role as 'super_admin' | 'admin' | 'doctor',
      status: status as any,
      permissions: defaultPermissions,
      createdBy: createdByUid,
    });

    // Update extended profile fields if doctor or specialized user
    if (adminDb && (qualification || specialization || experience || availability || registrationNumber)) {
      await adminDb.collection('users').doc(createdUser.uid).set(
        {
          qualification: qualification ? qualification.trim() : '',
          specialization: specialization ? specialization.trim() : '',
          experience: experience ? experience.trim() : '',
          availability: availability ? availability.trim() : '',
          registrationNumber: registrationNumber ? registrationNumber.trim() : '',
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${role === 'admin' ? 'Admin' : role === 'doctor' ? 'Doctor' : 'User'} account created successfully!`,
      user: {
        uid: createdUser.uid,
        email: createdUser.email,
        fullName: createdUser.fullName,
        role: createdUser.role,
        status: createdUser.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating user via API route:', error);
    let errorMessage = error.message || 'Failed to create user.';
    if (error.code === 'auth/email-already-in-use' || error.code === 'auth/email-already-exists') {
      errorMessage = 'This email address is already registered.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      uid,
      status,
      permissions,
      modules,
      businessId,
      shopId,
      fullName,
      phone,
      qualification,
      specialization,
      experience,
      availability,
      registrationNumber,
    } = body;

    // Explicit Super Admin authorization check
    const authCheck = await isRequestAuthorizedAsSuperAdmin(req, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || 'Super Admin authorization required.' },
        { status: authCheck.status || 403 }
      );
    }

    if (!uid) {
      return NextResponse.json({ error: 'UID is required.' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (modules !== undefined && Array.isArray(modules)) {
      const allowed = ['ecommerce', 'clinic'];
      const filtered = modules.filter((m: string) => allowed.includes(m));
      if (filtered.length > 0) {
        updateData.modules = filtered;
      }
    }
    if (businessId !== undefined) updateData.businessId = businessId;
    if (shopId !== undefined) updateData.shopId = shopId;
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (qualification !== undefined) updateData.qualification = qualification.trim();
    if (specialization !== undefined) updateData.specialization = specialization.trim();
    if (experience !== undefined) updateData.experience = experience.trim();
    if (availability !== undefined) updateData.availability = availability.trim();
    if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber.trim();

    if (adminDb) {
      await adminDb.collection('users').doc(uid).update(updateData);
    } else {
      const { getSharedClientFirestore } = await import('@/lib/firebaseAdmin');
      const { doc, updateDoc } = await import('firebase/firestore');
      const clientDb = getSharedClientFirestore();
      await updateDoc(doc(clientDb, 'users', uid), updateData);
    }

    return NextResponse.json({
      success: true,
      message: 'User profile updated successfully!',
    });
  } catch (error: any) {
    console.error('Error updating user status/permissions:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user.' }, { status: 500 });
  }
}
