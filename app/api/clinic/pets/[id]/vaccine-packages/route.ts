import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  isRequestAuthorizedForClinicStaff,
  fetchFirestoreDocRest,
  setFirestoreDocRest,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';
import {
  DEFAULT_VACCINE_PACKAGES,
  PetPurchasedPackage,
  generatePackageDosesSchedule,
  calculatePackageTotals,
} from '@/lib/vaccineSchedule';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/clinic/pets/[id]/vaccine-packages
 * Retrieves all purchased vaccine packages, dose history, and remaining balances for a pet.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: petId } = await params;
    const authCheck = await isRequestAuthorizedForClinicStaff(request);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check pet document directly
    let packages: PetPurchasedPackage[] = [];
    const petDoc = await fetchFirestoreDocRest('pets', petId, authCheck.token);

    if (petDoc && Array.isArray(petDoc.vaccinePackages)) {
      packages = [...petDoc.vaccinePackages];
    }

    if (packages.length === 0) {
      if (hasServiceAccount() && adminDb) {
        const snap = await adminDb
          .collection('pet_vaccine_packages')
          .where('petId', '==', petId)
          .get();
        packages = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      } else {
        try {
          const all = await fetchFirestoreCollectionRest('pet_vaccine_packages', authCheck.token);
          packages = all.filter((p: any) => p.petId === petId);
        } catch (_) {}
      }
    }

    return NextResponse.json({
      success: true,
      packages,
      totalCount: packages.length,
    });
  } catch (error: any) {
    console.error('[Pet Vaccine Packages GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pet vaccine packages.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinic/pets/[id]/vaccine-packages
 * Sells / Assigns a multi-dose vaccine package to a registered pet.
 * Records payment, initializes scheduled doses, optionally administers first dose today.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: petId } = await params;
    const body = await request.json();

    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Unauthorized' },
        { status: authCheck.status || 401 }
      );
    }

    const {
      packageId,
      customPackageName,
      customVaccineName,
      customTotalDoses,
      customPricePerDose,
      customIntervalDays,
      administerFirstDoseNow = false,
      firstDoseBrand = '',
      firstDoseBatch = '',
      firstDoseNotes = '',
      paymentStatus = 'Paid',
      paymentMethod = 'Cash',
      amountPaid: inputAmountPaid,
      appointmentId,
      scheduledDates = [], // optional custom overrides for dose dates
    } = body;

    // 1. Fetch Pet
    const petDoc = await fetchFirestoreDocRest('pets', petId, authCheck.token);
    if (!petDoc) {
      return NextResponse.json({ success: false, error: 'Pet patient record not found.' }, { status: 404 });
    }

    // 2. Fetch authoritative package definition from server
    let targetPackage: any = null;
    if (packageId) {
      if (hasServiceAccount() && adminDb) {
        const snap = await adminDb.collection('vaccine_packages').doc(packageId).get();
        if (snap.exists) targetPackage = { id: snap.id, ...snap.data() };
      } else {
        targetPackage = await fetchFirestoreDocRest('vaccine_packages', packageId, authCheck.token);
      }

      if (!targetPackage) {
        targetPackage = DEFAULT_VACCINE_PACKAGES.find((p) => p.id === packageId);
      }
    }

    // Determine package fields authoritatively
    const packageName = (targetPackage?.name || customPackageName || 'Vaccine Package').trim();
    const vaccineName = (targetPackage?.vaccineName || customVaccineName || packageName).trim();
    const totalDoses = parseInt(targetPackage?.totalDoses || customTotalDoses || 1, 10);
    const pricePerDose = parseFloat(targetPackage?.pricePerDose !== undefined ? targetPackage.pricePerDose : customPricePerDose || 0);
    const intervalDays = parseInt(targetPackage?.intervalDays || customIntervalDays || 21, 10);

    if (totalDoses <= 0) {
      return NextResponse.json({ success: false, error: 'Total doses must be at least 1.' }, { status: 400 });
    }

    // Authoritative calculations: Total Package Price = Total Doses * Price Per Dose
    const authoritativePackagePrice = Math.round(totalDoses * pricePerDose * 100) / 100;
    const effectiveAmountPaid = inputAmountPaid !== undefined
      ? parseFloat(inputAmountPaid)
      : (paymentStatus === 'Paid' ? authoritativePackagePrice : 0);

    const { packagePrice, outstandingAmount, paymentStatus: resolvedStatus } = calculatePackageTotals(
      totalDoses,
      pricePerDose,
      effectiveAmountPaid
    );

    const nowIso = new Date().toISOString();
    const todayDateStr = nowIso.split('T')[0];
    const purchasedPkgId = `pkg_purchased_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const staffBizId = authCheck.businessId || petDoc.businessId || 'biz_1791736912551_weqjk8';
    const staffShopId = authCheck.shopId || petDoc.shopId || 'SHOP-D9E8';
    const doctorName = body.doctorName || authCheck.fullName || 'Attending Doctor';

    // 3. Generate initial dose schedule
    const doses = generatePackageDosesSchedule({
      totalDoses,
      intervalDays,
      startDate: todayDateStr,
      firstDoseAdministered: Boolean(administerFirstDoseNow),
      firstDoseDoctor: doctorName,
      firstDoseUid: authCheck.uid,
      firstDoseBrand: firstDoseBrand.trim(),
      firstDoseBatch: firstDoseBatch.trim(),
      appointmentId,
    });

    // Apply any custom future date overrides
    if (Array.isArray(scheduledDates) && scheduledDates.length > 0) {
      scheduledDates.forEach((sd: { doseIndex: number; scheduledDate: string }) => {
        const found = doses.find((d) => d.doseIndex === sd.doseIndex);
        if (found && sd.scheduledDate && found.status !== 'administered') {
          found.scheduledDate = sd.scheduledDate.trim();
        }
      });
    }

    const administeredCount = administerFirstDoseNow ? 1 : 0;
    const remainingCount = Math.max(0, totalDoses - administeredCount);

    // Find next pending dose date
    const nextPending = doses.find((d) => d.status === 'pending');
    const nextScheduledDoseDate = nextPending ? nextPending.scheduledDate : null;

    const purchasedPackageRecord: PetPurchasedPackage = {
      id: purchasedPkgId,
      packageId: packageId || purchasedPkgId,
      packageName,
      vaccineName,
      petId,
      petName: petDoc.name || 'Pet',
      petRegistrationNumber: petDoc.registrationNumber || '',
      ownerName: petDoc.ownerName || '',
      ownerPhone: petDoc.contactNumber || '',
      totalDoses,
      pricePerDose,
      packagePrice,
      amountPaid: effectiveAmountPaid,
      outstandingAmount,
      paymentStatus: resolvedStatus,
      paymentMethod: paymentMethod || 'Cash',
      administeredDoses: administeredCount,
      remainingDoses: remainingCount,
      purchasedAt: nowIso,
      purchasedAppointmentId: appointmentId || null,
      businessId: staffBizId,
      shopId: staffShopId,
      status: remainingCount === 0 ? 'completed' : 'active',
      doses,
      nextScheduledDoseDate,
      updatedAt: nowIso,
      auditHistory: [
        {
          action: 'package_purchased',
          actorName: doctorName,
          timestamp: nowIso,
          details: `Purchased ${totalDoses}-dose package "${packageName}" for ₹${packagePrice}. Payment: ${resolvedStatus} (₹${effectiveAmountPaid}). First dose ${administerFirstDoseNow ? 'administered today' : 'scheduled'}.`,
        },
      ],
    };

    // 4. If first dose was administered, create treatment record & deduct stock
    let firstDoseTreatment: any = null;
    if (administerFirstDoseNow) {
      const treatmentId = `treat_pkg_${purchasedPkgId}_1`;
      doses[0].treatmentId = treatmentId;

      firstDoseTreatment = {
        id: treatmentId,
        petId,
        petName: petDoc.name || 'Pet',
        registrationNumber: petDoc.registrationNumber || '',
        ownerId: petDoc.ownerId || '',
        businessId: staffBizId,
        shopId: staffShopId,
        medicineName: vaccineName,
        medicineCategory: 'Vaccine',
        quantityUsed: 1,
        unit: 'dose',
        batchNumber: firstDoseBatch.trim(),
        dosage: '1 ml subcutaneous',
        administeredAt: nowIso,
        administeredByUid: authCheck.uid,
        administeredByName: doctorName,
        nextDueDate: nextScheduledDoseDate,
        notes: firstDoseNotes.trim() || `Administered Dose 1 under package "${packageName}".`,
        vaccineBrand: firstDoseBrand.trim(),
        doseNumber: doses[0].doseNumber,
        totalDoses,
        dosesAdministered: 1,
        dosesRemaining: remainingCount,
        scheduleStatus: remainingCount === 0 ? 'Schedule complete' : 'Series in progress',
        packageId: purchasedPkgId,
        packageName,
        isPackageCovered: true,
        charge: 0, // Never charge again for dose included in package
        appointmentId: appointmentId || null,
        createdAt: nowIso,
      };

      // Try inventory stock deduction if vaccine found
      try {
        const invItems = await fetchFirestoreCollectionRest('inventory', authCheck.token);
        const medMatch = invItems.find(
          (m: any) =>
            (m.name || '').toLowerCase().includes(vaccineName.toLowerCase()) ||
            vaccineName.toLowerCase().includes((m.name || '').toLowerCase())
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
        console.warn('[Package First Dose Stock Deduction Warning]', invErr);
      }
    }

    // 5. Update Pet Document with new package & treatment
    const existingPackages = Array.isArray(petDoc.vaccinePackages) ? petDoc.vaccinePackages : [];
    const updatedPackages = [purchasedPackageRecord, ...existingPackages];

    const existingTreatments = Array.isArray(petDoc.treatments) ? petDoc.treatments : [];
    const updatedTreatments = firstDoseTreatment
      ? [firstDoseTreatment, ...existingTreatments]
      : existingTreatments;

    const updatedPet: Record<string, any> = {
      ...petDoc,
      vaccinePackages: updatedPackages,
      treatments: updatedTreatments,
      updatedAt: nowIso,
    };

    if (administerFirstDoseNow) {
      updatedPet.lastVaccinationAt = nowIso;
      updatedPet.lastVaccineName = vaccineName;
      updatedPet.lastVaccineDose = doses[0].doseNumber;
      if (nextScheduledDoseDate) {
        updatedPet.nextVaccinationDue = nextScheduledDoseDate;
      }
    }

    // Persist to Firestore
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('pet_vaccine_packages').doc(purchasedPkgId).set(purchasedPackageRecord);
      if (firstDoseTreatment) {
        await adminDb.collection('treatments').doc(firstDoseTreatment.id).set(firstDoseTreatment);
      }
      await adminDb.collection('pets').doc(petId).set(updatedPet, { merge: true });
    } else {
      await setFirestoreDocRest('pet_vaccine_packages', purchasedPkgId, purchasedPackageRecord, authCheck.token);
      if (firstDoseTreatment) {
        await setFirestoreDocRest('treatments', firstDoseTreatment.id, firstDoseTreatment, authCheck.token);
      }
      await setFirestoreDocRest('pets', petId, updatedPet, authCheck.token);
    }

    return NextResponse.json({
      success: true,
      message: `Vaccine package "${packageName}" assigned to ${petDoc.name} successfully! Total: ₹${packagePrice} (${totalDoses} doses @ ₹${pricePerDose}). Remaining doses: ${remainingCount}.`,
      package: purchasedPackageRecord,
      firstDoseTreatment,
    });
  } catch (error: any) {
    console.error('[Pet Vaccine Package POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sell/assign vaccine package.' },
      { status: 500 }
    );
  }
}

