import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Globe,
  User,
  GraduationCap,
  ShieldCheck,
  Search,
  LogOut,
  Home,
  Check,
} from 'lucide-react';
import { GoogleAccount, UserProfile, Language } from '../types';
import { Translations, SUPPORTED_LANGUAGES } from '../utils/i18n';
import { BrandLogo } from './BrandLogo';
import { getShortTzBadge } from '../utils/timezone';

interface NavbarProps {
  userProfile: UserProfile;
  currentAccount: GoogleAccount | null;
  currentLanguage: Language;
  t: Translations;
  onToggleLanguage: (lang: Language) => void;
  onOpenAccountModal: () => void;
  onOpenStudentProfile?: () => void;
  onOpenTeacherProfile?: () => void;
  timeZone?: string;
  onGoToLanding?: () => void;
  onFindTutors?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  currentAccount,
  currentLanguage,
  t,
  onToggleLanguage,
  onOpenAccountModal,
  onOpenStudentProfile,
  onOpenTeacherProfile,
  timeZone,
  onGoToLanding,
  onFindTutors,
  onLogout,
}) => {
  const isEn = currentLanguage === 'en';
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const isTeacherOrAdmin = currentAccount ? (currentAccount.role === 'teacher' || currentAccount.role === 'admin') : false;
  const isTeacher = currentAccount?.role === 'teacher';
  const effectiveTimeZone = timeZone || (isTeacherOrAdmin ? 'America/Toronto' : 'America/Sao_Paulo');
  const shortTzName = getShortTzBadge(effectiveTimeZone);

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

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const localeMap: Record<Language, string> = {
        pt: 'pt-BR',
        en: 'en-US',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        it: 'it-IT',
        ja: 'ja-JP',
        ko: 'ko-KR',
        zh: 'zh-CN',
        ru: 'ru-RU',
        ar: 'ar-SA',
        tr: 'tr-TR',
      };
      const locale = localeMap[currentLanguage] || 'en-US';
      try {
        setCurrentTime(
          now.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: effectiveTimeZone,
            hour12: currentLanguage === 'en',
          })
        );
        setCurrentDateStr(
          now.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            timeZone: effectiveTimeZone,
          })
        );
      } catch (err) {
        console.warn('Error formatting timezone time:', err);
        setCurrentTime(
          now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        setCurrentDateStr(
          now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
        );
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentLanguage, effectiveTimeZone]);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return {
          label: t.adminBadge,
          bg: 'bg-[#000035] text-white border-[#1C4C96]',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-[#9AB4FF]" />,
        };
      case 'teacher':
        return {
          label: t.teacherBadge,
          bg: 'bg-[#062863]/10 text-[#062863] border-[#607EC9]/40',
          icon: <GraduationCap className="w-3.5 h-3.5 text-[#1C4C96]" />,
        };
      default:
        return {
          label: isEn ? 'Your Practice Space' : 'Seu Espaço de Prática',
          bg: 'bg-[#9AB4FF]/15 text-[#000035] border-[#9AB4FF]/50',
          icon: <User className="w-3.5 h-3.5 text-[#1C4C96]" />,
        };
    }
  };

  const roleBadge = getRoleBadge(currentAccount?.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#607EC9]/20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* 1. Brand Logo & Slogan */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGoToLanding}
              className="hover:opacity-90 transition cursor-pointer text-left"
              title="Home / Landing"
            >
              <BrandLogo size="md" showText={true} />
            </button>
          </div>

          {/* 2. Center Links & Clock Badge */}
          <div className="flex items-center gap-3">
            {onFindTutors && (
              <button
                type="button"
                onClick={onFindTutors}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#062863]/10 hover:bg-[#062863]/20 text-[#062863] text-xs font-bold transition cursor-pointer border border-[#607EC9]/30"
              >
                <Search className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span>{t.findTutors}</span>
              </button>
            )}

            <div
              className="flex flex-col items-center justify-center px-3.5 sm:px-4 py-1.5 bg-[#9AB4FF]/15 border border-[#9AB4FF]/40 rounded-xl shadow-2xs"
              title={`Fuso Horário / Timezone: ${effectiveTimeZone}`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 text-[#000035] font-mono font-semibold text-xs sm:text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1C4C96] animate-pulse"></span>
                <span>{currentTime}</span>
                <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 bg-[#062863]/10 text-[#062863] rounded-md border border-[#607EC9]/30 hidden xs:inline">
                  {shortTzName}
                </span>
              </div>
              <span className="text-[11px] text-[#062863] capitalize font-medium">{currentDateStr}</span>
            </div>
          </div>

          {/* 3. Right Controls: Multi-Language Selector & Account Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher: 12 Languages for Students; Locked English Immersion for Teachers */}
            {isTeacherOrAdmin ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#062863]/10 border border-[#607EC9]/40 text-[#062863] rounded-xl text-xs font-bold"
                title={t.teacherModeEnglishOnly}
              >
                <Globe className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span className="flex items-center gap-1">
                  <span>🇺🇸 EN</span>
                  <span className="text-[10px] bg-[#062863] text-white px-1.5 py-0.5 rounded-md font-semibold hidden sm:inline">
                    Native Friend Mode
                  </span>
                </span>
              </div>
            ) : (
              <div className="relative" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#9AB4FF]/15 hover:bg-[#9AB4FF]/25 border border-[#9AB4FF]/40 rounded-xl text-xs font-bold text-[#062863] transition shadow-2xs cursor-pointer"
                  title={t.language}
                >
                  <span className="text-base leading-none">{currentLangObj.flag}</span>
                  <span className="hidden sm:inline font-black uppercase text-[11px]">{currentLangObj.code}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#1C4C96] transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 12-Language Dropdown Panel */}
                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#607EC9]/30 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-96 overflow-y-auto">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{t.language} (12)</span>
                      <Globe className="w-3 h-3 text-[#1C4C96]" />
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
                                ? 'bg-[#062863] text-white font-bold shadow-xs'
                                : 'text-slate-700 hover:bg-[#9AB4FF]/15 hover:text-[#000035]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{lang.flag}</span>
                              <div className="text-left">
                                <span className="block text-xs font-bold">{lang.nativeName}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-[#9AB4FF]' : 'text-slate-400'}`}>
                                  {lang.name} • {lang.region}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#9AB4FF]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Edit Profile Button & Google Account Selector */}
            {currentAccount && (
              <>
                {/* Dedicated Profile & Photo Config Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isTeacher && onOpenTeacherProfile) {
                      onOpenTeacherProfile();
                    } else if (onOpenStudentProfile) {
                      onOpenStudentProfile();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[#000035] text-xs font-bold transition cursor-pointer shadow-2xs group"
                  title={isTeacher ? (isEn ? 'Edit Native Friend Profile & Photo' : 'Editar Perfil & Foto do Amigo Nativo') : (isEn ? 'Edit Your Profile & Photo' : 'Editar Seu Perfil & Foto')}
                >
                  <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[#1C4C96]/40 shrink-0 bg-slate-100 flex items-center justify-center">
                    {currentAccount.picture ? (
                      <img
                        src={currentAccount.picture}
                        alt={currentAccount.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                  <span className="hidden sm:inline group-hover:text-[#1C4C96] transition">
                    {isEn ? 'Your Profile' : 'Seu Perfil'}
                  </span>
                </button>

                {/* Account / Role Switcher */}
                <button
                  type="button"
                  onClick={onOpenAccountModal}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${roleBadge.bg} hover:opacity-90 transition cursor-pointer shadow-2xs`}
                  title={isEn ? 'Switch account or role' : 'Alternar perfil, função ou contas'}
                >
                  {roleBadge.icon}
                  <div className="text-left hidden sm:block">
                    <span className="block font-bold leading-tight">{currentAccount.name}</span>
                    <span className="text-[10px] opacity-75">{roleBadge.label}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>
              </>
            )}

            {!currentAccount && (
              <button
                type="button"
                onClick={onOpenAccountModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#000035] text-white text-xs font-bold hover:bg-[#062863] transition cursor-pointer shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.logIn}</span>
              </button>
            )}

            {/* Logout button */}
            {onLogout && currentAccount && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                title="Logout / Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};


