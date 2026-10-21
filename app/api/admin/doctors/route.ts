import { NextResponse } from 'next/server';
import {
  isRequestAuthorizedForDoctorCreation,
  createServerUserProfile,
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';

/**
 * GET /api/admin/doctors
 * Fetch list of doctors. If called by an Admin, filters by their assigned business / Shop ID.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const businessId = searchParams.get('businessId');

    let doctors: any[] = [];

    if (hasServiceAccount() && adminDb) {
      const snap = await adminDb.collection('doctors').get();
      if (!snap.empty) {
        doctors = snap.docs.map((d) => ({ uid: d.id, id: d.id, ...d.data() }));
      } else {
        const uSnap = await adminDb.collection('users').where('role', '==', 'doctor').get();
        doctors = uSnap.docs.map((d) => ({ uid: d.id, id: d.id, ...d.data() }));
      }
    } else {
      try {
        doctors = await fetchFirestoreCollectionRest('doctors');
      } catch (err: any) {
        console.warn('[Admin Doctors GET Warning via REST]', err.message);
      }

      if (doctors.length === 0) {
        try {
          const clientDb = await getServerAuthenticatedDb();
          const snap = await getDocs(collection(clientDb, 'doctors'));
          doctors = snap.docs.map((d) => ({ uid: d.id, id: d.id, ...d.data() }));
        } catch (_) {}
      }
    }

    if (shopId) {
      doctors = doctors.filter((d) => !d.shopId || d.shopId.toUpperCase() === shopId.toUpperCase());
    } else if (businessId) {
      doctors = doctors.filter((d) => !d.businessId || d.businessId === businessId);
    }

    return NextResponse.json({ success: true, count: doctors.length, doctors });

  } catch (error: any) {
    console.error('[Admin Doctors GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch doctors list.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/doctors
 * Protected Doctor Creation Endpoint
 * Rules:
 * - Super Admin is strictly BLOCKED (403)
 * - Only active Admins with the "clinic" module assigned can create Doctors (403)
 * - Admins can ONLY create Doctors for their own assigned business (403)
 */
export async function POST(request: Request) {
  const requestId = `req_doc_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    const body = await request.json();

    // 1. Strict Server-Side Authorization Check
    const authCheck = await isRequestAuthorizedForDoctorCreation(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authCheck.error || 'Access Denied: You are not authorized to create doctor accounts.',
          requestId,
        },
        { status: authCheck.status || 403 }
      );
    }

    const {
      fullName,
      email,
      phone = '',
      password,
      specialization = 'General Veterinary Practitioner',
      qualification = 'BVSc & AH',
      registrationNumber = '',
      experience = '5 Years',
      availability = 'Mon - Sat (09:00 AM - 05:00 PM)',
      status = 'active',
    } = body;

    // 2. Validate Required Fields
    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Doctor Full Name is required.', requestId },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid Doctor email address is required.', requestId },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.', requestId },
        { status: 400 }
      );
    }

    const extendedDoctorFields = {
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      registrationNumber: registrationNumber.trim(),
      experience: experience.trim(),
      availability: availability.trim(),
      assignedBusinessName: authCheck.admin.businessName || '',
    };

    // 3. Create Doctor Account via Server-Side Firebase Provisioner
    // Enforcing the Admin's verified businessId & shopId
    const createdUser = await createServerUserProfile({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      role: 'doctor',
      status: status === 'inactive' ? 'inactive' : 'active',
      businessId: authCheck.businessId,
      shopId: authCheck.shopId,
      permissions: [
        'dashboard',
        'appointments',
        'pets',
        'services',
        'vaccinations',
        'medical-records',
        'profile',
        'settings',
      ],
      createdBy: authCheck.admin.uid,
      extraData: extendedDoctorFields,
    });

    const extendedDoctorData = {
      uid: createdUser.uid,
      id: createdUser.uid,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      role: 'doctor',
      status: status === 'inactive' ? 'inactive' : 'active',
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      registrationNumber: registrationNumber.trim(),
      experience: experience.trim(),
      availability: availability.trim(),
      businessId: authCheck.businessId,
      shopId: authCheck.shopId,
      assignedBusinessName: authCheck.admin.businessName || '',
      createdBy: authCheck.admin.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Save extended clinical profile to both users and doctors collections
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('users').doc(createdUser.uid).set(extendedDoctorData, { merge: true });
      await adminDb.collection('doctors').doc(createdUser.uid).set(extendedDoctorData, { merge: true });
    } else {
      try {
        const clientDb = await getServerAuthenticatedDb();
        await setDoc(doc(clientDb, 'users', createdUser.uid), extendedDoctorData, { merge: true });
        await setDoc(doc(clientDb, 'doctors', createdUser.uid), extendedDoctorData, { merge: true });
      } catch (err) {
        // Document has already been persisted via authenticated REST provisioner
      }
    }

    return NextResponse.json({
      success: true,
      message: `Doctor ${fullName} registered successfully for Shop ID ${authCheck.shopId}!`,
      doctor: extendedDoctorData,
      requestId,
    });
  } catch (error: any) {
    console.error(`[Create Doctor Error][${requestId}]`, error);
    let statusCode = 500;
    let message = error.message || 'Failed to create Doctor account.';

    if (error.message && error.message.includes('already registered')) {
      statusCode = 409;
      message = 'A user with this email address already exists in the system.';
    }

    return NextResponse.json(
      { success: false, error: message, requestId },
      { status: statusCode }
    );
  }
}
