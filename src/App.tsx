import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { generateWeeklyHomeworkFromRoutines, generateWeeklyHomeworkWithAi } from './utils/homeworkGenerator';

// Components
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { FindTutorsSection } from './components/FindTutorsSection';
import { EnglishMomentsShowcase } from './components/EnglishMomentsShowcase';
import { CleanActivitySidebar } from './components/CleanActivitySidebar';
import { VideoLearningWorkspace } from './components/VideoLearningWorkspace';
import { DailySentenceSection } from './components/DailySentenceSection';
import { WeeklyHomeworkSection } from './components/WeeklyHomeworkSection';
import { TeacherScheduleControlTable } from './components/TeacherScheduleControlTable';
import { LiveMeetLessonsPanel } from './components/LiveMeetLessonsPanel';
import { TeacherLiveLessonNotesPanel } from './components/TeacherLiveLessonNotesPanel';
import { TeacherMediaAssignmentPanel } from './components/TeacherMediaAssignmentPanel';
import { SFluencyTracker } from './components/SFluencyTracker';
import { FloatingChatButton } from './components/FloatingChatButton';
import { NotificationBanner } from './components/NotificationBanner';
import { StudentHeaderSection } from './components/StudentHeaderSection';
import { StudentRoutineGuideSection } from './components/StudentRoutineGuideSection';
import { StudentWeeklyActivitySection } from './components/StudentWeeklyActivitySection';

// Modals
import { AuthModal } from './components/AuthModal';
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
import { ManageSubscriptionModal } from './components/ManageSubscriptionModal';
import { RoutineRemindersManager } from './components/RoutineRemindersManager';
import { ShieldCheck, Edit3 } from 'lucide-react';

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

