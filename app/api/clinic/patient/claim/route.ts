import { NextResponse } from 'next/server';
import {
  adminAuth,
  adminDb,
  hasServiceAccount,
  fetchFirestoreCollectionRest,
  setFirestoreDocRest,
} from '@/lib/firebaseAdmin';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let raw10 = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    raw10 = digits.substring(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    raw10 = digits.substring(1);
  } else if (digits.length > 10) {
    raw10 = digits.slice(-10);
  }
  return `+91${raw10}`;
}

/**
 * POST /api/clinic/patient/claim
 * Securely claims offline walk-in patient records (pets and appointments) for a user
 * who just verified their mobile number via Firebase Phone Auth OTP.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization token required.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7).trim();
    let callerUid = '';
    let verifiedPhone = '';

    if (adminAuth && hasServiceAccount()) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        callerUid = decoded.uid;
        verifiedPhone = decoded.phone_number || '';
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: `Invalid authentication token: ${err.message}` },
          { status: 401 }
        );
      }
    } else {
      // Decode JWT safely if service account unavailable in local dev
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          callerUid = payload.user_id || payload.sub || '';
          verifiedPhone = payload.phone_number || '';
        }
      } catch (_) {}
    }

    if (!callerUid || !verifiedPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only authenticated users with a verified phone number can claim records.',
        },
        { status: 403 }
      );
    }

    const standardPhone = normalizePhone(verifiedPhone);
    const phoneVariants = [
      standardPhone,
      standardPhone.substring(3), // 10 digits
      standardPhone.substring(1), // 91XXXXXXXXXX
    ];

    let claimedPetsCount = 0;
    let claimedAppointmentsCount = 0;
    let latestOwnerName = '';
    let latestOwnerAddress = '';

    // 1. Claim Pets
    const allPets = await fetchFirestoreCollectionRest('pets');
    for (const pet of allPets) {
      const petPhone = (pet.contactNumber || pet.ownerPhone || '').replace(/\D/g, '');
      const matchesPhone = phoneVariants.some((v) => v.replace(/\D/g, '') === petPhone);
      const isUnclaimed = pet.isUnclaimed || (pet.ownerId && pet.ownerId.startsWith('unclaimed_')) || !pet.ownerId;

      if (matchesPhone && (isUnclaimed || pet.ownerId !== callerUid)) {
        pet.ownerId = callerUid;
        pet.isUnclaimed = false;
        pet.claimedAt = new Date().toISOString();
        pet.updatedAt = new Date().toISOString();

        if (pet.ownerName && !latestOwnerName) latestOwnerName = pet.ownerName;
        if (pet.ownerAddress && !latestOwnerAddress) latestOwnerAddress = pet.ownerAddress;

        await setFirestoreDocRest('pets', pet.id, pet);
        claimedPetsCount++;
      }
    }

    // 2. Claim Appointments
    const allAppointments = await fetchFirestoreCollectionRest('appointments');
    for (const apt of allAppointments) {
      const aptPhone = (apt.customerPhone || apt.ownerPhone || '').replace(/\D/g, '');
      const matchesPhone = phoneVariants.some((v) => v.replace(/\D/g, '') === aptPhone);
      const isUnclaimed = apt.isUnclaimed || (apt.userId && apt.userId.startsWith('unclaimed_')) || !apt.userId;

      if (matchesPhone && (isUnclaimed || apt.userId !== callerUid)) {
        apt.userId = callerUid;
        apt.isUnclaimed = false;
        apt.claimedAt = new Date().toISOString();
        apt.updatedAt = new Date().toISOString();

        if (apt.customerName && !latestOwnerName) latestOwnerName = apt.customerName;
        if (apt.customerAddress && !latestOwnerAddress) latestOwnerAddress = apt.customerAddress;

        await setFirestoreDocRest('appointments', apt.id, apt);
        claimedAppointmentsCount++;
      }
    }

    // 3. Update User Profile if name/address missing
    if (latestOwnerName || latestOwnerAddress) {
      try {
        const userDoc = await import('@/lib/firebaseAdmin').then(({ fetchFirestoreDocRest }) =>
          fetchFirestoreDocRest('users', callerUid)
        );
        if (userDoc && (!userDoc.name || !userDoc.address)) {
          await setFirestoreDocRest('users', callerUid, {
            ...userDoc,
            name: userDoc.name || latestOwnerName,
            address: userDoc.address || latestOwnerAddress,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Successfully linked ${claimedPetsCount} pet(s) and ${claimedAppointmentsCount} appointment(s) to your verified account.`,
      claimedPetsCount,
      claimedAppointmentsCount,
      verifiedPhone: standardPhone,
    });
  } catch (error: any) {
    console.error('[Patient Claim Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to claim records.' },
      { status: 500 }
    );
  }
}
