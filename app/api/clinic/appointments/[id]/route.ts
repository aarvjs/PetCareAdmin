import { NextResponse } from 'next/server';
import {
  fetchFirestoreDocRest,
  setFirestoreDocRest,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';

/**
 * PATCH /api/clinic/appointments/[id]
 * Updates appointment status (Confirm with slot revalidation, Reject with reason, Reschedule, Complete).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, action, rejectionReason, cancelReason, newDate, newTime } = body;

    let existingApt = await fetchFirestoreDocRest('appointments', id);
    let targetDocId = id;
    if (!existingApt) {
      const allApts = await fetchFirestoreCollectionRest('appointments');
      const found = allApts.find((a) => a.appointmentId === id || a.id === id);
      if (found) {
        existingApt = found;
        targetDocId = found.id;
      }
    }

    if (!existingApt) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found.' },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    const targetAction = action || (status ? status.toLowerCase() : '');

    if (targetAction === 'confirm' || status === 'Confirmed') {
      // Re-validate that slot hasn't been occupied by another confirmed appointment
      const date = existingApt.appointmentDate || existingApt.date;
      const time = existingApt.appointmentTime || existingApt.time;
      const doctorId = existingApt.doctorId;

      const allApts = await fetchFirestoreCollectionRest('appointments');

      const conflict = allApts.find((dData) => {
        if (dData.id === id) return false;
        const sameDate = (dData.appointmentDate || dData.date) === date;
        const sameTime = (dData.appointmentTime || dData.time) === time;
        const sameDoc = !doctorId || !dData.doctorId || dData.doctorId === doctorId;
        const isConfirmed = dData.status === 'Confirmed';
        return sameDate && sameTime && sameDoc && isConfirmed;
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot confirm: Slot ${time} on ${date} was already confirmed for another patient.`,
            conflict: true,
          },
          { status: 409 }
        );
      }

      updates.status = 'Confirmed';
      updates.confirmedAt = new Date().toISOString();
    } else if (targetAction === 'reject' || status === 'Cancelled') {
      updates.status = 'Cancelled';
      updates.rejectionReason = rejectionReason || cancelReason || 'Declined by clinic';
      updates.cancelReason = rejectionReason || cancelReason || 'Declined by clinic';
      updates.cancelledAt = new Date().toISOString();
    } else if (targetAction === 'complete' || status === 'Completed') {
      updates.status = 'Completed';
      updates.completedAt = new Date().toISOString();
    } else if (targetAction === 'reschedule') {
      if (!newDate || !newTime) {
        return NextResponse.json(
          { success: false, error: 'New date and time are required for rescheduling.' },
          { status: 400 }
        );
      }
      updates.appointmentDate = newDate;
      updates.appointmentTime = newTime;
      updates.status = 'Confirmed';
      updates.rescheduledAt = new Date().toISOString();
    } else if (status) {
      updates.status = status;
    }

    const merged = { ...existingApt, ...updates };
    const saved = await setFirestoreDocRest('appointments', targetDocId, merged);

    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Failed to update appointment in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Appointment updated to ${updates.status || 'saved'}.`,
      appointment: { id: targetDocId, ...merged },
    });
  } catch (error: any) {
    console.error('[Clinic Appointment PATCH Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update appointment.' },
      { status: 500 }
    );
  }
}
