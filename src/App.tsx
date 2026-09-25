import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DayOfWeek,
  EnglishLevel,
  GoogleAccount,
  LiveLesson,
  NotificationItem,
  RoutineItem,
  StudentProfile,
  TeacherAssignedVideo,
  TeacherAssignedSpotify,
  TeacherMeetSettings,
  UserProfile,
  UserRole,
  WeeklyHomeworkData,
  Language,
  AdminLandingContent,
  NativeFriendTutor,
  StudentDictionaryEntry,
  LiveLessonVocabNote,
  DailyJournalEntry,
  WritingEvaluationResult,
} from './types';
import { defaultRoutinesByDay } from './data/defaultRoutines';
import { INITIAL_NATIVE_FRIENDS } from './data/tutors';
import { getTranslations, getActivityDisplayName } from './utils/i18n';
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  findTeacherLessonConflict,
  DEFAULT_STUDENT_TIMEZONE,
  DEFAULT_TEACHER_TIMEZONE,
} from './utils/timezone';
import { getTodayDayOfWeek } from './utils/notifications';
import { generateWeeklyHomeworkFromRoutines, generateWeeklyHomeworkWithAi } from './utils/homeworkGenerator';
import { normalizeStudentLevel, fetchTracksForStudentLevel } from './utils/spotify';
import { executeStartNewWeek } from './utils/StartNewWeekHandler';
import { addVideoToWatchedHistoryInFirestore, addTrackToListenedHistoryInFirestore } from './hooks/useRoutine';
import { recordConsumedVideo, recordConsumedTrack } from './hooks/useStudentHistory';
import { extractYouTubeVideoId, getYouTubeWatchUrl } from './utils/youtube';

// Components
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { FindTutorsSection } from './components/FindTutorsSection';
import { EnglishMomentsShowcase } from './components/EnglishMomentsShowcase';
import { CleanActivitySidebar } from './components/CleanActivitySidebar';
import { VideoLearningWorkspace } from './components/VideoLearningWorkspace';
import { DailySentenceSection } from './components/DailySentenceSection';
import { WeeklyHomeworkSection } from './components/WeeklyHomeworkSection';
import { TeacherScheduleControlTable } from './components/TeacherScheduleControlTable';
import { LiveMeetLessonsPanel } from './components/LiveMeetLessonsPanel';
import { TeacherLiveLessonNotesPanel } from './components/TeacherLiveLessonNotesPanel';
import { NativeFriendLessonInsights } from './components/NativeFriendLessonInsights';
import { TeacherSpotifyRoutineTracker } from './components/TeacherSpotifyRoutineTracker';
import { TeacherMediaAssignmentPanel } from './components/TeacherMediaAssignmentPanel';
import { SFluencyTracker } from './components/SFluencyTracker';
import { NotificationBanner } from './components/NotificationBanner';
import { StudentHeaderSection } from './components/StudentHeaderSection';
import { StudentRoutineGuideSection } from './components/StudentRoutineGuideSection';
import { StudentWeeklyActivitySection } from './components/StudentWeeklyActivitySection';

// Modals
import { AuthModal } from './components/AuthModal';
import { LoginModal } from './components/LoginModal';
import { BecomeTutorModal } from './components/BecomeTutorModal';
import { WeeklyHomeworkModal } from './components/WeeklyHomeworkModal';
import { LiveLessonScheduleModal } from './components/LiveLessonScheduleModal';
import { StudentManagementModal } from './components/StudentManagementModal';
import { TeacherMeetConfigModal } from './components/TeacherMeetConfigModal';
import { RescheduleModal } from './components/RescheduleModal';
import { NotCompletedModal } from './components/NotCompletedModal';
import { EmailNotificationModal } from './components/EmailNotificationModal';
import { DailySentenceModal } from './components/DailySentenceModal';
import { AdminLandingEditorModal } from './components/AdminLandingEditorModal';
import { AdminApprovalsModal } from './components/AdminApprovalsModal';
import { EditTutorProfileModal } from './components/EditTutorProfileModal';
import { StudentProfileModal } from './components/StudentProfileModal';
import { PersonalDictionaryModal } from './components/PersonalDictionaryModal';
import { StudentJournalModal } from './components/StudentJournalModal';
import {
  saveStudentVocabularyToFirestore,
  fetchStudentVocabularyFromFirestore,
  saveStudentJournalEntryToFirestore,
  fetchStudentJournalFromFirestore,
  saveLiveLessonToFirestore,
  updateLiveLessonInFirestore,
  deleteLiveLessonFromFirestore,
  fetchStudentLessonsFromFirestore,
  saveStudentWeeklyChecksToFirestore,
  fetchStudentWeeklyChecksFromFirestore,
  recordActivityInStudentJournal,
  removeActivityFromStudentJournal,
  subscribeToStudentJournal,
  fetchStudentJournalActivitiesFromFirestore,
  getDateForDayInCurrentWeek,
  getTodayIsoDate,
  mapStepIdToJournalType,
  deriveWeeklyChecksFromJournal,
} from './utils/studentPersistence';
import { StudentJournalEntry } from './types';
import { ManageSubscriptionModal } from './components/ManageSubscriptionModal';
import { RoutineRemindersManager } from './components/RoutineRemindersManager';
import { OnboardingWizardModal, OnboardingResultData } from './components/OnboardingWizardModal';
import { StartLivingEmailModal } from './components/StartLivingEmailModal';
import { ShieldCheck, Edit3, Sparkles, Headphones, BookOpen, Video, X, User, CheckCircle2, ChevronRight, MessageSquareQuote, Layers } from 'lucide-react';

const createDefaultStudentProfile = (account?: GoogleAccount | null): UserProfile => ({
  id: account?.id || (account?.email ? `usr-${account.email.replace(/[^a-zA-Z0-9]/g, '-')}` : 'user-default'),
  name: account?.name || '',
  email: account?.email || '',
  picture: account?.picture || '',
  avatar: account?.picture || '',
  level: EnglishLevel.BEGINNER,
  streakDays: 0,
  streakCount: 0,
  points: 0,
  dailyGoalMinutes: 30,
  completedTodayMinutes: 0,
  targetAudienceCategory: 'general',
  timezone: DEFAULT_STUDENT_TIMEZONE,
  contractedLessons: 0,
  completedLessonsCount: 0,
  learningGoal: '',
  routineVideoTime: '',
  routineAudioTime: '',
  dailyPhraseTime: '',
  weeklyNativeLessonsTarget: 1,
});

const isOldAudioActivity = (act: RoutineItem) => {
  const id = String(act?.id || '');
  const name = (act?.activityName || '').toLowerCase();
  return (
    id.endsWith('2') ||
    name.includes('escuta ativa') ||
    name.includes('podcast diário') ||
    name.includes('podcast diario') ||
    name.includes('(áudio)') ||
    name.includes('(audio)')
  );
};

const applyProfileTimesToRoutines = (
  baseRoutines: Record<DayOfWeek, RoutineItem[]>,
  videoTime?: string,
  _audioTime?: string
): Record<DayOfWeek, RoutineItem[]> => {
  const source = baseRoutines && Object.keys(baseRoutines).length > 0 ? baseRoutines : defaultRoutinesByDay;
  const cloned: Record<DayOfWeek, RoutineItem[]> = {} as any;
  (Object.keys(source) as DayOfWeek[]).forEach((day) => {
    let videoTimeApplied = false;

    // Completely remove old audio activity from routine timeline
    const rawList = (source[day] || []).filter((act) => !isOldAudioActivity(act));
    const dayList = rawList.length > 0 ? rawList : defaultRoutinesByDay[day] || [];

    cloned[day] = dayList.map((act, index) => {
      // Strictly target exclusively the ONE primary Video of the Day activity for this day
      const isVideoOfTheDay =
        !videoTimeApplied &&
        Boolean(videoTime) &&
        (act.id.endsWith('1') ||
          (act.teacherVideos && act.teacherVideos.length > 0) ||
          act.activityName?.toLowerCase().includes('vídeo') ||
          act.activityName?.toLowerCase().includes('video') ||
          index === 0);

      if (isVideoOfTheDay && videoTime) {
        videoTimeApplied = true;
        return { ...act, time: videoTime };
      }

      return { ...act };
    });
  });
  return cloned;
};

