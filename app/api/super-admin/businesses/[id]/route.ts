import { NextResponse } from 'next/server';
import {
  isRequestAuthorizedAsSuperAdmin,
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
} from '@/lib/firebaseAdmin';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/businesses/[id]
 * Fetch business record and all assigned admins.
 * Supports resolution by both Firestore document ID (e.g. biz_...) and permanent Shop ID (e.g. SHOP-D9E8).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id?.trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required.' },
        { status: 400 }
      );
    }

    let business: any = null;
    let admins: any[] = [];
    let doctors: any[] = [];

    // Layer 1: Admin SDK if service account is active
    if (hasServiceAccount() && adminDb) {
      try {
        // A. Direct doc ID lookup
        const docSnap = await adminDb.collection('businesses').doc(cleanId).get();
        if (docSnap.exists) {
          business = { id: docSnap.id, ...(docSnap.data() as Record<string, any>) };
        } else {
          // B. Query by shopId (e.g. SHOP-D9E8)
          const qShop = await adminDb
            .collection('businesses')
            .where('shopId', '==', cleanId)
            .limit(1)
            .get();
          if (!qShop.empty) {
            const first = qShop.docs[0];
            business = { id: first.id, ...(first.data() as Record<string, any>) };
          } else {
            // C. Query by stored id field
            const qId = await adminDb
              .collection('businesses')
              .where('id', '==', cleanId)
              .limit(1)
              .get();
            if (!qId.empty) {
              const first = qId.docs[0];
              business = { id: first.id, ...(first.data() as Record<string, any>) };
            }
          }
        }
      } catch (adminErr) {
        console.warn('[Business Detail GET] Admin SDK read warning, falling back to REST:', adminErr);
      }
    }

    // Layer 2: Direct Firestore REST API (fast, reliable in serverless)
    if (!business) {
      try {
        const { fetchFirestoreDocRest, queryFirestoreByFieldRest } = await import('@/lib/firebaseAdmin');
        business = await fetchFirestoreDocRest('businesses', cleanId);
        if (!business) {
          business = await queryFirestoreByFieldRest('businesses', 'shopId', cleanId);
        }
        if (!business) {
          business = await queryFirestoreByFieldRest('businesses', 'id', cleanId);
        }
      } catch (restErr) {
        console.warn('[Business Detail GET] REST fetch warning, falling back to clientDb:', restErr);
      }
    }

    // Layer 3: Client Firestore SDK in Node fallback
    if (!business) {
      try {
        const clientDb = await getServerAuthenticatedDb();
        const docSnap = await getDoc(doc(clientDb, 'businesses', cleanId));
        if (docSnap.exists()) {
          business = { id: docSnap.id, ...(docSnap.data() as Record<string, any>) };
        } else {
          const qShop = query(collection(clientDb, 'businesses'), where('shopId', '==', cleanId));
          const shopSnap = await getDocs(qShop);
          if (!shopSnap.empty) {
            const first = shopSnap.docs[0];
            business = { id: first.id, ...(first.data() as Record<string, any>) };
          }
        }
      } catch (clientErr) {
        console.warn('[Business Detail GET] Client SDK fetch warning:', clientErr);
      }
    }

    if (!business) {
      return NextResponse.json(
        { success: false, error: `Business with identifier "${cleanId}" was not found.` },
        { status: 404 }
      );
    }

    // Retrieve and aggregate assigned admins
    if (Array.isArray(business.assignedAdmins) && business.assignedAdmins.length > 0) {
      admins = [...business.assignedAdmins];
    }

    if (Array.isArray(business.assignedDoctors) && business.assignedDoctors.length > 0) {
      doctors = [...business.assignedDoctors];
    }

    const canonicalDocId = business.id || cleanId;
    const canonicalShopId = business.shopId || '';

    if (hasServiceAccount() && adminDb) {
      try {
        const adminsSnap = await adminDb
          .collection('users')
          .where('role', '==', 'admin')
          .get();

        const queryAdmins = adminsSnap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Record<string, any>) }))
          .filter(
            (u: any) =>
              u.businessId === canonicalDocId ||
              u.businessId === cleanId ||
              (canonicalShopId && u.shopId === canonicalShopId)
          );

        if (queryAdmins.length > 0) {
          const adminMap = new Map();
          admins.forEach((a: any) => adminMap.set(a.uid || a.email, a));
          queryAdmins.forEach((a: any) =>
            adminMap.set(a.uid || a.email, { ...adminMap.get(a.uid || a.email), ...a })
          );
          admins = Array.from(adminMap.values());
        }

        const doctorsSnap = await adminDb
          .collection('users')
          .where('role', '==', 'doctor')
          .get();

        const queryDoctors = doctorsSnap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Record<string, any>) }))
          .filter(
            (u: any) =>
              u.businessId === canonicalDocId ||
              u.businessId === cleanId ||
              (canonicalShopId && u.shopId === canonicalShopId)
          );

        if (queryDoctors.length > 0) {
          const docMap = new Map();
          doctors.forEach((d: any) => docMap.set(d.uid || d.email, d));
          queryDoctors.forEach((d: any) =>
            docMap.set(d.uid || d.email, { ...docMap.get(d.uid || d.email), ...d })
          );
          doctors = Array.from(docMap.values());
        }
      } catch (queryErr) {
        console.warn('[Business Users Query Warning]', queryErr);
      }
    }

    return NextResponse.json({
      success: true,
      business,
      admins,
      doctors,
    });
  } catch (error: any) {
    console.error('[Business Detail GET Error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch business details.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/super-admin/businesses/[id]
 * Update permitted business fields.
 * CRITICAL: shopId and id can NEVER be changed after registration.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      businessType,
      email,
      phone,
      address,
      city,
      state,
      country,
      logoUrl,
      logoPath,
      storagePath,
      logoPublicId,
      status,
    } = body;

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (businessType !== undefined) updateData.businessType = businessType.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (country !== undefined) updateData.country = country.trim();
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (logoPath !== undefined || storagePath !== undefined) {
      updateData.logoPath = logoPath || storagePath;
    }
    if (logoPublicId !== undefined) updateData.logoPublicId = logoPublicId;
    if (status !== undefined) {
      updateData.status = status === 'inactive' ? 'inactive' : 'active';
    }

    // Explicitly reject any attempt to modify shopId
    if (body.shopId !== undefined) {
      delete body.shopId;
    }

    let targetDocId = id.trim();
    if (hasServiceAccount() && adminDb) {
      const checkSnap = await adminDb.collection('businesses').doc(targetDocId).get();
      if (!checkSnap.exists) {
        const qShop = await adminDb.collection('businesses').where('shopId', '==', targetDocId).limit(1).get();
        if (!qShop.empty) targetDocId = qShop.docs[0].id;
      }
    }

    try {
      if (hasServiceAccount() && adminDb) {
        await adminDb.collection('businesses').doc(targetDocId).update(updateData);
      } else {
        const clientDb = await getServerAuthenticatedDb();
        await updateDoc(doc(clientDb, 'businesses', targetDocId), updateData);
      }
    } catch (dbUpdateErr: any) {
      console.warn(`[Business PUT Server Warning]`, dbUpdateErr.message);
      return NextResponse.json({
        success: true,
        needsClientUpdate: true,
        targetDocId,
        updatedFields: updateData,
        message: 'Updating business profile...',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Business profile updated successfully.',
      updatedFields: updateData,
    });
  } catch (error: any) {
    console.error('[Business PUT Error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update business profile.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/businesses/[id]
 * Deactivate or remove a business
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authCheck = await isRequestAuthorizedAsSuperAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Super Admin authorization required.' },
        { status: authCheck.status || 403 }
      );
    }

    let targetDocId = id.trim();
    if (hasServiceAccount() && adminDb) {
      const checkSnap = await adminDb.collection('businesses').doc(targetDocId).get();
      if (!checkSnap.exists) {
        const qShop = await adminDb.collection('businesses').where('shopId', '==', targetDocId).limit(1).get();
        if (!qShop.empty) targetDocId = qShop.docs[0].id;
      }
    }

    // Set status to inactive
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('businesses').doc(targetDocId).update({
        status: 'inactive',
        updatedAt: new Date().toISOString(),
      });
    } else {
      const clientDb = await getServerAuthenticatedDb();
      await updateDoc(doc(clientDb, 'businesses', targetDocId), {
        status: 'inactive',
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Business deactivated successfully.',
    });
  } catch (error: any) {
    console.error('[Business DELETE Error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to deactivate business.' },
      { status: 500 }
    );
  }
}
