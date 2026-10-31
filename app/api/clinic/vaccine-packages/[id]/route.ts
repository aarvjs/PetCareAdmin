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
 * PATCH /api/clinic/vaccine-packages/[id]
 * Updates package configuration while preserving historical backward compatibility.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let existing: any = null;
    if (hasServiceAccount() && adminDb) {
      const snap = await adminDb.collection('vaccine_packages').doc(id).get();
      if (snap.exists) existing = { id: snap.id, ...snap.data() };
    } else {
      existing = await fetchFirestoreDocRest('vaccine_packages', id, authCheck.token);
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vaccine package not found.' }, { status: 404 });
    }

    const totalDoses = body.totalDoses !== undefined ? parseInt(body.totalDoses, 10) : existing.totalDoses;
    const pricePerDose = body.pricePerDose !== undefined ? parseFloat(body.pricePerDose) : existing.pricePerDose;
    const calculatedPackagePrice = Math.round(totalDoses * pricePerDose * 100) / 100;

    const updatedData = {
      ...existing,
      name: body.name ? body.name.trim() : existing.name,
      vaccineName: body.vaccineName ? body.vaccineName.trim() : existing.vaccineName,
      species: body.species || existing.species,
      description: body.description !== undefined ? body.description.trim() : existing.description,
      totalDoses,
      pricePerDose,
      packagePrice: calculatedPackagePrice,
      intervalDays: body.intervalDays !== undefined ? parseInt(body.intervalDays, 10) : existing.intervalDays,
      status: body.status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('vaccine_packages').doc(id).set(updatedData, { merge: true });
    } else {
      await setFirestoreDocRest('vaccine_packages', id, updatedData, authCheck.token);
    }

    return NextResponse.json({
      success: true,
      message: 'Vaccine package updated successfully.',
      package: updatedData,
    });
  } catch (error: any) {
    console.error('[Vaccine Package PATCH Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update package.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clinic/vaccine-packages/[id]
 * Deactivates vaccine package (soft delete to preserve audit history)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authCheck = await isRequestAuthorizedForClinicStaff(request);
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const patchPayload = { status: 'Inactive', updatedAt: new Date().toISOString() };
    if (hasServiceAccount() && adminDb) {
      await adminDb.collection('vaccine_packages').doc(id).set(patchPayload, { merge: true });
    } else {
      await setFirestoreDocRest('vaccine_packages', id, patchPayload, authCheck.token);
    }

    return NextResponse.json({
      success: true,
      message: 'Vaccine package deactivated.',
    });
  } catch (error: any) {
    console.error('[Vaccine Package DELETE Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to deactivate package.' },
      { status: 500 }
    );
  }
}

