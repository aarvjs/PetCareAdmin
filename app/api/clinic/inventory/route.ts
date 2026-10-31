import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  isRequestAuthorizedForClinicStaff,
  setFirestoreDocRest,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/clinic/inventory
 * Retrieves clinic medicine/injection inventory for the authorized business.
 * Supports search and category filter.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'All';

    // 1. Authorize caller (Doctor, Clinic Admin, Super Admin)
    const authCheck = await isRequestAuthorizedForClinicStaff(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Unauthorized access.' },
        { status: authCheck.status || 401 }
      );
    }

    const targetBizId = authCheck.businessId;
    const targetShopId = authCheck.shopId;

    let items: any[] = [];

    if (hasServiceAccount() && adminDb) {
      let q: any = adminDb.collection('inventory');
      if (authCheck.role !== 'super_admin') {
        if (targetBizId) {
          q = q.where('businessId', '==', targetBizId);
        } else if (targetShopId) {
          q = q.where('shopId', '==', targetShopId);
        }
      }
      const snapshot = await q.get();
      items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      // Also include clinic_inventory if any exist
      try {
        const cSnap = await adminDb.collection('clinic_inventory').get();
        const existingIds = new Set(items.map((i) => i.id));
        cSnap.docs.forEach((d: any) => {
          if (!existingIds.has(d.id)) {
            items.push({ id: d.id, ...d.data() });
          }
        });
      } catch (_) {}
    } else {
      try {
        items = await fetchFirestoreCollectionRest('inventory', authCheck.token);
      } catch (err) {
        console.warn('[Clinic Inventory REST fetch error]', err);
      }
      try {
        const cItems = await fetchFirestoreCollectionRest('clinic_inventory', authCheck.token);
        const existingIds = new Set(items.map((i) => i.id));
        cItems.forEach((d: any) => {
          if (!existingIds.has(d.id)) {
            items.push(d);
          }
        });
      } catch (_) {}
    }

    // Apply business isolation if not super_admin
    if (authCheck.role !== 'super_admin') {
      if (targetBizId) {
        items = items.filter(
          (item) => item.businessId === targetBizId || item.shopId === targetBizId || (!item.businessId && !item.shopId)
        );
      } else if (targetShopId) {
        items = items.filter(
          (item) => item.shopId === targetShopId || item.businessId === targetShopId || (!item.businessId && !item.shopId)
        );
      }
    }

    // Filter in-memory for search, category, and sorting
    if (category && category !== 'All') {
      items = items.filter(
        (item) => (item.category || '').toLowerCase() === category.toLowerCase()
      );
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter(
        (item) =>
          (item.name || '').toLowerCase().includes(s) ||
          (item.batchNumber || '').toLowerCase().includes(s) ||
          (item.category || '').toLowerCase().includes(s)
      );
    }

    // Sort by name
    items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({
      success: true,
      items,
      totalCount: items.length,
      businessId: targetBizId,
      shopId: targetShopId,
    });
  } catch (error: any) {
    console.error('[Clinic Inventory GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch clinic inventory.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinic/inventory
 * Adds a new medicine or injection item to clinic inventory.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Authorize caller
    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Access Denied: You are not authorized to manage clinic inventory.' },
        { status: authCheck.status || 403 }
      );
    }

    const {
      name,
      genericName,
      category,
      strength,
      dosageUnit,
      manufacturer,
      description,
      defaultInstructions,
      price,
      stockQuantity,
      unit,
      batchNumber,
      expiryDate,
      lowStockThreshold,
      notes,
      status,
    } = body;

    // 2. Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Medicine or injection name is required.' },
        { status: 400 }
      );
    }

    const parsedStock = parseInt(stockQuantity ?? '0', 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return NextResponse.json(
        { success: false, error: 'Stock quantity must be a non-negative number.' },
        { status: 400 }
      );
    }

    const parsedPrice = price !== undefined && price !== '' ? parseFloat(price) : 0;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Medicine price must be a valid non-negative number.' },
        { status: 400 }
      );
    }

    const parsedThreshold = parseInt(lowStockThreshold, 10);
    const threshold = !isNaN(parsedThreshold) && parsedThreshold >= 0 ? parsedThreshold : 5;

    const assignedBizId = authCheck.businessId || body.businessId || '';
    const assignedShopId = authCheck.shopId || body.shopId || '';

    const timestamp = Date.now();
    const itemId = `med_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const inventoryItem = {
      id: itemId,
      name: name.trim(),
      genericName: genericName ? genericName.trim() : '',
      category: category ? category.trim() : 'Medicine',
      strength: strength ? strength.trim() : '',
      dosageUnit: dosageUnit ? dosageUnit.trim() : '',
      manufacturer: manufacturer ? manufacturer.trim() : '',
      description: description ? description.trim() : '',
      defaultInstructions: defaultInstructions ? defaultInstructions.trim() : '',
      price: parsedPrice,
      stockQuantity: parsedStock,
      unit: unit ? unit.trim().toLowerCase() : 'vial',
      batchNumber: batchNumber ? batchNumber.trim().toUpperCase() : '',
      expiryDate: expiryDate ? expiryDate.trim() : '',
      lowStockThreshold: threshold,
      notes: notes ? notes.trim() : '',
      businessId: assignedBizId,
      shopId: assignedShopId,
      status: status && ['active', 'inactive', 'archived'].includes(status.toLowerCase()) ? status.toLowerCase() : 'active',
      createdByUid: authCheck.uid,
      createdByName: authCheck.fullName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 3. Save to Firestore (Both inventory and clinic_inventory for compatibility)
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('inventory').doc(itemId).set(inventoryItem);
      try {
        await adminDb.collection('clinic_inventory').doc(itemId).set(inventoryItem);
      } catch (_) {}

      // Audit stock initialization movement
      if (parsedStock > 0) {
        const movId = `mov_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
        await adminDb.collection('inventory_movements').doc(movId).set({
          id: movId,
          businessId: assignedBizId,
          shopId: assignedShopId,
          medicineId: itemId,
          medicineName: inventoryItem.name,
          movementType: 'initial_stock',
          quantity: parsedStock,
          previousStock: 0,
          newStock: parsedStock,
          reason: 'Item creation',
          actorUid: authCheck.uid,
          actorName: authCheck.fullName,
          actorRole: authCheck.role,
          timestamp: nowIso,
        });
      }
    } else {
      await setFirestoreDocRest('inventory', itemId, inventoryItem, authCheck.token);
      try {
        await setFirestoreDocRest('clinic_inventory', itemId, inventoryItem, authCheck.token);
      } catch (_) {}

      if (parsedStock > 0) {
        const movId = `mov_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
        try {
          await setFirestoreDocRest('inventory_movements', movId, {
            id: movId,
            businessId: assignedBizId,
            shopId: assignedShopId,
            medicineId: itemId,
            medicineName: inventoryItem.name,
            movementType: 'initial_stock',
            quantity: parsedStock,
            previousStock: 0,
            newStock: parsedStock,
            reason: 'Item creation',
            actorUid: authCheck.uid,
            actorName: authCheck.fullName,
            actorRole: authCheck.role,
            timestamp: nowIso,
          }, authCheck.token);
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: `Item "${inventoryItem.name}" successfully added to clinic inventory.`,
      item: inventoryItem,
    });
  } catch (error: any) {
    console.error('[Clinic Inventory POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add item to clinic inventory.' },
      { status: 500 }
    );
  }
}