export default function App() {
  // 0. View mode: 'landing' | 'dashboard' | 'find-tutors'
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard' | 'find-tutors'>('landing');

  // 1. Language & i18n
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const t = useMemo(() => getTranslations(currentLanguage), [currentLanguage]);

  // 2. Authentication & Accounts
  const [currentAccount, setCurrentAccount] = useState<GoogleAccount | null>(() => {
    try {
      const saved = localStorage.getItem('its_simple_current_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [availableAccounts, setAvailableAccounts] = useState<GoogleAccount[]>(() => {
    try {
      const saved = localStorage.getItem('its_simple_available_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      if (currentAccount) {
        localStorage.setItem('its_simple_current_account', JSON.stringify(currentAccount));
      } else {
        localStorage.removeItem('its_simple_current_account');
      }
    } catch {}
  }, [currentAccount]);

  useEffect(() => {
    try {
      if (availableAccounts && availableAccounts.length > 0) {
        localStorage.setItem('its_simple_available_accounts', JSON.stringify(availableAccounts));
      }
    } catch {}
  }, [availableAccounts]);

  const isTeacher = currentAccount ? (currentAccount.role === 'teacher' || currentAccount.role === 'admin') : false;

  // 2.1 Tutors & Admin Content State
  const [tutors, setTutors] = useState<NativeFriendTutor[]>(INITIAL_NATIVE_FRIENDS);
  const [landingContent, setLandingContent] = useState<AdminLandingContent | null>(null);

  // 3. Student Profile & Level - strictly isolated per account
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    createDefaultStudentProfile(currentAccount)
  );

  // 4. Routines State by Day (Auto-positions on today's focus)
  const [routinesByDay, setRoutinesByDay] = useState<Record<DayOfWeek, RoutineItem[]>>(defaultRoutinesByDay);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getTodayDayOfWeek());
  const [selectedActivityId, setSelectedActivityId] = useState<string>(() => {
    const today = getTodayDayOfWeek();
    const todayActs = defaultRoutinesByDay[today];
    return todayActs && todayActs.length > 0 ? todayActs[0].id : 'm1';
  });

  // 5. Live Lessons State
  const [lessons, setLessons] = useState<LiveLesson[]>([]);
  const [teacherMeetSettings, setTeacherMeetSettings] = useState<Record<string, TeacherMeetSettings>>({
    'itissimple.school@gmail.com': {
      teacherEmail: 'itissimple.school@gmail.com',
      meetLink: 'https://meet.google.com/gmt-kxnw-zpq',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
      slotDurationMinutes: 30,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      timezone: 'America/Toronto',
    },
  });

  const [contractedLessons, setContractedLessons] = useState<Record<string, number>>({});

  // 6. Students Management State
  const [students, setStudents] = useState<StudentProfile[]>([]);

  // 7. Weekly Homework State
  const [weeklyHomework, setWeeklyHomework] = useState<WeeklyHomeworkData | null>(null);
  const [homeworkTargetDay, setHomeworkTargetDay] = useState<DayOfWeek>(getTodayDayOfWeek());

  // 7b. S-Path (Gráfico S) Weekly Checks & Student Journal State (Multi-device Single Source of Truth)
  const [weeklyChecks, setWeeklyChecks] = useState<Record<string, boolean>>({});
  const [studentJournal, setStudentJournal] = useState<StudentJournalEntry[]>([]);

  // 8. Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 9. Modals Control State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [authModalRole, setAuthModalRole] = useState<UserRole>('student');
  const [isBecomeTutorModalOpen, setIsBecomeTutorModalOpen] = useState<boolean>(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isStudentMgmtModalOpen, setIsStudentMgmtModalOpen] = useState<boolean>(false);
  const [isMeetConfigModalOpen, setIsMeetConfigModalOpen] = useState<boolean>(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState<boolean>(false);
  const [isNotCompletedModalOpen, setIsNotCompletedModalOpen] = useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isDailySentenceModalOpen, setIsDailySentenceModalOpen] = useState<boolean>(false);
  const [isAdminLandingEditorOpen, setIsAdminLandingEditorOpen] = useState<boolean>(false);
  const [isAdminApprovalsOpen, setIsAdminApprovalsOpen] = useState<boolean>(false);
  const [isEditTutorProfileOpen, setIsEditTutorProfileOpen] = useState<boolean>(false);
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState<boolean>(false);
  const [isPersonalDictionaryOpen, setIsPersonalDictionaryOpen] = useState<boolean>(false);
  const [studentDictionaryEntries, setStudentDictionaryEntries] = useState<StudentDictionaryEntry[]>([]);
  const [dailyJournalEntries, setDailyJournalEntries] = useState<DailyJournalEntry[]>([]);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);
  const [isManageSubscriptionOpen, setIsManageSubscriptionOpen] = useState<boolean>(false);
  const [subscriptionTargetTutor, setSubscriptionTargetTutor] = useState<NativeFriendTutor | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);
  const [isOnboardingCompleting, setIsOnboardingCompleting] = useState<boolean>(false);
  const [isStartLivingModalOpen, setIsStartLivingModalOpen] = useState<boolean>(false);
  const [onboardingInitialEmail, setOnboardingInitialEmail] = useState<string>('');
  const [authInitialEmail, setAuthInitialEmail] = useState<string>('');
  const [isStartingNewWeek, setIsStartingNewWeek] = useState<boolean>(false);

  const [activeLessonForAction, setActiveLessonForAction] = useState<LiveLesson | null>(null);
  const [teacherEmailForConfig, setTeacherEmailForConfig] = useState<string>('itissimple.school@gmail.com');
  const [scheduleStudentInfo, setScheduleStudentInfo] = useState<{ email: string; name: string; uid?: string } | null>(null);

  // Teacher Filter & Minimalist Activity Toggle
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [activeStudentActivity, setActiveStudentActivity] = useState<'insights' | 'notes' | 'videos_songs' | null>('insights');
  const [videosAndSongsSubTab, setVideosAndSongsSubTab] = useState<'videos' | 'songs'>('videos');

  const handleSelectStudentFilter = (studentEmail: string) => {
    setSelectedStudentFilter(studentEmail);
    if (studentEmail !== 'all') {
      setActiveStudentActivity('insights');
      setTimeout(() => {
        const el = document.getElementById('filtered-student-workspace');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleToggleStudentActivity = (act: 'insights' | 'notes' | 'videos_songs') => {
    setActiveStudentActivity((prev) => (prev === act ? null : act));
    setTimeout(() => {
      const el = document.getElementById('filtered-student-workspace');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 10. Fetch initial data from server on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [routinesRes, lessonsRes, studentsRes, settingsRes, landingRes, tutorsRes] = await Promise.all([
          fetch('/api/routines').catch(() => null),
          fetch('/api/lessons').catch(() => null),
          fetch('/api/students').catch(() => null),
          fetch('/api/teacher-settings').catch(() => null),
          fetch('/api/landing-content').catch(() => null),
          fetch('/api/tutors').catch(() => null),
        ]);

        if (routinesRes && routinesRes.ok) {
          const data = await routinesRes.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            setRoutinesByDay(data);
          }
        }

        if (lessonsRes && lessonsRes.ok) {
          const data = await lessonsRes.json();
          if (Array.isArray(data)) {
            setLessons(data);
          }
        }

        if (studentsRes && studentsRes.ok) {
          const data = await studentsRes.json();
          if (Array.isArray(data)) {
            setStudents(data);
          }
        }

        if (settingsRes && settingsRes.ok) {
          const data = await settingsRes.json();
          if (data && typeof data === 'object') {
            setTeacherMeetSettings((prev) => ({ ...prev, ...data }));
          }
        }

        if (landingRes && landingRes.ok) {
          const data = await landingRes.json();
          if (data && typeof data === 'object') {
            setLandingContent(data);
          }
        }

        if (tutorsRes && tutorsRes.ok) {
          const data = await tutorsRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setTutors(data);
          }
        }
      } catch (err) {
        console.warn('Using local default state:', err);
      }
    }

    loadInitialData();
  }, []);

  // Check for direct /admin or #admin URL trigger
  useEffect(() => {
    const handleAdminRouteCheck = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const hash = window.location.hash;
        if (path === '/admin' || hash === '#admin') {
          if (currentAccount?.role === 'admin') {
            setIsAdminApprovalsOpen(true);
          } else if (!currentAccount) {
            // Only prompt admin modal if user is strictly not logged in
            setAuthModalMode('login');
            setAuthModalRole('admin');
            setIsAuthModalOpen(true);
          } else {
            // Logged in as student or native friend: redirect safely to dashboard
            try {
              window.history.replaceState({}, '', '/dashboard');
            } catch {}
          }
        }
      }
    };
    handleAdminRouteCheck();
    window.addEventListener('popstate', handleAdminRouteCheck);
    return () => window.removeEventListener('popstate', handleAdminRouteCheck);
  }, [currentAccount]);

  // Compute current day's routine items
  const currentDayRoutines = useMemo(() => {
    return routinesByDay[selectedDay] || [];
  }, [routinesByDay, selectedDay]);

  // Compute currently selected activity
  const currentActivity = useMemo(() => {
    return currentDayRoutines.find((item) => item.id === selectedActivityId) || currentDayRoutines[0] || null;
  }, [currentDayRoutines, selectedActivityId]);

  // Generate Weekly Homework automatically whenever routines, dictionary, or targetDay change
  useEffect(() => {
    const customWordList = studentDictionaryEntries.map((e) => ({
      word: e.word,
      definitionEn: e.definitionEn,
      exampleSentence: e.exampleSentenceEn,
      translationPt: e.translationPt || '',
      sourceActivityName: e.sourceActivityName || 'Live Session',
      sourceDay: (e as any).sourceDay,
    }));

    const generated = generateWeeklyHomeworkFromRoutines({
      routinesByDay,
      studentName: userProfile.name,
      studentLevel: userProfile.level,
      studentEmail: currentAccount?.email || userProfile.email,
      customWords: customWordList,
      targetDay: homeworkTargetDay,
      activeStudyDays: userProfile?.weeklyStudyDays,
      weeklyCycle: userProfile?.weeklyCycle || 1,
      userProfile,
    });

    // If we already have an AI-generated homework and the collected words haven't changed, preserve it (unless it was generated with old template)!
    setWeeklyHomework((prev) => {
      if (prev?.isAiGenerated && !prev.isEmpty && prev.totalWordsCollected > 0 && prev.targetDay === homeworkTargetDay) {
        const prevText = prev.readingPassage?.text || '';
        const prevTextLower = prevText.toLowerCase();
        const isBadOldStory =
          prevText.includes('to make sure everything stayed aligned') ||
          prevText.includes('quick to ') ||
          prevText.includes('refreshing weather') ||
          prevText.includes('storm terms') ||
          prevTextLower.includes('the day began with great purpose as') ||
          prevTextLower.includes('reviewed key plans regarding') ||
          prevTextLower.includes('a productive day of focus and growth') ||
          prevTextLower.includes('address **') ||
          prevTextLower.includes('managing **') ||
          prevTextLower.includes('progress made on **') ||
          prevText.length < 80;

        if (!isBadOldStory) {
          const prevWords = prev.vocabularyList.map((w) => w.word.toLowerCase()).sort().join('|');
          const nextWords = generated.vocabularyList.map((w) => w.word.toLowerCase()).sort().join('|');
          if (prevWords === nextWords) {
            return prev;
          }
        }
      }
      return generated;
    });
  }, [routinesByDay, userProfile.name, userProfile.level, studentDictionaryEntries, homeworkTargetDay, userProfile?.weeklyStudyDays, userProfile?.weeklyCycle]);

  // AI-powered dynamic regeneration for Memorization Activity (focused on target day's vocabulary)
  const [isGeneratingHomeworkAi, setIsGeneratingHomeworkAi] = useState<boolean>(false);
  const isGeneratingAiRef = useRef<boolean>(false);

  const handleRegenerateHomeworkWithAi = useCallback(async () => {
    if (isGeneratingAiRef.current) return;
    isGeneratingAiRef.current = true;
    setIsGeneratingHomeworkAi(true);
    try {
      const generated = await generateWeeklyHomeworkWithAi({
        routinesByDay,
        studentName: userProfile.name,
        studentLevel: userProfile.level,
        studentEmail: currentAccount?.email || userProfile.email || '',
        targetDay: homeworkTargetDay,
        activeStudyDays: userProfile?.weeklyStudyDays,
        weeklyCycle: userProfile?.weeklyCycle || 1,
        userProfile,
        customWords: studentDictionaryEntries.map((e) => ({
          word: e.word,
          definitionEn: e.definitionEn,
          exampleSentence: e.exampleSentenceEn,
          translationPt: e.translationPt || '',
          sourceActivityName: e.sourceActivityName || 'Live Session',
          sourceDay: (e as any).sourceDay,
        })),
      });
      if (generated) {
        setWeeklyHomework(generated);
        if (generated.isAiGenerated) {
          setNotifications((prev) => [
            {
              id: `hw-ai-${Date.now()}`,
              title: currentLanguage === 'en' ? 'AI Memorization Activity Ready!' : 'Atividade de Memorização Pronta!',
              message: currentLanguage === 'en'
                ? 'Gemini AI crafted a custom native story, smart blanks, and writing challenges tailored to your weekly words.'
                : 'A IA Gemini elaborou uma história nativa inédita, lacunas inteligentes e desafios práticos para suas palavras.',
              type: 'success',
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...prev,
          ]);
        } else {
          lastAttemptedSignatureRef.current = '';
        }
      } else {
        lastAttemptedSignatureRef.current = '';
      }
    } catch {
      lastAttemptedSignatureRef.current = '';
      // Non-blocking fallback
    } finally {
      isGeneratingAiRef.current = false;
      setIsGeneratingHomeworkAi(false);
    }
  }, [routinesByDay, userProfile, currentAccount?.email, studentDictionaryEntries, homeworkTargetDay, currentLanguage]);

  const lastAttemptedSignatureRef = useRef<string>('');

  // Proactively generate AI content ONCE when student opens modal with vocabulary
  useEffect(() => {
    if (!isHomeworkModalOpen) return;
    if (!weeklyHomework || weeklyHomework.isEmpty || weeklyHomework.totalWordsCollected === 0) return;
    if (weeklyHomework.isAiGenerated) return;

    const signature = `${homeworkTargetDay}_${weeklyHomework.vocabularyList.map((w) => w.word.toLowerCase()).sort().join('|')}`;
    if (lastAttemptedSignatureRef.current === signature || isGeneratingAiRef.current) {
      return;
    }

    lastAttemptedSignatureRef.current = signature;
    handleRegenerateHomeworkWithAi();
  }, [isHomeworkModalOpen, weeklyHomework, homeworkTargetDay, handleRegenerateHomeworkWithAi]);

  const handleOpenHomeworkModal = useCallback((targetDay?: DayOfWeek) => {
    const selected = targetDay || getTodayDayOfWeek();
    setHomeworkTargetDay(selected);
    setIsHomeworkModalOpen(true);
  }, []);

  // Synchronize isolated student profile, lessons, routines, and settings whenever currentAccount changes
  useEffect(() => {
    if (!currentAccount?.email) {
      setLessons([]);
      setStudents([]);
      setWeeklyChecks({});
      setUserProfile(createDefaultStudentProfile(null));
      setRoutinesByDay(defaultRoutinesByDay);
      return;
    }

    const email = currentAccount.email;
    const role = currentAccount.role;
    const uid = currentAccount.uid || '';
    const queryParams = `email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`;

    // 1. Fetch user-isolated lessons directly from Firestore + API
    fetchStudentLessonsFromFirestore(uid, email).then((fsLessons) => {
      if (Array.isArray(fsLessons) && fsLessons.length > 0) {
        setLessons((prev) => {
          const map = new Map<string, LiveLesson>();
          fsLessons.forEach((l) => map.set(l.id, l));
          prev.forEach((l) => map.set(l.id, l));
          return Array.from(map.values());
        });
      }
    });

    fetch(`/api/lessons?${queryParams}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setLessons((prev) => {
            const map = new Map<string, LiveLesson>();
            prev.forEach((l) => map.set(l.id, l));
            data.forEach((l: LiveLesson) => map.set(l.id, l));
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => console.warn('Could not fetch isolated lessons:', err));

    // 2. Fetch user-isolated students list (for teachers and admin)
    if (role === 'teacher' || role === 'admin') {
      fetch(`/api/students?${queryParams}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setStudents(data);
        })
        .catch((err) => console.warn('Could not fetch isolated students:', err));
    } else {
      setStudents([]);
    }

    // 3. If student, reset routines first and fetch student-specific routines and user profile
    if (role === 'student') {
      setRoutinesByDay(defaultRoutinesByDay);

      async function loadStudentData() {
        try {
          const profileRes = await fetch(`/api/user-profile?email=${encodeURIComponent(email)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`);
          let loadedProfile: UserProfile | null = null;
          if (profileRes.ok) {
            const data = await profileRes.json();
            if (data.profile) {
              const cleanPic =
                (data.profile.picture && data.profile.picture.trim() !== '' ? data.profile.picture : '') ||
                (data.profile.avatar && data.profile.avatar.trim() !== '' ? data.profile.avatar : '') ||
                (currentAccount!.picture && currentAccount!.picture.trim() !== '' ? currentAccount!.picture : '') ||
                '';

              loadedProfile = {
                ...createDefaultStudentProfile(currentAccount),
                ...data.profile,
                id: data.profile.id || currentAccount!.id || `usr-${currentAccount!.email.replace(/[^a-zA-Z0-9]/g, '-')}`,
                name: data.profile.name || currentAccount!.name || '',
                email: currentAccount!.email,
                picture: cleanPic,
                avatar: cleanPic,
              };
              setUserProfile(loadedProfile);
            }
          }

          // Fetch student-specific routines
          const routinesRes = await fetch(`/api/student-routines?studentEmail=${encodeURIComponent(email)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`).catch(() => null);
          let baseRoutines = defaultRoutinesByDay;
          if (routinesRes && routinesRes.ok) {
            const routines = await routinesRes.json();
            if (routines && typeof routines === 'object' && Object.keys(routines).length > 0) {
              baseRoutines = routines;
            }
          }

          // Apply this specific student's registered routine times
          const vidTime = loadedProfile?.routineVideoTime;
          const audTime = loadedProfile?.routineAudioTime;
          const finalRoutines = applyProfileTimesToRoutines(baseRoutines, vidTime, audTime);
          setRoutinesByDay(finalRoutines);

          // Auto-position on today's focus
          const today = getTodayDayOfWeek();
          setSelectedDay(today);
          const todayItems = finalRoutines[today] || [];
          if (todayItems.length > 0) {
            setSelectedActivityId(todayItems[0].id);
          }

          // Fetch student-isolated studentJournal & S-Path weekly checks directly from Firestore (Multi-device Sync)
          fetchStudentJournalActivitiesFromFirestore(uid, email)
            .then((journalData) => {
              if (Array.isArray(journalData) && journalData.length > 0) {
                setStudentJournal(journalData);
                const derivedChecks = deriveWeeklyChecksFromJournal(journalData, loadedProfile?.weeklyCycle || 1);
                setWeeklyChecks((prev) => ({ ...prev, ...derivedChecks }));
              }
            })
            .catch(() => {});

          fetchStudentWeeklyChecksFromFirestore(uid, email)
            .then((checksData) => {
              if (checksData && checksData.checks) {
                setWeeklyChecks((prev) => ({ ...checksData.checks, ...prev }));
              }
            })
            .catch((err) => {
              console.warn('Notice loading weekly checks from Firestore:', err);
            });
        } catch (err) {
          console.warn('Could not fetch student data:', err);
        }
      }
      loadStudentData();
    } else if (role === 'teacher') {
      // 4. If teacher, fetch isolated teacher settings and tutor profile
      fetch(`/api/teacher-settings?teacherEmail=${encodeURIComponent(email)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((settings) => {
          if (settings && typeof settings === 'object' && Object.keys(settings).length > 0) {
            setTeacherMeetSettings((prev) => ({ ...prev, ...settings }));
          }
        })
        .catch((err) => console.warn('Could not fetch teacher settings:', err));

      async function loadTeacherProfile() {
        try {
          const res = await fetch(`/api/user-profile?email=${encodeURIComponent(email)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`);
          if (res.ok) {
            const data = await res.json();
            if (data.tutor) {
              setTutors((prev) => {
                const filtered = prev.filter(
                  (t) =>
                    t.email.toLowerCase() !== data.tutor.email.toLowerCase() &&
                    t.id !== data.tutor.id
                );
                return [...filtered, data.tutor];
              });
            }
          }
        } catch (err) {
          console.warn('Could not fetch teacher profile:', err);
        }
      }
      loadTeacherProfile();
    }

    // Fetch user-isolated student dictionary entries and journal entries directly from Firestore
    const dictEmail = (role === 'student' ? email : (selectedStudentFilter !== 'all' ? selectedStudentFilter : '')) || userProfile?.email || '';
    if (dictEmail || (role === 'student' && uid)) {
      // 1. Direct Firestore fetch for vocabulary
      fetchStudentVocabularyFromFirestore(uid, dictEmail).then((fsEntries) => {
        if (Array.isArray(fsEntries) && fsEntries.length > 0) {
          setStudentDictionaryEntries(fsEntries);
        }
      });

      // 2. Mirror from backend
      fetch(`/api/student-dictionary?studentEmail=${encodeURIComponent(dictEmail)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setStudentDictionaryEntries((prev) => {
              const map = new Map<string, StudentDictionaryEntry>();
              prev.forEach((e) => map.set(e.word.toLowerCase(), e));
              data.forEach((e: StudentDictionaryEntry) => map.set(e.word.toLowerCase(), e));
              return Array.from(map.values());
            });
          }
        })
        .catch((err) => console.warn('Could not fetch student dictionary:', err));

      // 3. Direct Firestore fetch for student journal
      fetchStudentJournalFromFirestore(uid, dictEmail).then((fsJournal) => {
        if (Array.isArray(fsJournal) && fsJournal.length > 0) {
          setDailyJournalEntries(fsJournal);
        }
      });

      // 4. Backend journal mirror
      fetch(`/api/student-journal?studentEmail=${encodeURIComponent(dictEmail)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setDailyJournalEntries((prev) => {
              const map = new Map<string, DailyJournalEntry>();
              prev.forEach((e) => map.set(e.id, e));
              data.forEach((e: DailyJournalEntry) => map.set(e.id, e));
              const list = Array.from(map.values());
              list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
              return list;
            });
          }
        })
        .catch(() => {});
    }
  }, [currentAccount?.email, currentAccount?.role, currentAccount?.uid, selectedStudentFilter, userProfile?.email]);

  // Real-time synchronization of studentJournal across all devices (Mobile <-> Desktop)
  useEffect(() => {
    const uid = currentAccount?.uid || userProfile?.id || (userProfile as any)?.uid || '';
    const email = currentAccount?.email || userProfile?.email || '';
    if (!uid && !email) return;

    const unsub = subscribeToStudentJournal(uid, email, (journal) => {
      if (Array.isArray(journal)) {
        setStudentJournal(journal);
        const derivedChecks = deriveWeeklyChecksFromJournal(journal, userProfile?.weeklyCycle || 1);
        setWeeklyChecks((prev) => ({ ...prev, ...derivedChecks }));
      }
    });

    return () => unsub();
  }, [currentAccount?.uid, currentAccount?.email, userProfile?.id, userProfile?.weeklyCycle]);

  // Refresh student dictionary whenever the modal is opened
  useEffect(() => {
    if (!isPersonalDictionaryOpen) return;
    const dictEmail = (currentAccount?.role === 'student' ? (currentAccount?.email || '') : (selectedStudentFilter !== 'all' ? selectedStudentFilter : '')) || userProfile?.email || '';
    const uid = currentAccount?.uid || '';
    if (dictEmail || uid) {
      fetchStudentVocabularyFromFirestore(uid, dictEmail).then((fsEntries) => {
        if (Array.isArray(fsEntries) && fsEntries.length > 0) {
          setStudentDictionaryEntries(fsEntries);
        }
      });

      fetch(`/api/student-dictionary?studentEmail=${encodeURIComponent(dictEmail)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setStudentDictionaryEntries((prev) => {
              const map = new Map<string, StudentDictionaryEntry>();
              prev.forEach((e) => map.set(e.word.toLowerCase(), e));
              data.forEach((e: StudentDictionaryEntry) => map.set(e.word.toLowerCase(), e));
              return Array.from(map.values());
            });
          }
        })
        .catch((err) => console.warn('Could not refresh student dictionary:', err));
    }
  }, [isPersonalDictionaryOpen, currentAccount?.email, currentAccount?.role, currentAccount?.uid, selectedStudentFilter, userProfile?.email]);

  // Handler: Manage/Update Native Friend Subscription
  const handleUpdateSubscription = async (teacherEmail: string | null, teacherName: string | null) => {
    setUserProfile((prev) => ({
      ...prev,
      teacherEmail: teacherEmail || undefined,
      teacherName: teacherName || undefined,
      enrollmentStatus: teacherEmail ? 'active' : 'cancelled',
    }));

    if (currentAccount?.email) {
      const cleanStEmail = currentAccount.email.toLowerCase().trim();
      setStudents((prev) => {
        const exists = prev.some((s) => (s.email || s.studentEmail || '').toLowerCase().trim() === cleanStEmail);
        if (exists) {
          return prev.map((s) =>
            (s.email || s.studentEmail || '').toLowerCase().trim() === cleanStEmail
              ? { ...s, teacherEmail: teacherEmail || '', teacherName: teacherName || '', status: teacherEmail ? 'active' : 'cancelled' }
              : s
          );
        }
        return [
          ...prev,
          {
            id: `st-${Date.now()}`,
            name: userProfile.name || currentAccount.name || cleanStEmail.split('@')[0],
            studentName: userProfile.name || currentAccount.name || cleanStEmail.split('@')[0],
            email: cleanStEmail,
            studentEmail: cleanStEmail,
            teacherEmail: teacherEmail || '',
            teacherName: teacherName || '',
            status: teacherEmail ? 'active' : 'cancelled',
            level: userProfile.level || 'iniciante',
          },
        ];
      });

      try {
        await fetch('/api/user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentAccount.email,
            profile: {
              teacherEmail: teacherEmail || null,
              teacherName: teacherName || null,
              enrollmentStatus: teacherEmail ? 'active' : 'cancelled',
            },
          }),
        });
      } catch (err) {
        console.warn('Failed to update subscription:', err);
      }
    }
  };

  // Handler: Start Living in English (Opens Email Verification Modal or redirects if student is logged in)
  const handleStartLivingInEnglish = () => {
    if (currentAccount?.role === 'student') {
      setViewMode('dashboard');
      return;
    }
    setIsStartLivingModalOpen(true);
  };

  // Handler: Complete Onboarding Wizard (Multi-step Assistant)
  const handleCompleteOnboarding = async (data: OnboardingResultData) => {
    try {
      // 1. Student identity resolution
      const isRegisteringStudent = Boolean(data.studentAccount?.email && data.studentAccount.email.trim() !== '');
      const cleanEmail = isRegisteringStudent
        ? data.studentAccount!.email.trim().toLowerCase()
        : (currentAccount?.role === 'student' && currentAccount.email ? currentAccount.email.trim().toLowerCase() : (userProfile.email || currentAccount?.email || ''));
      const effectiveName = isRegisteringStudent
        ? (data.studentAccount!.name || data.studentAccount!.email.split('@')[0]).trim()
        : (currentAccount?.role === 'student' && currentAccount.name ? currentAccount.name.trim() : (userProfile.name || currentAccount?.name || 'Aluno'));
      const studentUid = (currentAccount?.role === 'student' && currentAccount.email?.toLowerCase() === cleanEmail && currentAccount.uid)
        ? currentAccount.uid
        : (userProfile.email?.toLowerCase() === cleanEmail && userProfile.id ? userProfile.id : `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`);

      const selectedLevel = (data.englishLevel || data.userLevel || data.level || EnglishLevel.BEGINNER) as EnglishLevel;

      const newStudentAccount: GoogleAccount = {
        uid: studentUid,
        id: studentUid,
        name: effectiveName,
        email: cleanEmail,
        role: 'student',
        picture: '',
        avatar: '',
      };

      // 2. Prepare user profile data with assigned Native Friend and trial lesson balance
      const updatedProfile: UserProfile = {
        ...createDefaultStudentProfile(newStudentAccount),
        id: studentUid,
        name: effectiveName,
        email: cleanEmail,
        level: selectedLevel,
        userLevel: selectedLevel,
        englishLevel: selectedLevel,
        onboardingCompleted: true,
        learningGoal: data.learningGoal,
        weeklyStudyDaysTarget: data.weeklyStudyDaysTarget,
        weeklyStudyDays: data.weeklyStudyDays,
        routineVideoTime: data.routineVideoTime,
        routineAudioTime: data.routineAudioTime,
        dailyPhraseTime: data.dailyPhraseTime,
        teacherEmail: data.selectedTutor?.email || userProfile.teacherEmail || '',
        teacherName: data.selectedTutor?.name || userProfile.teacherName || '',
        enrollmentStatus: 'active',
        contractedLessons: Math.max(userProfile.contractedLessons || 0, 1),
        hasCompletedTrialLesson: false,
        subscriptionType: 'trial',
      };

      // 3. INSTANT SYNCHRONOUS STATE BATCHING:
      // Eliminate any delay between onboarding completion and student dashboard access
      setIsOnboardingCompleting(false);
      setIsOnboardingModalOpen(false);
      setViewMode('dashboard');
      setCurrentAccount(newStudentAccount);
      setUserProfile(updatedProfile);
      localStorage.setItem('currentUserAccount', JSON.stringify(newStudentAccount));

      // Update contractedLessons map with trial lesson immediately
      if (cleanEmail) {
        setContractedLessons((prev) => ({
          ...prev,
          [cleanEmail]: Math.max(prev[cleanEmail] || 0, 1),
        }));

        setStudents((prev) => {
          const exists = prev.some((st) => (st.email || st.studentEmail || '').toLowerCase().trim() === cleanEmail);
          if (exists) {
            return prev.map((st) =>
              (st.email || st.studentEmail || '').toLowerCase().trim() === cleanEmail
                ? {
                    ...st,
                    teacherEmail: data.selectedTutor?.email || st.teacherEmail,
                    teacherName: data.selectedTutor?.name || st.teacherName,
                    contractedLessons: Math.max(st.contractedLessons || 0, 1),
                    level: selectedLevel,
                  }
                : st
            );
          }
          return [
            ...prev,
            {
              id: `st-${Date.now()}`,
              name: effectiveName || cleanEmail.split('@')[0],
              studentName: effectiveName || cleanEmail.split('@')[0],
              email: cleanEmail,
              studentEmail: cleanEmail,
              teacherEmail: data.selectedTutor?.email || '',
              teacherName: data.selectedTutor?.name || '',
              status: 'active',
              level: selectedLevel,
              contractedLessons: 1,
            },
          ];
        });
      }

      // Pre-fetch and cache Spotify playlist tracks for the selected student level
      const normLevel = normalizeStudentLevel(selectedLevel);
      fetchTracksForStudentLevel(normLevel).catch(() => {});

      // Push welcome notification immediately
      setNotifications((prev) => [
        {
          id: `onboarding-${Date.now()}`,
          title: currentLanguage === 'en'
            ? '🎉 Onboarding Completed!'
            : '🎉 Onboarding Concluído com Sucesso!',
          message: currentLanguage === 'en'
            ? `Your personalized routine with ${data.selectedTutor?.name || 'your Native Friend'} is active! Your first free trial lesson is available to schedule.`
            : `Sua rotina personalizada com ${data.selectedTutor?.name || 'seu Amigo Nativo'} foi ativada! Sua 1ª aula teste gratuita está disponível para agendamento.`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);

      // Auto-open lesson schedule modal for this tutor with student info ready (smooth transition)
      if (data.selectedTutor?.email) {
        setTeacherEmailForConfig(data.selectedTutor.email);
        setScheduleStudentInfo({
          name: effectiveName,
          email: cleanEmail,
          uid: studentUid,
        });
        setTimeout(() => {
          setIsScheduleModalOpen(true);
        }, 350);
      }

      // 4. NON-BLOCKING BACKGROUND ASYNC PERSISTENCE:
      // Persist credentials & full student profile to backend & Firestore asynchronously
      (async () => {
        try {
          if (isRegisteringStudent) {
            await fetch('/api/auth/signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: effectiveName,
                email: cleanEmail,
                password: data.studentAccount?.password || '123456',
                role: 'student',
                level: selectedLevel,
                englishLevel: selectedLevel,
                userLevel: selectedLevel,
                learningGoal: data.learningGoal,
                weeklyPracticeDays: data.weeklyStudyDaysTarget,
                routineActivities: data.weeklyStudyDays,
                routineVideoTime: data.routineVideoTime,
                routineAudioTime: data.routineAudioTime,
                dailyPhraseTime: data.dailyPhraseTime,
                selectedTutorEmail: data.selectedTutor?.email,
                selectedTutorName: data.selectedTutor?.name,
                teacherEmail: data.selectedTutor?.email,
                teacherName: data.selectedTutor?.name,
                contractedLessons: 1,
              }),
            });
          }

          if (cleanEmail) {
            await fetch('/api/user-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: cleanEmail,
                profile: updatedProfile,
              }),
            });
          }
        } catch (err) {
          console.warn('Background persistence notice:', err);
        }
      })();
    } catch (err) {
      console.warn('Onboarding completion error:', err);
      setIsOnboardingModalOpen(false);
      if (!currentAccount) {
        setViewMode('landing');
      }
    } finally {
      setIsOnboardingCompleting(false);
    }
  };

  // Handler: Purchase Lesson Package with a specific Native Friend (Fixed Assignment)
  const handlePurchasePackage = async (params: {
    teacherEmail: string;
    teacherName: string;
    packageLessons: number;
    packagePriceBrl?: number;
    packagePriceUsd?: number;
    paymentMethod?: string;
  }) => {
    if (!currentAccount?.email) return;

    try {
      const res = await fetch('/api/students/purchase-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: currentAccount.email,
          ...params,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newCount = Number(data.contractedLessons || params.packageLessons);

        // Update userProfile with fixed teacher and updated lesson balance
        setUserProfile((prev) => ({
          ...prev,
          teacherEmail: params.teacherEmail,
          teacherName: params.teacherName,
          enrollmentStatus: 'active',
          contractedLessons: newCount,
        }));

        // Update contractedLessons map
        setContractedLessons((prev) => ({
          ...prev,
          [currentAccount.email.toLowerCase()]: newCount,
        }));

        // Update students state list
        setStudents((prev) => {
          const cleanEmail = currentAccount.email.toLowerCase().trim();
          const exists = prev.some((st) => (st.email || st.studentEmail || '').toLowerCase().trim() === cleanEmail);
          if (exists) {
            return prev.map((st) =>
              (st.email || st.studentEmail || '').toLowerCase().trim() === cleanEmail
                ? {
                    ...st,
                    teacherEmail: params.teacherEmail,
                    teacherName: params.teacherName,
                    contractedLessons: newCount,
                    status: 'active',
                  }
                : st
            );
          }
          return [
            ...prev,
            {
              id: `st-${Date.now()}`,
              name: userProfile.name || currentAccount.name || cleanEmail.split('@')[0],
              studentName: userProfile.name || currentAccount.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              studentEmail: cleanEmail,
              teacherEmail: params.teacherEmail,
              teacherName: params.teacherName,
              contractedLessons: newCount,
              status: 'active',
              level: userProfile.level || 'iniciante',
            },
          ];
        });

        // Notify student of successful fixed binding and purchase
        setNotifications((prev) => [
          {
            id: `purchase-${Date.now()}`,
            title: currentLanguage === 'en' ? 'Lesson Package Purchased!' : 'Pacote de Aulas Adquirido!',
            message:
              currentLanguage === 'en'
                ? `Congratulations! Package of ${params.packageLessons} lessons purchased. ${params.teacherName} is now your assigned Native Friend!`
                : `Parabéns! Pacote de ${params.packageLessons} aulas adquirido. ${params.teacherName} agora é seu Amigo Nativo fixo!`,
            type: 'success',
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);

        return data;
      }
    } catch (err) {
      console.error('Failed to purchase package:', err);
      throw err;
    }
  };

  // Handler: Change active account (teacher vs student)
  const handleSwitchAccount = (account: GoogleAccount) => {
    setCurrentAccount(account);
    setRoutinesByDay(defaultRoutinesByDay);
    if (account.role === 'student') {
      setUserProfile(createDefaultStudentProfile(account));
    } else {
      setUserProfile(createDefaultStudentProfile(null));
    }
  };

  // Handler: Add new Google account
  const handleAddAccount = (newAccount: GoogleAccount) => {
    setAvailableAccounts((prev) => [...prev, newAccount]);
    setCurrentAccount(newAccount);
    setRoutinesByDay(defaultRoutinesByDay);
    if (newAccount.role === 'student') {
      setUserProfile(createDefaultStudentProfile(newAccount));
    } else {
      setUserProfile(createDefaultStudentProfile(null));
    }
  };

  // Handler: Login Success from Auth Modal
  const handleLoginSuccess = (
    account: GoogleAccount,
    initialProfile?: Partial<UserProfile>,
    tutorData?: any
  ) => {
    setCurrentAccount(account);
    if (!availableAccounts.some((a) => a.email.toLowerCase() === account.email.toLowerCase())) {
      setAvailableAccounts((prev) => [...prev, account]);
    }
    if (account.role === 'student') {
      const cleanPic =
        (initialProfile?.picture && initialProfile.picture.trim() !== '' ? initialProfile.picture : '') ||
        (initialProfile?.avatar && initialProfile.avatar.trim() !== '' ? initialProfile.avatar : '') ||
        (account.picture && account.picture.trim() !== '' ? account.picture : '') ||
        '';

      const freshProfile: UserProfile = {
        ...createDefaultStudentProfile(account),
        ...(initialProfile || {}),
        id: account.id || initialProfile?.id || `usr-${account.email.replace(/[^a-zA-Z0-9]/g, '-')}`,
        name: initialProfile?.name || account.name || '',
        email: account.email,
        picture: cleanPic,
        avatar: cleanPic,
        level: initialProfile?.level || (initialProfile as any)?.englishLevel || (initialProfile as any)?.userLevel || EnglishLevel.BEGINNER,
        userLevel: initialProfile?.level || (initialProfile as any)?.englishLevel || (initialProfile as any)?.userLevel || EnglishLevel.BEGINNER,
        englishLevel: initialProfile?.level || (initialProfile as any)?.englishLevel || (initialProfile as any)?.userLevel || EnglishLevel.BEGINNER,
        learningGoal: initialProfile?.learningGoal || '',
        weeklyStudyDaysTarget: (initialProfile as any)?.weeklyStudyDaysTarget ?? 7,
        weeklyStudyDays: (initialProfile as any)?.weeklyStudyDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        routineVideoTime: (initialProfile as any)?.routineVideoTime || '09:00',
        routineAudioTime: (initialProfile as any)?.routineAudioTime || '14:00',
        dailyPhraseTime: (initialProfile as any)?.dailyPhraseTime || '20:00',
        teacherEmail: (initialProfile as any)?.teacherEmail || null,
        teacherName: (initialProfile as any)?.teacherName || null,
        contractedLessons: (initialProfile as any)?.contractedLessons ?? 1,
      };
      setUserProfile(freshProfile);

      // Pre-fetch Spotify tracks matching student level
      const normLevel = normalizeStudentLevel(freshProfile.level);
      fetchTracksForStudentLevel(normLevel).catch(() => {});
    } else {
      setUserProfile(createDefaultStudentProfile(null));
    }
    if (account.role === 'teacher') {
      if (tutorData) {
        setTutors((prev) => {
          const next = prev.filter((t) => t.email.toLowerCase() !== tutorData.email.toLowerCase());
          return [...next, tutorData];
        });
      }
      fetch(`/api/user-profile?email=${encodeURIComponent(account.email)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.tutor) {
            setTutors((prev) => {
              const next = prev.filter((t) => t.email.toLowerCase() !== data.tutor.email.toLowerCase());
              return [...next, data.tutor];
            });
          }
        })
        .catch(() => {});
    }
    if (account.role === 'student') {
      setViewMode('dashboard');
      if (typeof window !== 'undefined') {
        try {
          window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
        } catch {}
      }
    } else if (account.role === 'teacher') {
      setViewMode('dashboard');
      if (typeof window !== 'undefined') {
        try {
          window.history.replaceState({ page: 'teacher' }, '', '/teacher');
        } catch {}
      }
    } else if (account.role === 'admin') {
      setViewMode('dashboard');
      setIsAdminApprovalsOpen(true);
      if (typeof window !== 'undefined') {
        try {
          window.history.replaceState({ page: 'admin' }, '', '/admin');
        } catch {}
      }
    } else {
      setViewMode('dashboard');
    }
    setNotifications((prev) => [
      {
        id: `login-${Date.now()}`,
        title: currentLanguage === 'en' ? `Welcome, ${account.name}!` : `Bem-vindo(a), ${account.name}!`,
        message: currentLanguage === 'en'
          ? 'You are ready to live your English today.'
          : 'Seu painel de rotinas está pronto para você viver em inglês hoje.',
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Logout
  const handleLogout = () => {
    setCurrentAccount(null);
    setUserProfile(createDefaultStudentProfile(null));
    setLessons([]);
    setStudents([]);
    setViewMode('landing');
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, '', '/');
      } catch {}
    }
    setNotifications((prev) => [
      {
        id: `logout-${Date.now()}`,
        title: currentLanguage === 'en' ? 'Logged out' : 'Sessão encerrada',
        message: currentLanguage === 'en'
          ? 'See you soon! Your journey, step by step!'
          : 'Até logo! Sua jornada, passo a passo!',
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Update student English level
  const handleLevelChange = (newLevel: EnglishLevel) => {
    setUserProfile((prev) => ({ ...prev, level: newLevel }));
  };

  // Handler: Update contracted lessons
  const handleUpdateContractedLessons = async (studentEmail: string, count: number) => {
    setContractedLessons((prev) => ({ ...prev, [studentEmail.toLowerCase()]: count }));
    try {
      await fetch('/api/students/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail, count }),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Save 5 learned words for an activity
  const handleSaveLearnedWords = async (activityId: string, words: string[]) => {
    setRoutinesByDay((prev) => {
      const updatedDayList = (prev[selectedDay] || []).map((item) => {
        if (item.id === activityId) {
          return { ...item, learnedWords: words };
        }
        return item;
      });
      return { ...prev, [selectedDay]: updatedDayList };
    });

    try {
      await fetch('/api/routines/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: selectedDay, activityId, words }),
      });
    } catch {
      // local fallback
    }
  };

  // Unified single source of truth for 100% automatic behavioral activity completion
  const handleBehavioralActivityComplete = useCallback(
    async (params: {
      type: 'video' | 'audio' | 'memorization' | 'live_lesson';
      dayOfWeek?: DayOfWeek;
      activityId?: string;
      video?: {
        videoId: string;
        videoTitle?: string;
        url?: string;
        duration?: string;
      };
      track?: {
        id: string;
        trackId?: string;
        title: string;
        artist?: string;
        coverUrl?: string;
        url?: string;
      };
      targetStudentUid?: string;
      targetStudentEmail?: string;
    }) => {
      const targetDay = params.dayOfWeek || selectedDay;
      const uid = params.targetStudentUid || currentAccount?.uid || userProfile?.id || (userProfile as any)?.uid || '';
      const email = params.targetStudentEmail || currentAccount?.email || userProfile?.email || '';

      const stepMapping: Record<string, 'video_day' | 'audio_day' | 'memorization' | 'tutor_live'> = {
        video: 'video_day',
        audio: 'audio_day',
        memorization: 'memorization',
        live_lesson: 'tutor_live',
      };
      const stepId = stepMapping[params.type] || 'video_day';
      const checkKey = `${stepId}_${targetDay}`;
      const isAlreadyChecked = Boolean(weeklyChecks[checkKey]);

      // 1. Update S-Path (Gráfico S) in React state & direct Firestore users/{studentUID} persistence
      setWeeklyChecks((prev) => {
        if (prev[checkKey]) return prev;
        return { ...prev, [checkKey]: true };
      });

      const currentWeekNumber = Number(userProfile?.weeklyCycle) || 1;
      const targetDate = getDateForDayInCurrentWeek(targetDay);
      const journalType = mapStepIdToJournalType(params.type);
      const journalItemId =
        params.type === 'video'
          ? (params.video?.videoId || params.video?.url || `video_${targetDay}_${Date.now()}`)
          : params.type === 'audio'
          ? (params.track?.id || params.track?.trackId || `audio_${targetDay}_${Date.now()}`)
          : `${params.type}_${targetDay}_${Date.now()}`;

      if (uid) {
        recordActivityInStudentJournal(
          uid,
          {
            id: journalItemId,
            type: journalType,
            date: targetDate,
            dayOfWeek: targetDay,
            week: currentWeekNumber,
            timestamp: Date.now(),
            title: params.type === 'video' ? params.video?.videoTitle : params.type === 'audio' ? params.track?.title : undefined,
            artist: params.track?.artist,
            url: params.video?.url || params.track?.url,
          },
          email
        ).then((res) => {
          if (res.updatedJournal) {
            setStudentJournal(res.updatedJournal);
          }
        });

        if (!isAlreadyChecked) {
          saveStudentWeeklyChecksToFirestore(
            uid,
            { ...weeklyChecks, [checkKey]: true },
            email,
            userProfile?.weeklyNativeLessonsTarget,
            userProfile?.weeklyStudyDaysTarget
          );
        }
      }

      // 2. Update routine item state to completedToday = true
      setRoutinesByDay((prev) => {
        const dayList = prev[targetDay] || [];
        let matched = false;
        const updated = dayList.map((item) => {
          const actName = (item.activityName || '').toLowerCase();
          const isTarget =
            params.activityId === item.id ||
            (params.type === 'video' &&
              ((item.teacherVideos && item.teacherVideos.length > 0) ||
                actName.includes('video') ||
                actName.includes('vídeo') ||
                item.id.endsWith('1'))) ||
            (params.type === 'audio' &&
              (Boolean(item.teacherSpotify) ||
                actName.includes('audio') ||
                actName.includes('áudio') ||
                actName.includes('som') ||
                actName.includes('ouvir') ||
                item.id.endsWith('2')));

          if (isTarget && !matched) {
            matched = true;
            return { ...item, completedToday: true, completed: true };
          }
          return item;
        });
        return { ...prev, [targetDay]: updated };
      });

      // 3. Activity History, Exclusivity & Native Friend Database Feeding
      const currentWeekId = `week-${userProfile?.weeklyCycle || 1}`;
      const teacherUid = userProfile?.assignedNativeFriendUID || userProfile?.nativeFriendUID || '';

      if (params.type === 'video') {
        const rawVid = params.video?.videoId || params.video?.url || '';
        const cleanVid = extractYouTubeVideoId(rawVid) || rawVid.trim();
        const cleanTitle = (params.video?.videoTitle || 'Daily Video Practice').trim();

        if (cleanVid && uid) {
          // A. Persist to users/{studentUID}/watchedVideosHistory
          await addVideoToWatchedHistoryInFirestore(uid, cleanVid, cleanTitle);

          // B. Persist to weekly consumed videos users/{studentUID}/weeklyHistory/{weekId}
          await recordConsumedVideo(
            uid,
            currentWeekId,
            {
              id: cleanVid,
              videoId: cleanVid,
              videoTitle: cleanTitle,
              title: cleanTitle,
              watchedAt: new Date().toISOString(),
              dayOfWeek: targetDay,
              url: params.video?.url || getYouTubeWatchUrl(cleanVid),
              duration: params.video?.duration || '5-10 min',
            },
            teacherUid
          );

          // C. Update in-memory userProfile for 100% exclusivity rule
          setUserProfile((prev) => {
            if (!prev) return prev;
            const currentWatched = prev.watchedVideosHistory || [];
            if (currentWatched.includes(cleanVid)) return prev;
            return {
              ...prev,
              watchedVideosHistory: [...currentWatched, cleanVid],
            };
          });
        }
      } else if (params.type === 'audio') {
        const rawTrackId = params.track?.id || params.track?.trackId || '';
        const cleanTrackId = rawTrackId.trim();
        const cleanTitle = (params.track?.title || 'Daily Spotify Listening').trim();
        const cleanArtist = (params.track?.artist || 'Spotify Artist').trim();

        if (cleanTrackId && uid) {
          // A. Persist to users/{studentUID}/listenedTracksHistory
          await addTrackToListenedHistoryInFirestore(uid, cleanTrackId, cleanTitle, cleanArtist);

          // B. Persist to weekly consumed tracks users/{studentUID}/weeklyHistory/{weekId}
          await recordConsumedTrack(
            uid,
            currentWeekId,
            {
              id: cleanTrackId,
              trackId: cleanTrackId,
              title: cleanTitle,
              artist: cleanArtist,
              coverUrl: params.track?.coverUrl || '',
              dayOfWeek: targetDay,
              listenedAt: new Date().toISOString(),
              url: params.track?.url || '',
            },
            teacherUid
          );

          // C. Update in-memory userProfile for listened tracks history
          setUserProfile((prev) => {
            if (!prev) return prev;
            const currentListened = prev.listenedTracksHistory || [];
            const exists = currentListened.some((t: any) =>
              typeof t === 'string' ? t === cleanTrackId : t?.trackId === cleanTrackId || t?.id === cleanTrackId
            );
            if (exists) return prev;
            return {
              ...prev,
              listenedTracksHistory: [
                ...currentListened,
                { trackId: cleanTrackId, id: cleanTrackId, title: cleanTitle, artist: cleanArtist },
              ],
            };
          });
        }
      }

      // 4. Backend synchronization mirror
      try {
        fetch('/api/routines/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day: targetDay,
            activityId: params.activityId || (params.type === 'video' ? 'act-1' : 'act-2'),
            studentEmail: email,
            studentUid: uid,
            videoId: params.video?.videoId || null,
          }),
        }).catch(() => {});
      } catch {}

      // 5. Success notification (only if newly completed)
      if (!isAlreadyChecked) {
        const stepLabels: Record<string, { en: string; pt: string }> = {
          video_day: { en: 'Daily Video', pt: 'Vídeo do Dia' },
          audio_day: { en: 'Daily Audio', pt: 'Áudio do Dia' },
          memorization: { en: 'Daily Memorization Activity', pt: 'Atividade de Memorização do Dia' },
          tutor_live: { en: 'Live Lesson with Native Friend', pt: 'Aula com Amigo Nativo' },
        };
        const dayLabels: Record<DayOfWeek, { en: string; pt: string }> = {
          monday: { en: 'Monday', pt: 'Segunda-feira' },
          tuesday: { en: 'Tuesday', pt: 'Terça-feira' },
          wednesday: { en: 'Wednesday', pt: 'Quarta-feira' },
          thursday: { en: 'Thursday', pt: 'Quinta-feira' },
          friday: { en: 'Friday', pt: 'Sexta-feira' },
          saturday: { en: 'Saturday', pt: 'Sábado' },
          sunday: { en: 'Sunday', pt: 'Domingo' },
        };

        setNotifications((prev) => [
          {
            id: `behavioral-comp-${Date.now()}`,
            title: currentLanguage === 'en' ? '✨ Activity Completed!' : '✨ Atividade Concluída!',
            message:
              currentLanguage === 'en'
                ? `${stepLabels[stepId]?.en || stepId} registered automatically for ${dayLabels[targetDay]?.en || targetDay} on your S-Path and Activity History.`
                : `${stepLabels[stepId]?.pt || stepId} registrado automaticamente para ${dayLabels[targetDay]?.pt || targetDay} no seu Gráfico S e Histórico de Atividades.`,
            type: 'success',
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
      }
    },
    [selectedDay, currentAccount?.uid, currentAccount?.email, userProfile, weeklyChecks, currentLanguage]
  );

  // Handler: Update S-Path (Gráfico S) check for a pillar with instant UI reflection & Firestore users/{studentUID} persistence
  const handleUpdateSPathCheck = useCallback(
    (
      stepId: 'video_day' | 'audio_day' | 'memorization' | 'tutor_live',
      dayKey: DayOfWeek,
      isCompleted: boolean = true,
      targetUid?: string,
      targetEmail?: string
    ) => {
      const uid = targetUid || currentAccount?.uid || userProfile?.id || '';
      const email = targetEmail || currentAccount?.email || userProfile?.email || '';

      if (isCompleted && (stepId === 'video_day' || stepId === 'audio_day')) {
        handleBehavioralActivityComplete({
          type: stepId === 'video_day' ? 'video' : 'audio',
          dayOfWeek: dayKey,
          targetStudentUid: uid,
          targetStudentEmail: email,
        });
        return;
      }

      const checkKey = `${stepId}_${dayKey}`;

      setWeeklyChecks((prev) => {
        if (prev[checkKey] === isCompleted) return prev;
        return { ...prev, [checkKey]: isCompleted };
      });

      if (uid) {
        const targetType = mapStepIdToJournalType(stepId);
        const currentWeekNumber = Number(userProfile?.weeklyCycle) || 1;
        const targetDate = getDateForDayInCurrentWeek(dayKey);

        if (isCompleted) {
          recordActivityInStudentJournal(
            uid,
            {
              id: `${stepId}_${dayKey}_${currentWeekNumber}_${Date.now()}`,
              type: targetType,
              date: targetDate,
              dayOfWeek: dayKey,
              week: currentWeekNumber,
              timestamp: Date.now(),
              title: stepId === 'tutor_live' ? 'Live Session with Native Friend' : stepId === 'memorization' ? 'Weekly Memorization Activity' : undefined,
            },
            email
          ).then((res) => {
            if (res.updatedJournal) setStudentJournal(res.updatedJournal);
          });
        } else {
          removeActivityFromStudentJournal(
            uid,
            targetType,
            dayKey,
            currentWeekNumber,
            email
          ).then((res) => {
            if (res.updatedJournal) setStudentJournal(res.updatedJournal);
          });
        }

        saveStudentWeeklyChecksToFirestore(
          uid,
          { ...weeklyChecks, [checkKey]: isCompleted },
          email,
          userProfile?.weeklyNativeLessonsTarget,
          userProfile?.weeklyStudyDaysTarget
        );
      }

      // Feedback toast/notification for student
      if (isCompleted) {
        const stepLabels: Record<string, { en: string; pt: string }> = {
          video_day: { en: 'Daily Video', pt: 'Vídeo do Dia' },
          audio_day: { en: 'Daily Audio', pt: 'Áudio do Dia' },
          memorization: { en: 'Daily Memorization Activity', pt: 'Atividade de Memorização do Dia' },
          tutor_live: { en: 'Live Lesson with Native Friend', pt: 'Aula com Amigo Nativo' },
        };
        const dayLabels: Record<DayOfWeek, { en: string; pt: string }> = {
          monday: { en: 'Monday', pt: 'Segunda-feira' },
          tuesday: { en: 'Tuesday', pt: 'Terça-feira' },
          wednesday: { en: 'Wednesday', pt: 'Quarta-feira' },
          thursday: { en: 'Thursday', pt: 'Quinta-feira' },
          friday: { en: 'Friday', pt: 'Sexta-feira' },
          saturday: { en: 'Saturday', pt: 'Sábado' },
          sunday: { en: 'Sunday', pt: 'Domingo' },
        };

        setNotifications((prev) => [
          {
            id: `toast-spath-${Date.now()}`,
            title: currentLanguage === 'en' ? '🎉 S-Path Updated!' : '🎉 Gráfico S Atualizado!',
            message:
              currentLanguage === 'en'
                ? `${stepLabels[stepId]?.en || stepId} marked as completed for ${dayLabels[dayKey]?.en || dayKey} on your S-Path.`
                : `${stepLabels[stepId]?.pt || stepId} marcado como concluído para ${dayLabels[dayKey]?.pt || dayKey} no seu Gráfico S.`,
            type: 'success',
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
      }
    },
    [currentAccount?.uid, currentAccount?.email, userProfile?.id, userProfile?.email, userProfile?.weeklyNativeLessonsTarget, userProfile?.weeklyStudyDaysTarget, currentLanguage, handleBehavioralActivityComplete]
  );

  // Handler: Toggle activity completed status
  const handleToggleActivityComplete = async (activityId: string) => {
    let nowCompleted = false;
    let videoIdToArchive: string | null = null;
    let currentActivity: RoutineItem | undefined;

    setRoutinesByDay((prev) => {
      const updatedDayList = (prev[selectedDay] || []).map((item) => {
        if (item.id === activityId) {
          currentActivity = item;
          nowCompleted = !item.completedToday;
          if (nowCompleted) {
            const v = item.teacherVideos?.[0];
            if (v && (v.videoId || v.url)) {
              videoIdToArchive = extractYouTubeVideoId(v.videoId || v.url || '') || v.videoId || null;
            }
          }
          return { ...item, completedToday: nowCompleted, completed: nowCompleted };
        }
        return item;
      });
      return { ...prev, [selectedDay]: updatedDayList };
    });

    const studentUid = currentAccount?.uid || userProfile?.id || '';
    const studentEmail = currentAccount?.email || userProfile?.email || '';

    // Requirement 2: Guarantee that upon completing a video activity, the video ID is persistently added to watchedVideosHistory
    if (nowCompleted && videoIdToArchive && studentUid) {
      addVideoToWatchedHistoryInFirestore(studentUid, videoIdToArchive).catch(() => {});
    }

    // Automatic S-Path (Gráfico S) marking based on activity type
    const actName = (currentActivity?.activityName || '').toLowerCase();
    const isVideoActivity = Boolean(
      (currentActivity?.teacherVideos && currentActivity.teacherVideos.length > 0) ||
      actName.includes('video') ||
      actName.includes('vídeo') ||
      actName.includes('assistir') ||
      actName.includes('watch') ||
      activityId.endsWith('1')
    );

    const isAudioActivity = Boolean(
      currentActivity?.teacherSpotify ||
      actName.includes('áudio') ||
      actName.includes('audio') ||
      actName.includes('som') ||
      actName.includes('ouvir') ||
      actName.includes('listen') ||
      actName.includes('podcast') ||
      actName.includes('música') ||
      actName.includes('music') ||
      activityId.endsWith('2')
    );

    if (isVideoActivity) {
      handleUpdateSPathCheck('video_day', selectedDay, nowCompleted);
    }
    if (isAudioActivity) {
      handleUpdateSPathCheck('audio_day', selectedDay, nowCompleted);
    }

    try {
      await fetch('/api/routines/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: selectedDay,
          activityId,
          studentEmail,
          studentUid,
          videoId: videoIdToArchive,
        }),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Start New Week (Rotates assignments, moves consumed to history, increments weeklyCycle, resets week checks)
  const handleStartNewWeek = useCallback(async (studyDaysTarget?: number, selectedDays?: DayOfWeek[]) => {
    setIsStartingNewWeek(true);
    const studentEmail = currentAccount?.email || userProfile?.email || '';
    const uid = currentAccount?.uid || userProfile?.id || (userProfile as any)?.uid || '';
    const targetDays = studyDaysTarget || userProfile?.weeklyStudyDaysTarget || 7;
    const chosenDays = selectedDays || userProfile?.weeklyStudyDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    try {
      const result = await executeStartNewWeek({
        studentEmail,
        studentUid: uid,
        weeklyStudyDaysTarget: targetDays,
        weeklyStudyDays: chosenDays,
        currentCycle: userProfile?.weeklyCycle || 1,
        studentLevel: userProfile?.level || (userProfile as any)?.englishLevel || 'intermediate',
        currentRoutines: routinesByDay,
      });

      if (result && result.success) {
        if (result.routines) {
          const vidTime = userProfile?.routineVideoTime;
          const audTime = userProfile?.routineAudioTime;
          const finalRoutines = applyProfileTimesToRoutines(result.routines, vidTime, audTime);
          setRoutinesByDay(finalRoutines);
        }

        const effectiveCycle = result.weeklyCycle;
        const effectiveStudyTarget = result.weeklyStudyDaysTarget;
        const effectiveStudyDays = result.weeklyStudyDays;

        setUserProfile((prev) => ({
          ...prev,
          weeklyCycle: effectiveCycle,
          weeklyStudyDaysTarget: effectiveStudyTarget,
          weeklyStudyDays: effectiveStudyDays,
        }));

        // Reset S-Path checks for the new week in memory and Firestore users/{studentUID}
        setWeeklyChecks({});
        saveStudentWeeklyChecksToFirestore(
          uid,
          {},
          studentEmail,
          userProfile?.weeklyNativeLessonsTarget || 1,
          effectiveStudyTarget
        );

        // Persist weekly checks and study targets via weekly-checks endpoint as well
        fetch('/api/routines/weekly-checks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail,
            studentUid: uid,
            checks: {},
            weeklyNativeLessonsTarget: userProfile?.weeklyNativeLessonsTarget || 1,
            weeklyStudyDaysTarget: effectiveStudyTarget,
            weeklyStudyDays: effectiveStudyDays,
          }),
        }).catch(() => {});

        // Automatic positioning on Today if in active study plan, otherwise first active study day
        const today = getTodayDayOfWeek();
        const effectiveDay = chosenDays.includes(today) ? today : (chosenDays[0] || 'monday');
        setSelectedDay(effectiveDay);
        if (result.routines && result.routines[effectiveDay] && result.routines[effectiveDay].length > 0) {
          setSelectedActivityId(result.routines[effectiveDay][0].id);
        }

        setNotifications((prev) => [
          {
            id: `new-week-${Date.now()}`,
            title: currentLanguage === 'en'
              ? `🎉 Week ${effectiveCycle} Started!`
              : `🎉 Semana ${effectiveCycle} Iniciada!`,
            message: currentLanguage === 'en'
              ? `Study goal calibrated to ${effectiveStudyTarget} days/week. Fresh curated YouTube videos and Spotify audios have been assigned.`
              : `Meta de estudos calibrada para ${effectiveStudyTarget} dias/semana. Novos vídeos do YouTube e áudios do Spotify foram atribuídos.`,
            type: 'success',
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
        return true;
      }
    } catch (err) {
      console.warn('Could not start new week:', err);
    } finally {
      setIsStartingNewWeek(false);
    }
    return false;
  }, [currentAccount?.email, currentAccount?.uid, userProfile?.email, userProfile?.id, (userProfile as any)?.uid, userProfile?.routineVideoTime, userProfile?.routineAudioTime, userProfile?.weeklyCycle, userProfile?.weeklyStudyDaysTarget, userProfile?.weeklyStudyDays, userProfile?.weeklyNativeLessonsTarget, routinesByDay, currentLanguage]);

  // Handler: Teacher saves video & Spotify for activity
  const handleTeacherSaveVideos = async (
    activityId: string,
    videos: TeacherAssignedVideo[],
    teacherNotes?: string,
    replicateToAllDays = false,
    targetDays?: DayOfWeek[],
    spotify?: TeacherAssignedSpotify | null,
    targetStudentEmail?: string,
    targetStudentUid?: string,
    activityName?: string
  ) => {
    const daysToUpdate: DayOfWeek[] = replicateToAllDays
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      : targetDays && targetDays.length > 0
      ? targetDays
      : [selectedDay];

    const studentEmailToUse =
      targetStudentEmail ||
      (selectedStudentFilter !== 'all' ? selectedStudentFilter : '') ||
      (currentAccount?.role === 'student' ? currentAccount.email : '');

    const selectedSt = studentsList.find(
      (s) =>
        (studentEmailToUse && s.email?.toLowerCase() === studentEmailToUse.toLowerCase()) ||
        s.uid === studentEmailToUse ||
        s.id === studentEmailToUse
    );
    const studentUidToUse = targetStudentUid || selectedSt?.uid || selectedSt?.id || '';
    const resolvedTopic = activityName || videos?.[0]?.playlistTitle;

    setRoutinesByDay((prev) => {
      const updated = { ...prev };
      daysToUpdate.forEach((d) => {
        let matched = false;
        updated[d] = (updated[d] || []).map((item) => {
          const isTarget =
            item.id === activityId ||
            (item.teacherVideos && item.teacherVideos.length > 0) ||
            item.id.endsWith('1') ||
            item.activityName?.toLowerCase().includes('vídeo') ||
            item.activityName?.toLowerCase().includes('video') ||
            item.activityName === currentActivity?.activityName;
          if (isTarget && !matched) {
            matched = true;
            return {
              ...item,
              activityName: resolvedTopic || item.activityName,
              teacherVideos: videos,
              teacherNotes: teacherNotes || item.teacherNotes,
              ...(spotify !== undefined ? { teacherSpotify: spotify || undefined } : {}),
            };
          }
          return item;
        });
        if (!matched && updated[d] && updated[d].length > 0) {
          updated[d][0] = {
            ...updated[d][0],
            activityName: resolvedTopic || updated[d][0].activityName,
            teacherVideos: videos,
            teacherNotes: teacherNotes || updated[d][0].teacherNotes,
            ...(spotify !== undefined ? { teacherSpotify: spotify || undefined } : {}),
          };
        }
      });
      return updated;
    });

    try {
      await fetch('/api/routines/teacher-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: studentEmailToUse,
          studentUid: studentUidToUse,
          teacherUid: currentAccount?.uid,
          teacherEmail: currentAccount?.email,
          activityId,
          activityName: resolvedTopic,
          playlistTitle: resolvedTopic,
          videos,
          teacherNotes,
          days: daysToUpdate,
        }),
      });

      if (spotify !== undefined) {
        await fetch('/api/routines/teacher-spotify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: studentEmailToUse,
            studentUid: studentUidToUse,
            teacherUid: currentAccount?.uid,
            teacherEmail: currentAccount?.email,
            activityId,
            spotify,
            teacherNotes,
            days: daysToUpdate,
          }),
        });
      }
    } catch {
      // local fallback
    }
  };

  // Handler: Add custom activity to day's routine
  const handleAddCustomActivity = (newActivity: Omit<RoutineItem, 'id'>) => {
    const newItem: RoutineItem = {
      ...newActivity,
      id: `act-${Date.now()}`,
    };

    setRoutinesByDay((prev) => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), newItem],
    }));
    setSelectedActivityId(newItem.id);
  };

  // Handler: Assign video from playlist topic to activity
  const handleAssignVideoToActivity = (activityId: string, video: TeacherAssignedVideo, day: DayOfWeek) => {
    const playlistTopic = (video as any).playlistTitle;
    setRoutinesByDay((prev) => {
      const updated = { ...prev };
      updated[day] = (updated[day] || []).map((item) => {
        if (item.id === activityId) {
          return {
            ...item,
            activityName: playlistTopic || item.activityName,
            teacherVideos: [video],
            teacherNotes: video.instructions || item.teacherNotes,
          };
        }
        return item;
      });
      return updated;
    });

    const activeEmail = currentAccount?.email || userProfile?.email;
    const activeUid = currentAccount?.uid || (currentAccount as any)?.id || userProfile?.id;
    if (activeEmail || activeUid) {
      fetch('/api/routines/teacher-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          activityName: playlistTopic,
          playlistTitle: playlistTopic,
          videos: [video],
          teacherNotes: video.instructions,
          days: [day],
          day,
          studentEmail: activeEmail,
          studentUid: activeUid,
        }),
      }).catch(() => {});
    }
  };

  // Handler: Schedule new Live Lesson
  const handleScheduleLesson = async (lessonData: {
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    studentEmail: string;
    studentName: string;
    studentUid?: string;
    teacherEmail: string;
    teacherName: string;
    teacherUid?: string;
    meetLink: string;
  }) => {
    const finalStudentEmail = (lessonData.studentEmail && lessonData.studentEmail.trim() !== '')
      ? lessonData.studentEmail.trim().toLowerCase()
      : (scheduleStudentInfo?.email ? scheduleStudentInfo.email.trim().toLowerCase() : (currentAccount?.role === 'student' && currentAccount.email ? currentAccount.email.trim().toLowerCase() : (userProfile?.email ? userProfile.email.trim().toLowerCase() : '')));

    const finalStudentName = (lessonData.studentName && lessonData.studentName.trim() !== '')
      ? lessonData.studentName.trim()
      : (scheduleStudentInfo?.name ? scheduleStudentInfo.name.trim() : (currentAccount?.role === 'student' && currentAccount.name ? currentAccount.name.trim() : (userProfile?.name || 'Aluno')));

    const finalStudentUid = lessonData.studentUid
      || scheduleStudentInfo?.uid
      || (currentAccount?.role === 'student' ? currentAccount.uid : '')
      || (userProfile?.email?.toLowerCase() === finalStudentEmail && userProfile.id ? userProfile.id : '')
      || (finalStudentEmail ? `usr-${finalStudentEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '');

    const finalTeacherUid = lessonData.teacherUid
      || (lessonData.teacherEmail ? `usr-${lessonData.teacherEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '');

    // Conflict Check (Strict Anti-Duplicity Rule 2 - Individualized by teacher and student UIDs/emails)
    const existingConflict = findTeacherLessonConflict(
      lessonData.teacherEmail,
      lessonData.startDateTime,
      lessonData.endDateTime,
      lessons,
      undefined,
      finalTeacherUid,
      finalStudentEmail,
      finalStudentUid
    );
    if (existingConflict) {
      alert(
        isTeacher
          ? `Conflict Blocked: You or this student already have another lesson scheduled at this time. Overlapping lessons are not allowed.`
          : `Bloqueio de Conflito: Já existe uma aula agendada neste horário para este Amigo Nativo ou Aluno. Por favor, selecione outro horário disponível.`
      );
      return;
    }

    const newLesson: LiveLesson = {
      id: `lesson-${Date.now()}`,
      title: lessonData.title,
      description: lessonData.description,
      startDateTime: lessonData.startDateTime,
      endDateTime: lessonData.endDateTime,
      studentEmail: finalStudentEmail,
      studentName: finalStudentName,
      studentUid: finalStudentUid,
      teacherEmail: lessonData.teacherEmail,
      teacherName: lessonData.teacherName,
      teacherUid: finalTeacherUid,
      meetLink: lessonData.meetLink,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    setLessons((prev) => [newLesson, ...prev]);

    // Direct Firestore persistence
    saveLiveLessonToFirestore(newLesson);

    // Update students state so student appears immediately in teacher's filter and list
    setStudents((prev) => {
      const cleanEmail = finalStudentEmail;
      const exists = prev.some((s) => (s.email || s.studentEmail || '').toLowerCase().trim() === cleanEmail);
      if (exists) {
        return prev.map((s) =>
          (s.email || s.studentEmail || '').toLowerCase().trim() === cleanEmail
            ? { ...s, teacherEmail: lessonData.teacherEmail, teacherName: lessonData.teacherName, status: 'active' }
            : s
        );
      }
      return [
        ...prev,
        {
          id: `st-${Date.now()}`,
          name: lessonData.studentName,
          studentName: lessonData.studentName,
          email: cleanEmail,
          studentEmail: cleanEmail,
          teacherEmail: lessonData.teacherEmail,
          teacherName: lessonData.teacherName,
          status: 'active',
          level: 'iniciante',
        },
      ];
    });

    // Ensure active student session, profile, and fixed assigned Native Friend are locked in
    if (finalStudentEmail) {
      if (!currentAccount || currentAccount.role !== 'teacher' || scheduleStudentInfo) {
        const studentAccount: GoogleAccount = {
          uid: finalStudentUid,
          id: finalStudentUid,
          name: finalStudentName,
          email: finalStudentEmail,
          role: 'student',
          picture: '',
          avatar: '',
        };
        setCurrentAccount(studentAccount);
        localStorage.setItem('currentUserAccount', JSON.stringify(studentAccount));
      }

      setUserProfile((prev) => ({
        ...prev,
        id: finalStudentUid,
        name: finalStudentName,
        email: finalStudentEmail,
        teacherEmail: lessonData.teacherEmail,
        teacherName: lessonData.teacherName,
        enrollmentStatus: 'active',
        contractedLessons: Math.max(prev?.contractedLessons || 0, 1),
      }));

      setContractedLessons((prev) => ({
        ...prev,
        [finalStudentEmail]: Math.max(prev[finalStudentEmail] || 0, 1),
      }));

      fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: finalStudentEmail,
          profile: {
            id: finalStudentUid,
            name: finalStudentName,
            email: finalStudentEmail,
            teacherEmail: lessonData.teacherEmail,
            teacherName: lessonData.teacherName,
            enrollmentStatus: 'active',
            contractedLessons: Math.max(userProfile?.contractedLessons || 0, 1),
          },
        }),
      }).catch(() => {});
    }

    try {
      await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLesson),
      });
    } catch {
      // local fallback
    }

    // Direct student to their personal dashboard page and close modals
    setViewMode('dashboard');
    setIsScheduleModalOpen(false);
    setIsOnboardingModalOpen(false);
    setScheduleStudentInfo(null);
  };

  // Handler: Complete lesson (Automatically marks S-Path tutor_live for the lesson's day)
  const handleCompleteLesson = async (lessonId: string) => {
    let completedLesson: LiveLesson | undefined;
    setLessons((prev) => {
      completedLesson = prev.find((l) => l.id === lessonId);
      return prev.map((l) => (l.id === lessonId ? { ...l, status: 'completed' } : l));
    });

    const targetLesson = completedLesson || lessons.find((l) => l.id === lessonId);
    const targetStudentUid = targetLesson?.studentUid || currentAccount?.uid || userProfile?.id || '';
    const targetStudentEmail = targetLesson?.studentEmail || currentAccount?.email || userProfile?.email || '';

    // Calculate lesson day of week
    let lessonDay: DayOfWeek = 'monday';
    if (targetLesson?.startDateTime) {
      const d = new Date(targetLesson.startDateTime);
      const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const idx = d.getDay();
      if (dayNames[idx]) {
        lessonDay = dayNames[idx];
      }
    } else {
      lessonDay = selectedDay;
    }

    // Auto-mark S-Path for Native Friend session
    handleUpdateSPathCheck('tutor_live', lessonDay, true, targetStudentUid, targetStudentEmail);

    // Persist status change in Firestore
    updateLiveLessonInFirestore(lessonId, { status: 'completed' }, targetStudentUid || currentAccount?.uid);

    try {
      await fetch(`/api/lessons/${lessonId}/complete`, { method: 'POST' });
    } catch {
      // local fallback
    }
  };

  // Handler: Cancel lesson (preserves student balance if teacher unforeseen)
  const handleCancelLesson = async (
    lessonId: string,
    reason?: string,
    cancelledByInput?: 'student' | 'teacher'
  ) => {
    const finalCancelledBy = cancelledByInput || (isTeacher ? 'teacher' : 'student');
    const finalReason =
      reason ||
      (finalCancelledBy === 'teacher'
        ? currentLanguage === 'en'
          ? 'Native tutor unforeseen circumstances'
          : 'Imprevisto do amigo nativo'
        : currentLanguage === 'en'
        ? 'Cancelled for personal reasons'
        : 'Cancelado por motivo próprio');

    setLessons((prev) => {
      const target = prev.find((l) => l.id === lessonId);
      return prev.map((l) =>
        l.id === lessonId ||
        (target &&
          l.studentEmail &&
          l.studentEmail.toLowerCase() === (target.studentEmail || '').toLowerCase() &&
          l.startDateTime === target.startDateTime)
          ? {
              ...l,
              status: 'cancelled',
              cancelledAt: l.cancelledAt || new Date().toISOString(),
              cancelledBy: finalCancelledBy,
              cancellationReason: finalReason,
            }
          : l
      );
    });

    // Persist cancellation in Firestore
    updateLiveLessonInFirestore(lessonId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: finalCancelledBy,
      cancellationReason: finalReason,
    }, currentAccount?.uid);

    try {
      await fetch(`/api/lessons/${lessonId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelledBy: finalCancelledBy,
          reason: finalReason,
        }),
      });
    } catch {
      // local fallback
    }

    setNotifications((prev) => [
      {
        id: `cancel-${Date.now()}`,
        message:
          currentLanguage === 'en'
            ? finalCancelledBy === 'teacher'
              ? 'The session was cancelled due to native tutor unforeseen circumstances. Your lesson balance was NOT deducted.'
              : 'The session has been cancelled and counted in completed lessons.'
            : finalCancelledBy === 'teacher'
            ? 'A aula foi cancelada por imprevisto do amigo nativo. O seu saldo NÃO foi deduzido.'
            : 'A aula foi cancelada por motivo próprio e contabilizada nas aulas realizadas.',
        type: finalCancelledBy === 'teacher' ? 'success' : 'info',
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Mark Not Completed
  const handleConfirmNotCompleted = async (
    lessonId: string,
    responsible: 'student' | 'teacher',
    reason: string
  ) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              status: 'not_completed',
              notCompletedResponsible: responsible,
              notCompletedReason: reason,
            }
          : l
      )
    );

    // Persist not completed in Firestore
    updateLiveLessonInFirestore(lessonId, {
      status: 'not_completed',
      notCompletedResponsible: responsible,
      notCompletedReason: reason,
    }, currentAccount?.uid);

    try {
      await fetch(`/api/lessons/${lessonId}/not-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsible, reason }),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Propose Reschedule (Requires confirmation from the other party)
  const handleConfirmReschedule = async (
    lessonId: string,
    newStartIso: string,
    newEndIso: string,
    reason: string
  ) => {
    // Conflict Check on Reschedule proposal
    const targetLesson = lessons.find((l) => l.id === lessonId);
    if (targetLesson) {
      const teacherEmail = targetLesson.teacherEmail || targetLesson.tutorEmail || '';
      const conflict = findTeacherLessonConflict(
        teacherEmail,
        newStartIso,
        newEndIso,
        lessons,
        lessonId,
        targetLesson.teacherUid || targetLesson.tutorUid,
        targetLesson.studentEmail,
        targetLesson.studentUid
      );
      if (conflict) {
        alert(
          isTeacher
            ? `Conflict Blocked: The slot has another scheduled lesson. Please pick an open time.`
            : `Bloqueio de Conflito: O Amigo Nativo já possui outra aula agendada neste horário.`
        );
        return;
      }
    }

    const proposedBy = isTeacher ? 'teacher' : 'student';
    const proposalStatus = isTeacher
      ? 'pending_student_reschedule'
      : 'pending_teacher_reschedule';

    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              proposedNewStartDateTime: newStartIso,
              proposedNewEndDateTime: newEndIso,
              rescheduleNotes: reason,
              proposedBy,
              proposalStatus,
              proposedAt: new Date().toISOString(),
            }
          : l
      )
    );

    try {
      await fetch(`/api/lessons/${lessonId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStartIso, newEndIso, reason, proposedBy }),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Accept Reschedule (Strictly updates existing lesson in place, no duplicates)
  const handleAcceptReschedule = async (lessonId: string) => {
    const target = lessons.find((l) => l.id === lessonId);
    if (target && target.proposedNewStartDateTime) {
      const teacherEmail = target.teacherEmail || target.tutorEmail || '';
      const conflict = findTeacherLessonConflict(
        teacherEmail,
        target.proposedNewStartDateTime,
        target.proposedNewEndDateTime || target.endDateTime,
        lessons,
        lessonId,
        target.teacherUid || target.tutorUid,
        target.studentEmail,
        target.studentUid
      );
      if (conflict) {
        alert(
          isTeacher
            ? `Conflict: This proposed slot was booked by another lesson and cannot be accepted.`
            : `Bloqueio de Conflito: Este horário já foi ocupado por outra aula e não pode ser aceito.`
        );
        return;
      }
    }

    setLessons((prev) =>
      prev.map((l) => {
        if (l.id === lessonId && l.proposedNewStartDateTime) {
          return {
            ...l,
            startDateTime: l.proposedNewStartDateTime,
            endDateTime: l.proposedNewEndDateTime || l.endDateTime,
            rescheduledFrom: {
              startDateTime: l.startDateTime,
              endDateTime: l.endDateTime,
            },
            rescheduledAt: new Date().toISOString(),
            rescheduledBy: l.proposedBy,
            rescheduledReason: l.rescheduleNotes,
            proposedNewStartDateTime: undefined,
            proposedNewEndDateTime: undefined,
            proposalStatus: undefined,
          };
        }
        return l;
      })
    );

    try {
      await fetch(`/api/lessons/${lessonId}/accept-reschedule`, {
        method: 'POST',
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Decline Reschedule (Rejects proposed time, keeps original lesson intact)
  const handleDeclineReschedule = async (lessonId: string) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              proposedNewStartDateTime: undefined,
              proposedNewEndDateTime: undefined,
              proposalStatus: undefined,
            }
          : l
      )
    );

    try {
      await fetch(`/api/lessons/${lessonId}/decline-reschedule`, {
        method: 'POST',
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Save Lesson Notes & Recommendations
  const handleSaveLessonNotes = async (
    lessonId: string,
    notes: {
      topic?: string;
      liveNotes?: string;
      recommendations?: string;
      pronunciationNotes?: string;
      grammarAndPhrasing?: string;
      vocabularyNotes?: LiveLessonVocabNote[];
    }
  ) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              title: notes.topic || l.title,
              liveNotes: notes.liveNotes,
              recommendations: notes.recommendations,
              pronunciationNotes: notes.pronunciationNotes,
              grammarAndPhrasing: notes.grammarAndPhrasing,
              vocabularyNotes: notes.vocabularyNotes,
              notesLastSavedAt: new Date().toISOString(),
            }
          : l
      )
    );

    // Auto-migrate vocabulary notes to student's personal dictionary
    const targetLesson = lessons.find((l) => l.id === lessonId);
    const targetStudentEmail = targetLesson?.studentEmail || (selectedStudentFilter !== 'all' ? selectedStudentFilter : '');
    if (notes.vocabularyNotes && notes.vocabularyNotes.length > 0 && targetStudentEmail) {
      const dictEntries: StudentDictionaryEntry[] = notes.vocabularyNotes.map((vn) => ({
        id: vn.id || `dict_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        word: vn.word,
        partOfSpeech: vn.partOfSpeech || '',
        definitionEn: vn.meaningOrTip || '',
        exampleSentenceEn: vn.exampleSentence || '',
        learnedAt: new Date().toISOString(),
        source: vn.source || 'api',
        sourceActivityName: `Live Session with ${currentAccount?.name || 'Native Friend'}`,
      }));
      handleAddWordsToDictionary(dictEntries, targetStudentEmail);
    }

    try {
      await fetch(`/api/lessons/${lessonId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notes,
          studentEmail: targetStudentEmail,
          teacherEmail: currentAccount?.email,
          teacherName: currentAccount?.name,
        }),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Add words to Student Personal Dictionary (auto-migrated from lesson notes)
  const handleAddWordsToDictionary = async (entries: StudentDictionaryEntry[], studentEmail?: string) => {
    if (!entries || entries.length === 0) return;
    const targetEmail = (studentEmail || (selectedStudentFilter !== 'all' ? selectedStudentFilter : currentAccount?.email) || '').toLowerCase().trim();
    const targetStudent = (studentsList || []).find(
      (s) => (s.email || '').toLowerCase().trim() === targetEmail || (s as any).uid === targetEmail || s.id === targetEmail
    );
    const targetUid = (targetStudent as any)?.uid || targetStudent?.id || '';

    // Only update local studentDictionaryEntries if the current logged-in user is this student
    if (!currentAccount || (currentAccount.email || '').toLowerCase().trim() === targetEmail) {
      setStudentDictionaryEntries((prev) => {
        const map = new Map<string, StudentDictionaryEntry>();
        prev.forEach((e) => map.set(e.word.toLowerCase(), e));
        entries.forEach((e) => map.set(e.word.toLowerCase(), e));
        return Array.from(map.values()).sort((a, b) => a.word.localeCompare(b.word));
      });
    }

    if (targetEmail || targetUid) {
      // Direct Firestore persistence
      saveStudentVocabularyToFirestore(targetUid, entries, targetEmail);

      try {
        await fetch('/api/student-dictionary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: targetEmail,
            studentUid: targetUid,
            teacherEmail: currentAccount?.email,
            teacherName: currentAccount?.name,
            entries,
          }),
        });
      } catch (err) {
        console.warn('Failed to sync student dictionary entries:', err);
      }
    }
  };

  // Handler: Save manual entry in Personal Dictionary
  const handleSaveCustomDictionaryEntry = async (entry: StudentDictionaryEntry) => {
    let updatedList: StudentDictionaryEntry[] = [];
    setStudentDictionaryEntries((prev) => {
      const existing = prev.filter((e) => e.word.toLowerCase() !== entry.word.toLowerCase());
      updatedList = [...existing, entry].sort((a, b) => a.word.localeCompare(b.word));
      return updatedList;
    });

    const targetUid = currentAccount?.uid || userProfile?.id || '';
    const targetEmail = currentAccount?.email || userProfile?.email || '';

    // Direct Firestore persistence
    if (targetUid || targetEmail) {
      saveStudentVocabularyToFirestore(targetUid, [entry], targetEmail);
    }

    if (currentAccount?.email) {
      try {
        await fetch('/api/student-dictionary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: currentAccount.email,
            studentUid: currentAccount.uid,
            entry,
          }),
        });
      } catch (err) {
        console.warn('Failed to save student dictionary entry:', err);
      }
    }
  };

  // Handler: Add words from Live Session to Student's Weekly Activity Routine
  const handleAddWordsToWeeklyActivity = async (newWords: string[], studentEmail?: string) => {
    if (!newWords || newWords.length === 0) return;
    setRoutinesByDay((prev) => {
      const updated = { ...(prev || {}) };
      (Object.keys(updated) as DayOfWeek[]).forEach((day) => {
        if (Array.isArray(updated[day])) {
          updated[day] = updated[day].map((item) => {
            const isTutorOrConversation =
              item.id.toLowerCase().includes('tutor') ||
              item.activityName.toLowerCase().includes('conversa') ||
              item.activityName.toLowerCase().includes('chat') ||
              item.activityName.toLowerCase().includes('native') ||
              item.time === '15:00';

            if (isTutorOrConversation) {
              const existing = item.learnedWords || [];
              const combined = Array.from(new Set([...existing, ...newWords]));
              return { ...item, learnedWords: combined };
            }
            return item;
          });
        }
      });
      return updated;
    });

    try {
      await fetch('/api/routines/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: newWords, studentEmail }),
      });
    } catch {
      // local fallback
    }

    if (studentEmail) {
      handleSendStudentNotification(
        studentEmail,
        'New Vocabulary Added by Your Native Friend',
        `Your Native Friend added ${newWords.length} new words to your weekly study routine: ${newWords.slice(0, 5).join(', ')}${newWords.length > 5 ? '...' : ''}`
      );
    }
  };

  // Handler: Send Notification to Student
  const handleSendStudentNotification = (
    studentEmail: string,
    title: string,
    message: string
  ) => {
    setNotifications((prev) => [
      {
        id: `notif-live-${Date.now()}`,
        title,
        message,
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  // Handler: Save Teacher Meet Settings
  const handleSaveTeacherMeetSettings = async (settings: TeacherMeetSettings) => {
    const cleanEmail = (settings.teacherEmail || '').toLowerCase().trim();
    const uid =
      settings.uid ||
      (currentAccount?.email?.toLowerCase().trim() === cleanEmail ? currentAccount?.uid : undefined);
    const merged = { ...settings, teacherEmail: cleanEmail, ...(uid ? { uid } : {}) };

    setTeacherMeetSettings((prev) => ({
      ...prev,
      [cleanEmail]: merged,
      ...(uid ? { [uid]: merged } : {}),
    }));

    // Synchronize timezone, meetLink, availableDays, and availability to tutors list if updated
    setTutors((prev) =>
      prev.map((t) =>
        (t.email || '').toLowerCase().trim() === cleanEmail || (uid && (t as any).uid === uid)
          ? {
              ...t,
              timezone: settings.timezone || t.timezone,
              meetUrl: settings.meetLink || t.meetUrl,
              meetLink: settings.meetLink || (t as any).meetLink,
              availableDays:
                settings.availableDays && settings.availableDays.length > 0
                  ? settings.availableDays
                  : t.availableDays,
              availability: settings.availability || settings.availableHoursByDay || t.availability,
              availableHoursByDay: settings.availableHoursByDay || settings.availability || (t as any).availableHoursByDay,
            }
          : t
      )
    );

    try {
      await fetch('/api/teacher-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Save Landing Content from Admin Editor
  const handleSaveLandingContent = async (updatedContent: AdminLandingContent) => {
    setLandingContent(updatedContent);
    try {
      await fetch('/api/landing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedContent),
      });
    } catch {
      // local fallback
    }
  };

  const [isRefreshingTutors, setIsRefreshingTutors] = useState(false);

  const fetchLatestTutors = async () => {
    setIsRefreshingTutors(true);
    try {
      const email = currentAccount?.email || '';
      const role = currentAccount?.role || '';
      const uid = currentAccount?.uid || '';
      const isAdminUser = role === 'admin' || email.toLowerCase() === 'adm.itissimple@gmail.com' || isAdminApprovalsOpen;
      const query = `admin=${isAdminUser ? 'true' : 'false'}&includePending=${isAdminUser ? 'true' : 'false'}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}&_t=${Date.now()}`;
      const res = await fetch(`/api/tutors?${query}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTutors(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshingTutors(false);
    }
  };

  useEffect(() => {
    fetchLatestTutors();
    if (isAdminApprovalsOpen || currentAccount?.role === 'admin') {
      const interval = setInterval(fetchLatestTutors, 3000);
      return () => clearInterval(interval);
    }
  }, [isAdminApprovalsOpen, currentAccount?.role, currentAccount?.email]);

  // Handler: Admin Approve Tutor
  const handleApproveTutor = async (tutorId: string) => {
    setTutors((prev) =>
      prev.map((t) =>
        t.id === tutorId || t.email.toLowerCase() === tutorId.toLowerCase()
          ? { ...t, approvalStatus: 'approved' }
          : t
      )
    );
    try {
      const res = await fetch(`/api/tutors/${tutorId}/approve`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tutors)) {
          setTutors(data.tutors);
        }
      }
    } catch {
      // local fallback
    }
  };

  // Handler: Admin Reject Tutor
  const handleRejectTutor = async (tutorId: string) => {
    setTutors((prev) =>
      prev.map((t) =>
        t.id === tutorId || t.email.toLowerCase() === tutorId.toLowerCase()
          ? { ...t, approvalStatus: 'rejected' }
          : t
      )
    );
    try {
      const res = await fetch(`/api/tutors/${tutorId}/reject`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tutors)) {
          setTutors(data.tutors);
        }
      }
    } catch {
      // local fallback
    }
  };

  // Handler: Admin Delete Tutor
  const handleDeleteTutor = async (tutorId: string, tutorEmail?: string) => {
    const cleanEmail = tutorEmail?.toLowerCase();
    setTutors((prev) =>
      prev.filter((t) => {
        if (t.id === tutorId) return false;
        if (t.email.toLowerCase() === tutorId.toLowerCase()) return false;
        if (cleanEmail && t.email.toLowerCase() === cleanEmail) return false;
        return true;
      })
    );
    if (cleanEmail && cleanEmail !== 'adm.itissimple@gmail.com') {
      setAvailableAccounts((prev) => prev.filter((a) => a.email.toLowerCase() !== cleanEmail));
    }
    try {
      const queryParam = cleanEmail ? `?email=${encodeURIComponent(cleanEmail)}` : '';
      const response = await fetch(`/api/tutors/${encodeURIComponent(tutorId)}${queryParam}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.tutors)) {
          setTutors(data.tutors);
        }
      }
    } catch {
      // local fallback
    }
  };

  // Handler: Save Native Friend Profile (from Teacher Dashboard or Modal)
  const handleSaveTutorProfile = async (updatedTutor: NativeFriendTutor) => {
    const cleanEmail = (updatedTutor.email || '').toLowerCase().trim();
    const existingMeetSettings =
      teacherMeetSettings[cleanEmail] ||
      (currentAccount?.uid ? teacherMeetSettings[currentAccount.uid] : undefined);

    // Merge and preserve centralized meetUrl, availableDays, and availability
    const mergedTutor: NativeFriendTutor = {
      ...updatedTutor,
      meetUrl:
        existingMeetSettings?.meetLink ||
        updatedTutor.meetUrl ||
        '',
      availableDays:
        existingMeetSettings?.availableDays && existingMeetSettings.availableDays.length > 0
          ? existingMeetSettings.availableDays
          : updatedTutor.availableDays && updatedTutor.availableDays.length > 0
          ? updatedTutor.availableDays
          : [],
      availability:
        existingMeetSettings?.availability ||
        existingMeetSettings?.availableHoursByDay ||
        updatedTutor.availability,
      availableHours:
        existingMeetSettings?.availableHours ||
        updatedTutor.availableHours,
    };

    setTutors((prev) => {
      const exists = prev.some(
        (t) => t.id === mergedTutor.id || t.email.toLowerCase() === mergedTutor.email.toLowerCase()
      );
      if (exists) {
        return prev.map((t) =>
          t.id === mergedTutor.id || t.email.toLowerCase() === mergedTutor.email.toLowerCase()
            ? mergedTutor
            : t
        );
      }
      return [...prev, mergedTutor];
    });

    // Update currentAccount if active user is this tutor
    setCurrentAccount((prev) => {
      if (prev && prev.email.toLowerCase() === mergedTutor.email.toLowerCase()) {
        return {
          ...prev,
          name: mergedTutor.name,
          picture: mergedTutor.avatar || prev.picture,
        };
      }
      return prev;
    });

    // Update available accounts list
    setAvailableAccounts((prev) =>
      prev.map((acc) =>
        acc.email.toLowerCase() === mergedTutor.email.toLowerCase()
          ? {
              ...acc,
              name: mergedTutor.name,
              picture: mergedTutor.avatar || acc.picture,
            }
          : acc
      )
    );

    // Sync timezone to teacherMeetSettings if provided
    if (mergedTutor.timezone) {
      setTeacherMeetSettings((prev) => {
        const existing = prev[cleanEmail];
        if (existing) {
          return {
            ...prev,
            [cleanEmail]: {
              ...existing,
              timezone: mergedTutor.timezone,
            },
          };
        }
        return prev;
      });
    }

    try {
      await fetch(`/api/tutors/${mergedTutor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedTutor),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Save Student Profile & Photo
  const handleSaveStudentProfile = (updatedProfile: UserProfile, updatedPicture?: string) => {
    const cleanPic =
      updatedPicture !== undefined
        ? updatedPicture
        : updatedProfile.avatar || updatedProfile.picture || '';

    const cleanProfile: UserProfile = {
      ...updatedProfile,
      picture: cleanPic,
      avatar: cleanPic,
    };
    setUserProfile(cleanProfile);
    if (currentAccount) {
      setCurrentAccount((prev) =>
        prev
          ? {
              ...prev,
              name: cleanProfile.name,
              picture: cleanPic,
            }
          : null
      );
    }
    setAvailableAccounts((prev) =>
      prev.map((acc) =>
        acc.email.toLowerCase() === (cleanProfile.email || '').toLowerCase()
          ? {
              ...acc,
              name: cleanProfile.name,
              picture: cleanPic,
            }
          : acc
      )
    );
    setStudents((prev) =>
      prev.map((st) =>
        st.email.toLowerCase() === (cleanProfile.email || '').toLowerCase()
          ? {
              ...st,
              name: cleanProfile.name,
              studentName: cleanProfile.name,
              level: cleanProfile.level,
              studentLevel: cleanProfile.level,
              goal: cleanProfile.learningGoal || st.goal,
              routineVideoTime: cleanProfile.routineVideoTime || st.routineVideoTime,
              routineAudioTime: cleanProfile.routineAudioTime || st.routineAudioTime,
              dailyPhraseTime: cleanProfile.dailyPhraseTime || st.dailyPhraseTime,
              picture: cleanPic,
              avatar: cleanPic,
            }
          : st
      )
    );
    if (cleanProfile.routineVideoTime || cleanProfile.routineAudioTime) {
      setRoutinesByDay((prev) =>
        applyProfileTimesToRoutines(prev, cleanProfile.routineVideoTime, cleanProfile.routineAudioTime)
      );
    }

    try {
      fetch('/api/students/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: cleanProfile,
          picture: cleanPic,
          uid: currentAccount?.uid,
        }),
      }).catch(() => {});
    } catch {}
  };

  // Punctual time update for any activity in the timeline
  const handleUpdateActivityTime = (activityId: string, newTime: string, dayToUpdate?: DayOfWeek) => {
    const targetDay = dayToUpdate || selectedDay;
    setRoutinesByDay((prev) => {
      const updated = { ...prev };
      updated[targetDay] = (updated[targetDay] || []).map((item) =>
        item.id === activityId ? { ...item, time: newTime } : item
      );
      return updated;
    });

    const activeEmail = currentAccount?.email || userProfile?.email;
    if (activeEmail) {
      fetch('/api/routines/update-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: activeEmail,
          day: targetDay,
          activityId,
          time: newTime,
        }),
      }).catch(() => {});
    }
  };

  // Compute current tutor profile for Edit Profile Modal
  const currentTutorProfile: NativeFriendTutor = useMemo(() => {
    if (currentAccount && (currentAccount.role === 'teacher' || currentAccount.role === 'admin')) {
      const emailClean = (currentAccount.email || '').toLowerCase().trim();
      const settings =
        teacherMeetSettings[emailClean] ||
        (currentAccount.uid ? teacherMeetSettings[currentAccount.uid] : undefined);
      const found = tutors.find(
        (t) => t.email.toLowerCase() === emailClean
      );
      if (found) {
        return {
          ...found,
          meetUrl: settings?.meetLink || found.meetUrl || '',
          availableDays:
            settings?.availableDays && settings.availableDays.length > 0
              ? settings.availableDays
              : found.availableDays || [],
          availability: settings?.availability || settings?.availableHoursByDay || found.availability,
          timezone: settings?.timezone || found.timezone,
        };
      }

      return {
        id: `tutor-${currentAccount.email.replace(/[^a-zA-Z0-9]/g, '-')}`,
        name: currentAccount.name,
        email: currentAccount.email,
        avatar: currentAccount.picture || '',
        country: 'United States',
        countryCode: 'US',
        flag: '🇺🇸',
        accent: 'North American',
        rating: 5.0,
        reviewsCount: 0,
        activeStudents: 0,
        lessonsTaught: 0,
        pricePerSessionUsd: 20,
        pricePerSessionBrl: 110,
        headline: 'Conversational Native Friend',
        bio: 'Hello! I am ready to guide you in living English every day through real conversation and practical routines.',
        specialties: ['Conversational Fluency', 'Daily Routines'],
        availableDays: settings?.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        availableHours: settings?.availableHours || ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        availability: settings?.availability || settings?.availableHoursByDay,
        meetUrl: settings?.meetLink || '',
        approvalStatus: 'pending',
      };
    }
    if (tutors.length > 0) return tutors[0];
    return {
      id: 'default-tutor',
      name: 'Native Friend',
      email: 'contact@itissimple.com',
      avatar: '',
      country: 'United States',
      countryCode: 'US',
      flag: '🇺🇸',
      accent: 'North American',
      rating: 5.0,
      reviewsCount: 0,
      activeStudents: 0,
      lessonsTaught: 0,
      pricePerSessionUsd: 20,
      pricePerSessionBrl: 110,
      headline: 'Conversational Native Friend',
      bio: 'Ready to guide you in living English every day through real conversation.',
      specialties: ['Conversational Fluency', 'Daily Routines'],
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      availableHours: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
      approvalStatus: 'approved',
    };
  }, [tutors, currentAccount, teacherMeetSettings]);

  // Count pending tutor approvals for Administrator
  const pendingApprovalsCount = useMemo(() => {
    return tutors.filter((t) => (t.approvalStatus || 'approved') === 'pending').length;
  }, [tutors]);

  // Compute all words from routines and live sessions for Personal Dictionary
  const wordsFromRoutines = useMemo(() => {
    const list: Array<{ word: string; sourceActivityName?: string; sourceDay?: DayOfWeek }> = [];
    if (routinesByDay && typeof routinesByDay === 'object') {
      (Object.keys(routinesByDay) as DayOfWeek[]).forEach((day) => {
        (routinesByDay[day] || []).forEach((act) => {
          (act?.learnedWords || []).forEach((w) => {
            if (w && w.trim()) {
              list.push({
                word: w.trim(),
                sourceActivityName: act.activityName,
                sourceDay: day,
              });
            }
          });
        });
      });
    }

    // Also include vocabulary words noted by teacher during live lessons
    (lessons || []).forEach((l) => {
      if (l && Array.isArray(l.vocabularyNotes) && l.vocabularyNotes.length > 0) {
        l.vocabularyNotes.forEach((vn) => {
          if (vn && vn.word && vn.word.trim()) {
            list.push({
              word: vn.word.trim(),
              sourceActivityName: `Live Session with ${l.teacherName || 'Native Friend'}`,
            });
          }
        });
      }
    });

    return list;
  }, [routinesByDay, lessons]);

  // Handler: Save Daily Sentence and persist in Firestore Journal
  const handleSaveDailySentence = async (
    sentence: string,
    wordsUsed: string[],
    evaluationResult?: WritingEvaluationResult | null
  ) => {
    const studentUid = currentAccount?.uid || userProfile?.id || '';
    const studentEmail = (currentAccount?.email || userProfile?.email || '').toLowerCase().trim();

    const newJournalEntry: DailyJournalEntry = {
      id: `journal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: new Date().toISOString().split('T')[0],
      sentence,
      wordsUsed,
      correctedSentence: evaluationResult?.correctedSentence,
      explanation:
        evaluationResult?.explanation ||
        evaluationResult?.sentenceFeedback?.explanationPt ||
        evaluationResult?.sentenceFeedback?.explanationEn ||
        evaluationResult?.overallSummaryPt ||
        '',
      hasErrors: evaluationResult?.hasAnyError,
      createdAt: new Date().toISOString(),
      studentUid,
      studentEmail,
    };

    setDailyJournalEntries((prev) => [newJournalEntry, ...prev.filter((e) => e.id !== newJournalEntry.id)]);

    setUserProfile((prev) => ({
      ...prev,
      dailyJournalEntries: [
        newJournalEntry,
        ...(prev.dailyJournalEntries || []).filter((e) => e.id !== newJournalEntry.id),
      ],
    }));

    if (studentUid || studentEmail) {
      saveStudentJournalEntryToFirestore(studentUid, newJournalEntry, studentEmail);
      recordActivityInStudentJournal(
        studentUid,
        {
          id: `sentence_${newJournalEntry.date}_${Date.now()}`,
          type: 'sentence',
          date: newJournalEntry.date,
          dayOfWeek: selectedDay,
          week: Number(userProfile?.weeklyCycle) || 1,
          timestamp: Date.now(),
          title: sentence.length > 50 ? `${sentence.slice(0, 50)}...` : sentence,
          details: sentence,
        },
        studentEmail
      ).then((res) => {
        if (res.updatedJournal) {
          setStudentJournal(res.updatedJournal);
        }
      }).catch(() => {});
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: currentLanguage === 'en' ? 'Sentence Saved to Journal!' : 'Frase Salva no Diário!',
        message: sentence,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const handleDeleteJournalEntry = async (entryId: string) => {
    setDailyJournalEntries((prev) => prev.filter((e) => e.id !== entryId));
    setUserProfile((prev) => ({
      ...prev,
      dailyJournalEntries: (prev.dailyJournalEntries || []).filter((e) => e.id !== entryId),
    }));
  };

  // Comprehensive Teachers list for scheduling dropdowns, matching, and controls
  const teachersList = useMemo(() => {
    const teacherMap = new Map<string, GoogleAccount>();

    // 1. From availableAccounts
    availableAccounts.forEach((a) => {
      if (a.role === 'teacher' || a.role === 'admin') {
        const email = (a.email || '').toLowerCase().trim();
        if (email) teacherMap.set(email, { ...a, email });
      }
    });

    // 2. From all approved tutors list (coexistence of all Native Friends)
    tutors.forEach((t) => {
      if (t.approvalStatus === 'approved') {
        const email = (t.email || '').toLowerCase().trim();
        if (email) {
          const existing = teacherMap.get(email) || ({} as GoogleAccount);
          teacherMap.set(email, {
            ...existing,
            ...t,
            id: t.id || existing.id || `teacher-${email}`,
            name: t.name || existing.name || email.split('@')[0],
            email,
            role: 'teacher',
            avatar: t.avatar || existing.avatar || '',
            picture: t.avatar || existing.picture || '',
          });
        }
      }
    });

    // 3. From current student's assigned teacher if present
    if (userProfile.teacherEmail) {
      const email = userProfile.teacherEmail.toLowerCase().trim();
      if (!teacherMap.has(email)) {
        teacherMap.set(email, {
          id: `teacher-${email}`,
          name: userProfile.teacherName || email.split('@')[0],
          email,
          role: 'teacher',
        });
      }
    }

    return Array.from(teacherMap.values());
  }, [availableAccounts, tutors, userProfile.teacherEmail, userProfile.teacherName]);

  // Comprehensive Students list for teacher filtering, schedule modals, and student management
  const studentsList = useMemo(() => {
    const studentMap = new Map<string, GoogleAccount>();
    const isTeacher = currentAccount?.role === 'teacher' || currentAccount?.role === 'admin';
    const teacherEmailClean = (currentAccount?.email || '').toLowerCase().trim();
    const teacherUid = (currentAccount?.id || (currentAccount as any)?.uid || '').trim();
    const teacherNameClean = (currentAccount?.name || currentTutorProfile?.name || '').toLowerCase().trim();

    const adminEmails = [
      'adm.itissimple@gmail.com',
      'estilobeeforkids@gmail.com',
      'adm.itssimple@gmail.com',
      'estilobeeadm@gmail.com',
    ];

    const isMatchingTeacher = (sTeacherEmail?: string, sTeacherUid?: string, sTeacherName?: string) => {
      const cleanSTeacher = (sTeacherEmail || '').toLowerCase().trim();
      const cleanSTeacherUid = (sTeacherUid || '').trim();
      const cleanSTeacherName = (sTeacherName || '').toLowerCase().trim();

      if (teacherUid && cleanSTeacherUid && teacherUid === cleanSTeacherUid) return true;
      if (teacherEmailClean && cleanSTeacher && teacherEmailClean === cleanSTeacher) return true;

      // Check admin aliases
      if (adminEmails.includes(teacherEmailClean) && adminEmails.includes(cleanSTeacher)) return true;
      if (adminEmails.includes(teacherEmailClean) && cleanSTeacherName.includes('simple')) return true;
      if (teacherNameClean.includes('simple') && (adminEmails.includes(cleanSTeacher) || cleanSTeacherName.includes('simple'))) return true;

      return false;
    };

    // 1. From backend students array
    (students || []).forEach((s) => {
      const email = (s.email || s.studentEmail || '').toLowerCase().trim();
      const sTeacher = (s.teacherEmail || '').toLowerCase().trim();
      const sTeacherUid = (s.teacherUid || (s as any).assignedTeacherId || '').trim();
      const sTeacherName = (s.teacherName || '').toLowerCase().trim();
      const sStatus = s.status || (s as any).enrollmentStatus;

      if (!email) return;

      // Strictly filter out cancelled or unenrolled students
      if (sStatus === 'cancelled' || sStatus === 'not_enrolled') return;

      // If teacher is logged in, strictly enforce that student is assigned to this teacher
      if (isTeacher) {
        if (!isMatchingTeacher(sTeacher, sTeacherUid, sTeacherName)) return;
      }

      studentMap.set(email, {
        ...s,
        id: s.id || (s as any).uid || `st-${email}`,
        name: s.name || s.studentName || email.split('@')[0],
        studentName: s.name || s.studentName || email.split('@')[0],
        email,
        studentEmail: email,
        role: 'student',
        level: s.level || s.studentLevel || 'iniciante',
        studentLevel: s.level || s.studentLevel || 'iniciante',
        teacherEmail: s.teacherEmail || '',
        teacherName: s.teacherName || '',
        teacherUid: sTeacherUid || teacherUid,
        status: sStatus || 'active',
      } as any);
    });

    // 2. From availableAccounts (ONLY when NOT viewing as a teacher)
    if (!isTeacher) {
      availableAccounts.forEach((a) => {
        if (a.role === 'student') {
          const email = (a.email || '').toLowerCase().trim();
          if (email) {
            const existing = studentMap.get(email) || ({} as GoogleAccount);
            studentMap.set(email, {
              ...existing,
              ...a,
              id: a.id || (a as any).uid || existing.id || `st-${email}`,
              name: a.name || (existing as any).studentName || email.split('@')[0],
              studentName: a.name || (existing as any).studentName || email.split('@')[0],
              email,
              studentEmail: email,
              role: 'student',
              level: (a as any).level || (existing as any).level || 'iniciante',
              studentLevel: (a as any).level || (existing as any).studentLevel || 'iniciante',
            } as any);
          }
        }
      });
    }

    // 3. From current lessons (ONLY for this teacher if viewing as teacher)
    (lessons || []).forEach((l) => {
      const email = (l.studentEmail || '').toLowerCase().trim();
      if (!email) return;

      if (isTeacher) {
        if (l.status === 'cancelled') return;
        const lTeacherEmail = (l.teacherEmail || (l as any).tutorEmail || '').toLowerCase().trim();
        const lTeacherUid = (l.teacherUid || (l as any).tutorUid || '').trim();
        const lTeacherName = (l.teacherName || '').toLowerCase().trim();
        if (!isMatchingTeacher(lTeacherEmail, lTeacherUid, lTeacherName)) return;
      }

      // Check if student is explicitly unenrolled or cancelled
      const knownStudent = (students || []).find(
        (s) => (s.email || s.studentEmail || '').toLowerCase().trim() === email
      );
      if (knownStudent) {
        const kStatus = knownStudent.status || (knownStudent as any).enrollmentStatus;
        if (kStatus === 'cancelled' || kStatus === 'not_enrolled') return;
      }

      const existing = studentMap.get(email) || ({} as GoogleAccount);
      studentMap.set(email, {
        ...existing,
        id: existing.id || l.studentUid || `st-${email}`,
        name: existing.name || l.studentName || email.split('@')[0],
        studentName: (existing as any).studentName || l.studentName || email.split('@')[0],
        email,
        studentEmail: email,
        role: 'student',
        teacherEmail: (existing as any).teacherEmail || l.teacherEmail || '',
        teacherName: (existing as any).teacherName || l.teacherName || '',
        teacherUid: (existing as any).teacherUid || l.teacherUid || '',
      } as any);
    });

    // 4. Current user if student
    if (currentAccount?.role === 'student' && currentAccount.email) {
      const email = currentAccount.email.toLowerCase().trim();
      const existing = studentMap.get(email) || ({} as GoogleAccount);
      studentMap.set(email, {
        ...existing,
        ...currentAccount,
        id: currentAccount.id || (currentAccount as any).uid || existing.id || `st-${email}`,
        name: userProfile.name || currentAccount.name || existing.name || email.split('@')[0],
        studentName: userProfile.name || currentAccount.name || (existing as any).studentName || email.split('@')[0],
        email,
        studentEmail: email,
        role: 'student',
        teacherEmail: userProfile.teacherEmail || (existing as any).teacherEmail || '',
        teacherName: userProfile.teacherName || (existing as any).teacherName || '',
        teacherUid: (userProfile as any).teacherUid || (existing as any).teacherUid || '',
        level: userProfile.level || (existing as any).level || 'iniciante',
      } as any);
    }

    return Array.from(studentMap.values());
  }, [students, availableAccounts, lessons, currentAccount, userProfile, currentTutorProfile]);

  return (
    <div className="min-h-screen bg-[#FAFCFF] text-[#000035] flex flex-col font-sans selection:bg-[#9AB4FF]/40 selection:text-[#000035]">
      {/* 1. Conditional View Rendering: Landing Page vs Dashboard vs Find Tutors */}
      {viewMode === 'landing' || (!currentAccount && viewMode !== 'find-tutors') ? (
        <LandingPage
          tutors={tutors}
          currentLanguage={currentLanguage}
          onToggleLanguage={setCurrentLanguage}
          currentAccount={currentAccount}
          landingContent={landingContent || undefined}
          onOpenAdminLandingEditor={() => setIsAdminLandingEditorOpen(true)}
          onOpenAdminApprovals={() => setIsAdminApprovalsOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
          onLogout={handleLogout}
          onStartLivingInEnglish={handleStartLivingInEnglish}
          onOpenAuthModal={(mode, role = 'student') => {
            setAuthModalMode(mode);
            setAuthModalRole(role);
            setIsAuthModalOpen(true);
          }}
          onOpenBecomeTutorModal={() => setIsBecomeTutorModalOpen(true)}
          onGoToDashboard={() => {
            if (currentAccount) {
              setViewMode('dashboard');
            } else {
              setAuthModalMode('login');
              setAuthModalRole('student');
              setIsAuthModalOpen(true);
            }
          }}
          onBookLessonWithTutor={(tutor) => {
            setTeacherEmailForConfig(tutor.email);
            if (currentAccount?.role === 'student') {
              handleUpdateSubscription(tutor.email, tutor.name);
            }
            setIsScheduleModalOpen(true);
          }}
          onSendMessageToTutor={(tutor) => {
            setNotifications((prev) => [
              {
                id: `msg-${Date.now()}`,
                title: currentLanguage === 'en' ? `Message to ${tutor.name}` : `Mensagem para ${tutor.name}`,
                message: currentLanguage === 'en'
                  ? `Opening direct chat with ${tutor.name}.`
                  : `Iniciando conversa com ${tutor.name}.`,
                type: 'info',
                timestamp: new Date().toISOString(),
                read: false,
              },
              ...prev,
            ]);
          }}
        />
      ) : viewMode === 'find-tutors' ? (
        <div className="flex-1 flex flex-col">
          {/* Top Navbar */}
          <Navbar
            userProfile={userProfile}
            currentAccount={currentAccount}
            currentLanguage={currentLanguage}
            t={t}
            onToggleLanguage={setCurrentLanguage}
            onOpenAccountModal={() => {
              setAuthModalMode('login');
              setAuthModalRole('student');
              setIsAuthModalOpen(true);
            }}
            onOpenStudentProfile={() => setIsStudentProfileOpen(true)}
            onOpenTeacherProfile={() => setIsEditTutorProfileOpen(true)}
            onOpenAdminApprovals={() => setIsAdminApprovalsOpen(true)}
            onOpenAdminLandingEditor={() => setIsAdminLandingEditorOpen(true)}
            pendingTutorsCount={pendingApprovalsCount}
            onGoToLanding={() => setViewMode('landing')}
            onFindTutors={() => setViewMode('find-tutors')}
            onLogout={handleLogout}
            timeZone={isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE}
            tutors={tutors}
            lessons={lessons}
            students={studentsList}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (currentAccount) {
                    setViewMode('dashboard');
                  } else {
                    setViewMode('landing');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-white border border-[#607EC9]/30 text-[#062863] font-bold text-xs sm:text-sm hover:bg-[#9AB4FF]/15 transition cursor-pointer shadow-2xs"
              >
                ← {currentLanguage === 'en' ? (currentAccount ? 'Back to Practice Space' : 'Back to Home') : (currentAccount ? 'Voltar ao Seu Espaço de Prática' : 'Voltar ao Início')}
              </button>

              <button
                type="button"
                onClick={() => setIsBecomeTutorModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#062863] text-white font-bold text-xs sm:text-sm hover:bg-[#000035] transition cursor-pointer shadow-xs"
              >
                {currentLanguage === 'en' ? '+ Become a Native Friend' : '+ Seja um Amigo Nativo'}
              </button>
            </div>

            <FindTutorsSection
              tutors={tutors}
              currentLanguage={currentLanguage}
              onBookLesson={(tutor) => {
                setTeacherEmailForConfig(tutor.email);
                if (currentAccount?.role === 'student') {
                  handleUpdateSubscription(tutor.email, tutor.name);
                }
                setIsScheduleModalOpen(true);
              }}
              onSendMessage={(tutor) => {
                setNotifications((prev) => [
                  {
                    id: `msg-${Date.now()}`,
                    title: `Chat with ${tutor.name}`,
                    message: currentLanguage === 'en'
                      ? `Chat window opened for ${tutor.name}.`
                      : `Janela de chat aberta com ${tutor.name}.`,
                    type: 'info',
                    timestamp: new Date().toISOString(),
                    read: false,
                  },
                  ...prev,
                ]);
              }}
              onSelectMentor={(tutor) => {
                if (!currentAccount) {
                  setAuthModalMode('signup');
                  setAuthModalRole('student');
                  setIsAuthModalOpen(true);
                  return;
                }
                setSubscriptionTargetTutor(tutor);
                setIsManageSubscriptionOpen(true);
              }}
              selectedMentorEmail={userProfile?.teacherEmail}
            />

            <EnglishMomentsShowcase
              currentLanguage={currentLanguage}
              onExploreRoutines={() => setViewMode('dashboard')}
            />
          </main>
        </div>
      ) : (
        <>
          {/* Global Navigation Bar */}
          <Navbar
            userProfile={userProfile}
            currentAccount={currentAccount}
            currentLanguage={currentLanguage}
            t={t}
            onToggleLanguage={setCurrentLanguage}
            onOpenAccountModal={() => {
              setAuthModalMode('login');
              setAuthModalRole('student');
              setIsAuthModalOpen(true);
            }}
            onOpenStudentProfile={() => {
              if (currentAccount?.role === 'teacher') {
                setIsEditTutorProfileOpen(true);
              } else {
                setIsStudentProfileOpen(true);
              }
            }}
            onOpenTeacherProfile={() => setIsEditTutorProfileOpen(true)}
            onOpenAdminApprovals={() => setIsAdminApprovalsOpen(true)}
            onOpenAdminLandingEditor={() => setIsAdminLandingEditorOpen(true)}
            pendingTutorsCount={pendingApprovalsCount}
            onGoToLanding={() => setViewMode('landing')}
            onFindTutors={() => setViewMode('find-tutors')}
            onLogout={handleLogout}
            timeZone={isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE}
            tutors={tutors}
            lessons={lessons}
            students={studentsList}
          />

          {/* Notification Toast Banner */}
          <NotificationBanner
            notifications={notifications}
            onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
          />

          {/* Main Dashboard Workspace Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* TEACHER / ADMIN VIEW */}
            {isTeacher ? (
              <div className="space-y-6">
                {/* Admin Management Bar */}
                {currentAccount?.role === 'admin' && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-black text-[#000035]">
                            Administrator Control Panel
                          </h2>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            System Administrator
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Review pending Native Friend applications and manage homepage content.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsAdminApprovalsOpen(true)}
                        className="relative px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition cursor-pointer shadow-xs flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Native Friend Approvals</span>
                        {pendingApprovalsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-amber-700">
                            {pendingApprovalsCount} pending
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdminLandingEditorOpen(true)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4 text-slate-600" />
                        <span>Edit Landing Page</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Teacher Master Schedule Control */}
                <TeacherScheduleControlTable
                  lessons={lessons}
                  teachers={teachersList}
                  students={studentsList}
                  teacherMeetSettings={teacherMeetSettings}
                  currentAccount={currentAccount}
                  tutorProfile={currentTutorProfile}
                  selectedStudentFilter={selectedStudentFilter}
                  onSelectStudentFilter={handleSelectStudentFilter}
                  activeStudentActivity={activeStudentActivity}
                  onSelectStudentActivity={(act) => handleToggleStudentActivity(act)}
                  onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                  onOpenTeacherMeetConfig={(email) => {
                    setTeacherEmailForConfig(email);
                    setIsMeetConfigModalOpen(true);
                  }}
                  onOpenEditProfile={() => setIsEditTutorProfileOpen(true)}
                  onCompleteLesson={handleCompleteLesson}
                  onMarkNotCompleted={(lesson) => {
                    setActiveLessonForAction(lesson);
                    setIsNotCompletedModalOpen(true);
                  }}
                  onRescheduleLesson={(lesson) => {
                    setActiveLessonForAction(lesson);
                    setIsRescheduleModalOpen(true);
                  }}
                  onCancelLesson={handleCancelLesson}
                  onAcceptReschedule={handleAcceptReschedule}
                  onDeclineReschedule={handleDeclineReschedule}
                  currentLanguage="en"
                  t={getTranslations('en')}
                  timeZone={DEFAULT_TEACHER_TIMEZONE}
                />

                {/* Minimalist & Practical Student Workspace: Displayed when a specific student is filtered */}
                {selectedStudentFilter !== 'all' ? (() => {
                  const found = studentsList.find(
                    (s) =>
                      s.email?.toLowerCase() === selectedStudentFilter.toLowerCase() ||
                      s.uid === selectedStudentFilter ||
                      s.id === selectedStudentFilter
                  );
                  const stUid = found?.uid || found?.id || selectedStudentFilter;
                  const stEmail = found?.email || selectedStudentFilter;
                  const stName = found?.name || (found as any)?.studentName || (found as any)?.fullName || stEmail.split('@')[0];
                  const stLevel = found?.level || (found as any)?.studentLevel || 'intermediate';
                  const stAvatar = (found as any)?.avatarUrl || (found as any)?.photoUrl || (found as any)?.picture || '';
                  const stWeeklyCycle = (found as any)?.weeklyCycle || userProfile?.weeklyCycle || 1;
                  const stTimezone = (found as any)?.studentTimezone || (found as any)?.timezone || userProfile?.studentTimezone || 'America/Sao_Paulo';
                  const stActiveDays = (found as any)?.weeklyStudyDays || userProfile?.weeklyStudyDays;
                  const stActiveDaysCount = (found as any)?.weeklyStudyDaysTarget || userProfile?.weeklyStudyDaysTarget || 5;
                  const teacherUidVal = currentAccount?.uid || (currentTutorProfile as any)?.uid || currentTutorProfile?.id || '';
                  const teacherNameVal = currentAccount?.name || currentTutorProfile?.name;
                  const teacherEmailVal = currentAccount?.email || currentTutorProfile?.email;

                  // Student's scheduled lessons
                  const studentLessons = lessons.filter(
                    (l) => l.studentEmail?.toLowerCase() === stEmail.toLowerCase() && l.status !== 'cancelled'
                  );

                  return (
                    <div className="space-y-5 animate-in fade-in duration-200" id="filtered-student-workspace">
                      {/* 1. Student Profile Header Bar with Minimalist Activity Buttons */}
                      <div className="bg-white rounded-2xl border border-[#607EC9]/30 shadow-sm overflow-hidden" id="student-activity-section">
                        {/* Header Info */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#000035] via-[#062863] to-[#000035] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            {stAvatar ? (
                              <img
                                src={stAvatar}
                                alt={stName}
                                className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                                {stName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                  {stName}
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <ShieldCheck className="w-3 h-3" />
                                  Active Student
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-0.5">{stEmail}</p>
                            </div>
                          </div>

                          {/* Student Badges & Clear Filter Button */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/10 capitalize">
                              Level: {stLevel}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/10">
                              {stActiveDaysCount} study days/wk
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/10">
                              Week {stWeeklyCycle}
                            </span>
                            {studentLessons.length > 0 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                {studentLessons.length} lesson{studentLessons.length > 1 ? 's' : ''} scheduled
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedStudentFilter('all')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer shrink-0"
                              title="Clear student filter and return to full schedule"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Show All Students</span>
                            </button>
                          </div>
                        </div>

                        {/* Minimalist 3 Activity Buttons */}
                        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200/80">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                              <span>Student Activity:</span>
                              <span className="text-[11px] font-normal text-slate-400">(Click to view or toggle)</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full sm:w-auto">
                              {/* 1. Insights e Icebreaks Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleStudentActivity('insights')}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs ${
                                  activeStudentActivity === 'insights'
                                    ? 'bg-[#0A0F24] text-white shadow-slate-300 ring-2 ring-[#0A0F24]/50 ring-offset-1'
                                    : 'bg-white hover:bg-slate-50 text-[#0A0F24] border border-slate-200/90 hover:border-slate-300'
                                }`}
                              >
                                <Sparkles className={`w-4 h-4 ${activeStudentActivity === 'insights' ? 'text-amber-300' : 'text-[#0A0F24]'}`} />
                                <span>Insights e Icebreaks</span>
                                {activeStudentActivity === 'insights' && (
                                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                                )}
                              </button>

                              {/* 2. Live Lesson Notes Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleStudentActivity('notes')}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs ${
                                  activeStudentActivity === 'notes'
                                    ? 'bg-[#0A0F24] text-white shadow-slate-300 ring-2 ring-[#0A0F24]/50 ring-offset-1'
                                    : 'bg-white hover:bg-slate-50 text-[#0A0F24] border border-slate-200/90 hover:border-slate-300'
                                }`}
                              >
                                <BookOpen className={`w-4 h-4 ${activeStudentActivity === 'notes' ? 'text-[#9AB4FF]' : 'text-[#0A0F24]'}`} />
                                <span>Live Lesson Notes</span>
                                {activeStudentActivity === 'notes' && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                              </button>

                              {/* 3. Videos and Songs Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleStudentActivity('videos_songs')}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs ${
                                  activeStudentActivity === 'videos_songs'
                                    ? 'bg-[#0A0F24] text-white shadow-slate-300 ring-2 ring-[#0A0F24]/50 ring-offset-1'
                                    : 'bg-white hover:bg-slate-50 text-[#0A0F24] border border-slate-200/90 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <Video className={`w-4 h-4 ${activeStudentActivity === 'videos_songs' ? 'text-white' : 'text-[#0A0F24]'}`} />
                                  <Headphones className={`w-3.5 h-3.5 ${activeStudentActivity === 'videos_songs' ? 'text-white' : 'text-[#1DB954]'}`} />
                                </div>
                                <span>Videos and Songs</span>
                                {activeStudentActivity === 'videos_songs' && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Area: ONLY the selected activity expands below */}
                      {activeStudentActivity === 'insights' && (
                        <div id="section-student-insights" className="scroll-mt-6 animate-in fade-in duration-200">
                          <NativeFriendLessonInsights
                            studentUid={stUid}
                            studentEmail={stEmail}
                            studentName={stName}
                            studentLevel={stLevel}
                            teacherUid={teacherUidVal}
                            teacherName={teacherNameVal}
                            weekId={`week-${stWeeklyCycle}`}
                            weeklyCycle={stWeeklyCycle}
                            activeStudyDays={stActiveDays}
                          />
                        </div>
                      )}

                      {activeStudentActivity === 'notes' && (
                        <div id="section-student-notes" className="scroll-mt-6 animate-in fade-in duration-200">
                          <TeacherLiveLessonNotesPanel
                            lessons={lessons}
                            students={students}
                            currentAccount={currentAccount}
                            selectedStudentFilter={selectedStudentFilter}
                            onSaveLessonNotes={handleSaveLessonNotes}
                            onAddWordsToDictionary={handleAddWordsToDictionary}
                            onAddWordsToWeeklyActivity={handleAddWordsToWeeklyActivity}
                            onSendStudentNotification={handleSendStudentNotification}
                            timeZone={DEFAULT_TEACHER_TIMEZONE}
                          />
                        </div>
                      )}

                      {activeStudentActivity === 'videos_songs' && (
                        <div id="section-student-videos-songs" className="space-y-4 scroll-mt-6 animate-in fade-in duration-200">
                          {/* Minimalist Sub-Toggle between Videos and Songs */}
                          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700">Videos and Songs for {stName}:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setVideosAndSongsSubTab('videos')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                  videosAndSongsSubTab === 'videos'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>YouTube Videos</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setVideosAndSongsSubTab('songs')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                  videosAndSongsSubTab === 'songs'
                                    ? 'bg-[#1DB954] text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <Headphones className="w-3.5 h-3.5" />
                                <span>Spotify Routine & Songs</span>
                              </button>
                            </div>
                          </div>

                          {videosAndSongsSubTab === 'videos' ? (
                            <TeacherMediaAssignmentPanel
                              routinesByDay={routinesByDay}
                              students={studentsList}
                              selectedStudentEmail={selectedStudentFilter}
                              selectedStudentUid={stUid}
                              currentAccount={currentAccount}
                              onTeacherSaveVideos={handleTeacherSaveVideos}
                              currentLanguage="en"
                              t={getTranslations('en')}
                            />
                          ) : (
                            <TeacherSpotifyRoutineTracker
                              studentUid={stUid}
                              studentEmail={stEmail}
                              studentName={stName}
                              studentLevel={stLevel}
                              teacherUid={teacherUidVal}
                              teacherName={teacherNameVal}
                              teacherEmail={teacherEmailVal}
                              weekId={`week-${stWeeklyCycle}`}
                              weeklyCycle={stWeeklyCycle}
                              studentTimezone={stTimezone}
                              activeStudyDays={stActiveDays}
                              activeStudyDaysCount={stActiveDaysCount}
                            />
                          )}
                        </div>
                      )}

                      {activeStudentActivity === null && (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 shadow-2xs">
                          <p className="text-sm font-semibold text-slate-700">
                            Atividade minimizada para visualização limpa.
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Clique em um dos 3 botões acima (<strong>Insights e Icebreaks</strong>, <strong>Live Lesson Notes</strong> ou <strong>Videos and Songs</strong>) para abrir a atividade de {stName}.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })() : null}
              </div>
            ) : (
              /* STUDENT VIEW: Exactly Following the 3 User Model Sections */
              <div className="space-y-6" id="student-model-dashboard">
                {/* Section 1: Contracted Lessons & Balance + Fixed Teacher Card + Live 1-on-1 Sessions Panel (Image 1) */}
                <StudentHeaderSection
                  lessons={lessons}
                  currentAccount={currentAccount}
                  userProfile={userProfile}
                  teachers={teachersList}
                  teacherMeetSettings={teacherMeetSettings}
                  contractedLessons={contractedLessons}
                  onUpdateContractedLessons={handleUpdateContractedLessons}
                  onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                  onOpenManageSubscription={() => setIsManageSubscriptionOpen(true)}
                  onCancelLesson={handleCancelLesson}
                  onAcceptReschedule={handleAcceptReschedule}
                  onDeclineReschedule={handleDeclineReschedule}
                  onCompleteLesson={handleCompleteLesson}
                  onMarkNotCompleted={(lesson) => {
                    setActiveLessonForAction(lesson);
                    setIsNotCompletedModalOpen(true);
                  }}
                  onRescheduleLesson={(lesson) => {
                    setActiveLessonForAction(lesson);
                    setIsRescheduleModalOpen(true);
                  }}
                  currentLanguage={currentLanguage}
                  t={t}
                  timeZone={DEFAULT_STUDENT_TIMEZONE}
                />

                {/* Activity Reminders Manager (5-minute alerts based on registered times) */}
                <RoutineRemindersManager
                  key={currentAccount?.email || 'guest'}
                  userProfile={userProfile}
                  routinesByDay={routinesByDay}
                  currentLanguage={currentLanguage}
                  onTriggerNotification={(notif) => setNotifications((prev) => [notif, ...prev])}
                  onNavigateToActivity={(day, activityId) => {
                    setSelectedDay(day);
                    setSelectedActivityId(activityId);
                  }}
                  onOpenDailySentenceModal={() => setIsDailySentenceModalOpen(true)}
                />

                {/* Section 2: Daily Routine Guide STEP BY STEP (Image 2) */}
                <StudentRoutineGuideSection
                  routinesByDay={routinesByDay}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={setSelectedActivityId}
                  onToggleActivityComplete={handleToggleActivityComplete}
                  onAddCustomActivity={handleAddCustomActivity}
                  onEditActivity={(act) => {
                    setSelectedActivityId(act.id);
                  }}
                  onDeleteActivity={(actId) => {
                    setRoutinesByDay((prev) => {
                      const updated = { ...prev };
                      updated[selectedDay] = (updated[selectedDay] || []).filter((i) => i.id !== actId);
                      return updated;
                    });
                  }}
                  onSaveLearnedWords={handleSaveLearnedWords}
                  onUpdateTimeActivity={handleUpdateActivityTime}
                  userProfile={userProfile}
                  onSaveDailySentence={handleSaveDailySentence}
                  onOpenJournalModal={() => setIsJournalModalOpen(true)}
                  onOpenEmailModal={() => setIsEmailModalOpen(true)}
                  onTest30MinReminder={() => {
                    setNotifications((prev) => [
                      {
                        id: `reminder-${Date.now()}`,
                        title: currentLanguage === 'en' ? '⏰ 30-Minute End of Day Reminder' : '⏰ Lembrete: 30 min para o fim do dia',
                        message: currentLanguage === 'en'
                          ? 'Time to review today’s vocabulary and write your Sentence of the Day in English!'
                          : 'Hora de revisar as palavras da sua rotina de hoje e escrever sua Frase do Dia em inglês!',
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        read: false,
                      },
                      ...prev,
                    ]);
                  }}
                  currentLanguage={currentLanguage}
                  t={t}
                  onAssignVideoToActivity={handleAssignVideoToActivity}
                  weeklyCycle={userProfile?.weeklyCycle || 1}
                  onStartNewWeek={handleStartNewWeek}
                  isStarting={isStartingNewWeek}
                  weeklyChecks={weeklyChecks}
                  studentJournal={studentJournal}
                  onUpdateSPathCheck={handleUpdateSPathCheck}
                  onBehavioralComplete={handleBehavioralActivityComplete}
                />

                {/* Section 3: Weekly Activity (Image 3) */}
                <StudentWeeklyActivitySection
                  key={`weekly-activity-${userProfile?.weeklyCycle || 1}`}
                  homework={weeklyHomework}
                  routinesByDay={routinesByDay}
                  userProfile={userProfile}
                  studentJournal={studentJournal}
                  onOpenHomeworkModal={handleOpenHomeworkModal}
                  onOpenDictionaryModal={() => setIsPersonalDictionaryOpen(true)}
                  onOpenJournalModal={() => setIsJournalModalOpen(true)}
                  journalEntriesCount={dailyJournalEntries.length}
                  currentLanguage={currentLanguage}
                  dictionaryEntries={studentDictionaryEntries}
                  wordsFromRoutines={wordsFromRoutines}
                  onUpdateUserProfile={(partial) => {
                    handleSaveStudentProfile({ ...userProfile, ...partial });
                  }}
                  weeklyChecks={weeklyChecks}
                  onToggleWeeklyCheck={(stepId, dayKey, forcedChecked) => {
                    const isCompleted = typeof forcedChecked === 'boolean'
                      ? forcedChecked
                      : !Boolean(weeklyChecks[`${stepId}_${dayKey}`]);
                    handleUpdateSPathCheck(stepId as any, dayKey, isCompleted);
                  }}
                />
              </div>
            )}
          </main>

          {/* Footer with Discreet Easter Egg on © */}
          <Footer
            currentAccount={currentAccount}
            currentLanguage={currentLanguage}
            t={t}
            footerSlogan={landingContent?.footerSlogan || t.footerSub}
            scrollToSection={() => {}}
            onOpenBecomeTutorModal={() => setIsBecomeTutorModalOpen(true)}
            onOpenAuthModal={(mode, role) => {
              setAuthModalMode(mode);
              setAuthModalRole(role || 'student');
              setIsAuthModalOpen(true);
            }}
            onOpenAdminApprovals={() => setIsAdminApprovalsOpen(true)}
            onGoToDashboard={() => setViewMode('dashboard')}
          />
        </>
      )}

  {/* 5. Modals & Dialogs (Accessible from anywhere) */}
  {isAuthModalOpen && authModalMode === 'login' ? (
    <LoginModal
      isOpen={isAuthModalOpen && authModalMode === 'login'}
      onClose={() => setIsAuthModalOpen(false)}
      initialRole={authModalRole}
      initialEmail={authInitialEmail}
      currentLanguage={currentLanguage}
      onLoginSuccess={handleLoginSuccess}
      onShowToast={(title, message, type) => {
        setNotifications((prev) => [
          {
            id: `toast-${Date.now()}`,
            title,
            message,
            type: type || 'warning',
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
      }}
      onSwitchToSignUp={(role) => {
        setAuthModalMode('signup');
        setAuthModalRole(role || 'student');
      }}
    />
  ) : (
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      initialMode={authModalMode}
      initialRole={authModalRole}
      initialEmail={authInitialEmail}
      currentLanguage={currentLanguage}
      onLoginSuccess={handleLoginSuccess}
      onShowToast={(title, message, type) => {
        setNotifications((prev) => [
          {
            id: `toast-${Date.now()}`,
            title,
            message,
            type: type || 'warning',
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
      }}
    />
  )}

  <BecomeTutorModal
    isOpen={isBecomeTutorModalOpen}
    onClose={() => setIsBecomeTutorModalOpen(false)}
    currentLanguage={currentLanguage}
    onRegisteredSuccess={(tutor) => {
      const tutorAccount: GoogleAccount = {
        email: tutor.email,
        name: tutor.name,
        role: 'teacher',
        picture: tutor.avatar,
      };
      setTutors((prev) => [
        ...prev.filter((t) => t.email.toLowerCase() !== tutor.email.toLowerCase()),
        tutor,
      ]);
      setAvailableAccounts((prev) => [
        ...prev.filter((a) => a.email.toLowerCase() !== tutor.email.toLowerCase()),
        tutorAccount,
      ]);
      setCurrentAccount(tutorAccount);
      setViewMode('dashboard');
      setNotifications((prev) => [
        {
          id: `tutor-reg-${Date.now()}`,
          title: currentLanguage === 'en' ? 'Registration Complete!' : 'Cadastro Realizado!',
          message: currentLanguage === 'en'
            ? 'Your profile has been created and is pending Administrator approval before public listing.'
            : 'Seu perfil de Amigo Nativo foi criado com sucesso e está pendente de aprovação pelo Administrador para ser exibido publicamente.',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
    }}
  />

  {weeklyHomework && (
    <WeeklyHomeworkModal
      isOpen={isHomeworkModalOpen}
      onClose={() => setIsHomeworkModalOpen(false)}
      homework={weeklyHomework}
      selectedDay={homeworkTargetDay}
      activeStudyDays={userProfile?.weeklyStudyDays}
      weeklyCycle={userProfile?.weeklyCycle || 1}
      onSaveProgress={(updated) => setWeeklyHomework(updated)}
      onRegenerateWithAi={handleRegenerateHomeworkWithAi}
      isGeneratingAi={isGeneratingHomeworkAi}
      onCompleteTodayPart={(partKey, day) => {
        handleUpdateSPathCheck('memorization', day, true);
      }}
      onSubmitToTeacher={(updated) => {
        setWeeklyHomework(updated);
        setNotifications((prev) => [
          {
            id: `hw-${Date.now()}`,
            title: currentLanguage === 'en' ? 'Weekly Homework Submitted!' : 'Homework Semanal Enviada!',
            message: currentLanguage === 'en'
              ? 'Your weekly exercises and essay have been delivered to your teacher.'
              : 'Seus exercícios e redação semanal foram entregues ao professor com sucesso.',
            type: 'success',
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
      }}
      currentLanguage={currentLanguage}
      t={t}
    />
  )}

      <LiveLessonScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setTeacherEmailForConfig('');
          setScheduleStudentInfo(null);
          if (!currentAccount) {
            setViewMode('landing');
          }
        }}
        currentAccount={currentAccount}
        teachers={teachersList}
        students={studentsList}
        initialTeacherEmail={teacherEmailForConfig || userProfile.teacherEmail}
        teacherMeetSettings={teacherMeetSettings}
        lessons={lessons}
        onSchedule={handleScheduleLesson}
        currentLanguage={isTeacher ? 'en' : currentLanguage}
        t={isTeacher ? getTranslations('en') : t}
        timeZone={isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE}
        userProfile={userProfile}
        initialStudentEmail={scheduleStudentInfo?.email || (currentAccount?.role === 'student' ? currentAccount.email : userProfile?.email)}
        initialStudentName={scheduleStudentInfo?.name || (currentAccount?.role === 'student' ? currentAccount.name : userProfile?.name)}
        initialStudentUid={scheduleStudentInfo?.uid || (currentAccount?.role === 'student' ? currentAccount.uid : (userProfile?.id || userProfile?.uid))}
      />

      <StudentManagementModal
        isOpen={isStudentMgmtModalOpen}
        onClose={() => setIsStudentMgmtModalOpen(false)}
        students={students}
        onAddStudent={(newSt) => {
          const created: StudentProfile = { ...newSt, id: `st-${Date.now()}` };
          setStudents((prev) => [...prev, created]);
        }}
        onUpdateStudent={(updated) => {
          setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        }}
        onDeleteStudent={(id) => {
          setStudents((prev) => prev.filter((s) => s.id !== id));
        }}
        onSelectStudent={(st) => {
          setSelectedStudentFilter(st.email);
          setIsStudentMgmtModalOpen(false);
        }}
        selectedStudentId={selectedStudentFilter}
        currentLanguage={isTeacher ? 'en' : currentLanguage}
        t={isTeacher ? getTranslations('en') : t}
      />

      <TeacherMeetConfigModal
        isOpen={isMeetConfigModalOpen}
        onClose={() => setIsMeetConfigModalOpen(false)}
        teacherEmail={teacherEmailForConfig}
        teacherUid={
          (currentAccount?.email?.toLowerCase().trim() === teacherEmailForConfig?.toLowerCase().trim()
            ? currentAccount?.uid
            : undefined) ||
          tutors.find((t) => (t.email || '').toLowerCase().trim() === teacherEmailForConfig?.toLowerCase().trim())?.uid
        }
        currentSettings={
          teacherMeetSettings[teacherEmailForConfig?.toLowerCase().trim()] ||
          teacherMeetSettings[teacherEmailForConfig] ||
          (currentAccount?.uid ? teacherMeetSettings[currentAccount.uid] : undefined)
        }
        tutorProfile={
          tutors.find((t) => (t.email || '').toLowerCase().trim() === teacherEmailForConfig?.toLowerCase().trim()) ||
          (isTeacher ? currentTutorProfile : null)
        }
        onSave={handleSaveTeacherMeetSettings}
        currentLanguage="en"
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setActiveLessonForAction(null);
        }}
        lesson={activeLessonForAction}
        currentAccount={currentAccount}
        lessons={lessons}
        teacherMeetSettings={teacherMeetSettings}
        onConfirmReschedule={handleConfirmReschedule}
        currentLanguage={isTeacher ? 'en' : currentLanguage}
        timeZone={isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE}
      />

      <NotCompletedModal
        isOpen={isNotCompletedModalOpen}
        onClose={() => {
          setIsNotCompletedModalOpen(false);
          setActiveLessonForAction(null);
        }}
        lesson={activeLessonForAction}
        onConfirm={handleConfirmNotCompleted}
        currentLanguage={isTeacher ? 'en' : currentLanguage}
      />

      <EmailNotificationModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentAccount={currentAccount}
        userProfile={userProfile}
        teachers={teachersList}
        activityName={currentActivity?.activityName}
        activities={currentDayRoutines.map((r) => ({
          name: r.activityName,
          nameEn: r.activityName,
          time: r.time,
          words: r.learnedWords,
          notes: r.teacherNotes,
        }))}
        dailyPhrase={userProfile?.dailySentences?.[new Date().toISOString().split('T')[0]]}
        selectedDayName={selectedDay}
        currentLanguage={currentLanguage}
      />

      <ManageSubscriptionModal
        isOpen={isManageSubscriptionOpen}
        onClose={() => {
          setIsManageSubscriptionOpen(false);
          setSubscriptionTargetTutor(null);
        }}
        userProfile={userProfile}
        tutorsList={tutors}
        teachers={teachersList}
        currentLanguage={currentLanguage}
        onUpdateSubscription={handleUpdateSubscription}
        onPurchasePackage={handlePurchasePackage}
        initialSelectedTutor={subscriptionTargetTutor}
        onScheduleTrialLessonWithTutor={(tutor) => {
          setTeacherEmailForConfig(tutor.email);
          setIsManageSubscriptionOpen(false);
          setIsScheduleModalOpen(true);
        }}
      />

      {/* Pre-onboarding Email Verification Modal */}
      <StartLivingEmailModal
        isOpen={isStartLivingModalOpen}
        onClose={() => setIsStartLivingModalOpen(false)}
        currentLanguage={currentLanguage}
        onEmailProceed={(cleanEmail) => {
          setIsStartLivingModalOpen(false);
          setOnboardingInitialEmail(cleanEmail);
          setIsOnboardingModalOpen(true);
        }}
        onEmailVerified={(cleanEmail) => {
          setIsStartLivingModalOpen(false);
          setOnboardingInitialEmail(cleanEmail);
          setIsOnboardingModalOpen(true);
        }}
        onEmailAlreadyExists={(existingEmail) => {
          setIsStartLivingModalOpen(false);
          setNotifications((prev) => [
            {
              id: `toast-${Date.now()}`,
              title: currentLanguage === 'en' ? 'Account exists' : 'Conta já cadastrada',
              message: 'Este e-mail já possui uma conta cadastrada.',
              type: 'warning',
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...prev,
          ]);
          setAuthInitialEmail(existingEmail);
          setAuthModalMode('login');
          setAuthModalRole('student');
          setIsAuthModalOpen(true);
        }}
        onSwitchToLogin={(email) => {
          setIsStartLivingModalOpen(false);
          setAuthInitialEmail(email || '');
          setAuthModalMode('login');
          setAuthModalRole('student');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Multi-step Onboarding Assistant Wizard */}
      <OnboardingWizardModal
        isOpen={isOnboardingModalOpen}
        initialEmail={onboardingInitialEmail}
        onEmailAlreadyExists={(existingEmail) => {
          setIsOnboardingModalOpen(false);
          setNotifications((prev) => [
            {
              id: `toast-${Date.now()}`,
              title: currentLanguage === 'en' ? 'Account exists' : 'Conta já cadastrada',
              message: 'Este e-mail já possui uma conta cadastrada.',
              type: 'warning',
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...prev,
          ]);
          setAuthInitialEmail(existingEmail);
          setAuthModalMode('login');
          setAuthModalRole('student');
          setIsAuthModalOpen(true);
        }}
        onClose={() => {
          setIsOnboardingModalOpen(false);
          // If student gave up or closed onboarding before completion, or has no account, return to initial landing page
          if (!isOnboardingCompleting && (!currentAccount || viewMode === 'landing')) {
            setViewMode('landing');
          }
        }}
        currentLanguage={currentLanguage}
        tutorsList={tutors}
        currentUserProfile={userProfile}
        currentAccount={currentAccount}
        onCompleteOnboarding={handleCompleteOnboarding}
        onOpenStartNewWeek={() => {
          setViewMode('dashboard');
          setIsOnboardingModalOpen(false);
        }}
        onOpenScheduleTrialLesson={(tutor, studentInfo) => {
          setTeacherEmailForConfig(tutor.email);
          if (studentInfo && studentInfo.email) {
            setScheduleStudentInfo(studentInfo);
          } else {
            setScheduleStudentInfo({
              name: userProfile.name,
              email: userProfile.email,
              uid: userProfile.id,
            });
          }
          setIsScheduleModalOpen(true);
        }}
      />

      <DailySentenceModal
        isOpen={isDailySentenceModalOpen}
        onClose={() => setIsDailySentenceModalOpen(false)}
        todayRoutines={currentDayRoutines}
        userProfile={userProfile}
        currentLanguage={currentLanguage}
        onSaveDailySentence={handleSaveDailySentence}
        onOpenJournalModal={() => setIsJournalModalOpen(true)}
      />

      {/* Admin Landing Content Editor Modal */}
      <AdminLandingEditorModal
        isOpen={isAdminLandingEditorOpen}
        onClose={() => setIsAdminLandingEditorOpen(false)}
        currentContent={landingContent}
        onSave={handleSaveLandingContent}
        currentLanguage={isTeacher ? 'en' : currentLanguage}
      />

      {/* Admin Native Friend Approvals Modal */}
      <AdminApprovalsModal
        isOpen={isAdminApprovalsOpen}
        onClose={() => setIsAdminApprovalsOpen(false)}
        tutors={tutors}
        onApproveTutor={handleApproveTutor}
        onRejectTutor={handleRejectTutor}
        onDeleteTutor={handleDeleteTutor}
        onRefresh={fetchLatestTutors}
        isRefreshing={isRefreshingTutors}
        currentLanguage={isTeacher ? 'en' : currentLanguage}
      />

      {/* Native Friend Edit Profile Modal */}
      {isEditTutorProfileOpen && currentTutorProfile && (
        <EditTutorProfileModal
          isOpen={isEditTutorProfileOpen}
          onClose={() => setIsEditTutorProfileOpen(false)}
          tutor={currentTutorProfile}
          onSave={handleSaveTutorProfile}
          currentLanguage="en"
        />
      )}

      {/* Student Profile & Photo Modal */}
      <StudentProfileModal
        isOpen={isStudentProfileOpen}
        onClose={() => setIsStudentProfileOpen(false)}
        userProfile={userProfile}
        currentAccount={currentAccount}
        onSave={handleSaveStudentProfile}
        currentLanguage={currentLanguage}
      />

      {/* Student Personal Dictionary Modal */}
      <PersonalDictionaryModal
        isOpen={isPersonalDictionaryOpen}
        onClose={() => setIsPersonalDictionaryOpen(false)}
        wordsFromRoutines={wordsFromRoutines}
        customSavedEntries={studentDictionaryEntries}
        onSaveCustomEntry={handleSaveCustomDictionaryEntry}
        onOpenJournalModal={() => setIsJournalModalOpen(true)}
        currentLanguage={currentLanguage}
      />

      {/* Student Journal Modal (Saved & AI Corrected Sentences) */}
      <StudentJournalModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        entries={dailyJournalEntries}
        currentLanguage={currentLanguage}
        onDeleteEntry={handleDeleteJournalEntry}
        onOpenDailySentenceSection={() => setIsDailySentenceModalOpen(true)}
      />
    </div>
  );
}
