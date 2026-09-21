import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseAuthSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleAuthProvider, getDb } from '../firebase';
import { GoogleAccount, UserProfile, UserRole, EnglishLevel, NativeFriendTutor } from '../types';

export interface AuthUserDoc {
  uid: string;
  email: string;
  name: string;
  role: 'student' | 'native_friend' | 'teacher' | 'admin';
  nativeFriendUID?: string | null;
  teacherUid?: string | null;
  teacherEmail?: string | null;
  teacherName?: string | null;
  level?: EnglishLevel | string;
  studyPlan?: string;
  learningGoal?: string;
  weeklyStudyDaysTarget?: number;
  weeklyStudyDays?: string[];
  routineVideoTime?: string;
  routineAudioTime?: string;
  dailyPhraseTime?: string;
  contractedLessons?: number;
  completedLessonsCount?: number;
  avatar?: string;
  picture?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentAccount: GoogleAccount | null;
  userProfile: UserProfile | null;
  userRole: UserRole;
  isLoading: boolean;
  error: string | null;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  loginWithEmail: (
    email: string,
    pass: string,
    preferredRole?: UserRole
  ) => Promise<{
    success: boolean;
    role?: UserRole;
    account?: GoogleAccount;
    profile?: Partial<UserProfile>;
    tutor?: NativeFriendTutor;
    error?: string;
  }>;
  loginWithGoogle: (
    preferredRole?: UserRole
  ) => Promise<{
    success: boolean;
    role?: UserRole;
    account?: GoogleAccount;
    profile?: Partial<UserProfile>;
    error?: string;
  }>;
  logout: () => Promise<void>;
  fetchFirestoreUser: (uid: string, email?: string) => Promise<AuthUserDoc | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper with timeout to prevent infinite freezes
function withTimeout<T>(promise: Promise<T>, ms = 4500): Promise<T | null> {
  let timer: any;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentAccount, setCurrentAccount] = useState<GoogleAccount | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync Firebase Auth session on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Hydrate from Firestore
        try {
          const docData = await fetchFirestoreUser(user.uid, user.email || undefined);
          if (docData) {
            const resolvedRole: UserRole =
              docData.role === 'admin'
                ? 'admin'
                : docData.role === 'teacher' || docData.role === 'native_friend'
                ? 'teacher'
                : 'student';

            const acc: GoogleAccount = {
              uid: user.uid,
              email: user.email || docData.email,
              name: docData.name || user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
              role: resolvedRole,
              picture: docData.picture || docData.avatar || user.photoURL || '',
            };
            setCurrentAccount(acc);
          }
        } catch {
          // Keep current state
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch Firestore user doc by UID with fallback to emailDocId
  const fetchFirestoreUser = useCallback(async (uid: string, email?: string): Promise<AuthUserDoc | null> => {
    if (!uid && !email) return null;
    const db = getDb();
    try {
      if (uid) {
        const snap = await withTimeout(getDoc(doc(db, 'users', uid)), 3500);
        if (snap && snap.exists()) {
          return snap.data() as AuthUserDoc;
        }
      }
      if (email) {
        const cleanDocId = email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
        const snapEmail = await withTimeout(getDoc(doc(db, 'users', cleanDocId)), 3500);
        if (snapEmail && snapEmail.exists()) {
          return snapEmail.data() as AuthUserDoc;
        }
      }
    } catch (err) {
      console.warn('Firestore fetch user error:', err);
    }
    return null;
  }, []);

  // Dynamic Login with Email/Password and Firestore Role Verification
  const loginWithEmail = async (
    emailInput: string,
    passInput: string,
    preferredRole: UserRole = 'student'
  ): Promise<{
    success: boolean;
    role?: UserRole;
    account?: GoogleAccount;
    profile?: Partial<UserProfile>;
    tutor?: NativeFriendTutor;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = emailInput.toLowerCase().trim();

    try {
      // 1. Firebase Auth Sign-In
      let authUid: string | undefined;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, passInput);
        authUid = userCredential.user.uid;
      } catch (authErr: any) {
        console.log('Firebase Auth attempt:', authErr?.code || authErr?.message);
        // Continue to server verification which supports master admin and fallback credentials
      }

      // 2. Fetch User Document from Firestore by UID
      let firestoreDoc: AuthUserDoc | null = null;
      if (authUid) {
        firestoreDoc = await fetchFirestoreUser(authUid, cleanEmail);
      } else {
        firestoreDoc = await fetchFirestoreUser('', cleanEmail);
      }

      // 3. Authenticate with backend API endpoint with timeout safety
      const backendPayload = {
        email: cleanEmail,
        password: passInput,
        role: firestoreDoc?.role || preferredRole || 'student',
        uid: authUid,
      };

      const loginPromise = fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload),
      });

      const res = await withTimeout(loginPromise, 6000);

      if (!res) {
        throw new Error('Tempo de conexão esgotado ao contatar o servidor. Tente novamente.');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          errData.error ||
          (res.status === 401
            ? 'Perfil não encontrado. Por favor, cadastre-se antes de fazer login.'
            : 'Erro ao autenticar credenciais.');
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      const data = await res.json();
      const account: GoogleAccount = data.account;

      // Determine verified role from Firestore doc (source of truth) or backend verified account
      let verifiedRole: UserRole = 'student';
      if (firestoreDoc?.role === 'admin' || account.role === 'admin' || cleanEmail === 'adm.itissimple@gmail.com') {
        verifiedRole = 'admin';
      } else if (
        firestoreDoc?.role === 'teacher' ||
        firestoreDoc?.role === 'native_friend' ||
        account.role === 'teacher'
      ) {
        verifiedRole = 'teacher';
      } else {
        verifiedRole = 'student';
      }

      account.role = verifiedRole;
      setCurrentAccount(account);

      // Hydrate student profile with nativeFriendUID
      let profile: Partial<UserProfile> | undefined = data.profile;
      if (verifiedRole === 'student') {
        profile = {
          ...(data.profile || {}),
          id: account.uid,
          name: account.name,
          email: account.email,
          nativeFriendUID: firestoreDoc?.nativeFriendUID || firestoreDoc?.teacherUid || (data.profile as any)?.nativeFriendUID || null,
          teacherUid: firestoreDoc?.teacherUid || firestoreDoc?.nativeFriendUID || (data.profile as any)?.teacherUid || null,
          teacherEmail: firestoreDoc?.teacherEmail || data.profile?.teacherEmail || null,
          teacherName: firestoreDoc?.teacherName || data.profile?.teacherName || null,
          level: firestoreDoc?.level as any || data.profile?.level || EnglishLevel.BEGINNER,
          studyPlan: firestoreDoc?.studyPlan || firestoreDoc?.learningGoal || data.profile?.learningGoal || '',
          learningGoal: firestoreDoc?.learningGoal || data.profile?.learningGoal || '',
          weeklyStudyDaysTarget: firestoreDoc?.weeklyStudyDaysTarget ?? data.profile?.weeklyStudyDaysTarget ?? 7,
          weeklyStudyDays: firestoreDoc?.weeklyStudyDays || data.profile?.weeklyStudyDays || [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
          ],
        };
      }

      return {
        success: true,
        role: verifiedRole,
        account,
        profile,
        tutor: data.tutor,
      };
    } catch (err: any) {
      const msg = err.message || 'Erro ao processar login.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic Login with Google Popup and Firestore Role Verification
  const loginWithGoogle = async (
    preferredRole: UserRole = 'student'
  ): Promise<{
    success: boolean;
    role?: UserRole;
    account?: GoogleAccount;
    profile?: Partial<UserProfile>;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;

      if (!user.email) {
        throw new Error('Nenhum e-mail verificado foi retornado pelo Google.');
      }

      // Check Firestore doc by UID
      const firestoreDoc = await fetchFirestoreUser(user.uid, user.email);

      let targetRole: UserRole = preferredRole || 'student';
      if (firestoreDoc?.role === 'admin' || user.email.toLowerCase() === 'adm.itissimple@gmail.com') {
        targetRole = 'admin';
      } else if (firestoreDoc?.role === 'teacher' || firestoreDoc?.role === 'native_friend') {
        targetRole = 'teacher';
      } else if (firestoreDoc?.role === 'student') {
        targetRole = 'student';
      }

      // Synchronize with server backend
      const res = await withTimeout(
        fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            role: targetRole,
            picture: user.photoURL || undefined,
          }),
        }),
        6000
      );

      if (!res || !res.ok) {
        const errData = res ? await res.json().catch(() => ({})) : {};
        throw new Error(errData.error || 'Falha ao sincronizar perfil do Google.');
      }

      const data = await res.json();
      const account: GoogleAccount = data.account || {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        role: targetRole,
        picture: user.photoURL || '',
      };
      account.role = targetRole;
      setCurrentAccount(account);

      return {
        success: true,
        role: targetRole,
        account,
        profile: data.profile,
      };
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao autenticar com Google.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseAuthSignOut(auth);
    } catch {
      // ignore
    }
    setCurrentAccount(null);
    setUserProfile(null);
    setSelectedRole('student');
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentAccount,
        userProfile,
        userRole: currentAccount?.role || 'student',
        isLoading,
        error,
        selectedRole,
        setSelectedRole,
        loginWithEmail,
        loginWithGoogle,
        logout,
        fetchFirestoreUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
