import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Globe,
  CheckCircle2,
  Heart,
  Users,
  UserPlus,
  ChevronDown,
  Check,
  LogIn,
  LogOut,
  HelpCircle,
  User,
  GraduationCap,
  X,
  BookOpen,
  Calendar,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { GoogleAccount, Language, UserRole, AdminLandingContent } from '../types';
import { BrandLogo } from './BrandLogo';
import { FindTutorsSection } from './FindTutorsSection';
import { SFluencyTracker } from './SFluencyTracker';
import { NativeFriendTutor } from '../data/tutors';
import { SUPPORTED_LANGUAGES, getTranslations } from '../utils/i18n';

interface LandingPageProps {
  currentLanguage: Language;
  onToggleLanguage: (lang: Language) => void;
  currentAccount: GoogleAccount | null;
  onOpenAuthModal: (mode: 'login' | 'signup', role?: UserRole) => void;
  onOpenBecomeTutorModal: () => void;
  onGoToDashboard: () => void;
  onBookLessonWithTutor: (tutor: NativeFriendTutor) => void;
  onSendMessageToTutor: (tutor: NativeFriendTutor) => void;
  landingContent?: AdminLandingContent;
  tutors?: NativeFriendTutor[];
  onOpenAdminLandingEditor?: () => void;
  onOpenAdminApprovals?: () => void;
  pendingApprovalsCount?: number;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentLanguage,
  onToggleLanguage,
  currentAccount,
  onOpenAuthModal,
  onOpenBecomeTutorModal,
  onGoToDashboard,
  onBookLessonWithTutor,
  onSendMessageToTutor,
  landingContent,
  tutors,
  onOpenAdminLandingEditor,
  onOpenAdminApprovals,
  pendingApprovalsCount = 0,
  onLogout,
}) => {
  const isEn = currentLanguage === 'en';
  const isPt = currentLanguage === 'pt';
  const t = getTranslations(currentLanguage);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentAccount?.role === 'admin';

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Dynamic texts: When in Portuguese, allow Admin customized content, else use localized translations
  const heroBadge = (isPt && landingContent?.heroBadge) || t.heroBadge;
  const heroHeadlineStart = (isPt && landingContent?.heroHeadlineStart) || t.heroHeadlineStart;
  const heroHeadlineHighlight = (isPt && landingContent?.heroHeadlineHighlight) || t.heroHeadlineHighlight;
  const heroQuote = (isPt && landingContent?.heroQuote) || t.heroQuote;
  const heroSubtext = (isPt && landingContent?.heroSubtext) || t.heroSubtext;
  const heroFindFriendBtn = (isPt && landingContent?.heroFindFriendBtn) || t.heroFindFriendBtn;
  const heroStartLivingBtn = (isPt && landingContent?.heroStartLivingBtn) || t.heroStartLivingBtn;
  const philosophyBadge = (isPt && landingContent?.philosophyBadge) || t.philosophyBadge;
  const philosophyHeading1 = (isPt && landingContent?.philosophyHeading1) || t.philosophyHeading1;
  const philosophyHeading2 = (isPt && landingContent?.philosophyHeading2) || t.philosophyHeading2;
  const philosophySubheading = (isPt && landingContent?.philosophySubheading) || t.philosophySubheading;
  const philosophyPillar1Title = (isPt && landingContent?.philosophyPillar1Title) || t.philosophyPillar1Title;
  const philosophyPillar1Desc = (isPt && landingContent?.philosophyPillar1Desc) || t.philosophyPillar1Desc;
  const philosophyPillar1Tag = (isPt && landingContent?.philosophyPillar1Tag) || t.philosophyPillar1Tag;
  const philosophyPillar2Title = (isPt && landingContent?.philosophyPillar2Title) || t.philosophyPillar2Title;
  const philosophyPillar2Desc = (isPt && landingContent?.philosophyPillar2Desc) || t.philosophyPillar2Desc;
  const philosophyPillar2Tag = (isPt && landingContent?.philosophyPillar2Tag) || t.philosophyPillar2Tag;
  const philosophyPillar3Title = (isPt && landingContent?.philosophyPillar3Title) || t.philosophyPillar3Title;
  const philosophyPillar3Desc = (isPt && landingContent?.philosophyPillar3Desc) || t.philosophyPillar3Desc;
  const philosophyPillar3Tag = (isPt && landingContent?.philosophyPillar3Tag) || t.philosophyPillar3Tag;
  const footerSlogan = (isPt && landingContent?.footerSlogan) || t.footerSub;

  return (
    <div className="min-h-screen bg-[#000035] text-white flex flex-col selection:bg-[#9AB4FF]/30 selection:text-white">
      {/* 0. Dedicated Admin Controls Bar (Only Visible for Administrator) */}
      {isAdmin && (
        <div className="bg-[#1C4C96] text-white px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-3 border-b border-[#9AB4FF]/40 z-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F4CA54] animate-pulse" />
            <span>PAINEL ADMINISTRADOR: {currentAccount?.name} ({currentAccount?.email})</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdminLandingEditor && (
              <button
                type="button"
                onClick={onOpenAdminLandingEditor}
                className="px-3 py-1 rounded-lg bg-white text-[#000035] hover:bg-[#F4CA54] transition cursor-pointer font-black shadow-xs flex items-center gap-1.5"
              >
                ✏️ {isEn ? 'Edit Landing Page Texts' : 'Editar Textos da Home'}
              </button>
            )}

            {onOpenAdminApprovals && (
              <button
                type="button"
                onClick={onOpenAdminApprovals}
                className="px-3 py-1 rounded-lg bg-[#000035] text-[#9AB4FF] hover:text-white hover:bg-[#062863] border border-[#9AB4FF]/40 transition cursor-pointer font-bold shadow-xs flex items-center gap-1.5"
              >
                👥 {isEn ? 'Approve Native Friends' : 'Aprovações de Amigos Nativos'}
                {pendingApprovalsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#F4CA54] text-[#000035] text-[10px] flex items-center justify-center font-black">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer font-bold shadow-xs flex items-center gap-1.5"
                title={isEn ? 'Log out' : 'Sair da conta de Administrador'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isEn ? 'Log Out' : 'Sair'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Top Header */}
      <header className="sticky top-0 z-40 bg-[#000035]/95 backdrop-blur-md border-b border-[#1C4C96]/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" showText={true} textColor="text-white" />
            </div>

            {/* Center Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-bold text-[#9AB4FF]">
              <button
                type="button"
                onClick={() => scrollToSection('find-native-friend')}
                className="hover:text-white transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{t.findTutors}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('philosophy')}
                className="hover:text-white transition cursor-pointer"
              >
                {currentLanguage === 'pt' ? 'Nossa Filosofia' : 'Philosophy'}
              </button>
              <button
                type="button"
                onClick={onOpenBecomeTutorModal}
                className="text-[#F4CA54] hover:text-white transition cursor-pointer font-extrabold"
              >
                {t.becomeTutor}
              </button>
            </nav>

            {/* Right Controls: Language Selector, Help & Preply-style Log In */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 12-Language Switcher */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#062863] hover:bg-[#1C4C96] border border-[#607EC9]/50 rounded-xl text-xs font-bold text-white transition shadow-xs cursor-pointer"
                  title={t.language}
                >
                  <span className="text-base leading-none">{currentLangObj.flag}</span>
                  <span className="hidden sm:inline font-black uppercase text-[11px] text-[#9AB4FF]">{currentLangObj.code}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#9AB4FF] transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#000035] rounded-2xl shadow-2xl border border-[#607EC9] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-96 overflow-y-auto">
                    <div className="px-2.5 py-1.5 border-b border-[#1C4C96] text-[10px] font-bold text-[#9AB4FF] uppercase tracking-wider flex items-center justify-between">
                      <span>{t.language} (12)</span>
                      <Globe className="w-3 h-3 text-[#9AB4FF]" />
                    </div>
                    <div className="grid grid-cols-1 gap-1 pt-1.5">
                      {SUPPORTED_LANGUAGES.map((lang) => {
                        const isSelected = lang.code === currentLanguage;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              onToggleLanguage(lang.code);
                              setIsLangDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#1C4C96] text-white font-bold shadow-xs border border-[#9AB4FF]/50'
                                : 'text-slate-200 hover:bg-[#062863] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{lang.flag}</span>
                              <div className="text-left">
                                <span className="block text-xs font-bold">{lang.nativeName}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-[#F4CA54]' : 'text-[#9AB4FF]/70'}`}>
                                  {lang.name} • {lang.region}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#F4CA54]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Preply-style Help Circle Icon Button (?) */}
              <button
                type="button"
                onClick={() => setIsHelpOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#607EC9]/50 hover:border-white bg-[#062863]/50 hover:bg-[#1C4C96]/60 flex items-center justify-center text-white transition cursor-pointer"
                title={isEn ? 'Help & How it works' : 'Ajuda e Como funciona'}
                aria-label="Help"
              >
                <HelpCircle className="w-5 h-5 text-[#9AB4FF] hover:text-white" />
              </button>

              {/* Admin Portal Quick Access Button */}
              <button
                type="button"
                onClick={() => {
                  if (currentAccount?.role === 'admin') {
                    if (onOpenAdminApprovals) onOpenAdminApprovals();
                  } else {
                    onOpenAuthModal('login', 'admin');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#062863] hover:bg-[#1C4C96] border border-[#607EC9]/50 text-xs font-bold text-[#F4CA54] transition cursor-pointer shadow-xs"
                title={isEn ? 'Administrator Access' : 'Acesso do Administrador'}
              >
                <ShieldCheck className="w-4 h-4 text-[#F4CA54]" />
                <span className="hidden lg:inline">{isEn ? 'Admin' : 'Administrador'}</span>
                {pendingApprovalsCount !== undefined && pendingApprovalsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#F4CA54] text-[#000035] text-[9px] font-black flex items-center justify-center">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              {/* Preply-style Single Unified Log In / Dashboard Button */}
              <button
                type="button"
                onClick={() => {
                  if (currentAccount) {
                    onGoToDashboard();
                  } else {
                    onOpenAuthModal('login');
                  }
                }}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#000035] font-black text-xs sm:text-sm shadow-md transition cursor-pointer border-2 border-white active:scale-98"
                title={
                  currentAccount
                    ? currentAccount.role === 'admin'
                      ? isEn ? 'Administrator Dashboard' : 'Painel do Administrador'
                      : currentAccount.role === 'teacher'
                      ? isEn ? 'Native Friend Dashboard' : 'Painel do Amigo Nativo'
                      : isEn ? 'My Dashboard' : 'Meu Painel'
                    : isEn ? 'Log in to your account' : 'Acessar sua conta'
                }
              >
                {/* Preply-style ->] icon */}
                <LogIn className="w-4 h-4 text-[#000035] stroke-[2.5]" />
                <span>
                  {currentAccount
                    ? currentAccount.role === 'admin'
                      ? isEn ? 'Admin Dashboard' : 'Painel Admin'
                      : currentAccount.role === 'teacher'
                      ? isEn ? 'Teacher Dashboard' : 'Painel Amigo Nativo'
                      : isEn ? 'My Dashboard' : 'Meu Painel'
                    : isEn ? 'Log In' : 'Entrar'}
                </span>
              </button>

              {/* Botão Sair da Conta (Quando o usuário já está logado) */}
              {currentAccount && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/50 text-rose-300 hover:text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs active:scale-98"
                  title={isEn ? 'Log out of current account' : 'Sair da conta atual'}
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>{isEn ? 'Log Out' : 'Sair'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Help Modal (Preply style) */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white text-[#000035] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-6 animate-in fade-in zoom-in duration-150">
            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-[#062863] text-white flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-[#9AB4FF]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#000035]">
                  {isEn ? 'How It\'s Simple Works' : 'Como Funciona o It\'s Simple'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {isEn ? 'Quick guide to logging in and learning' : 'Guia rápido de login e aprendizado'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <LogIn className="w-5 h-5 text-[#1C4C96] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-0.5">
                    {isEn ? '1. Log In / Sign Up' : '1. Login e Cadastro'}
                  </h4>
                  <p className="leading-relaxed">
                    {isEn
                      ? 'Click the Log In button to access with Google or create an email/password account. Students are directed to their Routine Workspace, while Native Friends access their Master Schedule.'
                      : 'Clique no botão Entrar (Log In) para acessar via Google ou criar sua conta. Alunos são direcionados ao Painel de Rotinas, e Amigos Nativos ao Controle de Aulas.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#1C4C96] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-0.5">
                    {isEn ? '2. Live 30-min Sessions' : '2. Aulas Ao Vivo de 30 minutos'}
                  </h4>
                  <p className="leading-relaxed">
                    {isEn
                      ? 'Schedule 1-on-1 practical conversations with friendly Native Friends via Google Meet.'
                      : 'Agende sessões individuais práticas de conversação da vida real via Google Meet com seu mentor.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-[#1C4C96] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-0.5">
                    {isEn ? '3. Daily Routine & 5 Words' : '3. Rotinas e 5 Palavras Diárias'}
                  </h4>
                  <p className="leading-relaxed">
                    {isEn
                      ? 'Turn daily habits (coffee, commute, workout) into English moments. Record 5 words and finish your day with the Sentence of the Day.'
                      : 'Transforme seus hábitos diários em momentos de inglês, anote 5 palavras e crie sua Frase do Dia.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsHelpOpen(false);
                  onOpenAuthModal('login');
                }}
                className="flex-1 py-3 rounded-xl bg-[#000035] hover:bg-[#062863] text-white font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isEn ? 'Go to Log In' : 'Fazer Login'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                {isEn ? 'Close' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-5 pb-8 sm:pt-6 sm:pb-10 bg-gradient-to-b from-[#000035] via-[#062863] to-[#000035]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-3.5 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C4C96]/60 border border-[#9AB4FF]/50 text-[#9AB4FF] text-[11px] font-extrabold shadow-sm">
                <Sparkles className="w-3 h-3 text-[#F4CA54]" />
                <span>{heroBadge}</span>
              </div>

              {/* Main Headline (Scaled to 80%) */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-[1.15]">
                {heroHeadlineStart}{' '}
                <span className="underline decoration-[#F4CA54] decoration-3 underline-offset-4 text-white">
                  Living
                </span>{' '}
                <span className="underline decoration-[#9AB4FF] decoration-3 underline-offset-4 text-white">
                  your Life.
                </span>
              </h1>

              {/* Sub-slogans & Philosophy Manifesto */}
              <div className="space-y-1 text-xs sm:text-[13px] text-blue-100 font-medium leading-relaxed max-w-2xl mb-[3cm]">
                <p className="font-extrabold text-[#9AB4FF]">
                  {heroQuote}
                </p>
                <p className="text-slate-200">
                  {heroSubtext}
                </p>
              </div>

              {/* Call to Actions */}
              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => scrollToSection('find-native-friend')}
                  className="px-5 py-2 rounded-xl bg-[#607EC9] hover:bg-[#1C4C96] text-white font-black text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer border border-[#9AB4FF]/60 transform hover:scale-102"
                >
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span>{heroFindFriendBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (currentAccount) {
                      onGoToDashboard();
                    } else {
                      onOpenAuthModal('signup');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#000035]/80 hover:bg-[#062863] text-white border border-[#607EC9] font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{heroStartLivingBtn}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9AB4FF]" />
                </button>
              </div>

              {/* Trust & Key Features Badges */}
              <div className="pt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] sm:text-[11px] font-bold text-[#9AB4FF]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{t.badge100Native}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{t.badge30MinMeet}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{t.badgeAiCorrection}</span>
                </div>
              </div>
            </div>

            {/* Right Visual Card: S Fun Path to Fluency (Showcase Demo Only) */}
            <div className="lg:col-span-5 relative">
              <SFluencyTracker
                mode="demo"
                currentLanguage={currentLanguage}
                onExploreRoutines={onGoToDashboard}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Philosophy Section */}
      <section className="py-12 sm:py-16 bg-[#000035] border-t border-[#1C4C96]/50" id="philosophy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C4C96]/60 border border-[#9AB4FF]/50 text-[#9AB4FF] text-[11px] font-bold">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>{philosophyBadge}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {philosophyHeading1}{' '}
              <span className="text-[#9AB4FF] block sm:inline">
                {philosophyHeading2}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-blue-100 font-normal leading-relaxed">
              {philosophySubheading}
            </p>
          </div>

          {/* 3 Pillars Cards (Scaled to 80%) */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Pillar 1 */}
            <div className="bg-gradient-to-br from-[#062863]/90 via-[#000035] to-[#1C4C96]/60 rounded-2xl p-5 border border-[#607EC9]/50 shadow-xl space-y-3 hover:border-[#9AB4FF] transition flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1C4C96] text-[#9AB4FF] border border-[#9AB4FF]/40 flex items-center justify-center font-black text-sm shadow-xs">
                  1
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {philosophyPillar1Title}
                </h3>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  {philosophyPillar1Desc}
                </p>
              </div>
              <div className="p-2.5 bg-[#000035]/80 rounded-lg border border-[#607EC9]/40 text-[11px] font-bold text-[#9AB4FF]">
                {philosophyPillar1Tag}
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-gradient-to-br from-[#062863]/90 via-[#000035] to-[#1C4C96]/60 rounded-2xl p-5 border border-[#607EC9]/50 shadow-xl space-y-3 hover:border-[#9AB4FF] transition flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1C4C96] text-[#9AB4FF] border border-[#9AB4FF]/40 flex items-center justify-center font-black text-sm shadow-xs">
                  2
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {philosophyPillar2Title}
                </h3>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  {philosophyPillar2Desc}
                </p>
              </div>
              <div className="p-2.5 bg-[#000035]/80 rounded-lg border border-[#607EC9]/40 text-[11px] font-bold text-emerald-400">
                {philosophyPillar2Tag}
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-gradient-to-br from-[#062863]/90 via-[#000035] to-[#1C4C96]/60 rounded-2xl p-5 border border-[#607EC9]/50 shadow-xl space-y-3 hover:border-[#9AB4FF] transition flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1C4C96] text-[#9AB4FF] border border-[#9AB4FF]/40 flex items-center justify-center font-black text-sm shadow-xs">
                  3
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {philosophyPillar3Title}
                </h3>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  {philosophyPillar3Desc}
                </p>
              </div>
              <div className="p-2.5 bg-[#000035]/80 rounded-lg border border-[#607EC9]/40 text-[11px] font-bold text-[#F4CA54]">
                {philosophyPillar3Tag}
              </div>
            </div>
          </div>

          {/* Bottom Transition Banner to Next Section */}
          <div className="mt-10 text-center">
            <div className="inline-block bg-[#000035] px-6 py-2.5 rounded-xl border border-[#607EC9]/60 shadow-lg">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {isPt ? 'Sua jornada, passo a passo!' : 'Your journey, step by step!'}
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Find your Native Friend Section */}
      <FindTutorsSection
        currentLanguage={currentLanguage}
        tutors={tutors}
        onBookLesson={onBookLessonWithTutor}
        onSendMessage={onSendMessageToTutor}
        onSelectMentor={(tutor) => {
          if (onBookLessonWithTutor) onBookLessonWithTutor(tutor);
        }}
      />

      {/* 6. Become a Native Friend Callout Banner */}
      <section className="py-12 bg-[#000035] text-white border-t border-[#1C4C96]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#062863] via-[#000035] to-[#1C4C96] rounded-2xl p-6 sm:p-9 border border-[#607EC9]/50 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl text-left">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C4C96]/80 text-[#9AB4FF] text-[11px] font-bold border border-[#9AB4FF]/40">
                <Globe className="w-3 h-3 text-[#9AB4FF]" />
                <span>{t.forNativeSpeakersBadge}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {t.becomeTutorBannerTitle}
              </h2>
              <p className="text-xs sm:text-[13px] text-blue-100 leading-relaxed font-normal">
                {t.becomeTutorBannerDesc}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenBecomeTutorModal}
              className="px-6 py-2.5 rounded-xl bg-[#607EC9] hover:bg-[#1C4C96] text-white font-black text-xs sm:text-sm shadow-xl transition cursor-pointer shrink-0 border border-[#9AB4FF]/60"
            >
              {t.applyAsTutorBtn}
            </button>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-[#000025] border-t border-[#1C4C96]/50 py-12 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-2">
              <BrandLogo size="sm" showText={true} textColor="text-white" />
              <p className="text-xs text-[#9AB4FF]/75 font-medium">
                {footerSlogan}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-[#9AB4FF]">
              <button
                type="button"
                onClick={() => scrollToSection('find-native-friend')}
                className="hover:text-white cursor-pointer transition"
              >
                {t.findTutors}
              </button>
              <button
                type="button"
                onClick={onOpenBecomeTutorModal}
                className="hover:text-white cursor-pointer transition"
              >
                {t.becomeTutor}
              </button>
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="hover:text-white cursor-pointer transition"
              >
                {t.studentAccess}
              </button>
              <button
                type="button"
                onClick={() => onOpenAuthModal('login', 'admin')}
                className="hover:text-white cursor-pointer transition flex items-center gap-1 text-[#F4CA54]"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isEn ? 'Admin Access' : 'Acesso Administrador'}</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#1C4C96]/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9AB4FF]/60">
            <span>© 2026 It's Simple. All rights reserved.</span>
            <span>English Learning by Living your Life • Powered by Gemini AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

