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
      dbInstance = config.firestoreDatabaseId
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
      return dbInstance;
    }
  } catch (err) {
    console.warn('Could not initialize Firebase Firestore SDK:', err);
  }
  return null;
}

export async function fetchAppStateFromFirestore(): Promise<any | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'app_state', 'main_data'));
    if (snap.exists()) {
      return snap.data();
    }
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
    await setDoc(doc(db, 'app_state', 'main_data'), sanitized, { merge: true });
    return true;
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
    await setDoc(doc(db, 'users', docId), sanitized, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore saveUser error:', err);
    return false;
  }
}
