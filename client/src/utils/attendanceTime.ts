/**
 * Utility functions for attendance date and time validation in Uzbekistan (Asia/Tashkent, UTC+5).
 */

export const UZBEKISTAN_TIMEZONE = 'Asia/Tashkent';

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Tashkent timezone.
 */
export const getTashkentDateString = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: UZBEKISTAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Returns the current time formatted as HH:mm in Asia/Tashkent timezone (24-hour).
 */
export const getTashkentTimeString = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: UZBEKISTAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
};

/**
 * Returns total minutes since midnight (0 - 1439) in Asia/Tashkent timezone.
 */
export const getTashkentTimeMinutes = (d: Date = new Date()): number => {
  const timeStr = getTashkentTimeString(d);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Formats total minutes (e.g. 630) to HH:mm string (e.g. "10:30").
 */
export const formatMinutesToTimeString = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Extracts start time from group.startTime (e.g. "10:00") or group.name (e.g. "Frontend 10:00 Dush-Chor-Juma").
 */
export const extractGroupStartTime = (
  group?: { startTime?: string; name?: string } | null
): string | null => {
  if (!group) return null;
  if (group.startTime && /^\d{1,2}:\d{2}/.test(group.startTime)) {
    const [h, m] = group.startTime.slice(0, 5).split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  if (group.name) {
    const match = group.name.match(/\b(\d{1,2}:\d{2})\b/);
    if (match) {
      const [h, m] = match[1].split(':');
      return `${h.padStart(2, '0')}:${m}`;
    }
  }
  return null;
};

export interface AttendanceEligibility {
  canTakeAttendance: boolean;
  status: 'ALLOWED' | 'PAST_DATE' | 'FUTURE_DATE' | 'TIME_EXPIRED' | 'TOO_EARLY';
  message: string;
  startTime?: string;
  deadlineTime?: string;
  currentTashkentTime?: string;
}

/**
 * Checks whether initial attendance can be taken for a specific group and date.
 * Rule:
 * 1. Must be today (Asia/Tashkent). Past dates cannot take attendance ("bir kun oldingilarga saqlay olmasligi kerak").
 * 2. If group has a start time (e.g. 10:00), deadline is startTime + 30 minutes (e.g. 10:30).
 *    Attendance can be taken between (startTime - 15m) and (startTime + 30m).
 */
export const checkAttendanceTimeEligibility = (
  attendanceDate: string,
  group?: { startTime?: string; name?: string } | null
): AttendanceEligibility => {
  const todayTashkent = getTashkentDateString();
  const cleanDate = (attendanceDate || '').split('T')[0];
  const currentTashkentTime = getTashkentTimeString();

  // 1. Date checks
  if (cleanDate < todayTashkent) {
    return {
      canTakeAttendance: false,
      status: 'PAST_DATE',
      message:
        "O'tgan sana uchun yangi davomat saqlash taqiqlangan! Qoidaga ko'ra, davomat faqat dars kunida olinishi shart.",
      currentTashkentTime,
    };
  }

  if (cleanDate > todayTashkent) {
    return {
      canTakeAttendance: false,
      status: 'FUTURE_DATE',
      message: "Kelgusi sana uchun oldindan davomat saqlab bo'lmaydi!",
      currentTashkentTime,
    };
  }

  // 2. Time checks for today
  const startTime = extractGroupStartTime(group);
  if (!startTime) {
    // If no start time is specified on group, allow taking attendance today
    return {
      canTakeAttendance: true,
      status: 'ALLOWED',
      message: "Bugungi sana uchun davomat olishingiz mumkin.",
      currentTashkentTime,
    };
  }

  const [h, m] = startTime.split(':').map(Number);
  const startMinutes = h * 60 + m;
  const deadlineMinutes = startMinutes + 30; // 30 minutes after lesson start
  const deadlineTime = formatMinutesToTimeString(deadlineMinutes);
  const currentMinutes = getTashkentTimeMinutes();

  // Allow taking attendance starting 15 minutes before the lesson begins
  if (currentMinutes < startMinutes - 15) {
    return {
      canTakeAttendance: false,
      status: 'TOO_EARLY',
      message: `Dars hali boshlanmagan. Guruh darsi soat ${startTime} da boshlanadi. Davomatni soat ${startTime} dan ${deadlineTime} gacha olishingiz mumkin.`,
      startTime,
      deadlineTime,
      currentTashkentTime,
    };
  }

  // If past deadline (startTime + 30m)
  if (currentMinutes > deadlineMinutes) {
    return {
      canTakeAttendance: false,
      status: 'TIME_EXPIRED',
      message: `Davomat olish vaqti tugagan! Guruh darsi soat ${startTime} da boshlangan. Qoidaga ko'ra, davomat dars boshlanganidan so'ng 30 daqiqa ichida (${deadlineTime} gacha) olinishi shart edi.`,
      startTime,
      deadlineTime,
      currentTashkentTime,
    };
  }

  return {
    canTakeAttendance: true,
    status: 'ALLOWED',
    message: `Davomat olish vaqti: Soat ${deadlineTime} gacha davomatni saqlashingiz kerak.`,
    startTime,
    deadlineTime,
    currentTashkentTime,
  };
};
