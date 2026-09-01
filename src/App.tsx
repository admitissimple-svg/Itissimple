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
  WeeklyHomeworkData,
  Language,
  AdminLandingContent,
  NativeFriendTutor,
  StudentDictionaryEntry,
} from './types';
import { defaultRoutinesByDay } from './data/defaultRoutines';
import { INITIAL_NATIVE_FRIENDS } from './data/tutors';
import charlesAvatarImg from './assets/images/charles_anime_avatar_1788181232049.jpg';
import { getTranslations, getActivityDisplayName } from './utils/i18n';
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  DEFAULT_STUDENT_TIMEZONE,
  DEFAULT_TEACHER_TIMEZONE,
} from './utils/timezone';
import { generateWeeklyHomeworkFromRoutines } from './utils/homeworkGenerator';

// Components
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { FindTutorsSection } from './components/FindTutorsSection';
import { EnglishMomentsShowcase } from './components/EnglishMomentsShowcase';
import { CleanActivitySidebar } from './components/CleanActivitySidebar';
import { VideoLearningWorkspace } from './components/VideoLearningWorkspace';
import { DailySentenceSection } from './components/DailySentenceSection';
import { WeeklyHomeworkSection } from './components/WeeklyHomeworkSection';
import { LiveLessonsPanel } from './components/LiveLessonsPanel';
import { TeacherScheduleControlTable } from './components/TeacherScheduleControlTable';
import { SFluencyTracker } from './components/SFluencyTracker';
import { FloatingChatButton } from './components/FloatingChatButton';
import { NotificationBanner } from './components/NotificationBanner';

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

