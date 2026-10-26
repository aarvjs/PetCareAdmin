import { NextResponse } from 'next/server';
import {
  adminDb,
  hasServiceAccount,
  isRequestAuthorizedForClinicStaff,
  fetchFirestoreDocRest,
  setFirestoreDocRest,
  fetchFirestoreCollectionRest,
} from '@/lib/firebaseAdmin';

export {
  type BreakPeriod,
  type DaySchedule,
  DEFAULT_WEEKLY_SCHEDULE,
  timeToMinutes,
  minutesToTimeString,
  generateSlotsForDay,
} from '@/lib/clinicSchedule';
import {
  type BreakPeriod,
  type DaySchedule,
  DEFAULT_WEEKLY_SCHEDULE,
  timeToMinutes,
  minutesToTimeString,
  generateSlotsForDay,
} from '@/lib/clinicSchedule';

/**
 * GET /api/clinic/schedule
 * Query parameters:
 * - doctorId (optional, if omitted searches by businessId / shopId)
 * - businessId (optional)
 * - shopId (optional)
 * - date (optional: YYYY-MM-DD - returns available slots for this specific date)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const businessId = searchParams.get('businessId');
    const shopId = searchParams.get('shopId');
    const dateStr = searchParams.get('date'); // "YYYY-MM-DD"

    // 1. Locate Doctor
    let doctor: any = null;
    if (doctorId) {
      if (hasServiceAccount() && adminDb) {
        const snap = await adminDb.collection('doctors').doc(doctorId).get();
        if (snap.exists) doctor = { id: snap.id, ...snap.data() };
      }
      if (!doctor) {
        doctor = await fetchFirestoreDocRest('doctors', doctorId);
      }
    }

    // Fallback: If no doctorId, look for first active doctor in business/shop
    if (!doctor && (businessId || shopId)) {
      const allDoctors = await fetchFirestoreCollectionRest('doctors');
      doctor = allDoctors.find((d: any) => {
        const matchShop = shopId && d.shopId === shopId;
        const matchBiz = businessId && d.businessId === businessId;
        return (matchShop || matchBiz) && d.status !== 'inactive';
      });
    }

    if (!doctor) {
      return NextResponse.json({
        success: false,
        error: 'No active doctor found for the specified clinic.',
        availableSlots: [],
      }, { status: 404 });
    }

    // 2. Load Doctor Schedule
    let schedule: any = doctor.schedule || null;
    if (!schedule) {
      const scheduleDoc = await fetchFirestoreDocRest('doctor_schedules', doctor.id);
      if (scheduleDoc) schedule = scheduleDoc;
    }

    const savedDaysMap = new Map<string, any>(
      Array.isArray(schedule?.weeklySchedule)
        ? schedule.weeklySchedule.map((d: any) => [d.dayOfWeek, d])
        : []
    );

    const weeklySchedule: DaySchedule[] = DEFAULT_WEEKLY_SCHEDULE.map((defaultDay) => {
      const saved = savedDaysMap.get(defaultDay.dayOfWeek);
      if (saved) {
        return {
          ...defaultDay,
          ...saved,
          isEnabled: saved.isEnabled !== undefined ? Boolean(saved.isEnabled) : defaultDay.isEnabled,
          startTime: saved.startTime || defaultDay.startTime,
          endTime: saved.endTime || defaultDay.endTime,
          slotDurationMinutes: saved.slotDurationMinutes || defaultDay.slotDurationMinutes,
          breaks: Array.isArray(saved.breaks) ? saved.breaks : defaultDay.breaks,
        };
      }
      return defaultDay;
    });

    const blockedDates: string[] = Array.isArray(schedule?.blockedDates)
      ? schedule.blockedDates
      : [];

    // 3. If a specific date is requested, compute available slots
    let availableSlots: string[] = [];
    let isWorkingDay = false;
    let dayName = '';

    if (dateStr) {
      const targetDate = new Date(`${dateStr}T12:00:00Z`);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
      dayName = days[targetDate.getUTCDay()];

      // Check if date is blocked
      const isDateBlocked = blockedDates.includes(dateStr);

      const dayConfig = weeklySchedule.find((d) => d.dayOfWeek === dayName);
      isWorkingDay = Boolean(dayConfig?.isEnabled && !isDateBlocked);

      if (isWorkingDay && dayConfig) {
        // Fetch existing appointments for doctor on this date
        let existingAppointments: any[] = [];
        const allAppointments = await fetchFirestoreCollectionRest('appointments');
        existingAppointments = allAppointments.filter((a: any) => {
          const matchDoctor = a.doctorId === doctor.id || !a.doctorId;
          const matchDate = a.appointmentDate === dateStr || a.date === dateStr;
          const notCancelled = a.status !== 'Cancelled' && a.status !== 'cancelled' && a.status !== 'Rejected' && a.status !== 'rejected';
          return matchDoctor && matchDate && notCancelled;
        });

        availableSlots = generateSlotsForDay(dayConfig, existingAppointments, dateStr);
      }
    }

    return NextResponse.json({
      success: true,
      doctorId: doctor.id,
      doctorName: doctor.fullName || doctor.name || 'Dr. Veterinary Specialist',
      specialization: doctor.specialization || 'Veterinary Physician & Surgeon',
      qualification: doctor.qualification || 'B.V.Sc & A.H',
      businessId: doctor.businessId || businessId,
      shopId: doctor.shopId || shopId,
      weeklySchedule,
      blockedDates,
      date: dateStr,
      dayOfWeek: dayName,
      isWorkingDay,
      availableSlots,
    });
  } catch (error: any) {
    console.error('[Clinic Schedule GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch doctor schedule.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinic/schedule
 * Saves or updates doctor availability schedule.
 * Enforces authentication & authorization (Only doctor themselves or Clinic Admin).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authCheck = await isRequestAuthorizedForClinicStaff(request, body);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Access Denied: You are not authorized to update doctor schedule.' },
        { status: authCheck.status || 403 }
      );
    }

    const {
      doctorId,
      weeklySchedule,
      blockedDates,
      slotDurationMinutes,
    } = body;

    const targetDocId = doctorId || authCheck.uid;
    if (!targetDocId) {
      return NextResponse.json(
        { success: false, error: 'Doctor ID is required.' },
        { status: 400 }
      );
    }

    // Role check: Only the doctor themselves or Clinic Admin of same business
    if (authCheck.role === 'doctor' && authCheck.uid !== targetDocId) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: Doctors can only modify their own schedule.' },
        { status: 403 }
      );
    }

    // Validate weekly schedule format
    if (!Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid weekly schedule configuration is required.' },
        { status: 400 }
      );
    }

    // Validation: prevent start >= end and invalid break times
    for (const day of weeklySchedule) {
      if (day.isEnabled) {
        const start = timeToMinutes(day.startTime);
        const end = timeToMinutes(day.endTime);
        if (start >= end) {
          return NextResponse.json(
            { success: false, error: `Invalid working hours for ${day.dayOfWeek}: Start time must be before end time.` },
            { status: 400 }
          );
        }

        for (const b of day.breaks || []) {
          const bStart = timeToMinutes(b.startTime);
          const bEnd = timeToMinutes(b.endTime);
          if (bStart >= bEnd) {
            return NextResponse.json(
              { success: false, error: `Invalid break "${b.name}" on ${day.dayOfWeek}: Start time must be before end time.` },
              { status: 400 }
            );
          }
          if (bStart < start || bEnd > end) {
            return NextResponse.json(
              { success: false, error: `Break "${b.name}" on ${day.dayOfWeek} must be within operating hours (${day.startTime} - ${day.endTime}).` },
              { status: 400 }
            );
          }
        }
      }
    }

    const nowIso = new Date().toISOString();
    const scheduleData = {
      doctorId: targetDocId,
      weeklySchedule,
      blockedDates: Array.isArray(blockedDates) ? blockedDates : [],
      slotDurationMinutes: parseInt(slotDurationMinutes || '30', 10),
      businessId: authCheck.businessId,
      shopId: authCheck.shopId,
      updatedByUid: authCheck.uid,
      updatedByName: authCheck.fullName,
      updatedAt: nowIso,
    };

    // 1. Primary write to doctors/{targetDocId}
    await setFirestoreDocRest('doctors', targetDocId, {
      schedule: scheduleData,
      weeklySchedule,
      blockedDates: scheduleData.blockedDates,
      slotDurationMinutes: scheduleData.slotDurationMinutes,
      availability: `Mon - Sat (${weeklySchedule[0]?.startTime || '10:00 AM'} - ${weeklySchedule[0]?.endTime || '08:00 PM'})`,
      updatedAt: nowIso,
    }, authCheck.token);

    // 2. Sync to users/{targetDocId}
    try {
      await setFirestoreDocRest('users', targetDocId, {
        schedule: scheduleData,
        updatedAt: nowIso,
      }, authCheck.token);
    } catch (_) {}

    // 3. Attempt write to doctor_schedules collection
    try {
      await setFirestoreDocRest('doctor_schedules', targetDocId, scheduleData, authCheck.token);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Doctor appointment schedule successfully updated.',
      schedule: scheduleData,
    });
  } catch (error: any) {
    console.error('[Clinic Schedule POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update schedule.' },
      { status: 500 }
    );
  }
}
