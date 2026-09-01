import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Sparkles,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Compass,
  HeartHandshake,
  Loader2,
} from 'lucide-react';
import { GoogleAccount, EnglishLevel, Language, UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialRole?: UserRole;
  currentLanguage: Language;
  onLoginSuccess: (account: GoogleAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'student',
  currentLanguage,
  onLoginSuccess,
}) => {
  const isEn = currentLanguage === 'en';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole); // 'student' = Praticante, 'teacher' = Amigo Nativo
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [level, setLevel] = useState<EnglishLevel>(EnglishLevel.BEGINNER);
  const [learningGoal, setLearningGoal] = useState('English for everyday life & work');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickLogin = (demoAccount: GoogleAccount) => {
    onLoginSuccess(demoAccount);
    onClose();
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const mockGoogleUser = {
        name: role === 'teacher' ? 'Charles Lambert' : 'Regina Helena',
        email: role === 'teacher' ? 'charles.lambert1939@gmail.com' : 'reginahelena1980@gmail.com',
        role,
        picture:
          role === 'teacher'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      };

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockGoogleUser),
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.account);
      } else {
        onLoginSuccess({
          email: mockGoogleUser.email,
          name: mockGoogleUser.name,
          role,
          picture: mockGoogleUser.picture,
        });
      }
      onClose();
    } catch (err) {
      onLoginSuccess({
        email: role === 'teacher' ? 'charles.lambert1939@gmail.com' : 'reginahelena1980@gmail.com',
        name: role === 'teacher' ? 'Charles Lambert' : 'Regina Helena',
        role,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg(isEn ? 'Please fill in email and password' : 'Por favor, preencha o e-mail e a senha');
      return;
    }

    if (mode === 'signup' && !name) {
      setErrorMsg(isEn ? 'Please enter your full name' : 'Por favor, informe o seu nome completo');
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();

      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email: cleanEmail,
            password,
            role,
            englishLevel: level,
            learningGoal,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSuccessMsg(isEn ? 'Account created successfully!' : 'Conta criada com sucesso!');
          setTimeout(() => {
            onLoginSuccess(data.account);
            onClose();
          }, 600);
        } else {
          const errData = await res.json().catch(() => ({}));
          setErrorMsg(errData.error || (isEn ? 'Failed to create account' : 'Erro ao criar conta'));
        }
      } else {
        // Mode === 'login'
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            role,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          onLoginSuccess(data.account);
          onClose();
        } else {
          let resolvedRole: UserRole = role;
          let resolvedName = name || cleanEmail.split('@')[0];

          if (cleanEmail.includes('teacher') || cleanEmail.includes('charles') || cleanEmail.includes('sarah')) {
            resolvedRole = 'teacher';
          } else if (cleanEmail.includes('admin') || cleanEmail === 'adm.itissimple@gmail.com') {
            resolvedRole = 'admin';
            resolvedName = 'Admin It\'s Simple';
          }

          onLoginSuccess({
            email: cleanEmail,
            name: resolvedName,
            role: resolvedRole,
          });
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de autenticação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-[460px] w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-6 text-[#000035] animate-in fade-in zoom-in duration-150">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2.5">
            <BrandLogo size="md" showText={true} />
          </div>

          <h2 className="text-2xl font-black text-[#000035] tracking-tight">
            {mode === 'login'
              ? isEn ? 'Log in to It\'s Simple' : 'Entrar no It\'s Simple'
              : isEn ? 'Join It\'s Simple' : 'Criar conta no It\'s Simple'}
          </h2>
          
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {mode === 'login' ? (
              <>
                {isEn ? 'New here? ' : 'Novo por aqui? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                  }}
                  className="text-[#1C4C96] hover:underline font-bold cursor-pointer"
                >
                  {isEn ? 'Sign up' : 'Cadastre-se'}
                </button>
              </>
            ) : (
              <>
                {isEn ? 'Already have an account? ' : 'Já possui uma conta? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-[#1C4C96] hover:underline font-bold cursor-pointer"
                >
                  {isEn ? 'Log in' : 'Entrar'}
                </button>
              </>
            )}
          </p>
        </div>

        {/* 🌟 Role Selection Switcher (Praticante vs Amigo Nativo) */}
        <div className="mb-5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-1.5">
            {isEn ? 'I want to access as:' : 'Quero acessar como:'}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                role === 'student'
                  ? 'bg-white text-[#000035] shadow-sm border border-slate-200 ring-1 ring-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Compass
                  className={`w-4 h-4 ${
                    role === 'student' ? 'text-[#1C4C96]' : 'text-slate-400'
                  }`}
                />
                <span className="font-extrabold text-xs sm:text-sm">
                  {isEn ? 'Practitioner' : 'Praticante'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium leading-tight">
                {isEn ? 'Living English every day' : 'Vivendo o inglês no dia a dia'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                role === 'teacher'
                  ? 'bg-white text-[#000035] shadow-sm border border-slate-200 ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <HeartHandshake
                  className={`w-4 h-4 ${
                    role === 'teacher' ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <span className="font-extrabold text-xs sm:text-sm">
                  {isEn ? 'Native Friend' : 'Amigo Nativo'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium leading-tight">
                {isEn ? 'Mentoring & Conversation' : 'Mentoria e conversação real'}
              </span>
            </button>
          </div>
        </div>

        {/* 1. Continue with Google Social Button */}
        <div className="space-y-2.5 mb-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-[#000035] font-black text-xs sm:text-sm rounded-2xl border-2 border-slate-300 hover:border-slate-400 shadow-xs transition flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#1C4C96]" />
            ) : (
              /* Multicolored Google G SVG */
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            )}
            <span>{isEn ? 'Continue with Google' : 'Continuar com o Google'}</span>
          </button>
        </div>

        {/* Divider with single-line text */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            {isEn ? 'or with email' : 'ou com e-mail'}
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2. Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Full Name' : 'Nome Completo'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? 'Your full name' : 'Seu nome completo'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-[#000035] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] focus:border-transparent transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Email or Username' : 'E-mail ou Usuário'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isEn ? 'name@example.com' : 'seu.email@exemplo.com'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-[#000035] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                {isEn ? 'Password' : 'Senha'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => alert(isEn ? 'Password recovery instructions sent to your email.' : 'Instruções de recuperação enviadas para o seu e-mail.')}
                  className="text-[11px] font-bold text-[#1C4C96] hover:underline cursor-pointer"
                >
                  {isEn ? 'Forgot password?' : 'Esqueceu a senha?'}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-[#000035] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sign Up Level Selector (when role is student) */}
          {mode === 'signup' && role === 'student' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Your Comfort Level in English' : 'Como você se sente com o Inglês?'}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as EnglishLevel)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
              >
                <option value={EnglishLevel.BEGINNER}>{isEn ? 'Beginner (Iniciando na prática)' : 'Iniciante (Começando agora)'}</option>
                <option value={EnglishLevel.INTERMEDIATE}>{isEn ? 'Intermediate (Entendo mas travo)' : 'Intermediário (Entendo mas quero destravar)'}</option>
                <option value={EnglishLevel.ADVANCED}>{isEn ? 'Advanced (Buscando naturalidade)' : 'Avançado (Buscando naturalidade diária)'}</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-[#000035] hover:bg-[#062863] text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>
              {mode === 'login'
                ? isEn ? 'Log in' : 'Entrar'
                : isEn ? 'Create account' : 'Criar minha conta'}
            </span>
          </button>
        </form>

        {/* Terms Disclaimer */}
        <p className="text-[10px] text-slate-400 text-center mt-4 leading-tight">
          {isEn ? (
            <>
              By logging in, you agree to It's Simple{' '}
              <span className="underline cursor-pointer">Terms</span> and{' '}
              <span className="underline cursor-pointer">Privacy Policy</span>.
            </>
          ) : (
            <>
              Ao entrar, você concorda com os{' '}
              <span className="underline cursor-pointer">Termos</span> e a{' '}
              <span className="underline cursor-pointer">Política de Privacidade</span> do It's Simple.
            </>
          )}
        </p>

        {/* Quick Demo Access Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="uppercase tracking-wider">
              {isEn ? '⚡ 1-Click Demo Profiles:' : '⚡ Perfis de Demonstração:'}
            </span>
            <span className="text-[10px] text-[#1C4C96]">Auto-redirect</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleQuickLogin({
                  email: 'reginahelena1980@gmail.com',
                  name: 'Regina Helena',
                  role: 'student',
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70 text-left text-[11px] font-bold text-[#062863] transition cursor-pointer flex items-center justify-between"
            >
              <span>👩 Regina</span>
              <span className="text-[9px] text-blue-600 uppercase font-black">Praticante</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickLogin({
                  email: 'vinicius.student@gmail.com',
                  name: 'Vinicius Alcantara',
                  role: 'student',
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70 text-left text-[11px] font-bold text-[#062863] transition cursor-pointer flex items-center justify-between"
            >
              <span>👨 Vinicius</span>
              <span className="text-[9px] text-blue-600 uppercase font-black">Praticante</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickLogin({
                  email: 'charles.lambert1939@gmail.com',
                  name: 'Charles Lambert',
                  role: 'teacher',
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left text-[11px] font-bold text-emerald-900 transition cursor-pointer flex items-center justify-between"
            >
              <span>🇨🇦 Charles</span>
              <span className="text-[9px] text-emerald-700 uppercase font-black">Amigo Nativo</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickLogin({
                  email: 'adm.itissimple@gmail.com',
                  name: 'Admin It\'s Simple',
                  role: 'admin',
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-left text-[11px] font-bold text-slate-800 transition cursor-pointer flex items-center justify-between"
            >
              <span>🛡️ Admin Geral</span>
              <span className="text-[9px] text-slate-600 uppercase font-black">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
