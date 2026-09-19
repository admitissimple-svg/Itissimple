import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getDb, auth } from '../firebase';
import { DayOfWeek } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
}

export interface CurrentSpotifyTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  dayOfWeek: DayOfWeek;
  url?: string;
  level?: string;
}

export interface StudentTrackFeedback {
  teacherUid: string;
  teacherName?: string;
  teacherEmail?: string;
  studentUid: string;
  dayOfWeek: DayOfWeek;
  trackId: string;
  comment: string;
  recommendation?: string;
  createdAt: string;
}

export interface StudentCurrentRoutineDoc {
  studentUid: string;
  studentEmail?: string;
  nativeFriendUid?: string;
  nativeFriendEmail?: string;
  weekId: string;
  currentSpotifyTrack?: CurrentSpotifyTrack | null;
  teacherFeedback?: Record<string, StudentTrackFeedback>;
  updatedAt?: string;
}

// In-memory debounce cache to prevent unnecessary writes if the track hasn't changed
const lastSyncedSignatureMap = new Map<string, string>();

/**
 * Normalizes a student ID/email to a safe Firestore document path token.
 */
export function normalizeStudentIdForPath(rawIdOrEmail: string): string {
  if (!rawIdOrEmail) return '';
  return rawIdOrEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Persists the student's Spotify Song of the Day to Firestore:
 * Path: users/{studentUID}/currentRoutine/{weekId}
 * Field: currentSpotifyTrack: { id, title, artist, coverUrl, dayOfWeek }
 */
export async function syncStudentSpotifyTrackToFirestore(
  studentUid: string,
  weekId: string = 'week-1',
  track: CurrentSpotifyTrack | null,
  extra?: {
    studentEmail?: string;
    nativeFriendUid?: string;
    nativeFriendEmail?: string;
  }
): Promise<boolean> {
  const cleanStudentUid = normalizeStudentIdForPath(studentUid);
  if (!cleanStudentUid) return false;
  const safeWeekId = weekId || 'week-1';

  // Build signature to avoid redundant round-trips
  const trackSignature = track
    ? `${cleanStudentUid}:${safeWeekId}:${track.id}:${track.dayOfWeek}:${track.title}`
    : `${cleanStudentUid}:${safeWeekId}:null`;

  if (lastSyncedSignatureMap.get(`${cleanStudentUid}:${safeWeekId}`) === trackSignature) {
    return true; // Already up-to-date
  }

  const path = `users/${cleanStudentUid}/currentRoutine/${safeWeekId}`;

  try {
    const db = getDb();
    const routineDocRef = doc(db, 'users', cleanStudentUid, 'currentRoutine', safeWeekId);

    const payload: Partial<StudentCurrentRoutineDoc> = {
      studentUid: cleanStudentUid,
      weekId: safeWeekId,
      currentSpotifyTrack: track
        ? {
            id: track.id || '',
            title: track.title || '',
            artist: track.artist || '',
            coverUrl: track.coverUrl || '',
            dayOfWeek: track.dayOfWeek,
            ...(track.url ? { url: track.url } : {}),
            ...(track.level ? { level: track.level } : {}),
          }
        : null,
      updatedAt: new Date().toISOString(),
      ...(extra?.studentEmail ? { studentEmail: extra.studentEmail } : {}),
      ...(extra?.nativeFriendUid ? { nativeFriendUid: extra.nativeFriendUid } : {}),
      ...(extra?.nativeFriendEmail ? { nativeFriendEmail: extra.nativeFriendEmail } : {}),
    };

    await setDoc(routineDocRef, payload, { merge: true });
    lastSyncedSignatureMap.set(`${cleanStudentUid}:${safeWeekId}`, trackSignature);

    // Also notify server backend mirror for fallback/REST synchronization
    fetch('/api/routines/current-routine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Subscribes to the student's current weekly routine in real time using onSnapshot.
 * Listens to: users/{studentUID}/currentRoutine/{weekId}
 * Returns an unsubscribe callback.
 */
export function subscribeStudentCurrentRoutine(
  studentUid: string,
  weekId: string = 'week-1',
  onUpdate: (data: StudentCurrentRoutineDoc | null) => void
): () => void {
  const cleanStudentUid = normalizeStudentIdForPath(studentUid);
  if (!cleanStudentUid) {
    onUpdate(null);
    return () => {};
  }
  const safeWeekId = weekId || 'week-1';
  const path = `users/${cleanStudentUid}/currentRoutine/${safeWeekId}`;

  try {
    const db = getDb();
    const routineDocRef = doc(db, 'users', cleanStudentUid, 'currentRoutine', safeWeekId);

    const unsubscribe = onSnapshot(
      routineDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as StudentCurrentRoutineDoc);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        onUpdate(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

/**
 * Saves a comment or recommendation from the Native Friend / Teacher
 * strictly linked to the student and the song/day they listened to.
 */
export async function saveNativeFriendTrackFeedback(
  studentUid: string,
  weekId: string = 'week-1',
  feedback: {
    teacherUid: string;
    teacherName?: string;
    teacherEmail?: string;
    dayOfWeek: DayOfWeek;
    trackId: string;
    comment: string;
    recommendation?: string;
  }
): Promise<boolean> {
  const cleanStudentUid = normalizeStudentIdForPath(studentUid);
  if (!cleanStudentUid) return false;
  const safeWeekId = weekId || 'week-1';
  const path = `users/${cleanStudentUid}/currentRoutine/${safeWeekId}`;

  try {
    const db = getDb();
    const routineDocRef = doc(db, 'users', cleanStudentUid, 'currentRoutine', safeWeekId);

    const feedbackEntry: StudentTrackFeedback = {
      ...feedback,
      studentUid: cleanStudentUid,
      createdAt: new Date().toISOString(),
    };

    const payload = {
      updatedAt: new Date().toISOString(),
      nativeFriendUid: feedback.teacherUid,
      ...(feedback.teacherEmail ? { nativeFriendEmail: feedback.teacherEmail } : {}),
      teacherFeedback: {
        [feedback.dayOfWeek]: feedbackEntry,
      },
    };

    await setDoc(routineDocRef, payload, { merge: true });

    // Also mirror to server backend
    fetch('/api/routines/current-routine/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentUid: cleanStudentUid,
        weekId: safeWeekId,
        feedback: feedbackEntry,
      }),
    }).catch(() => {});

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}
