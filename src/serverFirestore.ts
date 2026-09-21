import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

try {
  setLogLevel('silent');
} catch {}

let dbInstance: any = null;

export function getFirestoreDb() {
  if (dbInstance) return dbInstance;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      dbInstance = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
      return dbInstance;
    }
  } catch (err) {
    console.warn('Could not initialize Firebase Firestore SDK:', err);
  }
  return null;
}

// Timeout helper so remote Firestore never blocks an Express API response
function withTimeout<T>(promise: Promise<T>, ms: number = 2000): Promise<T | null> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

export async function fetchAppStateFromFirestore(): Promise<any | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const fetchPromise = getDoc(doc(db, 'app_state', 'main_data')).then((snap) => {
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    });
    return await withTimeout(fetchPromise, 2500);
  } catch (err) {
    console.warn('Firestore fetchAppState error:', err);
  }
  return null;
}

export async function saveAppStateToFirestore(data: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  try {
    // Sanitize data: JSON roundtrip eliminates any undefined properties that cause Firestore setDoc to fail
    const sanitized = JSON.parse(JSON.stringify(data));
    const savePromise = setDoc(doc(db, 'app_state', 'main_data'), sanitized).then(() => true);
    const result = await withTimeout(savePromise, 2000);
    return !!result;
  } catch (err) {
    console.warn('Firestore saveAppState error:', err);
    return false;
  }
}

export async function saveUserToFirestore(user: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !user?.email) return false;
  try {
    const sanitized = JSON.parse(JSON.stringify(user));
    const docId = user.uid || user.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
    const savePromise = setDoc(doc(db, 'users', docId), sanitized, { merge: true }).then(() => true);
    const result = await withTimeout(savePromise, 2000);
    return !!result;
  } catch (err) {
    console.warn('Firestore saveUser error:', err);
    return false;
  }
}

export async function fetchUserFromFirestore(email: string, uid?: string): Promise<any | null> {
  const db = getFirestoreDb();
  if (!db || (!email && !uid)) return null;
  try {
    const cleanDocId = email ? email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-') : '';
    const fetchPromise = (async () => {
      if (uid) {
        const snapUid = await getDoc(doc(db, 'users', uid));
        if (snapUid.exists()) return snapUid.data();
      }
      if (cleanDocId) {
        const snapEmail = await getDoc(doc(db, 'users', cleanDocId));
        if (snapEmail.exists()) return snapEmail.data();
      }
      return null;
    })();
    return await withTimeout(fetchPromise, 1500);
  } catch (err) {
    console.warn('Firestore fetchUser error:', err);
    return null;
  }
}

export async function checkUserExistsInFirestore(email: string): Promise<boolean> {
  if (!email) return false;
  const user = await fetchUserFromFirestore(email);
  return Boolean(user);
}

/**
 * Dedicated persistence for Student Media Assignments (YouTube & Spotify) directly linked to UID.
 * Guarantees that even across reloads, disconnects, or new logins, the assigned content is retained in Firestore.
 */
export async function saveStudentAssignmentsByUid(
  uid: string,
  data: {
    uid?: string;
    email?: string;
    level?: string;
    weeklyCycle?: number;
    weeklyStudyDaysTarget?: number;
    weeklyStudyDays?: string[];
    videoAssignments?: any[];
    spotifyAssignments?: any[];
    routines?: any;
    watchedVideos?: string[];
    listenedTracks?: string[];
    updatedAt?: string;
  }
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !uid) return false;
  try {
    const sanitized = JSON.parse(JSON.stringify({
      ...data,
      uid,
      updatedAt: data.updatedAt || new Date().toISOString(),
    }));
    const savePromise = setDoc(doc(db, 'student_assignments', uid), sanitized, { merge: true }).then(() => true);
    const result = await withTimeout(savePromise, 2000);
    return !!result;
  } catch (err) {
    console.warn('Firestore saveStudentAssignmentsByUid error:', err);
    return false;
  }
}

export async function fetchStudentAssignmentsByUid(uid: string): Promise<any | null> {
  const db = getFirestoreDb();
  if (!db || !uid) return null;
  try {
    const fetchPromise = getDoc(doc(db, 'student_assignments', uid)).then((snap) => {
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    });
    return await withTimeout(fetchPromise, 2000);
  } catch (err) {
    console.warn('Firestore fetchStudentAssignmentsByUid error:', err);
    return null;
  }
}

