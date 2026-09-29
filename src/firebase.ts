import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel, Firestore, doc, getDoc } from 'firebase/firestore';
import baseFirebaseConfig from '../firebase-applet-config.json';

// Silence internal gRPC stream disconnection logs
try {
  setLogLevel('silent');
} catch {
  // Ignore if already configured
}

// Compute effective configuration allowing environment variable overrides
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string>);

export const effectiveFirebaseConfig = {
  projectId: baseFirebaseConfig.projectId || 'itissimple-8663d',
  appId: baseFirebaseConfig.appId,
  apiKey: baseFirebaseConfig.apiKey,
  authDomain: baseFirebaseConfig.authDomain,
  firestoreDatabaseId: (baseFirebaseConfig as any).firestoreDatabaseId || 'ai-studio-itissimple-e32d4304-3e35-441e-a910-7af9cbdeb03e',
  storageBucket: baseFirebaseConfig.storageBucket,
  messagingSenderId: baseFirebaseConfig.messagingSenderId,
  measurementId: baseFirebaseConfig.measurementId,
  oAuthClientId: (baseFirebaseConfig as any).oauthClientId || (baseFirebaseConfig as any).oAuthClientId,
  recaptchaSiteKey: baseFirebaseConfig.recaptchaSiteKey,
};

// Initialize or reuse Firebase App instance
export const app = getApps().length === 0 ? initializeApp(effectiveFirebaseConfig) : getApp();

// Firebase Authentication instance
export const auth = getAuth(app);

// Google Auth Provider configured for popups with multi-account isolation and required Workspace scopes
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.send');
// Note: Google Drive session notes are synchronized via backend platform credentials mapped to the teacher's email,
// avoiding client-side OAuth prompts for drive.file and bypassing 'App not verified' warnings.

// Lazy-initialized Firestore instance to avoid starting unused background gRPC streams
let _firestoreDb: Firestore | null = null;
export function getDb(): Firestore {
  if (!_firestoreDb) {
    _firestoreDb = effectiveFirebaseConfig.firestoreDatabaseId
      ? getFirestore(app, effectiveFirebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
  return _firestoreDb;
}

export const db = {
  get current() {
    return getDb();
  },
};

export async function testConnection(): Promise<boolean> {
  try {
    const firestore = getDb();
    const testDoc = doc(firestore, '_connection_test', 'ping');
    await getDoc(testDoc);
    return true;
  } catch (error) {
    try {
      const firestore = getDb();
      const fallbackDoc = doc(firestore, 'test', 'ping');
      await getDoc(fallbackDoc);
      return true;
    } catch {
      console.warn('Firestore connection test notice:', error);
      return false;
    }
  }
}

export default app;
