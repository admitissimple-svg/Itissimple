import { DayOfWeek, RoutineItem } from '../types';
import { resetRepeatFlagsInFirestore } from '../hooks/useRoutine';

export interface StartNewWeekParams {
  studentEmail: string;
  studentUid: string;
  weeklyStudyDaysTarget?: number;
  weeklyStudyDays?: DayOfWeek[];
  currentCycle?: number;
}

export interface StartNewWeekResult {
  success: boolean;
  weeklyCycle: number;
  weeklyStudyDaysTarget: number;
  weeklyStudyDays: DayOfWeek[];
  routines: Record<DayOfWeek, RoutineItem[]>;
  message: string;
}

const ALL_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Executes the complete "Start New Week" lifecycle:
 * 1. Resets isRepeatVideo: false across all days in Firestore (users/{studentUID}/routines/{dayOfWeek})
 * 2. Clears the "Repeat Previous Video" button state for all days
 * 3. Advances weeklyCycle and archives consumed history
 * 4. Resets activity completion and video attachments for a fresh start
 */
export async function executeStartNewWeek(
  params: StartNewWeekParams
): Promise<StartNewWeekResult | null> {
  const { studentEmail, studentUid, weeklyStudyDaysTarget, weeklyStudyDays } = params;
  const targetDays = weeklyStudyDaysTarget || 7;
  const chosenDays = weeklyStudyDays && weeklyStudyDays.length > 0 ? weeklyStudyDays : ALL_DAYS;

  // 1. Force reset isRepeatVideo: false in Firestore for all days
  if (studentUid || studentEmail) {
    const idToUse = studentUid || studentEmail;
    try {
      await resetRepeatFlagsInFirestore(idToUse, ALL_DAYS);
    } catch (err) {
      console.warn('Notice resetting repeat video flags in Firestore:', err);
    }
  }

  // 2. Call backend reset endpoint
  try {
    const res = await fetch('/api/student-routines/start-new-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail,
        uid: studentUid,
        studentUid,
        weeklyStudyDaysTarget: targetDays,
        weeklyStudyDays: chosenDays,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    const rawRoutines = data.routines || {};

    // 3. Guarantee that every routine item returned has isRepeatVideo: false and no leftover repeat metadata
    const sanitizedRoutines: Record<DayOfWeek, RoutineItem[]> = {} as any;
    ALL_DAYS.forEach((day) => {
      const dayList = rawRoutines[day] || [];
      sanitizedRoutines[day] = dayList.map((act: any) => ({
        ...act,
        completed: false,
        completedToday: false,
        isRepeatVideo: false,
        repeatVideo: false,
      }));
    });

    return {
      success: true,
      weeklyCycle: data.weeklyCycle !== undefined ? data.weeklyCycle : (params.currentCycle || 1) + 1,
      weeklyStudyDaysTarget: data.weeklyStudyDaysTarget || targetDays,
      weeklyStudyDays: data.weeklyStudyDays || chosenDays,
      routines: sanitizedRoutines,
      message: data.message || 'New week cycle started successfully with repeat flags reset.',
    };
  } catch (err) {
    console.warn('Error in executeStartNewWeek:', err);
    return null;
  }
}
