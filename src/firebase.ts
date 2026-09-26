import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
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
  projectId: env.VITE_FIREBASE_PROJECT_ID || baseFirebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || baseFirebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || baseFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || baseFirebaseConfig.authDomain,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || baseFirebaseConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || baseFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseFirebaseConfig.messagingSenderId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || baseFirebaseConfig.measurementId,
  oAuthClientId: env.VITE_FIREBASE_OAUTH_CLIENT_ID || baseFirebaseConfig.oAuthClientId,
  recaptchaSiteKey: env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || baseFirebaseConfig.recaptchaSiteKey,
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

export default app;
