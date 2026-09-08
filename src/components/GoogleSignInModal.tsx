import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { GoogleAccount, UserRole, Language } from '../types';
import { googleSignIn } from '../utils/auth';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (account: GoogleAccount, initialProfile?: any) => void;
  preferredRole?: UserRole;
  currentLanguage: Language;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  preferredRole = 'student',
  currentLanguage = 'pt',
}) => {
  const isEn = currentLanguage === 'en';

  const [selectedRole, setSelectedRole] = useState<UserRole>(preferredRole);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Support ESC key to dismiss Google sign-in modal easily
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Trigger real Google Authentication via Firebase Auth Popup
      const { user } = await googleSignIn();

      if (!user.email) {
        throw new Error(isEn ? 'No verified email returned from Google.' : 'Nenhum e-mail verificado retornado pelo Google.');
      }

      // 2. Synchronize verified Google account with backend
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          role: selectedRole,
          picture: user.photoURL || undefined, // Real verified photo from Google only, no mock inheritance
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || (isEn ? 'Failed to synchronize account.' : 'Falha ao sincronizar conta.'));
      }

      const data = await res.json();
      onLoginSuccess(data.account, data.profile);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      // Friendly message if user closed popup
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg(isEn ? 'Sign-in cancelled (popup closed).' : 'Autenticação cancelada (janela fechada).');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setErrorMsg(isEn ? 'Request cancelled.' : 'Solicitação cancelada.');
      } else {
        setErrorMsg(err.message || (isEn ? 'Google authentication failed.' : 'Falha na autenticação com Google.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-[450px] w-full p-8 shadow-2xl border border-slate-200 relative my-6 text-[#202124] animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer z-10"
          aria-label="Close"
          title="Fechar (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {/* Authentic Google 4-color G Logo */}
            <svg className="w-12 h-12" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-normal text-[#202124] tracking-tight">
            {isEn ? 'Sign in with Google' : 'Entrar com o Google'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-1">
            {isEn
              ? 'Real, secure authentication backed by Firebase Auth'
              : 'Autenticação real e segura via Firebase Auth'}
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            {isEn ? 'Select your profile type:' : 'Escolha seu tipo de perfil:'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                selectedRole === 'student'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isEn ? 'Student (Aluno)' : 'Aluno (Student)'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('teacher')}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                selectedRole === 'teacher'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isEn ? 'Native Friend (Tutor)' : 'Amigo Nativo (Tutor)'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleAuth}
            className="w-full py-3.5 px-4 bg-[#1a73e8] hover:bg-[#1b66c9] text-white rounded-full font-bold text-sm transition shadow-sm cursor-pointer active:scale-98 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isEn ? 'Opening Google popup...' : 'Conectando ao Google...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isEn ? 'Continue with Google' : 'Continuar com o Google'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            {isEn ? 'Cancel' : 'Cancelar'}
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{isEn ? 'Verified Google Identity • No mock data' : 'Identidade Google Verificada • Sem dados simulados'}</span>
        </div>
      </div>
    </div>
  );
};
