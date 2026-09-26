import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseAuthSignOut,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../firebase';

let inMemoryToken: string | null = null;
let inMemoryGoogleAccessToken: string | null = null;

export function getGoogleOAuthToken(): string | null {
  return inMemoryGoogleAccessToken;
}

export function setGoogleOAuthToken(token: string | null) {
  inMemoryGoogleAccessToken = token;
}

export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  if (auth.currentUser) {
    try {
      inMemoryToken = await auth.currentUser.getIdToken(forceRefresh);
    } catch {
      try {
        inMemoryToken = await auth.currentUser.getIdToken(true);
      } catch {
        // Fallback to cached inMemoryToken
      }
    }
  } else {
    inMemoryToken = null;
  }
  return inMemoryToken;
}

export interface RealAuthResult {
  accessToken: string;
  googleOAuthAccessToken?: string | null;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

/**
 * Real Google Authentication using Firebase Auth Popup
 */
export async function googleSignIn(): Promise<RealAuthResult> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const user: User = result.user;
  const token = await user.getIdToken();
  inMemoryToken = token;

  const credential = GoogleAuthProvider.credentialFromResult(result);
  const googleOAuthAccessToken = credential?.accessToken || null;
  if (googleOAuthAccessToken) {
    inMemoryGoogleAccessToken = googleOAuthAccessToken;
  }

  return {
    accessToken: token,
    googleOAuthAccessToken,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
  };
}

/**
 * Real Firebase Email/Password Sign-In
 */
export async function firebaseSignInWithEmail(email: string, pass: string): Promise<RealAuthResult> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  const user = result.user;
  const token = await user.getIdToken();
  inMemoryToken = token;

  return {
    accessToken: token,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
  };
}

/**
 * Real Firebase Email/Password Account Creation
 */
export async function firebaseSignUpWithEmail(email: string, pass: string): Promise<RealAuthResult> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  const user = result.user;
  const token = await user.getIdToken();
  inMemoryToken = token;

  return {
    accessToken: token,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
  };
}

/**
 * Real Sign Out
 */
export async function firebaseSignOut(): Promise<void> {
  inMemoryToken = null;
  await firebaseAuthSignOut(auth).catch(() => null);
}

