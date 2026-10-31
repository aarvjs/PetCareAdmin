import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  isRequestAuthorizedForClinicStaff,
  fetchFirestoreDocRest,
  setFirestoreDocRest,
} from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * PATCH /api/clinic/pets/[id]/vaccine-packages/[pkgId]/schedule
 * Updates scheduled date for an individual future dose in a purchased package.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pkgId: string }> }
) {
  try {
    const { id: petId, pkgId } = await params;
    const body = await request.json();

    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { doseIndex, scheduledDate } = body;
    if (!doseIndex || !scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'doseIndex and scheduledDate are required.' },
        { status: 400 }
      );
    }

    const petDoc = await fetchFirestoreDocRest('pets', petId, authCheck.token);
    if (!petDoc) {
      return NextResponse.json({ success: false, error: 'Pet record not found.' }, { status: 404 });
    }

    let packages: any[] = Array.isArray(petDoc.vaccinePackages) ? [...petDoc.vaccinePackages] : [];
    let pkgIndex = packages.findIndex((p) => p.id === pkgId);

    let pkgDoc: any = null;
    if (pkgIndex >= 0) {
      pkgDoc = packages[pkgIndex];
    } else {
      pkgDoc = await fetchFirestoreDocRest('pet_vaccine_packages', pkgId, authCheck.token);
    }

    if (!pkgDoc) {
      return NextResponse.json({ success: false, error: 'Package record not found.' }, { status: 404 });
    }

    const doses: any[] = Array.isArray(pkgDoc.doses) ? [...pkgDoc.doses] : [];
    const target = doses.find((d) => d.doseIndex === parseInt(doseIndex, 10));

    if (!target) {
      return NextResponse.json({ success: false, error: 'Dose not found in package.' }, { status: 404 });
    }

    if (target.status === 'administered') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify scheduled date of an already administered dose.' },
        { status: 400 }
      );
    }

    target.scheduledDate = scheduledDate.trim();

    // Recalculate next scheduled dose date
    const nextPending = doses.find((d) => d.status === 'pending');
    pkgDoc.nextScheduledDoseDate = nextPending ? nextPending.scheduledDate : null;
    pkgDoc.doses = doses;
    pkgDoc.updatedAt = new Date().toISOString();

    if (pkgIndex >= 0) {
      packages[pkgIndex] = pkgDoc;
    }

    const updatedPet = {
      ...petDoc,
      vaccinePackages: packages,
      nextVaccinationDue: pkgDoc.nextScheduledDoseDate || petDoc.nextVaccinationDue,
      updatedAt: new Date().toISOString(),
    };

    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('pet_vaccine_packages').doc(pkgId).set(pkgDoc, { merge: true });
      await adminDb.collection('pets').doc(petId).set(updatedPet, { merge: true });
    } else {
      await setFirestoreDocRest('pet_vaccine_packages', pkgId, pkgDoc, authCheck.token);
      await setFirestoreDocRest('pets', petId, updatedPet, authCheck.token);
    }

    return NextResponse.json({
      success: true,
      message: `Scheduled date for ${target.doseNumber} updated to ${scheduledDate}.`,
      package: pkgDoc,
    });
  } catch (error: any) {
    console.error('[Update Package Dose Schedule Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update schedule.' },
      { status: 500 }
    );
  }
}

