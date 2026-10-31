import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  isRequestAuthorizedForClinicStaff,
  fetchFirestoreDocRest,
  setFirestoreDocRest,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/clinic/pets/[id]/vaccine-packages/[pkgId]/administer
 * Administers a package dose to a pet.
 * Automatically decrements remaining doses, records administering doctor,
 * updates next scheduled dose, and enforces ₹0 additional fee (already paid in package).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pkgId: string }> }
) {
  try {
    const { id: petId, pkgId } = await params;
    const body = await request.json().catch(() => ({}));

    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Unauthorized' },
        { status: authCheck.status || 401 }
      );
    }

    const {
      doseIndex: requestedDoseIndex,
      vaccineBrand = '',
      batchNumber = '',
      notes = '',
      administeredAt,
      appointmentId,
    } = body;

    // 1. Load Pet Document
    const petDoc = await fetchFirestoreDocRest('pets', petId, authCheck.token);
    if (!petDoc) {
      return NextResponse.json({ success: false, error: 'Pet patient record not found.' }, { status: 404 });
    }

    // 2. Locate Package
    let packages: any[] = Array.isArray(petDoc.vaccinePackages) ? [...petDoc.vaccinePackages] : [];
    let pkgIndex = packages.findIndex((p) => p.id === pkgId);

    let pkgDoc: any = null;
    if (pkgIndex >= 0) {
      pkgDoc = packages[pkgIndex];
    } else {
      pkgDoc = await fetchFirestoreDocRest('pet_vaccine_packages', pkgId, authCheck.token);
    }

    if (!pkgDoc) {
      return NextResponse.json({ success: false, error: 'Vaccine package not found for this pet.' }, { status: 404 });
    }

    const doses: any[] = Array.isArray(pkgDoc.doses) ? [...pkgDoc.doses] : [];

    // Find the dose to administer
    let targetDose: any = null;
    if (requestedDoseIndex !== undefined) {
      targetDose = doses.find((d) => d.doseIndex === parseInt(requestedDoseIndex, 10));
    } else {
      targetDose = doses.find((d) => d.status === 'pending');
    }

    if (!targetDose) {
      return NextResponse.json(
        { success: false, error: 'No pending doses available in this package. All doses have been completed!' },
        { status: 400 }
      );
    }

    // IDEMPOTENCY / DUPLICATE PREVENTION:
    if (targetDose.status === 'administered') {
      return NextResponse.json(
        {
          success: false,
          error: `${targetDose.doseNumber} was already administered on ${targetDose.administeredAt ? new Date(targetDose.administeredAt).toLocaleDateString('en-GB') : 'a previous visit'}. Cannot administer duplicate dose.`,
        },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const adminDateIso = administeredAt ? new Date(administeredAt).toISOString() : nowIso;
    const doctorName = body.doctorName || authCheck.fullName || 'Attending Doctor';
    const staffBizId = authCheck.businessId || petDoc.businessId || 'biz_1791736912551_weqjk8';
    const staffShopId = authCheck.shopId || petDoc.shopId || 'SHOP-D9E8';

    const treatmentId = `treat_pkg_${pkgId}_${targetDose.doseIndex}`;

    // Mark dose as administered
    targetDose.status = 'administered';
    targetDose.administeredAt = adminDateIso;
    targetDose.administeredByDoctor = doctorName;
    targetDose.administeredByUid = authCheck.uid;
    targetDose.vaccineBrand = vaccineBrand.trim() || targetDose.vaccineBrand || '';
    targetDose.batchNumber = batchNumber.trim() || targetDose.batchNumber || '';
    targetDose.notes = notes.trim() || targetDose.notes || '';
    targetDose.appointmentId = appointmentId || targetDose.appointmentId || null;
    targetDose.treatmentId = treatmentId;

    // Recalculate administered & remaining counts
    const administeredCount = doses.filter((d) => d.status === 'administered').length;
    const remainingCount = Math.max(0, pkgDoc.totalDoses - administeredCount);

    // Find next pending dose
    const nextPending = doses.find((d) => d.status === 'pending');
    const nextScheduledDoseDate = nextPending ? nextPending.scheduledDate : null;

    pkgDoc.doses = doses;
    pkgDoc.administeredDoses = administeredCount;
    pkgDoc.remainingDoses = remainingCount;
    pkgDoc.nextScheduledDoseDate = nextScheduledDoseDate;
    pkgDoc.status = remainingCount === 0 ? 'completed' : 'active';
    pkgDoc.updatedAt = nowIso;

    if (!Array.isArray(pkgDoc.auditHistory)) pkgDoc.auditHistory = [];
    pkgDoc.auditHistory.push({
      action: 'dose_administered',
      actorName: doctorName,
      timestamp: nowIso,
      details: `${targetDose.doseNumber} administered on ${new Date(adminDateIso).toLocaleDateString('en-GB')}. ${remainingCount} doses remaining. Next scheduled: ${nextScheduledDoseDate || 'All Completed'}.`,
    });

    if (pkgIndex >= 0) {
      packages[pkgIndex] = pkgDoc;
    } else {
      packages.unshift(pkgDoc);
    }

    // 3. Create Treatment Record with ₹0 charge (Already covered by package)
    const treatmentRecord = {
      id: treatmentId,
      petId,
      petName: petDoc.name || 'Pet',
      registrationNumber: petDoc.registrationNumber || '',
      ownerId: petDoc.ownerId || '',
      businessId: staffBizId,
      shopId: staffShopId,
      medicineName: pkgDoc.vaccineName,
      medicineCategory: 'Vaccine',
      quantityUsed: 1,
      unit: 'dose',
      batchNumber: targetDose.batchNumber,
      dosage: '1 ml subcutaneous',
      administeredAt: adminDateIso,
      administeredByUid: authCheck.uid,
      administeredByName: doctorName,
      nextDueDate: nextScheduledDoseDate,
      notes: notes.trim() || `Administered ${targetDose.doseNumber} under package "${pkgDoc.packageName}".`,
      vaccineBrand: targetDose.vaccineBrand,
      doseNumber: targetDose.doseNumber,
      totalDoses: pkgDoc.totalDoses,
      dosesAdministered: administeredCount,
      dosesRemaining: remainingCount,
      scheduleStatus: remainingCount === 0 ? 'Schedule complete' : 'Series in progress',
      packageId: pkgId,
      packageName: pkgDoc.packageName,
      isPackageCovered: true,
      charge: 0, // ₹0 charge: Never deduct package payment again
      appointmentId: appointmentId || null,
      createdAt: nowIso,
    };

    // 4. Try inventory stock deduction
    try {
      const invItems = await fetchFirestoreCollectionRest('inventory', authCheck.token);
      const medMatch = invItems.find(
        (m: any) =>
          (m.name || '').toLowerCase().includes(pkgDoc.vaccineName.toLowerCase()) ||
          pkgDoc.vaccineName.toLowerCase().includes((m.name || '').toLowerCase())
      );
      if (medMatch && typeof medMatch.stockQuantity === 'number') {
        const newStock = Math.max(0, medMatch.stockQuantity - 1);
        await setFirestoreDocRest('inventory', medMatch.id, {
          ...medMatch,
          stockQuantity: newStock,
          updatedAt: nowIso,
        }, authCheck.token);
      }
    } catch (invErr) {
      console.warn('[Package Dose Stock Deduction Warning]', invErr);
    }

    // 5. Update Pet Document
    const existingTreatments = Array.isArray(petDoc.treatments) ? petDoc.treatments : [];
    const updatedTreatments = [treatmentRecord, ...existingTreatments.filter((t: any) => t.id !== treatmentId)];

    const updatedPet: Record<string, any> = {
      ...petDoc,
      vaccinePackages: packages,
      treatments: updatedTreatments,
      lastVaccinationAt: adminDateIso,
      lastVaccineName: pkgDoc.vaccineName,
      lastVaccineDose: targetDose.doseNumber,
      updatedAt: nowIso,
    };
    if (nextScheduledDoseDate) {
      updatedPet.nextVaccinationDue = nextScheduledDoseDate;
    }

    // 6. Persist changes
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('pet_vaccine_packages').doc(pkgId).set(pkgDoc, { merge: true });
      await adminDb.collection('treatments').doc(treatmentId).set(treatmentRecord);
      await adminDb.collection('pets').doc(petId).set(updatedPet, { merge: true });
    } else {
      await setFirestoreDocRest('pet_vaccine_packages', pkgId, pkgDoc, authCheck.token);
      await setFirestoreDocRest('treatments', treatmentId, treatmentRecord, authCheck.token);
      await setFirestoreDocRest('pets', petId, updatedPet, authCheck.token);
    }

    return NextResponse.json({
      success: true,
      message: `${targetDose.doseNumber} of "${pkgDoc.packageName}" administered successfully to ${petDoc.name}! Remaining doses: ${remainingCount}. Next due: ${nextScheduledDoseDate || 'Schedule Complete'}.`,
      administeredDose: targetDose,
      remainingDoses: remainingCount,
      nextScheduledDoseDate,
      package: pkgDoc,
      treatment: treatmentRecord,
    });
  } catch (error: any) {
    console.error('[Administer Package Dose Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to administer package dose.' },
      { status: 500 }
    );
  }
}