export default function App() {
  // 0. View mode: 'landing' | 'dashboard' | 'find-tutors'
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard' | 'find-tutors'>('landing');

  // 1. Language & i18n
  const [currentLanguage, setCurrentLanguage] = useState<Language>('pt');
  const t = useMemo(() => getTranslations(currentLanguage), [currentLanguage]);

  // 2. Authentication & Accounts
  const [currentAccount, setCurrentAccount] = useState<GoogleAccount | null>(null);

  const [availableAccounts, setAvailableAccounts] = useState<GoogleAccount[]>([
    {
      email: 'reginahelena1980@gmail.com',
      name: 'Regina Helena',
      role: 'student',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      email: 'charles.lambert1939@gmail.com',
      name: 'Charles Lambert (Amigo Nativo)',
      role: 'teacher',
      picture: charlesAvatarImg,
    },
    {
      email: 'sarah.jenkins.tutor@gmail.com',
      name: 'Sarah Jenkins (Amiga Nativa)',
      role: 'teacher',
      picture: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    {
      email: 'vinicius.student@gmail.com',
      name: 'Vinicius Alcantara',
      role: 'student',
      picture: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    },
    {
      email: 'adm.itissimple@gmail.com',
      name: 'Admin It\'s Simple',
      role: 'admin',
    },
  ]);

  const isTeacher = currentAccount ? (currentAccount.role === 'teacher' || currentAccount.role === 'admin') : false;

  // 2.1 Tutors & Admin Content State
  const [tutors, setTutors] = useState<NativeFriendTutor[]>(INITIAL_NATIVE_FRIENDS);
  const [landingContent, setLandingContent] = useState<AdminLandingContent | null>(null);

  // 3. Student Profile & Level
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'regina-1',
    name: 'Regina Helena',
    email: 'reginahelena1980@gmail.com',
    level: EnglishLevel.BEGINNER,
    streakDays: 14,
    points: 840,
    dailyGoalMinutes: 30,
    completedTodayMinutes: 20,
    targetAudienceCategory: 'executives',
    timezone: DEFAULT_STUDENT_TIMEZONE,
    contractedLessons: 10,
    completedLessonsCount: 3,
  });

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

  const [contractedLessons, setContractedLessons] = useState<Record<string, number>>({
    'reginahelena1980@gmail.com': 10,
    'vinicius.student@gmail.com': 5,
  });

  // 6. Students Management State
  const [students, setStudents] = useState<StudentProfile[]>([
    {
      id: 'st-1',
      name: 'Regina Helena',
      email: 'reginahelena1980@gmail.com',
      level: EnglishLevel.BEGINNER,
      contractedLessons: 10,
      completedLessonsCount: 3,
      goal: 'English for work & everyday communication',
      activeSince: '2025-01-10',
      createdAt: '2025-01-10T10:00:00Z',
    },
    {
      id: 'st-2',
      name: 'Vinicius Alcantara',
      email: 'vinicius.student@gmail.com',
      level: EnglishLevel.INTERMEDIATE,
      contractedLessons: 5,
      completedLessonsCount: 1,
      goal: 'Business presentations and international meetings',
      activeSince: '2025-02-01',
      createdAt: '2025-02-01T10:00:00Z',
    },
  ]);

  // 7. Weekly Homework State
  const [weeklyHomework, setWeeklyHomework] = useState<WeeklyHomeworkData | null>(null);

  // 8. Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 9. Modals Control State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
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

  const [activeLessonForAction, setActiveLessonForAction] = useState<LiveLesson | null>(null);
  const [teacherEmailForConfig, setTeacherEmailForConfig] = useState<string>('charles.lambert1939@gmail.com');

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

  // Generate Weekly Homework automatically whenever routines change
  useEffect(() => {
    const generated = generateWeeklyHomeworkFromRoutines({
      routinesByDay,
      studentName: userProfile.name,
      studentLevel: userProfile.level,
    });
    setWeeklyHomework(generated);
  }, [routinesByDay, userProfile.name, userProfile.level]);

  // Handler: Change active account (teacher vs student)
  const handleSwitchAccount = (account: GoogleAccount) => {
    setCurrentAccount(account);
    if (account.role === 'student') {
      setUserProfile((prev) => ({
        ...prev,
        name: account.name,
        email: account.email,
      }));
    }
  };

  // Handler: Add new Google account
  const handleAddAccount = (newAccount: GoogleAccount) => {
    setAvailableAccounts((prev) => [...prev, newAccount]);
    setCurrentAccount(newAccount);
  };

  // Handler: Login Success from Auth Modal
  const handleLoginSuccess = (account: GoogleAccount) => {
    setCurrentAccount(account);
    if (!availableAccounts.some((a) => a.email.toLowerCase() === account.email.toLowerCase())) {
      setAvailableAccounts((prev) => [...prev, account]);
    }
    if (account.role === 'student') {
      setUserProfile((prev) => ({
        ...prev,
        name: account.name,
        email: account.email,
      }));
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
    teacherEmail: string;
    teacherName: string;
    meetLink: string;
  }) => {
    const newLesson: LiveLesson = {
      id: `lesson-${Date.now()}`,
      title: lessonData.title,
      description: lessonData.description,
      startDateTime: lessonData.startDateTime,
      endDateTime: lessonData.endDateTime,
      studentEmail: lessonData.studentEmail,
      studentName: lessonData.studentName,
      teacherEmail: lessonData.teacherEmail,
      teacherName: lessonData.teacherName,
      meetLink: lessonData.meetLink,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    setLessons((prev) => [newLesson, ...prev]);

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

  // Handler: Cancel lesson
  const handleCancelLesson = async (lessonId: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    try {
      await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' });
    } catch {
      // local fallback
    }
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

  // Handler: Reschedule lesson
  const handleConfirmReschedule = async (
    lessonId: string,
    newStartIso: string,
    newEndIso: string,
    reason: string
  ) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              startDateTime: newStartIso,
              endDateTime: newEndIso,
              rescheduleNotes: reason,
              proposalStatus: isTeacher
                ? 'pending_student_reschedule'
                : 'pending_teacher_reschedule',
            }
          : l
      )
    );

    try {
      await fetch(`/api/lessons/${lessonId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStartIso, newEndIso, reason }),
      });
    } catch {
      // local fallback
    }
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
      localStorage.setItem('its_simple_landing_content', JSON.stringify(updatedContent));
    } catch {
      // local fallback
    }
  };

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
      await fetch(`/api/tutors/${tutorId}/approve`, { method: 'POST' });
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
      await fetch(`/api/tutors/${tutorId}/reject`, { method: 'POST' });
    } catch {
      // local fallback
    }
  };

  // Handler: Save Native Friend Profile (from Teacher Dashboard or Modal)
  const handleSaveTutorProfile = async (updatedTutor: NativeFriendTutor) => {
    setTutors((prev) => {
      const next = prev.map((t) =>
        t.id === updatedTutor.id || t.email.toLowerCase() === updatedTutor.email.toLowerCase()
          ? updatedTutor
          : t
      );
      try {
        localStorage.setItem('its_simple_tutors', JSON.stringify(next));
      } catch {}
      return next;
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
    setUserProfile(updatedProfile);
    if (currentAccount) {
      setCurrentAccount((prev) =>
        prev
          ? {
              ...prev,
              name: updatedProfile.name,
              picture: updatedPicture || prev.picture,
            }
          : null
      );
    }
    setAvailableAccounts((prev) =>
      prev.map((acc) =>
        acc.email.toLowerCase() === (updatedProfile.email || '').toLowerCase()
          ? {
              ...acc,
              name: updatedProfile.name,
              picture: updatedPicture || acc.picture,
            }
          : acc
      )
    );
    setStudents((prev) =>
      prev.map((st) =>
        st.email.toLowerCase() === (updatedProfile.email || '').toLowerCase()
          ? {
              ...st,
              name: updatedProfile.name,
              studentName: updatedProfile.name,
              level: updatedProfile.level,
              studentLevel: updatedProfile.level,
              goal: updatedProfile.learningGoal || st.goal,
            }
          : st
      )
    );
    try {
      localStorage.setItem('its_simple_user_profile', JSON.stringify(updatedProfile));
      if (updatedPicture) {
        localStorage.setItem('its_simple_user_picture', updatedPicture);
      }
      fetch('/api/students/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: updatedProfile, picture: updatedPicture }),
      }).catch(() => {});
    } catch {}
  };

  // Compute current tutor profile for Edit Profile Modal
  const currentTutorProfile: NativeFriendTutor = useMemo(() => {
    if (currentAccount) {
      const found = tutors.find(
        (t) => t.email.toLowerCase() === currentAccount.email.toLowerCase()
      );
      if (found) return found;
    }
    return tutors[0] || INITIAL_NATIVE_FRIENDS[0];
  }, [tutors, currentAccount]);

  // Compute all words from routines for Personal Dictionary
  const wordsFromRoutines = useMemo(() => {
    const list: Array<{ word: string; sourceActivityName?: string; sourceDay?: DayOfWeek }> = [];
    (Object.keys(routinesByDay) as DayOfWeek[]).forEach((day) => {
      (routinesByDay[day] || []).forEach((act) => {
        (act.learnedWords || []).forEach((w) => {
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
    return list;
  }, [routinesByDay]);

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

  // Teachers list for scheduling dropdowns
  const teachersList = availableAccounts.filter((a) => a.role === 'teacher' || a.role === 'admin');
  const studentsList = availableAccounts.filter((a) => a.role === 'student');

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
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode);
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
                setTeacherEmailForConfig(tutor.email);
                setIsScheduleModalOpen(true);
              }}
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
            onOpenStudentProfile={() => setIsStudentProfileOpen(true)}
            onOpenTeacherProfile={() => setIsEditTutorProfileOpen(true)}
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
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* 1. FOR TEACHER: Teacher Master Schedule Control is the FIRST Panel */}
            {isTeacher && (
              <TeacherScheduleControlTable
                lessons={lessons}
                teachers={teachersList}
                students={studentsList}
                teacherMeetSettings={teacherMeetSettings}
                currentAccount={currentAccount}
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
                currentLanguage={currentLanguage}
                t={t}
                timeZone={DEFAULT_TEACHER_TIMEZONE}
              />
            )}

            {/* 2. Top Live Lessons Schedule & Balance Overview */}
            <LiveLessonsPanel
              lessons={lessons}
              currentAccount={currentAccount}
              teachers={teachersList}
              teacherMeetSettings={teacherMeetSettings}
              contractedLessons={contractedLessons}
              onUpdateContractedLessons={handleUpdateContractedLessons}
              onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
              onOpenTeacherMeetConfig={(email) => {
                setTeacherEmailForConfig(email);
                setIsMeetConfigModalOpen(true);
              }}
              onCancelLesson={handleCancelLesson}
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
              selectedStudentFilter={selectedStudentFilter}
              onSelectStudentFilter={setSelectedStudentFilter}
              timeZone={isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE}
            />

            {/* 3. Student Weekly S Fluency Tracker (100% Live Progress Connected) */}
            {!isTeacher && (
              <SFluencyTracker
                mode="student"
                currentLanguage={currentLanguage}
                routinesByDay={routinesByDay}
                selectedDay={selectedDay}
                userProfile={userProfile}
                lessons={lessons}
                weeklyHomework={weeklyHomework}
                onSelectDay={setSelectedDay}
                onSelectActivity={setSelectedActivityId}
                onToggleActivityComplete={handleToggleActivityComplete}
                onOpenDailySentence={() => setIsDailySentenceModalOpen(true)}
                onOpenScheduleLesson={() => setIsScheduleModalOpen(true)}
                onOpenHomework={() => setIsHomeworkModalOpen(true)}
              />
            )}

        {/* Routine Workspace: Clean Sidebar + Video & 5 Words Learning Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Routine Navigator (Days + Activities) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <CleanActivitySidebar
              routinesByDay={routinesByDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              selectedActivityId={selectedActivityId}
              onSelectActivity={setSelectedActivityId}
              onToggleComplete={handleToggleActivityComplete}
              onAddCustomActivity={handleAddCustomActivity}
              onManageStudents={() => setIsStudentMgmtModalOpen(true)}
              onOpenPersonalDictionary={() => setIsPersonalDictionaryOpen(true)}
              isTeacher={isTeacher}
              currentLanguage={currentLanguage}
              t={t}
            />
          </div>

          {/* Right Column: Video Player, Guidance & 5 Words Recorder */}
          <div className="lg:col-span-8 space-y-6">
            <VideoLearningWorkspace
              activity={currentActivity}
              level={userProfile.level}
              isTeacher={isTeacher}
              t={t}
              currentLanguage={currentLanguage}
              onSaveLearnedWords={handleSaveLearnedWords}
              onToggleComplete={handleToggleActivityComplete}
              onTeacherEditVideos={(act) => {
                // Inline editing is enabled directly in the workspace
              }}
              onTeacherSaveVideos={handleTeacherSaveVideos}
              onOpenEndOfDayModal={() => setIsDailySentenceModalOpen(true)}
              onOpenEmailNotificationModal={() => setIsEmailModalOpen(true)}
            />

            {/* Daily Sentence Section */}
            <DailySentenceSection
              todayRoutines={currentDayRoutines}
              userProfile={userProfile}
              currentLanguage={currentLanguage}
              t={t}
              onSaveDailySentence={handleSaveDailySentence}
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
            />
          </div>
        </div>

        {/* Weekly Homework Section */}
        <WeeklyHomeworkSection
          homework={weeklyHomework}
          routinesByDay={routinesByDay}
          onOpenHomeworkModal={() => setIsHomeworkModalOpen(true)}
          onOpenDictionaryModal={() => setIsPersonalDictionaryOpen(true)}
          currentLanguage={currentLanguage}
        />
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
    currentLanguage={currentLanguage}
    onLoginSuccess={handleLoginSuccess}
  />

  <BecomeTutorModal
    isOpen={isBecomeTutorModalOpen}
    onClose={() => setIsBecomeTutorModalOpen(false)}
    currentLanguage={currentLanguage}
    onRegisteredSuccess={(tutor) => {
      setAvailableAccounts((prev) => [
        ...prev,
        {
          email: tutor.email,
          name: tutor.name,
          role: 'teacher',
        },
      ]);
      setNotifications((prev) => [
        {
          id: `tutor-reg-${Date.now()}`,
          title: currentLanguage === 'en' ? 'Welcome to the Native Friends Team!' : 'Bem-vindo(a) à equipe de Native Friends!',
          message: currentLanguage === 'en'
            ? 'Your teacher account has been activated.'
            : 'Sua conta de professor foi ativada com sucesso.',
          type: 'success',
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
        onClose={() => setIsScheduleModalOpen(false)}
        currentAccount={currentAccount}
        teachers={teachersList}
        students={studentsList}
        teacherMeetSettings={teacherMeetSettings}
        onSchedule={handleScheduleLesson}
        currentLanguage={currentLanguage}
        t={t}
        timeZone={isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE}
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
        currentLanguage={currentLanguage}
        t={t}
      />

      <TeacherMeetConfigModal
        isOpen={isMeetConfigModalOpen}
        onClose={() => setIsMeetConfigModalOpen(false)}
        teacherEmail={teacherEmailForConfig}
        currentSettings={teacherMeetSettings[teacherEmailForConfig]}
        onSave={handleSaveTeacherMeetSettings}
        currentLanguage={currentLanguage}
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setActiveLessonForAction(null);
        }}
        lesson={activeLessonForAction}
        currentAccount={currentAccount}
        onConfirmReschedule={handleConfirmReschedule}
        currentLanguage={currentLanguage}
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
        currentLanguage={currentLanguage}
      />

      <EmailNotificationModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        currentAccount={currentAccount}
        teachers={teachersList}
        activityName={currentActivity?.activityName}
        currentLanguage={currentLanguage}
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
        currentLanguage={currentLanguage}
      />

      {/* Admin Native Friend Approvals Modal */}
      <AdminApprovalsModal
        isOpen={isAdminApprovalsOpen}
        onClose={() => setIsAdminApprovalsOpen(false)}
        tutors={tutors}
        onApproveTutor={handleApproveTutor}
        onRejectTutor={handleRejectTutor}
        currentLanguage={currentLanguage}
      />

      {/* Native Friend Edit Profile Modal */}
      <EditTutorProfileModal
        isOpen={isEditTutorProfileOpen}
        onClose={() => setIsEditTutorProfileOpen(false)}
        tutor={currentTutorProfile}
        onSave={handleSaveTutorProfile}
        currentLanguage={currentLanguage}
      />

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
        currentLanguage={currentLanguage}
      />
    </div>
  );
}