/**
 * Dedicated persistence for Teacher Availability Schedule directly linked to UID and Email.
 * Stores granular 30-min slots partitioned by day of week.
 */
export async function saveTeacherAvailabilityToFirestore(
  uidOrEmail: string,
  data: {
    uid?: string;
    teacherEmail?: string;
    meetLink?: string;
    timezone?: string;
    availableDays?: string[];
    availableHours?: string[];
    availableHoursByDay?: Record<string, string[]>;
    availability?: Record<string, string[]>;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    updatedAt?: string;
  }
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !uidOrEmail) return false;
  try {
    const sanitized = JSON.parse(JSON.stringify({
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString(),
    }));

    const cleanDocId = uidOrEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const savePromise = setDoc(doc(db, 'teacher_availability', cleanDocId), sanitized, { merge: true }).then(() => true);

    // If teacher UID is present and different from cleanDocId, also mirror to UID doc
    if (data.uid && data.uid !== cleanDocId) {
      setDoc(doc(db, 'teacher_availability', data.uid), sanitized, { merge: true }).catch(() => {});
    }

    const result = await withTimeout(savePromise, 2000);
    return !!result;
  } catch (err) {
    console.warn('Firestore saveTeacherAvailabilityToFirestore error:', err);
    return false;
  }
}

export async function fetchTeacherAvailabilityFromFirestore(uidOrEmail: string): Promise<any | null> {
  const db = getFirestoreDb();
  if (!db || !uidOrEmail) return null;
  try {
    const cleanDocId = uidOrEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const fetchPromise = getDoc(doc(db, 'teacher_availability', cleanDocId)).then(async (snap) => {
      if (snap.exists()) {
        return snap.data();
      }
      // If not found by cleanDocId and uidOrEmail is different, try directly
      if (uidOrEmail !== cleanDocId) {
        const snapDirect = await getDoc(doc(db, 'teacher_availability', uidOrEmail));
        if (snapDirect.exists()) return snapDirect.data();
      }
      return null;
    });
    return await withTimeout(fetchPromise, 2000);
  } catch (err) {
    console.warn('Firestore fetchTeacherAvailabilityFromFirestore error:', err);
    return null;
  }
}

/**
 * Persists daily routine video selection to users/{uid}/routines/{dayOfWeek}
 */
export async function saveRoutineVideoSubcollection(
  uid: string,
  dayOfWeek: string,
  data: any
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !uid || !dayOfWeek) return false;
  try {
    const sanitized = JSON.parse(JSON.stringify({
      ...data,
      dayOfWeek,
      updatedAt: data.updatedAt || new Date().toISOString(),
    }));
    const savePromise = setDoc(doc(db, 'users', uid, 'routines', dayOfWeek), sanitized, { merge: true }).then(() => true);
    const result = await withTimeout(savePromise, 2000);
    return !!result;
  } catch (err) {
    console.warn('Firestore saveRoutineVideoSubcollection error:', err);
    return false;
  }
}

/**
 * Resets isRepeatVideo: false for all days in users/{uid}/routines/{dayOfWeek}
 */
export async function resetRepeatFlagsSubcollection(
  uid: string,
  days: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !uid) return false;
  try {
    await Promise.all(
      days.map((day) =>
        setDoc(
          doc(db, 'users', uid, 'routines', day),
          { isRepeatVideo: false, updatedAt: new Date().toISOString() },
          { merge: true }
        )
      )
    );
    return true;
  } catch (err) {
    console.warn('Firestore resetRepeatFlagsSubcollection error:', err);
    return false;
  }
}

/**
 * Appends videoId to users/{uid} watchedVideosHistory array
 */
export async function addWatchedVideoToUserDoc(uid: string, videoId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !uid || !videoId) return false;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? (snap.data().watchedVideosHistory || snap.data().watchedVideos || []) : [];
    const list = Array.isArray(existing) ? existing : [];
    if (!list.includes(videoId)) {
      list.push(videoId);
      await setDoc(userRef, { watchedVideosHistory: list, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Firestore addWatchedVideoToUserDoc error:', err);
    return false;
  }
}


