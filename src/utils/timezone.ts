export const DEFAULT_STUDENT_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_TEACHER_TIMEZONE = 'America/Toronto';

export function formatDateInTimeZone(
  isoDateString: string,
  timeZone: string = DEFAULT_STUDENT_TIMEZONE,
  lang: 'pt' | 'en' = 'pt'
): string {
  try {
    const d = new Date(isoDateString);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return new Date(isoDateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }
}

export function formatTimeInTimeZone(
  isoDateString: string,
  timeZone: string = DEFAULT_STUDENT_TIMEZONE
): string {
  try {
    const d = new Date(isoDateString);
    return d.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date(isoDateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}

export function formatTimeSlot12h(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const min = parts[1];
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${min} ${ampm}`;
}

export function getDayKeyInTimeZone(
  isoDateString: string,
  timeZone: string = DEFAULT_STUDENT_TIMEZONE
): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' {
  try {
    const d = new Date(isoDateString);
    const dayStr = d.toLocaleDateString('en-US', { timeZone, weekday: 'short' }).toLowerCase();
    if (dayStr.startsWith('mon')) return 'mon';
    if (dayStr.startsWith('tue')) return 'tue';
    if (dayStr.startsWith('wed')) return 'wed';
    if (dayStr.startsWith('thu')) return 'thu';
    if (dayStr.startsWith('fri')) return 'fri';
    if (dayStr.startsWith('sat')) return 'sat';
    if (dayStr.startsWith('sun')) return 'sun';
    return 'mon';
  } catch {
    const day = new Date(isoDateString).getDay();
    const map: Record<number, 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = {
      0: 'sun',
      1: 'mon',
      2: 'tue',
      3: 'wed',
      4: 'thu',
      5: 'fri',
      6: 'sat',
    };
    return map[day] || 'mon';
  }
}

export function getTimezoneDisplayLabel(
  timeZone: string = DEFAULT_STUDENT_TIMEZONE,
  lang: 'pt' | 'en' = 'pt'
): string {
  if (timeZone.includes('Toronto') || timeZone.includes('New_York') || timeZone.includes('Eastern')) {
    return lang === 'en' ? 'Eastern Time (Toronto/NY)' : 'Horário do Leste (Toronto/NY)';
  }
  if (timeZone.includes('Sao_Paulo') || timeZone.includes('Brazil')) {
    return lang === 'en' ? 'Brasília Time (GMT-3)' : 'Horário de Brasília (GMT-3)';
  }
  if (timeZone.includes('London')) return 'London (GMT+0/+1)';
  if (timeZone.includes('Lisbon')) return 'Lisboa / Portugal';
  if (timeZone.includes('Los_Angeles')) return 'Pacific Time (LA)';
  if (timeZone.includes('Chicago')) return 'Central Time (Chicago)';
  return timeZone.replace('_', ' ');
}

export function getShortTzBadge(timeZone: string): string {
  if (timeZone.includes('Toronto') || timeZone.includes('New_York') || timeZone.includes('Eastern')) return 'ET (GMT-4)';
  if (timeZone.includes('Sao_Paulo') || timeZone.includes('Belem') || timeZone.includes('Brazil')) return 'BRT (GMT-3)';
  if (timeZone.includes('London')) return 'GMT';
  if (timeZone.includes('Lisbon')) return 'WET';
  if (timeZone.includes('Los_Angeles')) return 'PT (GMT-7)';
  return 'GMT';
}


export const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'Brasília (BRT)', offset: 'GMT-3' },
  { value: 'America/Toronto', label: 'Toronto / New York (ET)', offset: 'GMT-4' },
  { value: 'America/Chicago', label: 'Chicago (CT)', offset: 'GMT-5' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)', offset: 'GMT-7' },
  { value: 'Europe/London', label: 'London (GMT)', offset: 'GMT+0' },
  { value: 'Europe/Lisbon', label: 'Lisbon (WET)', offset: 'GMT+0' },
  { value: 'Europe/Madrid', label: 'Madrid / Paris (CET)', offset: 'GMT+1' },
];

export function generate30MinTimeSlots(startHour: string = '07:00', endHour: string = '22:00'): string[] {
  const slots: string[] = [];
  const [sH, sM] = startHour.split(':').map(Number);
  const [eH, eM] = endHour.split(':').map(Number);

  let currentMin = sH * 60 + (sM || 0);
  const endMin = eH * 60 + (eM || 0);

  while (currentMin < endMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(formatted);
    currentMin += 30;
  }

  return slots;
}

// Fixed 30-minute slots from 06:00 to 22:30 for Native Friends availability
export const FIXED_30MIN_AVAILABILITY_SLOTS: string[] = generate30MinTimeSlots('06:00', '23:00');

// Default popular teacher availability hours (08:00 to 18:00)
export const DEFAULT_TEACHER_AVAILABILITY_HOURS: string[] = generate30MinTimeSlots('08:00', '18:00');

/**
 * Checks if two time intervals overlap: [startA, endA) and [startB, endB)
 */
export function checkTimeRangesOverlap(
  startA: string | number | Date,
  endA: string | number | Date,
  startB: string | number | Date,
  endB: string | number | Date
): boolean {
  const sA = startA instanceof Date ? startA.getTime() : new Date(startA).getTime();
  const eA = endA instanceof Date ? endA.getTime() : new Date(endA).getTime();
  const sB = startB instanceof Date ? startB.getTime() : new Date(startB).getTime();
  const eB = endB instanceof Date ? endB.getTime() : new Date(endB).getTime();

  if (isNaN(sA) || isNaN(eA) || isNaN(sB) || isNaN(eB)) return false;
  return sA < eB && eA > sB;
}

/**
 * Finds if there is an existing scheduled lesson conflicting with the proposed time range for a teacher
 */
export function findTeacherLessonConflict<T extends {
  id?: string;
  teacherEmail?: string;
  tutorEmail?: string;
  status?: string;
  startDateTime?: string;
  endDateTime?: string;
  [key: string]: any;
}>(
  teacherEmail: string,
  proposedStartIso: string,
  proposedEndIso: string,
  lessons: T[],
  excludeLessonId?: string
): T | null {
  if (!teacherEmail || !proposedStartIso || !proposedEndIso || !Array.isArray(lessons)) {
    return null;
  }

  const cleanTeacher = teacherEmail.toLowerCase().trim();
  const pStart = new Date(proposedStartIso).getTime();
  const pEnd = new Date(proposedEndIso).getTime();

  if (isNaN(pStart) || isNaN(pEnd) || pStart >= pEnd) return null;

  for (const l of lessons) {
    if (excludeLessonId && l.id === excludeLessonId) continue;
    // Cancelled lessons do not occupy slots
    if (l.status === 'cancelled') continue;

    const lTeacher = (l.teacherEmail || l.tutorEmail || '').toLowerCase().trim();
    if (lTeacher !== cleanTeacher) continue;

    if (!l.startDateTime || !l.endDateTime) continue;
    const lStart = new Date(l.startDateTime).getTime();
    const lEnd = new Date(l.endDateTime).getTime();

    if (isNaN(lStart) || isNaN(lEnd)) continue;

    // Check overlap: lStart < pEnd && lEnd > pStart
    if (lStart < pEnd && lEnd > pStart) {
      return l;
    }
  }

  return null;
}


