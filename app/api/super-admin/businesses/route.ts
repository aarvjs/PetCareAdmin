import { NextResponse } from 'next/server';
import {
  isRequestAuthorizedAsSuperAdmin,
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
} from '@/lib/firebaseAdmin';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

/**
 * Server-Side Collision-Checked Unique Shop ID Generator
 * Format: SHOP-XXXX (4 alphanumeric uppercase chars, non-ambiguous)
 */
async function generateUniqueShopId(): Promise<string> {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  for (let attempt = 0; attempt < 12; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `SHOP-${code}`;

    let isCollision = false;

    if (hasServiceAccount() && adminDb) {
      const snap = await adminDb.collection('businesses').where('shopId', '==', candidate).limit(1).get();
      isCollision = !snap.empty;
    } else {
      try {
        const clientDb = await getServerAuthenticatedDb();
        const qBiz = query(collection(clientDb, 'businesses'), where('shopId', '==', candidate));
        const snapBiz = await getDocs(qBiz);
        isCollision = !snapBiz.empty;
      } catch (e) {
        isCollision = false;
      }
    }

    if (!isCollision) {
      return candidate;
    }
  }

  // Fallback high-entropy format
  return `SHOP-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.random().toString(36).toUpperCase().slice(-3)}`;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const status = searchParams.get('status');

    let businesses: any[] = [];

    // Layer 1: Admin SDK if service account is active
    if (hasServiceAccount() && adminDb) {
      try {
        const snap = await adminDb.collection('businesses').get();
        businesses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (adminErr) {
        console.warn('[Businesses GET] Admin SDK read warning, falling back to REST:', adminErr);
      }
    }

    // Layer 2: Direct Firestore REST API (fast, serverless-native, non-blocking)
    if (businesses.length === 0) {
      try {
        const { fetchFirestoreCollectionRest } = await import('@/lib/firebaseAdmin');
        businesses = await fetchFirestoreCollectionRest('businesses');
      } catch (restErr) {
        console.warn('[Businesses GET] REST fetch warning, falling back to clientDb:', restErr);
      }
    }

    // Layer 3: Client Firestore SDK in Node fallback
    if (businesses.length === 0) {
      try {
        const clientDb = await getServerAuthenticatedDb();
        const snap = await getDocs(collection(clientDb, 'businesses'));
        businesses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (clientErr) {
        console.warn('[Businesses GET] Client SDK fetch warning:', clientErr);
      }
    }

    // Filter by search query
    if (search) {
      businesses = businesses.filter(
        (b) =>
          (b.name || '').toLowerCase().includes(search) ||
          (b.shopId || '').toLowerCase().includes(search) ||
          (b.email || '').toLowerCase().includes(search) ||
          (b.city || '').toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (status && status !== 'all') {
      businesses = businesses.filter((b) => b.status === status);
    }

    // Sort newest first
    businesses.sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });

    return NextResponse.json({ success: true, businesses });
  } catch (error: any) {
    console.error('[Businesses GET Error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch businesses.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const requestId = `req_biz_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    const body = await request.json();

    // 1. Super Admin Authorization
    const authCheck = await isRequestAuthorizedAsSuperAdmin(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Super Admin authorization required.' },
        { status: authCheck.status || 403 }
      );
    }

    const {
      name,
      businessType = 'Pet Clinic',
      email,
      phone,
      address,
      city,
      state,
      country = 'India',
      logoUrl = '',
      logoPath = '',
      storagePath = '',
      logoPublicId = '',
      status = 'active',
      createdByUid = 'super_admin',
    } = body;

    // 2. Field Validations
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Business / Clinic Name is required.' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid business email address is required.' },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Business contact phone number is required.' },
        { status: 400 }
      );
    }

    // 3. Prevent duplicate documents (Idempotent business registration)
    if (hasServiceAccount() && adminDb) {
      const existingSnap = await adminDb
        .collection('businesses')
        .where('email', '==', email.trim().toLowerCase())
        .where('name', '==', name.trim())
        .limit(1)
        .get();
      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        const existingBiz: any = { id: existingDoc.id, ...existingDoc.data() };
        return NextResponse.json({
          success: true,
          message: `Business "${name}" is already registered with Shop ID ${existingBiz.shopId}.`,
          business: existingBiz,
          requestId,
        });
      }
    } else {
      const clientDb = await getServerAuthenticatedDb();
      try {
        const qExisting = query(
          collection(clientDb, 'businesses'),
          where('email', '==', email.trim().toLowerCase()),
          where('name', '==', name.trim())
        );
        const snapExisting = await getDocs(qExisting);
        if (!snapExisting.empty) {
          const existingDoc = snapExisting.docs[0];
          const existingBiz: any = { id: existingDoc.id, ...existingDoc.data() };
          return NextResponse.json({
            success: true,
            message: `Business "${name}" is already registered with Shop ID ${existingBiz.shopId}.`,
            business: existingBiz,
            requestId,
          });
        }
      } catch (checkErr) {
        // Proceed if query check fails
      }
    }

    // 4. Generate Trusted Server-Side Unique Shop ID
    const shopId = await generateUniqueShopId();
    const businessId = `biz_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
    const now = new Date().toISOString();

    const businessDoc = {
      id: businessId,
      shopId,
      name: name.trim(),
      businessType: businessType.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      country: country ? country.trim() : 'India',
      logoUrl: logoUrl || '',
      logoPath: logoPath || storagePath || '',
      logoPublicId: logoPublicId || '',
      status: status === 'inactive' ? 'inactive' : 'active',
      adminCount: 0,
      assignedAdmins: [],
      createdBy: createdByUid,
      createdAt: now,
      updatedAt: now,
    };

    // 5. Save directly to canonical businesses collection
    try {
      if (hasServiceAccount() && adminDb) {
        await adminDb.collection('businesses').doc(businessId).set(businessDoc);
      } else {
        const clientDb = await getServerAuthenticatedDb();
        await setDoc(doc(clientDb, 'businesses', businessId), businessDoc);
      }
    } catch (dbWriteErr: any) {
      console.warn(`[Register Business Server Write Warning][${requestId}]`, dbWriteErr.message);
      // If server write was blocked due to strict cloud rules, return provisioned business
      // so the authenticated client browser can finalize the Firestore write!
      return NextResponse.json({
        success: true,
        needsClientWrite: true,
        business: businessDoc,
        message: `Business provisioned with Shop ID ${shopId}. Finalizing registration...`,
        requestId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Business "${name}" registered successfully with Shop ID ${shopId}!`,
      business: businessDoc,
      requestId,
    });
  } catch (error: any) {
    console.error(`[Register Business Error][${requestId}]`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register business.' },
      { status: 500 }
    );
  }
}