const applyProfileTimesToRoutines = (
  baseRoutines: Record<DayOfWeek, RoutineItem[]>,
  videoTime?: string,
  audioTime?: string
): Record<DayOfWeek, RoutineItem[]> => {
  const source = baseRoutines && Object.keys(baseRoutines).length > 0 ? baseRoutines : defaultRoutinesByDay;
  const cloned: Record<DayOfWeek, RoutineItem[]> = {} as any;
  (Object.keys(source) as DayOfWeek[]).forEach((day) => {
    let videoTimeApplied = false;
    let audioTimeApplied = false;

    cloned[day] = (source[day] || []).map((act, index) => {
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

      // Strictly target exclusively the ONE primary Audio / Podcast of the Day activity for this day
      const isAudioOfTheDay =
        !audioTimeApplied &&
        Boolean(audioTime) &&
        (act.id.endsWith('2') ||
          Boolean(act.teacherSpotify) ||
          act.activityName?.toLowerCase().includes('áudio') ||
          act.activityName?.toLowerCase().includes('audio') ||
          act.activityName?.toLowerCase().includes('podcast') ||
          index === 1);

      if (isAudioOfTheDay && audioTime) {
        audioTimeApplied = true;
        return { ...act, time: audioTime };
      }

      // All other activities in the day strictly keep their own original / customized times
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

  // 4. Routines State by Day
  const [routinesByDay, setRoutinesByDay] = useState<Record<DayOfWeek, RoutineItem[]>>(defaultRoutinesByDay);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('m1');

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
      timezone: 'America/Sao_Paulo',
    },
  });

  const [contractedLessons, setContractedLessons] = useState<Record<string, number>>({});

  // 6. Students Management State
  const [students, setStudents] = useState<StudentProfile[]>([]);

  // 7. Weekly Homework State
  const [weeklyHomework, setWeeklyHomework] = useState<WeeklyHomeworkData | null>(null);

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
  const [isManageSubscriptionOpen, setIsManageSubscriptionOpen] = useState<boolean>(false);
  const [subscriptionTargetTutor, setSubscriptionTargetTutor] = useState<NativeFriendTutor | null>(null);

  const [activeLessonForAction, setActiveLessonForAction] = useState<LiveLesson | null>(null);
  const [teacherEmailForConfig, setTeacherEmailForConfig] = useState<string>('itissimple.school@gmail.com');

  // Teacher Filter
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');

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

  // Compute current day's routine items
  const currentDayRoutines = useMemo(() => {
    return routinesByDay[selectedDay] || [];
  }, [routinesByDay, selectedDay]);

  // Compute currently selected activity
  const currentActivity = useMemo(() => {
    return currentDayRoutines.find((item) => item.id === selectedActivityId) || currentDayRoutines[0] || null;
  }, [currentDayRoutines, selectedActivityId]);

  // Generate Weekly Homework automatically whenever routines or dictionary change
  useEffect(() => {
    const customWordList = studentDictionaryEntries.map((e) => ({
      word: e.word,
      definitionEn: e.definitionEn,
      exampleSentence: e.exampleSentenceEn,
      translationPt: e.translationPt || '',
      sourceActivityName: e.sourceActivityName || 'Live Session',
    }));

    const generated = generateWeeklyHomeworkFromRoutines({
      routinesByDay,
      studentName: userProfile.name,
      studentLevel: userProfile.level,
      customWords: customWordList,
    });

    // If we already have an AI-generated homework and the collected words haven't changed, preserve it!
    setWeeklyHomework((prev) => {
      if (prev?.isAiGenerated && !prev.isEmpty && prev.totalWordsCollected > 0) {
        const prevWords = prev.vocabularyList.map((w) => w.word.toLowerCase()).sort().join('|');
        const nextWords = generated.vocabularyList.map((w) => w.word.toLowerCase()).sort().join('|');
        if (prevWords === nextWords) {
          return prev;
        }
      }
      return generated;
    });
  }, [routinesByDay, userProfile.name, userProfile.level, studentDictionaryEntries]);

  // AI-powered dynamic regeneration for Memorization Activity (4 stages using real weekly vocabulary)
  const [isGeneratingHomeworkAi, setIsGeneratingHomeworkAi] = useState<boolean>(false);

  const handleRegenerateHomeworkWithAi = useCallback(async () => {
    setIsGeneratingHomeworkAi(true);
    try {
      const generated = await generateWeeklyHomeworkWithAi({
        routinesByDay,
        studentName: userProfile.name,
        studentLevel: userProfile.level,
        studentEmail: currentAccount?.email || userProfile.email || '',
        customWords: studentDictionaryEntries.map((e) => ({
          word: e.word,
          definitionEn: e.definitionEn,
          exampleSentence: e.exampleSentenceEn,
          translationPt: e.translationPt || '',
          sourceActivityName: e.sourceActivityName || 'Live Session',
        })),
      });
      setWeeklyHomework(generated);
    } catch {
      // Non-blocking fallback
    } finally {
      setIsGeneratingHomeworkAi(false);
    }
  }, [routinesByDay, userProfile.name, userProfile.level, currentAccount?.email, userProfile.email, studentDictionaryEntries]);

  // Proactively generate AI content as soon as vocabulary is present
  useEffect(() => {
    if (
      weeklyHomework &&
      !weeklyHomework.isAiGenerated &&
      !weeklyHomework.isEmpty &&
      weeklyHomework.totalWordsCollected > 0 &&
      !isGeneratingHomeworkAi
    ) {
      handleRegenerateHomeworkWithAi();
    }
  }, [weeklyHomework, isGeneratingHomeworkAi, handleRegenerateHomeworkWithAi]);

  const handleOpenHomeworkModal = useCallback(() => {
    setIsHomeworkModalOpen(true);
    // Auto-trigger AI generation if not yet generated by AI and user has real collected vocabulary
    if (
      weeklyHomework &&
      !weeklyHomework.isAiGenerated &&
      !weeklyHomework.isEmpty &&
      weeklyHomework.totalWordsCollected > 0 &&
      !isGeneratingHomeworkAi
    ) {
      handleRegenerateHomeworkWithAi();
    }
  }, [weeklyHomework, isGeneratingHomeworkAi, handleRegenerateHomeworkWithAi]);

  // Synchronize isolated student profile, lessons, routines, and settings whenever currentAccount changes
  useEffect(() => {
    if (!currentAccount?.email) {
      setLessons([]);
      setStudents([]);
      setUserProfile(createDefaultStudentProfile(null));
      setRoutinesByDay(defaultRoutinesByDay);
      return;
    }

    const email = currentAccount.email;
    const role = currentAccount.role;
    const uid = currentAccount.uid || '';
    const queryParams = `email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`;

    // 1. Fetch user-isolated lessons
    fetch(`/api/lessons?${queryParams}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setLessons(data);
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
          setRoutinesByDay(applyProfileTimesToRoutines(baseRoutines, vidTime, audTime));
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

    // Fetch user-isolated student dictionary entries
    const dictEmail = (role === 'student' ? email : (selectedStudentFilter !== 'all' ? selectedStudentFilter : '')) || userProfile?.email || '';
    if (dictEmail || (role === 'student' && uid)) {
      fetch(`/api/student-dictionary?studentEmail=${encodeURIComponent(dictEmail)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setStudentDictionaryEntries(data);
        })
        .catch((err) => console.warn('Could not fetch student dictionary:', err));
    }
  }, [currentAccount?.email, currentAccount?.role, currentAccount?.uid, selectedStudentFilter, userProfile?.email]);

  // Refresh student dictionary whenever the modal is opened
  useEffect(() => {
    if (!isPersonalDictionaryOpen) return;
    const dictEmail = (currentAccount?.role === 'student' ? (currentAccount?.email || '') : (selectedStudentFilter !== 'all' ? selectedStudentFilter : '')) || userProfile?.email || '';
    const uid = currentAccount?.uid || '';
    if (dictEmail || uid) {
      fetch(`/api/student-dictionary?studentEmail=${encodeURIComponent(dictEmail)}${uid ? `&uid=${encodeURIComponent(uid)}` : ''}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setStudentDictionaryEntries(data);
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
        level: initialProfile?.level || EnglishLevel.BEGINNER,
        learningGoal: initialProfile?.learningGoal || '',
      };
      setUserProfile(freshProfile);
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
    setViewMode('dashboard');
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

  // Handler: Toggle activity completed status
  const handleToggleActivityComplete = async (activityId: string) => {
    let nowCompleted = false;
    setRoutinesByDay((prev) => {
      const updatedDayList = (prev[selectedDay] || []).map((item) => {
        if (item.id === activityId) {
          nowCompleted = !item.completedToday;
          return { ...item, completedToday: nowCompleted };
        }
        return item;
      });
      return { ...prev, [selectedDay]: updatedDayList };
    });

    try {
      await fetch('/api/routines/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: selectedDay, activityId }),
      });
    } catch {
      // local fallback
    }
  };

  // Handler: Teacher saves video & Spotify for activity
  const handleTeacherSaveVideos = async (
    activityId: string,
    videos: TeacherAssignedVideo[],
    teacherNotes?: string,
    replicateToAllDays = false,
    targetDays?: DayOfWeek[],
    spotify?: TeacherAssignedSpotify | null
  ) => {
    const daysToUpdate: DayOfWeek[] = replicateToAllDays
      ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      : targetDays && targetDays.length > 0
      ? targetDays
      : [selectedDay];

    setRoutinesByDay((prev) => {
      const updated = { ...prev };
      daysToUpdate.forEach((d) => {
        updated[d] = (updated[d] || []).map((item) => {
          if (item.id === activityId || item.activityName === currentActivity?.activityName) {
            return {
              ...item,
              teacherVideos: videos,
              teacherNotes: teacherNotes || item.teacherNotes,
              ...(spotify !== undefined ? { teacherSpotify: spotify || undefined } : {}),
            };
          }
          return item;
        });
      });
      return updated;
    });

    try {
      await fetch('/api/routines/teacher-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
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
      : (currentAccount?.role === 'student' && currentAccount.email ? currentAccount.email.trim().toLowerCase() : '');

    const finalStudentName = (lessonData.studentName && lessonData.studentName.trim() !== '')
      ? lessonData.studentName.trim()
      : (currentAccount?.role === 'student' && currentAccount.name ? currentAccount.name.trim() : 'Aluno');

    const finalStudentUid = lessonData.studentUid
      || (currentAccount?.role === 'student' ? currentAccount.uid : '')
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

    // If current user is student, bind teacher to student's profile immediately
    if (currentAccount?.role === 'student') {
      setUserProfile((prev) => ({
        ...prev,
        teacherEmail: lessonData.teacherEmail,
        teacherName: lessonData.teacherName,
        enrollmentStatus: 'active',
      }));
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
  };

  // Handler: Complete lesson
  const handleCompleteLesson = async (lessonId: string) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, status: 'completed' } : l))
    );

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

    setStudentDictionaryEntries((prev) => {
      const map = new Map<string, StudentDictionaryEntry>();
      prev.forEach((e) => map.set(e.word.toLowerCase(), e));
      entries.forEach((e) => map.set(e.word.toLowerCase(), e));
      return Array.from(map.values()).sort((a, b) => a.word.localeCompare(b.word));
    });

    if (targetEmail) {
      try {
        await fetch('/api/student-dictionary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: targetEmail,
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
    setStudentDictionaryEntries((prev) => {
      const existing = prev.filter((e) => e.word.toLowerCase() !== entry.word.toLowerCase());
      return [...existing, entry].sort((a, b) => a.word.localeCompare(b.word));
    });

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
    setTeacherMeetSettings((prev) => ({
      ...prev,
      [settings.teacherEmail]: settings,
    }));

    try {
      await fetch('/api/teacher-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
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
    setTutors((prev) => {
      const exists = prev.some(
        (t) => t.id === updatedTutor.id || t.email.toLowerCase() === updatedTutor.email.toLowerCase()
      );
      if (exists) {
        return prev.map((t) =>
          t.id === updatedTutor.id || t.email.toLowerCase() === updatedTutor.email.toLowerCase()
            ? updatedTutor
            : t
        );
      }
      return [...prev, updatedTutor];
    });

    // Update currentAccount if active user is this tutor
    setCurrentAccount((prev) => {
      if (prev && prev.email.toLowerCase() === updatedTutor.email.toLowerCase()) {
        return {
          ...prev,
          name: updatedTutor.name,
          picture: updatedTutor.avatar || prev.picture,
        };
      }
      return prev;
    });

    // Update available accounts list
    setAvailableAccounts((prev) =>
      prev.map((acc) =>
        acc.email.toLowerCase() === updatedTutor.email.toLowerCase()
          ? {
              ...acc,
              name: updatedTutor.name,
              picture: updatedTutor.avatar || acc.picture,
            }
          : acc
      )
    );

    try {
      await fetch(`/api/tutors/${updatedTutor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTutor),
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
      const found = tutors.find(
        (t) => t.email.toLowerCase() === currentAccount.email.toLowerCase()
      );
      if (found) return found;

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
        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        availableHours: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
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
  }, [tutors, currentAccount]);

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

  // Handler: Save Daily Sentence
  const handleSaveDailySentence = (sentence: string, wordsUsed: string[]) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: currentLanguage === 'en' ? 'Sentence of the Day Recorded!' : 'Frase do Dia Registrada!',
        message: sentence,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
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
    const isTeacher = currentAccount?.role === 'teacher';
    const teacherEmailClean = (currentAccount?.email || '').toLowerCase().trim();
    const teacherUid = (currentAccount?.id || (currentAccount as any)?.uid || '').trim();

    // 1. From backend students array
    (students || []).forEach((s) => {
      const email = (s.email || s.studentEmail || '').toLowerCase().trim();
      const sTeacher = (s.teacherEmail || '').toLowerCase().trim();
      const sTeacherUid = (s.teacherUid || (s as any).assignedTeacherId || '').trim();
      const sStatus = s.status || (s as any).enrollmentStatus;

      // If teacher is logged in, strictly enforce that student is assigned to this teacher and not cancelled
      if (isTeacher) {
        const matchesTeacher =
          (teacherUid && sTeacherUid && (teacherUid === sTeacherUid || teacherUid.includes(sTeacher) || sTeacherUid.includes(teacherEmailClean))) ||
          (teacherEmailClean && sTeacher && teacherEmailClean === sTeacher);
        if (!matchesTeacher) return;
        if (sStatus === 'cancelled' || sStatus === 'not_enrolled') return;
      }

      if (email) {
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
      }
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
      if (isTeacher) {
        if (l.status === 'cancelled') return;
        const lTeacherEmail = (l.teacherEmail || (l as any).tutorEmail || '').toLowerCase().trim();
        const lTeacherUid = (l.teacherUid || (l as any).tutorUid || '').trim();
        const isMyLesson =
          (teacherUid && lTeacherUid && (teacherUid === lTeacherUid || teacherUid.includes(lTeacherEmail) || lTeacherUid.includes(teacherEmailClean))) ||
          (teacherEmailClean && lTeacherEmail && teacherEmailClean === lTeacherEmail);
        if (!isMyLesson) return;
      }
      const email = (l.studentEmail || '').toLowerCase().trim();
      if (email) {
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
      }
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
  }, [students, availableAccounts, lessons, currentAccount, userProfile]);

  return (
    <div className="min-h-screen bg-[#FAFCFF] text-[#000035] flex flex-col font-sans selection:bg-[#9AB4FF]/40 selection:text-[#000035]">
      {/* 1. Conditional View Rendering: Landing Page vs Dashboard vs Find Tutors */}
      {viewMode === 'landing' ? (
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
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="px-4 py-2 rounded-xl bg-white border border-[#607EC9]/30 text-[#062863] font-bold text-xs sm:text-sm hover:bg-[#9AB4FF]/15 transition cursor-pointer shadow-2xs"
              >
                ← {currentLanguage === 'en' ? 'Back to Practice Space' : 'Voltar ao Seu Espaço de Prática'}
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
                  onSelectStudentFilter={setSelectedStudentFilter}
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

                {/* Conditional Panels: Displayed ONLY when a specific student is selected in the master control filter */}
                {selectedStudentFilter !== 'all' ? (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* 2. Teacher Live Session Notes & Recommendations Panel (Native Friend Panel) */}
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

                    {/* 3. Teacher Media Assignment Panel (YouTube Videos & Spotify Audios) */}
                    <TeacherMediaAssignmentPanel
                      routinesByDay={routinesByDay}
                      students={studentsList}
                      selectedStudentEmail={selectedStudentFilter}
                      onTeacherSaveVideos={handleTeacherSaveVideos}
                      currentLanguage="en"
                      t={getTranslations('en')}
                    />
                  </div>
                ) : null}
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
                />

                {/* Section 3: Weekly Activity (Image 3) */}
                <StudentWeeklyActivitySection
                  homework={weeklyHomework}
                  routinesByDay={routinesByDay}
                  userProfile={userProfile}
                  onOpenHomeworkModal={handleOpenHomeworkModal}
                  onOpenDictionaryModal={() => setIsPersonalDictionaryOpen(true)}
                  currentLanguage={currentLanguage}
                  dictionaryEntries={studentDictionaryEntries}
                  wordsFromRoutines={wordsFromRoutines}
                  onUpdateUserProfile={(partial) => {
                    handleSaveStudentProfile({ ...userProfile, ...partial });
                  }}
                />
              </div>
            )}
          </main>

      {/* 4. Floating AI Chatbot Assistant */}
      <FloatingChatButton
        currentAccount={currentAccount}
        currentActivity={currentActivity}
        currentLanguage={currentLanguage}
        userLevel={userProfile.level}
        t={t}
      />
    </>
  )}

  {/* 5. Modals & Dialogs (Accessible from anywhere) */}
  <AuthModal
    isOpen={isAuthModalOpen}
    onClose={() => setIsAuthModalOpen(false)}
    initialMode={authModalMode}
    initialRole={authModalRole}
    currentLanguage={currentLanguage}
    onLoginSuccess={handleLoginSuccess}
  />

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
      onSaveProgress={(updated) => setWeeklyHomework(updated)}
      onRegenerateWithAi={handleRegenerateHomeworkWithAi}
      isGeneratingAi={isGeneratingHomeworkAi}
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
        currentSettings={teacherMeetSettings[teacherEmailForConfig]}
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
      />

      <DailySentenceModal
        isOpen={isDailySentenceModalOpen}
        onClose={() => setIsDailySentenceModalOpen(false)}
        todayRoutines={currentDayRoutines}
        userProfile={userProfile}
        currentLanguage={currentLanguage}
        onSaveDailySentence={handleSaveDailySentence}
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
        currentLanguage={currentLanguage}
      />
    </div>
  );
}
