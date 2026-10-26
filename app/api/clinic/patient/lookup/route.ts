import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Normalizes Indian phone numbers to standard format (+91XXXXXXXXXX)
 */
function normalizePhone(phone: string): { standard: string; raw10: string; withoutPlus: string } {
  const digits = phone.replace(/\D/g, '');
  let raw10 = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    raw10 = digits.substring(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    raw10 = digits.substring(1);
  } else if (digits.length > 10) {
    raw10 = digits.slice(-10);
  }

  return {
    standard: `+91${raw10}`,
    raw10,
    withoutPlus: `91${raw10}`,
  };
}

/**
 * GET /api/clinic/patient/lookup
 * Looks up existing patient/owner details and registered pets by mobile number.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || '';
    const businessId = (searchParams.get('businessId') || '').trim();
    const shopId = (searchParams.get('shopId') || '').trim();

    const digits = phone.replace(/\D/g, '');
    if (!phone.trim() || digits.length < 10) {
      return NextResponse.json(
        { success: false, error: 'A valid 10-digit mobile number is required.' },
        { status: 400 }
      );
    }

    const { standard, raw10, withoutPlus } = normalizePhone(phone);
    const phoneVariants = [standard, raw10, withoutPlus, `+${withoutPlus}`];

    let foundUser: any = null;
    let existingPets: any[] = [];

    // 1. Check if an existing verified user exists with this phone number
    if (hasServiceAccount() && adminDb) {
      for (const p of phoneVariants) {
        const uSnap = await adminDb.collection('users').where('phoneNumber', '==', p).limit(1).get();
        if (!uSnap.empty) {
          const doc = uSnap.docs[0];
          foundUser = { uid: doc.id, ...doc.data() };
          break;
        }
      }
    } else {
      try {
        const clientDb = await getServerAuthenticatedDb();
        for (const p of phoneVariants) {
          const q = query(collection(clientDb, 'users'), where('phoneNumber', '==', p));
          const uSnap = await getDocs(q);
          if (!uSnap.empty) {
            const doc = uSnap.docs[0];
            foundUser = { uid: doc.id, ...doc.data() };
            break;
          }
        }
      } catch (_) {}
    }

    // 2. Query pets registered under this owner / phone number for this business
    let allPets: any[] = [];
    if (hasServiceAccount() && adminDb) {
      let q: any = adminDb.collection('pets');
      const pSnap = await q.get();
      allPets = pSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } else {
      allPets = await fetchFirestoreCollectionRest('pets');
    }

    // Filter pets matching owner UID or phone variants, strictly isolated to current business
    existingPets = allPets.filter((pet) => {
      // Business isolation
      const matchesBiz = !businessId || pet.businessId === businessId;
      const matchesShop = !shopId || (pet.shopId && pet.shopId.toUpperCase() === shopId.toUpperCase());
      if (!matchesBiz && !matchesShop) return false;

      // Ownership match
      const petOwnerId = pet.ownerId || '';
      const petPhone = (pet.contactNumber || pet.ownerPhone || '').replace(/\D/g, '');
      const matchesUserUid = Boolean(foundUser?.uid && petOwnerId === foundUser.uid);
      const matchesPhone = phoneVariants.some((v) => v.replace(/\D/g, '') === petPhone);

      return matchesUserUid || matchesPhone;
    });

    return NextResponse.json({
      success: true,
      normalizedPhone: standard,
      userExists: Boolean(foundUser),
      user: foundUser
        ? {
            uid: foundUser.uid,
            name: foundUser.name || foundUser.displayName || '',
            phoneNumber: foundUser.phoneNumber || standard,
            address: foundUser.address || '',
            city: foundUser.city || '',
          }
        : null,
      pets: existingPets.map((p) => ({
        id: p.id,
        name: p.name || 'Unnamed Pet',
        species: p.species || 'Dog',
        breed: p.breed || 'Indie / Mixed',
        gender: p.gender || 'Male',
        dob: p.dob || '',
        age: p.age || '',
        coatColour: p.coatColour || '',
        registrationNumber: p.registrationNumber || '',
        photoUrl: p.photoUrl || '',
      })),
    });
  } catch (error: any) {
    console.error('[Patient Lookup Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to lookup patient.' },
      { status: 500 }
    );
  }
}
