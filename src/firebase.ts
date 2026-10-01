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

// Compute effective configuration allowing environment variable overrides while strictly enforcing active project
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string>);

// Active and exclusive project constants for itissimple-8663d
export const ACTIVE_FIREBASE_PROJECT_ID = 'itissimple-8663d';
export const ACTIVE_PROJECT_NUMBER = '245342369537';
export const ACTIVE_FIREBASE_AUTH_DOMAIN = `${ACTIVE_FIREBASE_PROJECT_ID}.firebaseapp.com`;
export const ACTIVE_FIREBASE_STORAGE_BUCKET = `${ACTIVE_FIREBASE_PROJECT_ID}.appspot.com`;
export const ACTIVE_OAUTH_CLIENT_ID = '';
export const ACTIVE_FIREBASE_APP_ID = '1:245342369537:web:7c8551e8eeb3933ed68d00';
export const ACTIVE_APP_ID = ACTIVE_FIREBASE_APP_ID;
export const ACTIVE_FIREBASE_DATABASE_ID = '(default)';
export const ACTIVE_FIRESTORE_DATABASE_ID = ACTIVE_FIREBASE_DATABASE_ID;

// Strict sanitization: completely block and override any legacy (e.g. 245342369537) or divergent project identifiers
function sanitizeProjectId(raw?: string): string {
  if (raw && raw !== '245342369537' && raw === ACTIVE_FIREBASE_PROJECT_ID) {
    return ACTIVE_FIREBASE_PROJECT_ID;
  }
  return ACTIVE_FIREBASE_PROJECT_ID;
}

function sanitizeAuthDomain(raw?: string): string {
  if (raw && !raw.includes('245342369537') && raw === ACTIVE_FIREBASE_AUTH_DOMAIN) {
    return ACTIVE_FIREBASE_AUTH_DOMAIN;
  }
  return ACTIVE_FIREBASE_AUTH_DOMAIN;
}

export const effectiveFirebaseConfig = {
  projectId: sanitizeProjectId(env.VITE_FIREBASE_PROJECT_ID || baseFirebaseConfig.projectId),
  appId: env.VITE_FIREBASE_APP_ID || baseFirebaseConfig.appId || ACTIVE_APP_ID,
  apiKey: env.VITE_FIREBASE_API_KEY || baseFirebaseConfig.apiKey || 'AIzaSyBDgPCPMD36mSX0lkkyEcz6-rHJdBqk',
  authDomain: sanitizeAuthDomain(env.VITE_FIREBASE_AUTH_DOMAIN || baseFirebaseConfig.authDomain),
  firestoreDatabaseId: ACTIVE_FIRESTORE_DATABASE_ID,
  storageBucket: ACTIVE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseFirebaseConfig.messagingSenderId || ACTIVE_PROJECT_NUMBER,
  measurementId: baseFirebaseConfig.measurementId || '',
  oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || baseFirebaseConfig.oAuthClientId || ACTIVE_OAUTH_CLIENT_ID,
  recaptchaSiteKey: baseFirebaseConfig.recaptchaSiteKey || '',
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
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Lazy-initialized Firestore instance to avoid starting unused background gRPC streams
let _firestoreDb: Firestore | null = null;
export function getDb(): Firestore {
  if (!_firestoreDb) {
    const dbId = effectiveFirebaseConfig.firestoreDatabaseId;
_firestoreDb = (dbId && dbId !== '(default)')
  ? getFirestore(app, dbId)
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
