import { NextResponse } from 'next/server';
import { adminDb, hasServiceAccount, fetchFirestoreDocRest, queryFirestoreByFieldRest } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const callerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

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
          const bDoc = await queryFirestoreByFieldRest('businesses', 'shopId', shopId, callerToken);
          if (bDoc) {
            businessId = bDoc.id;
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
        bizData = await fetchFirestoreDocRest('businesses', businessId, callerToken);
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
        const counterDoc = await fetchFirestoreDocRest('counters', `pets_${businessId}`, callerToken);
        if (counterDoc && typeof counterDoc.lastNumber === 'number') {
          lastNumber = counterDoc.lastNumber;
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
