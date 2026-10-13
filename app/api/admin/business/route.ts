import { NextResponse } from 'next/server';
import {
  getServerAuthenticatedDb,
  adminDb,
  hasServiceAccount,
  fetchFirestoreDocRest,
  queryFirestoreByFieldRest,
} from '@/lib/firebaseAdmin';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Verifies and fetches the registered business document associated with an Admin.
 * Checks business existence, active status, and canonical Shop ID.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId')?.trim();
    const shopId = searchParams.get('shopId')?.trim();
    const uid = searchParams.get('uid')?.trim();

    let targetBusinessId = businessId || '';
    let targetShopId = shopId || '';
    let adminProfile: any = null;

    // 1. If UID provided, fetch admin user profile first to read canonical businessId & shopId
    if (uid) {
      if (hasServiceAccount() && adminDb) {
        try {
          const uSnap = await adminDb.collection('users').doc(uid).get();
          if (uSnap.exists) {
            adminProfile = { uid: uSnap.id, ...uSnap.data() };
            targetBusinessId = targetBusinessId || adminProfile.businessId || '';
            targetShopId = targetShopId || adminProfile.shopId || '';
          }
        } catch (e) {
          console.warn('[Admin Business GET] Admin profile fetch warning:', e);
        }
      }
      
      if (!adminProfile) {
        try {
          const restUser = await fetchFirestoreDocRest('users', uid);
          if (restUser) {
            adminProfile = restUser;
            targetBusinessId = targetBusinessId || adminProfile.businessId || '';
            targetShopId = targetShopId || adminProfile.shopId || '';
          }
        } catch (e) {
          // ignore
        }
      }

      if (!adminProfile) {
        try {
          const clientDb = await getServerAuthenticatedDb();
          const uSnap = await getDoc(doc(clientDb, 'users', uid));
          if (uSnap.exists()) {
            adminProfile = { uid: uSnap.id, ...uSnap.data() };
            targetBusinessId = targetBusinessId || adminProfile.businessId || '';
            targetShopId = targetShopId || adminProfile.shopId || '';
          }
        } catch (e) {
          console.warn('[Admin Business GET] Client profile fetch warning:', e);
        }
      }
    }

    if (!targetBusinessId && !targetShopId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No business association found for this administrator account.',
        },
        { status: 400 }
      );
    }

    // 2. Fetch business document from canonical businesses collection
    let bizDoc: any = null;

    if (hasServiceAccount() && adminDb) {
      if (targetBusinessId) {
        const bSnap = await adminDb.collection('businesses').doc(targetBusinessId).get();
        if (bSnap.exists) {
          bizDoc = { id: bSnap.id, ...bSnap.data() };
        }
      }

      if (!bizDoc && targetShopId) {
        const qSnap = await adminDb
          .collection('businesses')
          .where('shopId', '==', targetShopId)
          .limit(1)
          .get();
        if (!qSnap.empty) {
          bizDoc = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
        }
      }
    }

    // 2b. Fast REST API fallback
    if (!bizDoc) {
      try {
        if (targetBusinessId) {
          bizDoc = await fetchFirestoreDocRest('businesses', targetBusinessId);
        }
        if (!bizDoc && targetShopId) {
          bizDoc = await queryFirestoreByFieldRest('businesses', 'shopId', targetShopId);
        }
      } catch (e) {
        console.warn('[Admin Business GET] REST fallback warning:', e);
      }
    }

    // 2c. Client SDK fallback
    if (!bizDoc) {
      const clientDb = await getServerAuthenticatedDb();

      if (targetBusinessId) {
        try {
          const bSnap = await getDoc(doc(clientDb, 'businesses', targetBusinessId));
          if (bSnap.exists()) {
            bizDoc = { id: bSnap.id, ...bSnap.data() };
          }
        } catch (e) {
          console.warn('[Admin Business GET] Client business fetch warning:', e);
        }
      }

      if (!bizDoc && targetShopId) {
        try {
          const q = query(collection(clientDb, 'businesses'), where('shopId', '==', targetShopId));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const first = qSnap.docs[0];
            bizDoc = { id: first.id, ...first.data() };
          }
        } catch (e) {
          console.warn('[Admin Business GET] Client shopId query warning:', e);
        }
      }
    }

    if (!bizDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assigned business was not found in the database.',
        },
        { status: 404 }
      );
    }

    // 3. Verify business status
    if (bizDoc.status === 'inactive') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your assigned business account is currently inactive.',
          business: bizDoc,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      business: bizDoc,
      admin: adminProfile,
    });
  } catch (error: any) {
    console.error('[Admin Business GET Fatal Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch business details.',
      },
      { status: 500 }
    );
  }
}
