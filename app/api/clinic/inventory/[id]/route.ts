import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
  isRequestAuthorizedForClinicStaff,
  fetchFirestoreDocRest,
  setFirestoreDocRest,
} from '@/lib/firebaseAdmin';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/clinic/inventory/[id]
 * Updates an inventory item (stock adjustment, expiry, low-stock threshold, etc.)
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // 1. Authorize caller
    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Access Denied: You are not authorized to update clinic inventory.' },
        { status: authCheck.status || 403 }
      );
    }

    // 2. Fetch current item
    let currentItem: any = null;
    if (hasServiceAccount() && adminDb) {
      let snap = await adminDb.collection('inventory').doc(id).get();
      if (!snap.exists) snap = await adminDb.collection('clinic_inventory').doc(id).get();
      if (snap.exists) currentItem = { id: snap.id, ...snap.data() };
    } else {
      currentItem = await fetchFirestoreDocRest('inventory', id, authCheck.token);
      if (!currentItem) {
        currentItem = await fetchFirestoreDocRest('clinic_inventory', id, authCheck.token);
      }
      if (!currentItem) {
        try {
          const clientDb = await getServerAuthenticatedDb();
          let snap = await getDoc(doc(clientDb, 'inventory', id));
          if (!snap.exists()) snap = await getDoc(doc(clientDb, 'clinic_inventory', id));
          if (snap.exists()) currentItem = { id: snap.id, ...snap.data() };
        } catch (_) {}
      }
    }

    if (!currentItem) {
      return NextResponse.json({ success: false, error: 'Inventory item not found.' }, { status: 404 });
    }

    // Business Isolation Check
    if (authCheck.role !== 'super_admin') {
      const staffBiz = authCheck.businessId;
      const staffShop = authCheck.shopId;
      const itemBiz = currentItem.businessId;
      const itemShop = currentItem.shopId;

      const isSameBusiness =
        (staffBiz && itemBiz && staffBiz === itemBiz) ||
        (staffShop && itemShop && staffShop.toUpperCase() === itemShop.toUpperCase()) ||
        (!itemBiz && !itemShop);

      if (!isSameBusiness) {
        return NextResponse.json(
          { success: false, error: 'Access Denied: You can only update inventory for your own clinic.' },
          { status: 403 }
        );
      }
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      updatedByUid: authCheck.uid,
    };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category.trim();
    if (body.unit !== undefined) updates.unit = body.unit.trim().toLowerCase();
    if (body.batchNumber !== undefined) updates.batchNumber = body.batchNumber.trim().toUpperCase();
    if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate.trim();
    if (body.lowStockThreshold !== undefined) {
      const t = parseInt(body.lowStockThreshold, 10);
      if (!isNaN(t) && t >= 0) updates.lowStockThreshold = t;
    }

    // Stock Quantity adjustment
    let stockMovement: any = null;
    if (body.stockQuantity !== undefined) {
      const newStock = parseInt(body.stockQuantity, 10);
      if (isNaN(newStock) || newStock < 0) {
        return NextResponse.json(
          { success: false, error: 'Stock quantity must be a non-negative number.' },
          { status: 400 }
        );
      }

      const prevStock = Number(currentItem.stockQuantity) || 0;
      updates.stockQuantity = newStock;

      if (newStock !== prevStock) {
        const delta = newStock - prevStock;
        const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        stockMovement = {
          id: movId,
          businessId: currentItem.businessId,
          shopId: currentItem.shopId,
          medicineId: id,
          medicineName: updates.name || currentItem.name,
          movementType: delta > 0 ? 'restock' : 'adjustment',
          quantity: delta,
          previousStock: prevStock,
          newStock,
          reason: body.adjustmentReason || 'Manual inventory adjustment',
          actorUid: authCheck.uid,
          actorName: authCheck.fullName,
          actorRole: authCheck.role,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Save updates
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('inventory').doc(id).set(updates, { merge: true });
      try {
        await adminDb.collection('clinic_inventory').doc(id).set(updates, { merge: true });
      } catch (_) {}
      if (stockMovement) {
        await adminDb.collection('inventory_movements').doc(stockMovement.id).set(stockMovement);
      }
    } else {
      await setFirestoreDocRest('inventory', id, updates);
      try {
        await setFirestoreDocRest('clinic_inventory', id, updates);
      } catch (_) {}
      if (stockMovement) {
        try {
          await setFirestoreDocRest('inventory_movements', stockMovement.id, stockMovement);
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory item successfully updated.',
      item: { ...currentItem, ...updates },
    });
  } catch (error: any) {
    console.error('[Clinic Inventory PATCH Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update inventory item.' },
      { status: 500 }
    );
  }
}
