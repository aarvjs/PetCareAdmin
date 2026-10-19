import { NextResponse } from 'next/server';
import { adminDb, hasServiceAccount, getServerAuthenticatedDb, fetchFirestoreDocRest } from '@/lib/firebaseAdmin';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const businessIdParam = searchParams.get('businessId');

    let businessId = businessIdParam || '';

    // If only shopId is provided, resolve businessId
    if (!businessId && shopId) {
      if (hasServiceAccount() && adminDb) {
        const bSnap = await adminDb.collection('businesses').where('shopId', '==', shopId).limit(1).get();
        if (!bSnap.empty) {
          businessId = bSnap.docs[0].id;
        }
      } else {
        try {
          const clientDb = await getServerAuthenticatedDb();
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const q = query(collection(clientDb, 'businesses'), where('shopId', '==', shopId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            businessId = snap.docs[0].id;
          }
        } catch (_) {}
      }
    }

    if (!businessId) {
      businessId = 'biz_1791736912551_weqjk8'; // default canonical fallback
    }

    // Read business details for prefix
    let prefix = 'HPPC/P/';
    try {
      let bizData: any = null;
      if (hasServiceAccount() && adminDb) {
        const snap = await adminDb.collection('businesses').doc(businessId).get();
        if (snap.exists) bizData = snap.data();
      } else {
        bizData = await fetchFirestoreDocRest('businesses', businessId);
      }
      if (bizData && (bizData.petRegistrationPrefix || bizData.settings?.petRegistrationPrefix)) {
        prefix = bizData.petRegistrationPrefix || bizData.settings.petRegistrationPrefix;
      }
    } catch (_) {}

    // Read counter
    let lastNumber = 0;
    try {
      if (hasServiceAccount() && adminDb) {
        const cSnap = await adminDb.collection('counters').doc(`pets_${businessId}`).get();
        if (cSnap.exists) {
          lastNumber = cSnap.data()?.lastNumber || 0;
        }
      } else {
        const clientDb = await getServerAuthenticatedDb();
        const cSnap = await getDoc(doc(clientDb, 'counters', `pets_${businessId}`));
        if (cSnap.exists()) {
          lastNumber = cSnap.data()?.lastNumber || 0;
        }
      }
    } catch (_) {}

    const nextNumber = lastNumber + 1;
    const formattedNumber = `${prefix}${String(nextNumber).padStart(2, '0')}`;

    return NextResponse.json({
      success: true,
      nextRegistrationNumber: formattedNumber,
      prefix,
      businessId,
    });
  } catch (error: any) {
    console.error('[Next Reg Number API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate preview registration number.' },
      { status: 500 }
    );
  }
}
