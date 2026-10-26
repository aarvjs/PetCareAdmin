export interface BreakPeriod {
  name: string;
  startTime: string; // "HH:MM" in 24hr format
  endTime: string;
}

export interface DaySchedule {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isEnabled: boolean;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  slotDurationMinutes: number; // default 30
  breaks: BreakPeriod[];
}

export const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
  {
    dayOfWeek: 'Monday',
    isEnabled: true,
    startTime: '10:00',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breaks: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
  },
  {
    dayOfWeek: 'Tuesday',
    isEnabled: true,
    startTime: '10:00',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breaks: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
  },
  {
    dayOfWeek: 'Wednesday',
    isEnabled: true,
    startTime: '10:00',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breaks: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
  },
  {
    dayOfWeek: 'Thursday',
    isEnabled: true,
    startTime: '10:00',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breaks: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
  },
  {
    dayOfWeek: 'Friday',
    isEnabled: true,
    startTime: '10:00',
    endTime: '20:00',
    slotDurationMinutes: 30,
    breaks: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
  },
  {
    dayOfWeek: 'Saturday',
    isEnabled: true,
    startTime: '10:00',
    endTime: '19:00',
    slotDurationMinutes: 30,
    breaks: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
  },
  {
    dayOfWeek: 'Sunday',
    isEnabled: false,
    startTime: '10:00',
    endTime: '14:00',
    slotDurationMinutes: 30,
    breaks: [],
  },
];

export function timeToMinutes(t: string): number {
  if (!t) return 0;
  let clean = t.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  clean = clean.replace(/[AP]M/, '').trim();
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

export function minutesToTimeString(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mStr = m.toString().padStart(2, '0');
  return `${h12.toString().padStart(2, '0')}:${mStr} ${period}`;
}

export function generateSlotsForDay(
  dayConfig: DaySchedule,
  existingAppointments: Array<{ time?: string; appointmentTime?: string }>,
  targetDateStr?: string
): string[] {
  if (!dayConfig || !dayConfig.isEnabled) return [];

  const startMin = timeToMinutes(dayConfig.startTime);
  const endMin = timeToMinutes(dayConfig.endTime);
  const duration = Math.max(10, dayConfig.slotDurationMinutes || 30);

  if (startMin >= endMin) return [];

  // Parse breaks into minute intervals
  const breakIntervals = (dayConfig.breaks || []).map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  // Parse existing appointment times normalized
  const bookedMinutes = new Set<number>();
  existingAppointments.forEach((a) => {
    const rawTime = a.appointmentTime || a.time || '';
    if (rawTime) {
      bookedMinutes.add(timeToMinutes(rawTime));
    }
  });

  // Calculate current minutes if target date is today
  let currentMinutesToday = -1;
  if (targetDateStr) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (targetDateStr === todayStr) {
      const now = new Date();
      currentMinutesToday = now.getHours() * 60 + now.getMinutes();
    }
  }

  const slots: string[] = [];
  for (let current = startMin; current + duration <= endMin; current += duration) {
    // 1. Check if overlaps with any break
    const isInBreak = breakIntervals.some(
      (b) => current < b.end && current + duration > b.start
    );
    if (isInBreak) continue;

    // 2. Check if already booked
    if (bookedMinutes.has(current)) continue;

    // 3. If today, skip times that have already passed (with 15 min buffer)
    if (currentMinutesToday >= 0 && current <= currentMinutesToday + 15) continue;

    slots.push(minutesToTimeString(current));
  }

  return slots;
}
