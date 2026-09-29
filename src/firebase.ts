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

// Active and exclusive project constants for gen-lang-client-0507076122
export const ACTIVE_FIREBASE_PROJECT_ID = 'gen-lang-client-0507076122';
export const ACTIVE_PROJECT_NUMBER = '681085451337';
export const ACTIVE_FIREBASE_AUTH_DOMAIN = `${ACTIVE_FIREBASE_PROJECT_ID}.firebaseapp.com`;
export const ACTIVE_FIREBASE_STORAGE_BUCKET = `${ACTIVE_FIREBASE_PROJECT_ID}.firebasestorage.app`;
export const ACTIVE_OAUTH_CLIENT_ID = `${ACTIVE_PROJECT_NUMBER}-${ACTIVE_FIREBASE_PROJECT_ID}.apps.googleusercontent.com`;
export const ACTIVE_APP_ID = `1:${ACTIVE_PROJECT_NUMBER}:web:${ACTIVE_FIREBASE_PROJECT_ID}`;
export const ACTIVE_FIRESTORE_DATABASE_ID = 'ai-studio-itissimple-e32d4304-3e35-441e-a910-7af9cbdeb03e';

// Strict sanitization: completely block and override any legacy or divergent project identifiers
function sanitizeProjectId(raw?: string): string {
  if (raw && raw === ACTIVE_FIREBASE_PROJECT_ID) {
    return ACTIVE_FIREBASE_PROJECT_ID;
  }
  return ACTIVE_FIREBASE_PROJECT_ID;
}

function sanitizeAuthDomain(raw?: string): string {
  if (raw && raw === ACTIVE_FIREBASE_AUTH_DOMAIN) {
    return ACTIVE_FIREBASE_AUTH_DOMAIN;
  }
  return ACTIVE_FIREBASE_AUTH_DOMAIN;
}

export const effectiveFirebaseConfig = {
  projectId: sanitizeProjectId(env.VITE_FIREBASE_PROJECT_ID || baseFirebaseConfig.projectId),
  appId: ACTIVE_APP_ID,
  apiKey: env.VITE_FIREBASE_API_KEY || baseFirebaseConfig.apiKey || 'AIzaSyBVAXfOGPV11t7HIkgb6YH4GScws1mfTzk',
  authDomain: sanitizeAuthDomain(env.VITE_FIREBASE_AUTH_DOMAIN || baseFirebaseConfig.authDomain),
  firestoreDatabaseId: ACTIVE_FIRESTORE_DATABASE_ID,
  storageBucket: ACTIVE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ACTIVE_PROJECT_NUMBER,
  measurementId: baseFirebaseConfig.measurementId || '',
  oAuthClientId: ACTIVE_OAUTH_CLIENT_ID,
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
