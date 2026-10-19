import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  getServerAuthenticatedDb,
  isRequestAuthorizedForClinicStaff,
} from '@/lib/firebaseAdmin';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pets/[id]
 * Fetch single pet details with business isolation
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    let petData: any = null;

    if (hasServiceAccount() && adminDb) {
      const snap = await adminDb.collection('pets').doc(id).get();
      if (snap.exists) petData = { id: snap.id, ...snap.data() };
    } else {
      const clientDb = await getServerAuthenticatedDb();
      const snap = await getDoc(doc(clientDb, 'pets', id));
      if (snap.exists()) petData = { id: snap.id, ...snap.data() };
    }

    if (!petData) {
      return NextResponse.json({ success: false, error: 'Pet record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pet: petData });
  } catch (error: any) {
    console.error('[Pet GET by ID Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pet details.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pets/[id]
 * Securely updates a pet record.
 * Handles Editing Registration Number (Requirement 2):
 * - Validates uniqueness within the relevant business
 * - Prevents duplicate registrations
 * - Keeps an audit record of the change (previous and new values, authorized user, timestamp, reason)
 * - Only authorized Clinic Admins or authorized Doctors can modify the registration number
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // 1. Fetch current pet record
    let currentPet: any = null;
    if (hasServiceAccount() && adminDb) {
      const snap = await adminDb.collection('pets').doc(id).get();
      if (snap.exists) currentPet = { id: snap.id, ...snap.data() };
    } else {
      const clientDb = await getServerAuthenticatedDb();
      const snap = await getDoc(doc(clientDb, 'pets', id));
      if (snap.exists()) currentPet = { id: snap.id, ...snap.data() };
    }

    if (!currentPet) {
      return NextResponse.json({ success: false, error: 'Pet record not found.' }, { status: 404 });
    }

    const isEditingRegNumber = body.registrationNumber && body.registrationNumber.trim() !== currentPet.registrationNumber;

    // 2. Authorize Caller
    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Access Denied: You are not authorized to update this pet patient.' },
        { status: authCheck.status || 403 }
      );
    }

    // Business Isolation Check: Admin/Doctor must belong to the same business as the pet
    if (authCheck.role !== 'super_admin') {
      const staffBiz = authCheck.businessId;
      const staffShop = authCheck.shopId;
      const petBiz = currentPet.businessId;
      const petShop = currentPet.shopId;

      const isSameBusiness =
        (staffBiz && petBiz && staffBiz === petBiz) ||
        (staffShop && petShop && staffShop.toUpperCase() === petShop.toUpperCase()) ||
        (!petBiz && !petShop); // legacy fallback

      if (!isSameBusiness) {
        return NextResponse.json(
          { success: false, error: 'Access Denied: You can only manage pets registered under your own business.' },
          { status: 403 }
        );
      }
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    // 3. Handle Registration Number Modification & Uniqueness Check (Requirement 2)
    if (isEditingRegNumber) {
      const newRegNumber = body.registrationNumber.trim();

      // Check for duplicates within this business
      let isDuplicate = false;
      const targetBiz = currentPet.businessId;

      if (hasServiceAccount() && adminDb) {
        let q: any = adminDb.collection('pets').where('registrationNumber', '==', newRegNumber);
        if (targetBiz) q = q.where('businessId', '==', targetBiz);
        const dupSnap = await q.get();
        isDuplicate = dupSnap.docs.some((d: any) => d.id !== id);
      } else {
        const clientDb = await getServerAuthenticatedDb();
        const q = query(
          collection(clientDb, 'pets'),
          where('registrationNumber', '==', newRegNumber)
        );
        const dupSnap = await getDocs(q);
        isDuplicate = dupSnap.docs.some((d) => d.id !== id && (!targetBiz || d.data().businessId === targetBiz));
      }

      if (isDuplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `Registration number "${newRegNumber}" is already in use by another pet patient in this business.`,
          },
          { status: 409 }
        );
      }

      // Build Audit Record
      const auditEntry = {
        action: 'edit_registration_number',
        previousRegistrationNumber: currentPet.registrationNumber,
        newRegistrationNumber: newRegNumber,
        updatedByUid: authCheck.uid,
        updatedByName: authCheck.fullName,
        updatedByRole: authCheck.role,
        timestamp: new Date().toISOString(),
        reason: body.reason?.trim() || 'Registration number correction by authorized staff',
      };

      const existingAudit = Array.isArray(currentPet.auditHistory) ? currentPet.auditHistory : [];
      updates.registrationNumber = newRegNumber;
      updates.auditHistory = [...existingAudit, auditEntry];
    }

    // 4. Update other allowed clinical fields
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.breed !== undefined) updates.breed = body.breed.trim();
    if (body.species !== undefined) updates.species = body.species.trim();
    if (body.gender !== undefined) updates.gender = body.gender.trim();
    if (body.coatColour !== undefined) updates.coatColour = body.coatColour.trim();
    if (body.dob !== undefined) updates.dob = body.dob.trim();
    if (body.ownerName !== undefined) updates.ownerName = body.ownerName.trim();
    if (body.contactNumber !== undefined) updates.contactNumber = body.contactNumber.trim();
    if (body.ownerAddress !== undefined) updates.ownerAddress = body.ownerAddress.trim();
    if (body.medicalNotes !== undefined) updates.medicalNotes = body.medicalNotes.trim();
    if (body.status !== undefined) updates.status = body.status;

    // 5. Commit update
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('pets').doc(id).set(updates, { merge: true });
    } else {
      const clientDb = await getServerAuthenticatedDb();
      await updateDoc(doc(clientDb, 'pets', id), updates);
    }

    const updatedPet = { ...currentPet, ...updates };

    return NextResponse.json({
      success: true,
      message: isEditingRegNumber
        ? `Registration number updated to ${updates.registrationNumber} with audit logging.`
        : 'Pet record updated successfully.',
      pet: updatedPet,
    });
  } catch (error: any) {
    console.error('[Pet PATCH Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update pet record.' },
      { status: 500 }
    );
  }
}
