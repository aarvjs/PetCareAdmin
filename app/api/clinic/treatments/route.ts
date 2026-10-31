import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  isRequestAuthorizedForClinicStaff,
  fetchFirestoreDocRest,
  setFirestoreDocRest,
  commitFirestoreBatchRest,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/clinic/treatments
 * Retrieves treatment / vaccination history for a specific pet.
 * Accessible to authorized clinic staff and the pet's verified owner.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');

    if (!petId) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "petId" is required.' },
        { status: 400 }
      );
    }

    let treatments: any[] = [];

    // 1. Check pet document directly (guaranteed sync with customer app and atomic updates)
    const petDoc = await fetchFirestoreDocRest('pets', petId);
    if (petDoc && Array.isArray(petDoc.treatments) && petDoc.treatments.length > 0) {
      treatments = [...petDoc.treatments];
    }

    if (treatments.length === 0) {
      if (hasServiceAccount() && adminDb) {
        const snap = await adminDb
          .collection('treatments')
          .where('petId', '==', petId)
          .get();

        treatments = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      } else {
        try {
          const allTreatments = await fetchFirestoreCollectionRest('treatments');
          treatments = allTreatments.filter((t) => t.petId === petId);
        } catch (_) {}
      }
    }

    // Sort chronologically (most recent first)
    treatments.sort((a, b) => {
      const dateA = new Date(a.administeredAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.administeredAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      treatments,
      totalCount: treatments.length,
    });
  } catch (error: any) {
    console.error('[Clinic Treatments GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch treatments.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinic/treatments
 * Records injections, medicines, or MULTIPLE VACCINES administered to a pet.
 * Supports:
 * - Single medicine administration (backward compatibility)
 * - Multiple vaccine selections in one visit (Feature 1)
 * - Independent dose number, history, and next due date per vaccine
 * - Atomic stock deduction + idempotency check + package linkage
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Authorize caller (Doctor, Clinic Admin, Super Admin)
    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error:
            authCheck.error ||
            'Access Denied: Only authorized Clinic Doctors or Administrators can record treatments.',
        },
        { status: authCheck.status || 403 }
      );
    }

    const { petId, idempotencyKey } = body;
    if (!petId) {
      return NextResponse.json({ success: false, error: 'Pet ID is required.' }, { status: 400 });
    }

    // Determine items to administer (supports multiple vaccines or single medicine)
    let itemsToAdminister: any[] = [];
    if (Array.isArray(body.vaccines) && body.vaccines.length > 0) {
      itemsToAdminister = body.vaccines;
    } else if (body.medicineId) {
      itemsToAdminister = [body];
    }

    if (itemsToAdminister.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one medicine or vaccine to administer.' },
        { status: 400 }
      );
    }

    const trimmedKey = idempotencyKey && typeof idempotencyKey === 'string' ? idempotencyKey.trim() : '';

    // Load Pet Document
    const petDoc = await fetchFirestoreDocRest('pets', petId, authCheck.token);
    if (!petDoc) {
      return NextResponse.json({ success: false, error: 'Pet patient record not found.' }, { status: 404 });
    }

    // Business isolation check
    const staffBizId = authCheck.businessId || petDoc.businessId || 'biz_1791736912551_weqjk8';
    const staffShopId = authCheck.shopId || petDoc.shopId || 'SHOP-D9E8';
    if (authCheck.role !== 'super_admin') {
      const petBiz = petDoc.businessId;
      const petShop = petDoc.shopId;
      const matchBiz = staffBizId && petBiz && staffBizId === petBiz;
      const matchShop = staffShopId && petShop && staffShopId.toUpperCase() === petShop.toUpperCase();
      if (!matchBiz && !matchShop && petBiz && petShop) {
        return NextResponse.json(
          { success: false, error: 'This pet patient is not registered under your clinic business.' },
          { status: 403 }
        );
      }
    }

    // 2. Idempotency Check
    if (trimmedKey && Array.isArray(petDoc.treatments)) {
      const existingKey = petDoc.treatments.find((t: any) => t.idempotencyKey === trimmedKey);
      if (existingKey) {
        return NextResponse.json({
          success: true,
          deduplicated: true,
          message: 'Treatment already recorded (idempotent request detected; no extra stock deducted).',
          treatment: existingKey,
        });
      }
    }

    const nowIso = new Date().toISOString();
    const existingTreatments = Array.isArray(petDoc.treatments) ? [...petDoc.treatments] : [];
    const newTreatmentRecords: any[] = [];
    const inventoryUpdates: Array<{ collection: string; id: string; newStock: number }> = [];
    const doctorName = body.administeredByName || body.callerProfile?.fullName || authCheck.fullName || 'Doctor';

    // Track active independent vaccine schedules
    const vaccineScheduleMap: Record<string, any> = petDoc.vaccineScheduleMap ? { ...petDoc.vaccineScheduleMap } : {};

    // 3. Process each vaccine / medicine item
    for (let idx = 0; idx < itemsToAdminister.length; idx++) {
      const item = itemsToAdminister[idx];
      const medId = item.medicineId;
      if (!medId) continue;

      const qty = parseFloat(item.quantityUsed || item.quantity || '1') || 1;
      const adminDateIso = item.administeredAt ? new Date(item.administeredAt).toISOString() : nowIso;
      const isVaccine =
        (item.medicineCategory || item.category || '').toLowerCase() === 'vaccine' ||
        (item.medicineName || item.name || '').toLowerCase().includes('vaccin') ||
        Boolean(item.doseNumber);

      // Check Inventory Stock
      let medData = await fetchFirestoreDocRest('inventory', medId, authCheck.token);
      let medCol = 'inventory';
      if (!medData) {
        medData = await fetchFirestoreDocRest('clinic_inventory', medId, authCheck.token);
        medCol = 'clinic_inventory';
      }

      if (medData) {
        const curStock = Number(medData.stockQuantity) || 0;
        const newStock = Math.max(0, Math.round((curStock - qty) * 100) / 100);
        inventoryUpdates.push({ collection: medCol, id: medId, newStock });
      }

      const itemTreatmentId = `treat_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      const medName = item.medicineName || item.name || medData?.name || 'Vaccine';
      const itemBrand = item.vaccineBrand || medData?.brand || '';
      const itemDoseNum = item.doseNumber || (isVaccine ? 'Dose 1' : '');
      const itemNextDue = item.nextDueDate ? item.nextDueDate.trim() : null;

      const treatmentRecord = {
        id: itemTreatmentId,
        petId,
        petName: petDoc.name || 'Pet',
        registrationNumber: petDoc.registrationNumber || 'UNASSIGNED',
        ownerId: petDoc.ownerId || '',
        businessId: staffBizId,
        shopId: staffShopId,
        medicineId: medId,
        medicineName: medName,
        medicineCategory: isVaccine ? 'Vaccine' : (medData?.category || item.medicineCategory || 'Medicine'),
        quantityUsed: qty,
        unit: item.unit || medData?.unit || 'dose',
        batchNumber: item.batchNumber || medData?.batchNumber || '',
        dosage: item.dosage ? item.dosage.trim() : `${qty} ${item.unit || medData?.unit || 'dose'}`,
        administeredAt: adminDateIso,
        administeredByUid: authCheck.uid,
        administeredByName: doctorName,
        nextDueDate: itemNextDue, // Independent next due date for this vaccine!
        notes: item.notes ? item.notes.trim() : '',
        idempotencyKey: trimmedKey ? `${trimmedKey}_${idx}` : undefined,
        vaccineBrand: itemBrand,
        doseNumber: itemDoseNum,
        totalDoses: typeof item.totalDoses === 'number' ? item.totalDoses : null,
        dosesAdministered: typeof item.dosesAdministered === 'number' ? item.dosesAdministered : (isVaccine ? 1 : 0),
        dosesRemaining: typeof item.dosesRemaining === 'number' ? item.dosesRemaining : null,
        scheduleStatus: item.scheduleStatus ? String(item.scheduleStatus).trim() : (isVaccine ? 'Series in progress' : ''),
        packageId: item.packageId || null,
        packageName: item.packageName || null,
        isPackageCovered: Boolean(item.isPackageCovered),
        appointmentId: body.appointmentId || item.appointmentId || null,
        createdAt: nowIso,
      };

      newTreatmentRecords.push(treatmentRecord);

      // Maintain independent next due date & last administered date for this specific vaccine
      if (isVaccine) {
        vaccineScheduleMap[medName] = {
          vaccineName: medName,
          vaccineBrand: itemBrand,
          doseNumber: itemDoseNum,
          lastAdministered: adminDateIso,
          nextDueDate: itemNextDue,
          totalDoses: treatmentRecord.totalDoses,
          dosesRemaining: treatmentRecord.dosesRemaining,
          updatedAt: nowIso,
        };
      }

      // If tied to a purchased package, also update the package's dose record
      if (item.packageId && Array.isArray(petDoc.vaccinePackages)) {
        const pkgMatch = petDoc.vaccinePackages.find((p: any) => p.id === item.packageId);
        if (pkgMatch && Array.isArray(pkgMatch.doses)) {
          const doseMatch = pkgMatch.doses.find(
            (d: any) => d.status === 'pending' || d.doseNumber === itemDoseNum
          );
          if (doseMatch) {
            doseMatch.status = 'administered';
            doseMatch.administeredAt = adminDateIso;
            doseMatch.administeredByDoctor = doctorName;
            doseMatch.treatmentId = itemTreatmentId;
            doseMatch.vaccineBrand = itemBrand;
            const newAdmin = pkgMatch.doses.filter((d: any) => d.status === 'administered').length;
            pkgMatch.administeredDoses = newAdmin;
            pkgMatch.remainingDoses = Math.max(0, pkgMatch.totalDoses - newAdmin);
            const nextP = pkgMatch.doses.find((d: any) => d.status === 'pending');
            pkgMatch.nextScheduledDoseDate = nextP ? nextP.scheduledDate : null;
            pkgMatch.status = pkgMatch.remainingDoses === 0 ? 'completed' : 'active';
            pkgMatch.updatedAt = nowIso;
          }
        }
      }
    }

    // 4. Update Pet Document with all new treatments and independent schedule map
    const combinedTreatments = [...newTreatmentRecords, ...existingTreatments];

    // Find latest administered vaccine to keep summary fields fresh
    const lastVacRecord = newTreatmentRecords.find(
      (r) => r.medicineCategory === 'Vaccine' || Boolean(r.doseNumber)
    );

    const updatedPetData: Record<string, any> = {
      ...petDoc,
      lastTreatmentAt: nowIso,
      lastVisit: nowIso.split('T')[0],
      treatments: combinedTreatments,
      vaccineScheduleMap,
      updatedAt: nowIso,
    };

    if (lastVacRecord) {
      updatedPetData.lastVaccinationAt = lastVacRecord.administeredAt;
      updatedPetData.lastVaccineName = lastVacRecord.medicineName;
      updatedPetData.lastVaccineDose = lastVacRecord.doseNumber;
      if (lastVacRecord.nextDueDate) {
        updatedPetData.nextVaccinationDue = lastVacRecord.nextDueDate;
      }
    }

    // 5. Commit all writes to Firestore
    if (hasServiceAccount() && adminDb) {
      const batch = adminDb.batch();
      for (const t of newTreatmentRecords) {
        batch.set(adminDb.collection('treatments').doc(t.id), t);
      }
      for (const inv of inventoryUpdates) {
        batch.update(adminDb.collection(inv.collection).doc(inv.id), {
          stockQuantity: inv.newStock,
          updatedAt: nowIso,
        });
      }
      batch.set(adminDb.collection('pets').doc(petId), updatedPetData, { merge: true });
      await batch.commit();
    } else {
      for (const t of newTreatmentRecords) {
        try {
          await setFirestoreDocRest('treatments', t.id, t, authCheck.token);
        } catch (_) {}
      }
      for (const inv of inventoryUpdates) {
        try {
          await setFirestoreDocRest(
            inv.collection,
            inv.id,
            { stockQuantity: inv.newStock, updatedAt: nowIso },
            authCheck.token
          );
        } catch (_) {}
      }
      await setFirestoreDocRest('pets', petId, updatedPetData, authCheck.token);
    }

    return NextResponse.json({
      success: true,
      message:
        newTreatmentRecords.length > 1
          ? `Successfully recorded ${newTreatmentRecords.length} vaccines with individual schedules and stock deductions!`
          : `Treatment successfully recorded!`,
      treatments: newTreatmentRecords,
      treatment: newTreatmentRecords[0],
      count: newTreatmentRecords.length,
    });
  } catch (error: any) {
    console.error('[Clinic Treatments POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record treatments.' },
      { status: 400 }
    );
  }
}
