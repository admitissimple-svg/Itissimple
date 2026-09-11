import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence internal gRPC stream disconnection logs
try {
  setLogLevel('silent');
} catch {
  // Ignore if already configured
}

// Initialize or reuse Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication instance
export const auth = getAuth(app);

// Google Auth Provider configured for popups
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

// Lazy-initialized Firestore instance to avoid starting unused background gRPC streams
let _firestoreDb: Firestore | null = null;
export function getDb(): Firestore {
  if (!_firestoreDb) {
    _firestoreDb = firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
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
