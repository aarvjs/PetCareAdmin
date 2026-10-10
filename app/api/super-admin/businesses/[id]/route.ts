import { NextResponse } from 'next/server';
import {
  isRequestAuthorizedAsSuperAdmin,
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
} from '@/lib/firebaseAdmin';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

/**
 * GET /api/super-admin/businesses/[id]
 * Fetch business record and all assigned admins
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let business: any = null;
    let admins: any[] = [];

    if (hasServiceAccount() && adminDb) {
      const docSnap = await adminDb.collection('businesses').doc(id).get();
      if (docSnap.exists) {
        business = { id: docSnap.id, ...docSnap.data() };
      }

      if (business) {
        // Query admins by businessId or shopId
        const adminsSnap = await adminDb
          .collection('users')
          .where('role', '==', 'admin')
          .get();

        admins = adminsSnap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter(
            (u: any) =>
              u.businessId === id ||
              (business.shopId && u.shopId === business.shopId)
          );
      }
    } else {
      const clientDb = await getServerAuthenticatedDb();

      // 1. Try businesses collection
      try {
        const docSnap = await getDoc(doc(clientDb, 'businesses', id));
        if (docSnap.exists()) {
          business = { id: docSnap.id, ...docSnap.data() };
        }
      } catch (e) {
        // ignore
      }

      // 2. Fallback to users collection
      if (!business) {
        try {
          const docSnap = await getDoc(doc(clientDb, 'users', id));
          if (docSnap.exists() && (docSnap.data()?.isBusinessDoc || docSnap.data()?.shopId)) {
            business = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          // ignore
        }
      }

      if (business) {
        try {
          const q = query(
            collection(clientDb, 'users'),
            where('role', '==', 'admin')
          );
          const adminsSnap = await getDocs(q);
          admins = adminsSnap.docs
            .map((d) => ({ uid: d.id, ...d.data() }))
            .filter(
              (u: any) =>
                u.businessId === id ||
                (business.shopId && u.shopId === business.shopId)
            );
        } catch (e: any) {
          console.warn('[Business Admin Query Warning]', e.message);
        }
      }
    }

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
      admins,
    });
  } catch (error: any) {
    console.error('[Business Detail GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch business details.' },
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
    if (logoPublicId !== undefined) updateData.logoPublicId = logoPublicId;
    if (status !== undefined) {
      updateData.status = status === 'inactive' ? 'inactive' : 'active';
    }

    // Explicitly reject any attempt to modify shopId
    if (body.shopId !== undefined) {
      delete body.shopId;
    }

    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('businesses').doc(id).update(updateData);
    } else {
      const clientDb = await getServerAuthenticatedDb();
      try {
        await updateDoc(doc(clientDb, 'businesses', id), updateData);
      } catch (e) {
        // Fallback to users collection
        await updateDoc(doc(clientDb, 'users', id), updateData);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Business profile updated successfully.',
      updatedFields: updateData,
    });
  } catch (error: any) {
    console.error('[Business PUT Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update business profile.' },
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

    // Set status to inactive
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('businesses').doc(id).update({
        status: 'inactive',
        updatedAt: new Date().toISOString(),
      });
    } else {
      const clientDb = await getServerAuthenticatedDb();
      try {
        await updateDoc(doc(clientDb, 'businesses', id), {
          status: 'inactive',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        await updateDoc(doc(clientDb, 'users', id), {
          status: 'inactive',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Business deactivated successfully.',
    });
  } catch (error: any) {
    console.error('[Business DELETE Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to deactivate business.' },
      { status: 500 }
    );
  }
}
