import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Layers,
  BookMarked,
  ArrowRight,
  CheckCircle2,
  Video,
  Headphones,
  Users,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  DayOfWeek,
  Language,
  RoutineItem,
  WeeklyHomeworkData,
  UserProfile,
  StudentDictionaryEntry,
} from '../types';
import { Translations, getTranslations } from '../utils/i18n';
import { DAYS_OF_WEEK } from '../utils/notifications';

interface StudentWeeklyActivitySectionProps {
  homework: WeeklyHomeworkData | null;
  routinesByDay: Record<DayOfWeek, RoutineItem[]>;
  userProfile?: UserProfile;
  onOpenHomeworkModal: () => void;
  onOpenDictionaryModal: () => void;
  currentLanguage: Language;
  dictionaryEntries?: StudentDictionaryEntry[];
  wordsFromRoutines?: Array<{ word: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>;
  onUpdateUserProfile?: (updated: Partial<UserProfile>) => void;
}

const WEEK_DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tus' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

interface WeeklyRoutineRow {
  id: string;
  time: string;
  titleEn: string;
  titlePt: string;
  icon: any;
}

const ROUTINE_ROWS: WeeklyRoutineRow[] = [
  {
    id: 'video_day',
    time: '07:30',
    titleEn: 'Video of the Day',
    titlePt: 'Vídeo do Dia',
    icon: Video,
  },
  {
    id: 'audio_day',
    time: '08:30',
    titleEn: 'Audio of the Day: Podcast or Music',
    titlePt: 'Áudio do Dia: Podcast ou Música',
    icon: Headphones,
  },
  {
    id: 'tutor_live',
    time: '15:00',
    titleEn: 'Chat with Your Native Friend',
    titlePt: 'Conversa com Seu Amigo Nativo',
    icon: Users,
  },
  {
    id: 'memorization',
    time: '21:30',
    titleEn: 'Memorization Activity & Consolidation',
    titlePt: 'Atividade de Memorização & Fixação',
    icon: BookOpen,
  },
];

export const StudentWeeklyActivitySection: React.FC<StudentWeeklyActivitySectionProps> = ({
  homework,
  routinesByDay,
  userProfile,
  onOpenHomeworkModal,
  onOpenDictionaryModal,
  currentLanguage,
  dictionaryEntries,
  wordsFromRoutines,
  onUpdateUserProfile,
}) => {
  const isEn = currentLanguage === 'en';
  const t = getTranslations(currentLanguage);
  const studentEmail = userProfile?.email || '';

  // Local state for dictionary entries loaded directly from server database
  const [loadedDictEntries, setLoadedDictEntries] = useState<StudentDictionaryEntry[]>([]);

  // Sync loaded entries whenever dictionaryEntries prop changes
  useEffect(() => {
    if (Array.isArray(dictionaryEntries)) {
      setLoadedDictEntries(dictionaryEntries);
    }
  }, [dictionaryEntries]);

  // Fetch dictionary directly from server database for the active student
  useEffect(() => {
    if (!studentEmail) return;
    let isMounted = true;
    fetch(`/api/student-dictionary?studentEmail=${encodeURIComponent(studentEmail)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setLoadedDictEntries((prev) => {
            const map = new Map<string, StudentDictionaryEntry>();
            prev.forEach((e) => {
              if (e && e.word) map.set(e.word.toLowerCase().trim(), e);
            });
            data.forEach((e: StudentDictionaryEntry) => {
              if (e && e.word) map.set(e.word.toLowerCase().trim(), e);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        console.warn('Error loading student dictionary for weekly activity counter:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [studentEmail]);

  // Total learned / practiced words calculation across student personal dictionary (saved by native friend or student), routines, and live sessions
  const totalWords = useMemo(() => {
    const uniqueWords = new Set<string>();

    // 1. Personal dictionary words (saved by native friends during live lessons or student)
    const activeDict = (dictionaryEntries && dictionaryEntries.length > 0)
      ? dictionaryEntries
      : loadedDictEntries;

    if (Array.isArray(activeDict)) {
      activeDict.forEach((entry) => {
        const clean = (entry?.word || '').trim().toLowerCase();
        if (clean) uniqueWords.add(clean);
      });
    }

    // 2. Words from routines and live lesson notes
    if (Array.isArray(wordsFromRoutines)) {
      wordsFromRoutines.forEach((item) => {
        const clean = (item?.word || '').trim().toLowerCase();
        if (clean) uniqueWords.add(clean);
      });
    }

    // 3. Directly inspect routinesByDay items
    if (routinesByDay && typeof routinesByDay === 'object') {
      Object.values(routinesByDay as Record<string, RoutineItem[]>).forEach((dayItems) => {
        if (Array.isArray(dayItems)) {
          dayItems.forEach((item) => {
            if (item?.learnedWords && Array.isArray(item.learnedWords)) {
              item.learnedWords.forEach((w) => {
                if (typeof w === 'string' && w.trim().length > 0) {
                  uniqueWords.add(w.trim().toLowerCase());
                }
              });
            }
          });
        }
      });
    }

    return uniqueWords.size;
  }, [dictionaryEntries, loadedDictEntries, wordsFromRoutines, routinesByDay]);

  // Target weekly chat sessions with native friend (default: 1 or from user profile)
  const initialTarget = userProfile?.weeklyNativeLessonsTarget || 1;
  const [weeklyNativeTarget, setWeeklyNativeTarget] = useState<number>(initialTarget);

  useEffect(() => {
    if (userProfile?.weeklyNativeLessonsTarget && userProfile.weeklyNativeLessonsTarget > 0) {
      setWeeklyNativeTarget(userProfile.weeklyNativeLessonsTarget);
    }
  }, [userProfile?.weeklyNativeLessonsTarget]);

  // 7-day checklist grid state: map of "stepId_dayKey" -> boolean
  // Starts with no markings (0%) and persists in backend server database for multi-device sync
  const [weeklyChecks, setWeeklyChecks] = useState<Record<string, boolean>>({});

  // Fetch weekly checks and weekly native target from server API for multi-device sync
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/routines/weekly-checks?studentEmail=${encodeURIComponent(studentEmail)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data) {
          if (data.checks) {
            setWeeklyChecks(data.checks);
          }
          if (typeof data.weeklyNativeLessonsTarget === 'number' && data.weeklyNativeLessonsTarget > 0) {
            setWeeklyNativeTarget(data.weeklyNativeLessonsTarget);
          }
        }
      })
      .catch((err) => {
        console.warn('Error loading weekly checks from server:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [studentEmail]);

  const handleTargetChange = (newTarget: number) => {
    const safeTarget = Math.max(1, Math.min(7, newTarget));
    setWeeklyNativeTarget(safeTarget);
    if (onUpdateUserProfile) {
      onUpdateUserProfile({ weeklyNativeLessonsTarget: safeTarget });
    }
    fetch('/api/routines/weekly-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail,
        checks: weeklyChecks,
        weeklyNativeLessonsTarget: safeTarget,
      }),
    }).catch((err) => {
      console.warn('Error saving weeklyNativeLessonsTarget to server:', err);
    });
  };

  const toggleCheck = (stepId: string, dayKey: DayOfWeek) => {
    const key = `${stepId}_${dayKey}`;
    setWeeklyChecks((prev) => {
      const updated = {
        ...prev,
        [key]: !prev[key],
      };
      // Persist directly to backend database
      fetch('/api/routines/weekly-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail,
          checks: updated,
          weeklyNativeLessonsTarget: weeklyNativeTarget,
        }),
      }).catch((err) => {
        console.warn('Error saving weekly checks to server:', err);
      });
      return updated;
    });
  };

  // Count completed days per routine row
  const checkedCounts = useMemo(() => {
    const counts: Record<string, number> = {
      video_day: 0,
      audio_day: 0,
      tutor_live: 0,
      memorization: 0,
    };
    WEEK_DAYS.forEach((d) => {
      ROUTINE_ROWS.forEach((row) => {
        if (weeklyChecks[`${row.id}_${d.key}`]) {
          counts[row.id] = (counts[row.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [weeklyChecks]);

  // Pillar completion ratios (0.0 to 1.0 capped)
  // Daily habits (Video, Audio, Memorization) have a 7-day weekly base.
  // Chat with Native Friend uses the student's dynamic weekly target (e.g. 1 or 2 sessions/week).
  const videoRatio = Math.min(1, (checkedCounts.video_day || 0) / 7);
  const audioRatio = Math.min(1, (checkedCounts.audio_day || 0) / 7);
  const nativeRatio = Math.min(1, (checkedCounts.tutor_live || 0) / Math.max(1, weeklyNativeTarget));
  const memoRatio = Math.min(1, (checkedCounts.memorization || 0) / 7);

  // Evolution of the Week progress percentage
  // Each of the 4 routine pillars has equal weight (25%).
  // Reaching the configured weekly goal of native chats awards 100% of that pillar (25% toward the total).
  const progressPercent = Math.min(
    100,
    Math.round(((videoRatio + audioRatio + nativeRatio + memoRatio) / 4) * 100)
  );

  // S Path SVG calculation
  const pathTotalLength = 220;
  const strokeDashoffset = pathTotalLength - (progressPercent / 100) * pathTotalLength;

  return (
    <div className="space-y-4" id="weekly-activity-section">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-br from-[#000035] via-[#062863] to-[#1C4C96] text-white rounded-3xl p-5 border border-[#1C4C96] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] text-[#9AB4FF] flex items-center justify-center shrink-0 border border-[#9AB4FF]/40 shadow-xs">
            <BookOpen className="w-5 h-5 text-[#9AB4FF]" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">
              {isEn ? 'Weekly Activity' : 'Atividade Semanal'}
            </h2>
            <p className="text-xs text-[#9AB4FF]/85 mt-0.5">
              {isEn
                ? 'Review your vocabulary, practice interactive exercises, and track your weekly S-path fluency.'
                : 'Revise seu vocabulário, pratique exercícios interativos e acompanhe o avanço do seu S da fluência.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Card: Memorization Activity — Routine Vocabulary */}
      <div className="bg-gradient-to-br from-[#000035] via-[#062863] to-[#1C4C96] text-white rounded-3xl p-5 sm:p-6 border border-[#1C4C96] shadow-md space-y-5">
        {/* Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#607EC9]/40 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#1C4C96] text-white flex items-center justify-center shrink-0 border border-[#9AB4FF]/50 shadow-xs">
              <BookOpen className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {isEn
                    ? 'Memorization Activity — Routine Vocabulary'
                    : 'Atividade de Memorização — Vocabulário da Rotina'}
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-[#000035]/60 text-[#9AB4FF] border border-[#9AB4FF]/40 rounded-full uppercase tracking-wider">
                  {isEn ? 'Weekly Memorization Review' : 'Revisão Semanal de Memorização'}
                </span>
              </div>
              <p className="text-xs text-[#9AB4FF]/85 leading-relaxed max-w-2xl">
                {isEn
                  ? 'All words and expressions you typed during your Monday-to-Sunday routines are gathered here into light, engaging memorization exercises, phrases, and text.'
                  : 'Todas as palavras e expressões que você digitou durante suas rotinas de segunda a domingo estão reunidas aqui em exercícios leves de fixação, frases e texto.'}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={onOpenDictionaryModal}
              className="px-3.5 py-2.5 bg-[#000035]/80 hover:bg-[#000035] text-white rounded-2xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md border border-[#9AB4FF]/40"
            >
              <BookMarked className="w-4 h-4 text-[#F4CA54]" />
              <span>{isEn ? 'My Dictionary' : 'Meu Dicionário'}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F4CA54] text-[#000035]">
                {totalWords}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenHomeworkModal}
              className="px-4 py-2.5 bg-[#607EC9] hover:bg-[#1C4C96] text-white rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg border border-[#9AB4FF]/60 active:scale-98"
            >
              <BookOpen className="w-4 h-4 text-white" />
              <span>{isEn ? 'Open Memorization Activity →' : 'Abrir Atividade de Memorização →'}</span>
            </button>
          </div>
        </div>

        {/* 3 Metric / Feature Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Metric 1: Learned Words */}
          <div className="p-3.5 bg-[#000035]/60 rounded-2xl border border-[#607EC9]/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1C4C96]/60 flex items-center justify-center text-[#9AB4FF] shrink-0 border border-[#9AB4FF]/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#9AB4FF]/75 font-bold block uppercase tracking-wider">
                {isEn ? 'Learned Words' : 'Palavras Praticadas'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-white font-mono">
                  {totalWords}
                </span>
                <span className="text-[10px] text-[#9AB4FF]/80">
                  {isEn ? 'in your routine' : 'na sua rotina'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Practice Modules */}
          <div className="p-3.5 bg-[#000035]/60 rounded-2xl border border-[#607EC9]/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1C4C96]/60 flex items-center justify-center text-[#9AB4FF] shrink-0 border border-[#9AB4FF]/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#9AB4FF]/75 font-bold block uppercase tracking-wider">
                {isEn ? 'Practice Modules' : 'Módulos Práticos'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-white font-mono">5</span>
                <span className="text-[10px] text-[#9AB4FF]/80">
                  {isEn ? 'interactive exercises' : 'exercícios interativos'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Access My Dictionary */}
          <button
            type="button"
            onClick={onOpenDictionaryModal}
            className="p-3.5 bg-[#000035]/60 hover:bg-[#000035] rounded-2xl border border-[#607EC9]/40 hover:border-[#9AB4FF] transition flex items-center justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#1C4C96]/60 flex items-center justify-center text-[#F4CA54] shrink-0 border border-[#9AB4FF]/30">
                <BookMarked className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#9AB4FF]/75 font-bold block uppercase tracking-wider">
                  {isEn ? 'Access My Dictionary' : 'Acessar Meu Dicionário'}
                </span>
                <p className="text-[10px] text-white font-semibold truncate mt-0.5">
                  {isEn ? 'English definitions & examples' : 'Definições e exemplos em inglês'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#9AB4FF] group-hover:translate-x-1 transition shrink-0" />
          </button>
        </div>
      </div>

      {/* 3. Bottom Card: 2-Column S-Fluency Path & 7-Day Checklist Grid */}
      <div className="bg-gradient-to-br from-[#000035] via-[#062863] to-[#1C4C96] text-white rounded-3xl p-5 sm:p-6 border border-[#1C4C96] shadow-md space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: S-Curve Vector & Weekly Progress */}
          <div className="lg:col-span-4 bg-[#000035]/70 rounded-2xl p-4 border border-[#607EC9]/40 flex flex-col justify-between space-y-4">
            {/* Badges & Heading */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-[#1C4C96] text-[#9AB4FF] rounded-full uppercase border border-[#9AB4FF]/40">
                  {isEn ? 'Your Path to Fluency' : 'Seu Caminho para a Fluência'}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-[#000035] text-[#F4CA54] rounded-full border border-[#F4CA54]/40 uppercase">
                  {isEn ? 'Weekly Tracker' : 'Acompanhamento Semanal'}
                </span>
              </div>

              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#F4CA54] font-mono">
                  {progressPercent}%
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {isEn ? 'Evolution of the Week' : 'Evolução da Semana'}
                </span>
              </div>

              <p className="text-[11px] text-[#9AB4FF]/85 leading-snug">
                {isEn
                  ? 'With each routine completed in your week, the path illuminates towards natural fluency.'
                  : 'A cada rotina realizada na sua semana, o caminho do S se ilumina até a fluência natural.'}
              </p>
            </div>

            {/* The Animated S-Curve Vector */}
            <div className="relative w-full aspect-square max-w-[200px] mx-auto flex items-center justify-center py-2">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full drop-shadow-md"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="sTrackBgWeekly" x1="15" y1="85" x2="85" y2="15" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1C4C96" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#607EC9" stopOpacity="0.3" />
                  </linearGradient>

                  <linearGradient id="sTrackActiveWeekly" x1="15" y1="85" x2="85" y2="15" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#9AB4FF" />
                    <stop offset="50%" stopColor="#607EC9" />
                    <stop offset="85%" stopColor="#9AB4FF" />
                    <stop offset="100%" stopColor="#F4CA54" />
                  </linearGradient>

                  <radialGradient id="fluencyGlowWeekly" cx="80" cy="20" r="16" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFBEB" />
                    <stop offset="45%" stopColor="#F4CA54" />
                    <stop offset="100%" stopColor="#F4CA54" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Orbit / Horizon lines */}
                <ellipse
                  cx="50"
                  cy="50"
                  rx="42"
                  ry="25"
                  transform="rotate(-25 50 50)"
                  stroke="#607EC9"
                  strokeOpacity="0.35"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="26"
                  ry="42"
                  transform="rotate(-25 50 50)"
                  stroke="#607EC9"
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Inactive S Path background (empty track) */}
                <path
                  d="M 24 78 C 36 86, 68 84, 68 66 C 68 52, 32 48, 32 34 C 32 18, 62 14, 76 22"
                  stroke="url(#sTrackBgWeekly)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Active S Path illuminated progress */}
                <path
                  d="M 24 78 C 36 86, 68 84, 68 66 C 68 52, 32 48, 32 34 C 32 18, 62 14, 76 22"
                  stroke="url(#sTrackActiveWeekly)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pathTotalLength}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700 ease-out"
                />

                {/* Inner dashed road line */}
                <path
                  d="M 26 78 C 36 85, 66 83, 66 66 C 66 53, 34 47, 34 34 C 34 20, 60 16, 74 22"
                  stroke="#000035"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />

                {/* Milestone Checkpoint Dots along the S curve */}
                <circle cx="24" cy="78" r="4" fill={progressPercent >= 20 ? '#9AB4FF' : '#1C4C96'} stroke="#000035" strokeWidth="1.5" />
                <circle cx="66" cy="66" r="4" fill={progressPercent >= 45 ? '#9AB4FF' : '#1C4C96'} stroke="#000035" strokeWidth="1.5" />
                <circle cx="32" cy="34" r="4" fill={progressPercent >= 70 ? '#9AB4FF' : '#1C4C96'} stroke="#000035" strokeWidth="1.5" />
                <circle cx="76" cy="22" r="4" fill={progressPercent >= 100 ? '#F4CA54' : '#1C4C96'} stroke="#000035" strokeWidth="1.5" />

                {/* Fluency Beacon Star at top right */}
                <circle cx="80" cy="20" r="10" fill="url(#fluencyGlowWeekly)" />
                <circle cx="80" cy="20" r="5" fill={progressPercent === 100 ? '#FFFBEB' : '#F4CA54'} />
                <path
                  d="M80 8 L80 13 M80 27 L80 32 M68 20 L73 20 M87 20 L92 20"
                  stroke="#F4CA54"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={progressPercent === 100 ? 'animate-spin origin-[80px_20px]' : ''}
                />
              </svg>

              {/* S Symbol Floating Badge */}
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-[#000035] border border-[#F4CA54] rounded-lg text-[9px] font-black text-[#F4CA54] shadow-md flex items-center gap-1">
                <span>S</span>
                <span className="text-[8px] text-[#9AB4FF]">PATH</span>
              </div>
            </div>

            {/* Bottom Progress details */}
            <div className="space-y-1.5 pt-2 border-t border-[#607EC9]/30">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-white uppercase">
                  {isEn ? 'Path Traveled This Week:' : 'Caminho Percorrido na Semana:'}
                </span>
                <span className="text-[#F4CA54] font-mono">{progressPercent}%</span>
              </div>

              <div className="w-full bg-[#000035] rounded-full h-2 overflow-hidden border border-[#607EC9]/40">
                <div
                  className="bg-gradient-to-r from-[#9AB4FF] via-[#607EC9] to-[#F4CA54] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-[10px] text-[#9AB4FF]/80 italic text-center pt-1">
                {isEn
                  ? 'Mark your daily activities to track your evolution along the S path to fluency.'
                  : 'Marque suas atividades diárias para acompanhar sua evolução no caminho do S até a fluência natural.'}
              </p>
            </div>
          </div>

          {/* Right Column: Interactive 7-Day Routine Checklist Table */}
          <div className="lg:col-span-8 bg-[#000035]/70 rounded-2xl p-4 border border-[#607EC9]/40 space-y-3">
            {/* Header with Title & Day Columns */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#607EC9]/40 pb-2.5">
              <span className="text-xs font-bold text-white">
                {isEn
                  ? 'Mark your completed activities for each day of the week:'
                  : 'Acompanhe e marque suas atividades realizadas na semana:'}
              </span>

              {/* 7 Days Header Pill */}
              <div className="grid grid-cols-7 gap-1 bg-[#062863] px-2 py-1 rounded-xl border border-[#1C4C96] text-center">
                {WEEK_DAYS.map((d) => (
                  <span key={d.key} className="text-[9px] font-mono font-black text-[#9AB4FF] uppercase w-6">
                    {d.label}
                  </span>
                ))}
              </div>
            </div>

            {/* 4 Routine Rows */}
            <div className="space-y-2">
              {ROUTINE_ROWS.map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.id}
                    className="p-2.5 sm:p-3 bg-[#062863]/60 rounded-xl border border-[#1C4C96]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    {/* Step Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#000035] text-[#9AB4FF] flex items-center justify-center shrink-0 border border-[#9AB4FF]/30 shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        {(() => {
                          const displayTime =
                            row.id === 'video_day'
                              ? userProfile?.routineVideoTime || row.time
                              : row.id === 'audio_day'
                              ? userProfile?.routineAudioTime || row.time
                              : row.time;
                          return (
                            <span className="text-[11px] font-mono font-bold text-[#9AB4FF] px-1.5 py-0.5 rounded bg-[#000035]/70 border border-[#9AB4FF]/20 shrink-0">
                              {displayTime}
                            </span>
                          );
                        })()}
                        <h4 className="text-xs sm:text-sm font-black text-white truncate">
                          {isEn ? row.titleEn : row.titlePt}
                        </h4>
                        {row.id === 'tutor_live' && (
                          <div className="inline-flex items-center gap-1.5 flex-wrap">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#000035]/80 border border-[#9AB4FF]/30 text-[10px] text-[#9AB4FF] shadow-xs">
                              <span className="text-[#9AB4FF]/70 text-[9px] font-semibold uppercase">{isEn ? 'Goal:' : 'Meta:'}</span>
                              <select
                                value={weeklyNativeTarget}
                                onChange={(e) => handleTargetChange(Number(e.target.value))}
                                className="bg-transparent text-[#F4CA54] font-black cursor-pointer focus:outline-hidden text-[10px]"
                                title={isEn ? 'Weekly native chat frequency goal' : 'Frequência de aulas semanais com o nativo'}
                              >
                                <option value={1} className="bg-[#000035] text-white">1x {isEn ? '/ week' : '/ semana'}</option>
                                <option value={2} className="bg-[#000035] text-white">2x {isEn ? '/ week' : '/ semana'}</option>
                                <option value={3} className="bg-[#000035] text-white">3x {isEn ? '/ week' : '/ semana'}</option>
                                <option value={4} className="bg-[#000035] text-white">4x {isEn ? '/ week' : '/ semana'}</option>
                                <option value={5} className="bg-[#000035] text-white">5x {isEn ? '/ week' : '/ semana'}</option>
                                <option value={7} className="bg-[#000035] text-white">7x {isEn ? '/ week' : '/ semana'}</option>
                              </select>
                            </div>
                            {(checkedCounts.tutor_live || 0) >= weeklyNativeTarget ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-extrabold uppercase tracking-wide">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                <span>{isEn ? 'Goal met' : 'Meta atingida'} ({(checkedCounts.tutor_live || 0)}/{weeklyNativeTarget})</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#9AB4FF]/75 font-bold">
                                ({(checkedCounts.tutor_live || 0)}/{weeklyNativeTarget} {isEn ? 'completed' : 'concluída' + (weeklyNativeTarget > 1 ? 's' : '')})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 7 Interactive Day Check Circles */}
                    <div className="grid grid-cols-7 gap-1 shrink-0 self-end sm:self-auto">
                      {WEEK_DAYS.map((d) => {
                        const isChecked = Boolean(weeklyChecks[`${row.id}_${d.key}`]);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => toggleCheck(row.id, d.key)}
                            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95"
                            title={`${isEn ? row.titleEn : row.titlePt} (${d.label})`}
                          >
                            {isChecked ? (
                              <div className="w-5 h-5 rounded-full bg-[#1C4C96] text-[#9AB4FF] flex items-center justify-center border border-[#9AB4FF] shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#9AB4FF]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[#607EC9]/50 hover:border-[#9AB4FF] transition bg-[#000035]/40" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
