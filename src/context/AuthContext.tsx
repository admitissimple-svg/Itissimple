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
    promise
      .then((res) => {
        clearTimeout(timer);
        return res;
      })
      .catch((err) => {
        clearTimeout(timer);
        throw err;
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

  // Sync Firebase Auth session on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const cleanEmail = (user.email || '').toLowerCase().trim();
        const isMasterAdmin = cleanEmail === 'adm.itissimple@gmail.com';

        // Hydrate from Firestore with resilient fallback
        try {
          const docData = await fetchFirestoreUser(user.uid, user.email || undefined);
          const resolvedRole: UserRole = docData
            ? (docData.role === 'admin' || isMasterAdmin
                ? 'admin'
                : docData.role === 'teacher' || docData.role === 'native_friend'
                ? 'teacher'
                : 'student')
            : (isMasterAdmin ? 'admin' : 'student');

          const acc: GoogleAccount = {
            uid: user.uid,
            email: cleanEmail,
            name: docData?.name || user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
            role: resolvedRole,
            picture: docData?.picture || docData?.avatar || user.photoURL || '',
          };
          setCurrentAccount(acc);
        } catch (hydrationErr) {
          console.warn('Notice during user hydration:', hydrationErr);
          const acc: GoogleAccount = {
            uid: user.uid,
            email: cleanEmail,
            name: user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
            role: isMasterAdmin ? 'admin' : 'student',
            picture: user.photoURL || '',
          };
          setCurrentAccount(acc);
        }
      } else {
        setCurrentAccount(null);
      }
    });

    return () => unsubscribe();
  }, [fetchFirestoreUser]);

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

      // 4. Determine verified role strictly from Firestore doc (source of truth)
      const docRole = (firestoreDoc?.role || '').toLowerCase();
      let verifiedRole: UserRole = 'student';

      if (docRole === 'student') {
        verifiedRole = 'student';
      } else if (docRole === 'native_friend' || docRole === 'teacher') {
        verifiedRole = 'teacher';
      } else if (docRole === 'admin' || cleanEmail === 'adm.itissimple@gmail.com') {
        if (cleanEmail === 'adm.itissimple@gmail.com' || docRole === 'admin') {
          verifiedRole = 'admin';
        } else {
          verifiedRole = 'student';
        }
      } else {
        // Fallback to backend account or requested role without overriding to admin
        if (account.role === 'admin' && cleanEmail === 'adm.itissimple@gmail.com') {
          verifiedRole = 'admin';
        } else if (account.role === 'teacher' || preferredRole === 'teacher') {
          verifiedRole = 'teacher';
        } else {
          verifiedRole = 'student';
        }
      }

      account.role = verifiedRole;
      setCurrentAccount(account);

      // Hydrate student profile with routine state, level, study plan, and unique Native Friend link (nativeFriendUID)
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
          level: (firestoreDoc?.level as any) || data.profile?.level || EnglishLevel.BEGINNER,
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
          routineVideoTime: firestoreDoc?.routineVideoTime || data.profile?.routineVideoTime || '09:00',
          routineAudioTime: firestoreDoc?.routineAudioTime || data.profile?.routineAudioTime || '14:00',
          dailyPhraseTime: firestoreDoc?.dailyPhraseTime || data.profile?.dailyPhraseTime || '20:00',
        };

        // Redirection INSTANTLY to Student Dashboard (/dashboard)
        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
          } catch {}
        }
      } else if (verifiedRole === 'teacher') {
        // Redirection to Native Friend Panel (/teacher)
        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState({ page: 'teacher' }, '', '/teacher');
          } catch {}
        }
      } else if (verifiedRole === 'admin') {
        // Redirection to Administrator Panel (/admin)
        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState({ page: 'admin' }, '', '/admin');
          } catch {}
        }
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

      let targetRole: UserRole = 'student';
      const docRole = (firestoreDoc?.role || '').toLowerCase();
      if (docRole === 'student') {
        targetRole = 'student';
      } else if (docRole === 'teacher' || docRole === 'native_friend') {
        targetRole = 'teacher';
      } else if (docRole === 'admin' || user.email.toLowerCase() === 'adm.itissimple@gmail.com') {
        if (user.email.toLowerCase() === 'adm.itissimple@gmail.com' || docRole === 'admin') {
          targetRole = 'admin';
        } else {
          targetRole = 'student';
        }
      } else {
        targetRole = preferredRole === 'teacher' ? 'teacher' : (preferredRole === 'admin' && user.email.toLowerCase() === 'adm.itissimple@gmail.com' ? 'admin' : 'student');
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

      // Strict Redirection by verified role
      if (targetRole === 'student') {
        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
          } catch {}
        }
      } else if (targetRole === 'teacher') {
        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState({ page: 'teacher' }, '', '/teacher');
          } catch {}
        }
      } else if (targetRole === 'admin') {
        if (typeof window !== 'undefined') {
          try {
            window.history.replaceState({ page: 'admin' }, '', '/admin');
          } catch {}
        }
      }

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
