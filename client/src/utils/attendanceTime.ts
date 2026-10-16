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
/**
 * Extracts start time from group.startTime (e.g. "13:00") or group.name (e.g. "Frontend 13:00 Dush-Chor-Juma" or "13:00 - 14:30").
 */
export const extractGroupStartTime = (
  group?: { startTime?: string; endTime?: string; name?: string } | null
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

/**
 * Extracts end time from group.endTime (e.g. "14:30") or group.name (e.g. "13:00 - 14:30"),
 * or computes fallback (startTime + 90 minutes).
 */
export const extractGroupEndTime = (
  group?: { startTime?: string; endTime?: string; name?: string } | null,
  fallbackStartMinutes?: number
): string | null => {
  if (!group) return null;
  if (group.endTime && /^\d{1,2}:\d{2}/.test(group.endTime)) {
    const [h, m] = group.endTime.slice(0, 5).split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  if (group.name) {
    // Match "13:00 - 14:30" or "13:00-14:30"
    const rangeMatch = group.name.match(/\b\d{1,2}:\d{2}\s*[-–—]\s*(\d{1,2}:\d{2})\b/);
    if (rangeMatch) {
      const [h, m] = rangeMatch[1].split(':');
      return `${h.padStart(2, '0')}:${m}`;
    }
  }
  if (fallbackStartMinutes !== undefined) {
    return formatMinutesToTimeString(fallbackStartMinutes + 90);
  }
  return null;
};

export interface AttendanceEligibility {
  canTakeAttendance: boolean;
  status: 'ALLOWED' | 'PAST_DATE' | 'FUTURE_DATE' | 'TIME_EXPIRED' | 'TOO_EARLY';
  message: string;
  startTime?: string;
  endTime?: string;
  deadlineTime?: string;
  currentTashkentTime?: string;
}

/**
 * Checks whether attendance can be taken for a specific group and date.
 * Rule (O'quv markazlari uchun dars vaqti talabi):
 * 1. Must be today (Asia/Tashkent). Past or future dates cannot take attendance.
 * 2. Dars nechchidan nechchigacha qo'yilgan bo'lsa (masalan 13:00 dan 14:30 gacha),
 *    davomat ayni o'sha dars vaqti oralig'ida olinishi shart!
 *    Darsdan oldin: "Dars hali boshlanmagan (13:00 dan 14:30 gacha)"
 *    Darsdan keyin: "Davomat olish vaqti tugagan (dars 13:00 - 14:30 edi)"
 */
export const checkAttendanceTimeEligibility = (
  attendanceDate: string,
  group?: { startTime?: string; endTime?: string; name?: string } | null
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
        "O'tgan sana uchun yangi davomat saqlash taqiqlangan! Qoidaga ko'ra, davomat faqat bugungi dars kunida olinishi shart.",
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

  const [hStart, mStart] = startTime.split(':').map(Number);
  const startMinutes = hStart * 60 + mStart;

  // Extract or compute end time (e.g. 14:30)
  const rawEndTime = extractGroupEndTime(group, startMinutes);
  let endMinutes = startMinutes + 90; // default 1.5 hours
  let endTime = rawEndTime || formatMinutesToTimeString(endMinutes);

  if (rawEndTime) {
    const [hEnd, mEnd] = rawEndTime.split(':').map(Number);
    const parsedEnd = hEnd * 60 + mEnd;
    if (parsedEnd > startMinutes) {
      endMinutes = parsedEnd;
      endTime = rawEndTime;
    }
  }

  const currentMinutes = getTashkentTimeMinutes();

  // Allow taking attendance starting 5 minutes before lesson starts
  const startToleranceMinutes = startMinutes - 5;

  if (currentMinutes < startToleranceMinutes) {
    return {
      canTakeAttendance: false,
      status: 'TOO_EARLY',
      message: `Dars hali boshlanmagan. Guruh darsi soat ${startTime} dan ${endTime} gacha bo'ladi. Davomatni faqat dars vaqtida (${startTime} - ${endTime}) olishingiz mumkin.`,
      startTime,
      endTime,
      deadlineTime: endTime,
      currentTashkentTime,
    };
  }

  // If past lesson end time
  if (currentMinutes > endMinutes) {
    return {
      canTakeAttendance: false,
      status: 'TIME_EXPIRED',
      message: `Davomat olish vaqti tugagan! Guruh darsi soat ${startTime} dan ${endTime} gacha bo'lgan. Qoidaga ko'ra, davomat faqat dars vaqti oralig'ida (${startTime} - ${endTime}) olinishi shart.`,
      startTime,
      endTime,
      deadlineTime: endTime,
      currentTashkentTime,
    };
  }

  return {
    canTakeAttendance: true,
    status: 'ALLOWED',
    message: `Davomat olish vaqti faol: Dars tugashiga (${endTime}) qadar davomatni saqlashingiz mumkin.`,
    startTime,
    endTime,
    deadlineTime: endTime,
    currentTashkentTime,
  };
};
