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
