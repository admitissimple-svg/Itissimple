import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Volume2,
  Save,
  Check,
  Headphones,
  ExternalLink,
  BookOpen,
  PenTool,
  Wand2,
  AlertTriangle,
  Play,
  Youtube,
  Radio,
  Music,
  X,
  ChevronDown,
  Layers,
  Video,
  RotateCcw,
  Star,
  RefreshCw,
  Target,
} from 'lucide-react';
import { StartNewWeekModal } from './StartNewWeekModal';
import {
  DayOfWeek,
  Language,
  RoutineItem,
  UserProfile,
  WritingEvaluationResult,
  TeacherAssignedVideo,
  TeacherAssignedSpotify,
} from '../types';
import { Translations, getActivityDisplayName } from '../utils/i18n';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, getDailyYouTubeVideoForStudent } from '../utils/youtube';
import {
  getSpotifyEmbedUrl,
  getSpotifyDirectUrl,
  normalizeStudentLevel,
  getSpotifyPlaylistForLevel,
  getDailySpotifyTrackForStudent,
  DAYS_SEQUENCE,
  isValidSpotifyUrl,
} from '../utils/spotify';
import { speakText } from '../utils/audio';
import { checkStudentWritingApi } from '../utils/writingChecker';
import { getInstantOrCachedWord, lookupWord, DictionaryLookupResult } from '../utils/dictionaryService';
import {
  DAYS_OF_WEEK,
  getDayLabel,
  getDayShortLabel,
  getLastActivityOfTheDay,
  getEndOfDayReminderTime,
  getTodayDayOfWeek,
} from '../utils/notifications';

interface YouTubePlaylistItem {
  id: string;
  title: string;
  videos?: Array<{
    id?: string;
    videoId?: string;
    title: string;
    url?: string;
  }>;
}

interface StudentRoutineGuideSectionProps {
  routinesByDay: Record<DayOfWeek, RoutineItem[]>;
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
  onToggleActivityComplete: (id: string) => void;
  onAddCustomActivity?: (item: Omit<RoutineItem, 'id'>) => void;
  onEditActivity?: (item: RoutineItem) => void;
  onDeleteActivity?: (id: string) => void;
  onUpdateTimeActivity?: (activityId: string, newTime: string) => void;
  onSaveLearnedWords: (activityId: string, words: string[]) => void;
  userProfile: UserProfile;
  onSaveDailySentence: (sentence: string, wordsUsed: string[]) => void;
  onOpenEmailModal?: () => void;
  onTest30MinReminder?: () => void;
  currentLanguage: Language;
  t: Translations;
  onAssignVideoToActivity?: (activityId: string, video: TeacherAssignedVideo, day: DayOfWeek) => void;
  onStartNewWeek?: (studyDaysTarget?: number, selectedDays?: DayOfWeek[]) => Promise<boolean | void> | void;
  weeklyCycle?: number;
}

export const StudentRoutineGuideSection: React.FC<StudentRoutineGuideSectionProps> = ({
  routinesByDay,
  selectedDay,
  onSelectDay,
  selectedActivityId,
  onSelectActivity,
  onToggleActivityComplete,
  onAddCustomActivity,
  onEditActivity,
  onDeleteActivity,
  onUpdateTimeActivity,
  onSaveLearnedWords,
  userProfile,
  onSaveDailySentence,
  onOpenEmailModal,
  onTest30MinReminder,
  currentLanguage,
  t,
  onAssignVideoToActivity,
  onStartNewWeek,
  weeklyCycle = 1,
}) => {
  const isEn = currentLanguage === 'en';
  const todayDay = getTodayDayOfWeek();
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);
  const [isStartingNewWeek, setIsStartingNewWeek] = useState(false);

  // Playlists from active admin YouTube channel
  const [playlists, setPlaylists] = useState<YouTubePlaylistItem[]>([]);
  const [loadingPlaylistAssignId, setLoadingPlaylistAssignId] = useState<string | null>(null);
  const [playlistFeedback, setPlaylistFeedback] = useState<{
    activityId: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  // Custom YouTube video suggestion states
  const [customSuggestionActivities, setCustomSuggestionActivities] = useState<Record<string, boolean>>({});
  const [suggestingUrlActivityId, setSuggestingUrlActivityId] = useState<string | null>(null);
  const [suggestingUrlValues, setSuggestingUrlValues] = useState<Record<string, string>>({});
  const [isSavingSuggestionId, setIsSavingSuggestionId] = useState<string | null>(null);

  // Fetch active playlists dynamically
  useEffect(() => {
    let isMounted = true;
    fetch('/api/youtube-playlists')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPlaylists(data);
        }
      })
      .catch((err) => {
        console.warn('Error fetching playlists for timeline selector:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Inline time editing state for individual activity row
  const [editingTimeActivityId, setEditingTimeActivityId] = useState<string | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState<string>('');

  // Filter out any legacy audio activity from the timeline to keep the interface focused and simplified
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

  const currentDayList = routinesByDay[selectedDay] || [];
  const sortedActivities = [...currentDayList]
    .filter((act) => !isOldAudioActivity(act))
    .sort((a, b) => a.time.localeCompare(b.time));

  // Current active activity (guaranteed not to be an old audio activity)
  const activeActivity =
    sortedActivities.find((a) => a.id === selectedActivityId) || sortedActivities[0] || null;

  // 5 Words State
  const [words, setWords] = useState<string[]>(['', '', '', '', '']);
  const [wordsSaveFeedback, setWordsSaveFeedback] = useState<boolean>(false);
  const [wordDefinitions, setWordDefinitions] = useState<Record<number, DictionaryLookupResult>>({});

  // Synchronize 5 words when active activity changes
  useEffect(() => {
    if (activeActivity && activeActivity.learnedWords && activeActivity.learnedWords.length > 0) {
      const padded = [...activeActivity.learnedWords];
      while (padded.length < 5) padded.push('');
      setWords(padded.slice(0, 5));
    } else {
      setWords(['', '', '', '', '']);
    }
    setWordsSaveFeedback(false);
  }, [activeActivity?.id]);

  // Keep English definitions synchronized from configured dictionary
  useEffect(() => {
    const initialDefs: Record<number, DictionaryLookupResult> = {};
    words.forEach((w, idx) => {
      const clean = w.trim();
      if (clean) {
        initialDefs[idx] = getInstantOrCachedWord(clean);
      }
    });
    setWordDefinitions(initialDefs);

    const timer = setTimeout(() => {
      words.forEach(async (w, idx) => {
        const clean = w.trim();
        if (clean.length >= 2) {
          try {
            const res = await lookupWord(clean);
            if (res) {
              setWordDefinitions((prev) => {
                if (words[idx]?.trim().toLowerCase() === clean.toLowerCase()) {
                  return { ...prev, [idx]: res };
                }
                return prev;
              });
            }
          } catch {
            // Error handling handled by lookupWord
          }
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [words]);

  // Spotify view toggle: App Player or Spotify Web, and Track vs Full Playlist view
  const [spotifyPlayerMode, setSpotifyPlayerMode] = useState<'app' | 'web'>('app');
  const [spotifyEmbedView, setSpotifyEmbedView] = useState<'track' | 'playlist'>('track');

  // Sentence of the day State
  const [sentenceInput, setSentenceInput] = useState<string>('');
  const [sentenceSavedSuccess, setSentenceSavedSuccess] = useState<boolean>(false);
  const [sentenceEvaluation, setSentenceEvaluation] = useState<WritingEvaluationResult | null>(null);
  const [isCheckingSentence, setIsCheckingSentence] = useState<boolean>(false);
  const [savedTopicsBeforeRepeat, setSavedTopicsBeforeRepeat] = useState<Record<string, string>>({});

  // Quick jump helpers
  const activeStudyDays: DayOfWeek[] = useMemo(() => {
    if (userProfile?.weeklyStudyDays && userProfile.weeklyStudyDays.length > 0) {
      return userProfile.weeklyStudyDays;
    }
    return DAYS_OF_WEEK;
  }, [userProfile?.weeklyStudyDays]);

  // Active study days sorted in standard calendar order
  const activeDaysInOrder: DayOfWeek[] = useMemo(() => {
    const calendarOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const filtered = calendarOrder.filter((d) => activeStudyDays.includes(d));
    return filtered.length > 0 ? filtered : calendarOrder;
  }, [activeStudyDays]);

  // Requirement 3: "Repeat Previous Video" option is available ONLY from the 2nd active study day onwards
  const canShowRepeatVideoOption = useMemo(() => {
    const currentActiveIdx = activeDaysInOrder.indexOf(selectedDay);
    return currentActiveIdx >= 1;
  }, [activeDaysInOrder, selectedDay]);

  // Ensure selectedDay is always one of the active study days in the student's plan
  useEffect(() => {
    if (userProfile?.weeklyStudyDays && userProfile.weeklyStudyDays.length > 0) {
      if (!userProfile.weeklyStudyDays.includes(selectedDay)) {
        const fallback = userProfile.weeklyStudyDays.includes(todayDay)
          ? todayDay
          : userProfile.weeklyStudyDays[0];
        if (fallback) onSelectDay(fallback);
      }
    }
  }, [userProfile?.weeklyStudyDays, selectedDay, todayDay, onSelectDay]);

  const handleJumpWeekdays = () => {
    const weekday = activeStudyDays.find((d) =>
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d)
    );
    if (weekday) onSelectDay(weekday);
    else if (activeStudyDays[0]) onSelectDay(activeStudyDays[0]);
  };

  const handleJumpWeekends = () => {
    const weekend = activeStudyDays.find((d) => ['saturday', 'sunday'].includes(d));
    if (weekend) onSelectDay(weekend);
    else if (activeStudyDays.length > 0) onSelectDay(activeStudyDays[activeStudyDays.length - 1]);
  };

  // Calculate routine words for current day
  const allLearnedWordsToday: string[] = [];
  (sortedActivities || []).forEach((item) => {
    if (item?.learnedWords && Array.isArray(item.learnedWords)) {
      item.learnedWords.forEach((w) => {
        if (w && typeof w === 'string') {
          const trimmed = w.trim();
          if (trimmed && !allLearnedWordsToday.includes(trimmed)) {
            allLearnedWordsToday.push(trimmed);
          }
        }
      });
    }
  });

  // Today's routine words (starts empty without pre-filled words)
  const displayRoutineWords = allLearnedWordsToday;

  const formatToAmPm = (timeStr?: string): string => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2);
    if (isNaN(hours)) return timeStr;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formattedHours = hours.toString().padStart(2, '0');
    return `${formattedHours}:${minutes} ${period}`;
  };

  const matchedSentenceWords = displayRoutineWords.filter((w) =>
    Boolean(w && (sentenceInput || '').toLowerCase().includes(w.toLowerCase()))
  );

  // Handlers for 5 Words
  const handleWordChange = (index: number, val: string) => {
    const updated = [...words];
    updated[index] = val;
    setWords(updated);
  };

  const handleSaveWords = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeActivity) return;
    const cleanWords = words.map((w) => w.trim()).filter((w) => w.length > 0);
    onSaveLearnedWords(activeActivity.id, cleanWords);
    setWordsSaveFeedback(true);
    setTimeout(() => setWordsSaveFeedback(false), 2500);
  };

  // Handlers for Sentence of the Day
  const handleCheckGrammar = async () => {
    if (!sentenceInput.trim() || sentenceInput.trim().length < 4) return;
    setIsCheckingSentence(true);
    try {
      const evaluation = await checkStudentWritingApi({
        sentence: sentenceInput.trim(),
        words: matchedSentenceWords,
        level: userProfile.level,
      });
      setSentenceEvaluation(evaluation);
    } catch (err) {
      console.warn('Sentence check error:', err);
    } finally {
      setIsCheckingSentence(false);
    }
  };

  const handleSaveSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sentenceInput.trim();
    if (!clean || clean.length < 5) return;
    onSaveDailySentence(clean, matchedSentenceWords);
    setSentenceSavedSuccess(true);
    setTimeout(() => {
      setSentenceSavedSuccess(false);
      setSentenceInput('');
      setSentenceEvaluation(null);
    }, 2000);
  };

  // Automated level-based Spotify & YouTube curriculum sequential distribution
  const normalizedLevel = normalizeStudentLevel(userProfile?.level);
  const levelPlaylistConfig = getSpotifyPlaylistForLevel(normalizedLevel);
  const dailySpotifyTrack = getDailySpotifyTrackForStudent(normalizedLevel, selectedDay);
  const dailyYouTubeVideo = getDailyYouTubeVideoForStudent(normalizedLevel, selectedDay);

  const currentDayActivities = routinesByDay[selectedDay] || [];

  // Active YouTube video extraction: priority to active selected activity, then any day routine item, then level curriculum daily video
  const assignedVideo: TeacherAssignedVideo | null =
    (activeActivity?.teacherVideos && activeActivity.teacherVideos.length > 0
      ? activeActivity.teacherVideos[0]
      : null) ||
    currentDayActivities.find((act) => act && act.teacherVideos && act.teacherVideos.length > 0)?.teacherVideos?.[0] ||
    null;

  const isActiveActivityCustomSuggestion =
    Boolean(activeActivity && customSuggestionActivities[activeActivity.id]) ||
    (assignedVideo as any)?.playlistId === 'custom_suggestion' ||
    (assignedVideo as any)?.isCustomSuggestion === true ||
    activeActivity?.activityName === 'Your Suggestion' ||
    activeActivity?.activityName === 'Sua Sugestão' ||
    (assignedVideo as any)?.playlistTitle === 'Your Suggestion' ||
    (assignedVideo as any)?.playlistTitle === 'Sua Sugestão';

  // Rule 2a: Do NOT auto-fill any URL when "Your Suggestion" is selected without a saved video URL
  const isCustomWithoutVideo =
    isActiveActivityCustomSuggestion && (!assignedVideo?.url || !assignedVideo?.videoId);

  const rawVideoUrl = assignedVideo?.videoId || assignedVideo?.url || (isCustomWithoutVideo ? '' : dailyYouTubeVideo.url);
  const validVidId = isCustomWithoutVideo
    ? ''
    : extractYouTubeVideoId(rawVideoUrl) || dailyYouTubeVideo.videoId || 'OT1YRzt1f8A';
  const defaultVideoTitle =
    assignedVideo?.title ||
    dailyYouTubeVideo.title ||
    (activeActivity
      ? `English Routine: ${getActivityDisplayName(activeActivity.activityName, currentLanguage)}`
      : 'English Routine Video');
  const embedUrl = validVidId ? getYouTubeEmbedUrl(validVidId) : '';

  const rawAssignedSpotify =
    currentDayActivities.find((act) => act && act.teacherSpotify && act.teacherSpotify.url)?.teacherSpotify ||
    (activeActivity?.teacherSpotify?.url ? activeActivity.teacherSpotify : null);

  // Guard against any obsolete, broken or dummy placeholder Spotify URLs
  const assignedSpotify =
    rawAssignedSpotify && isValidSpotifyUrl(rawAssignedSpotify.url)
      ? rawAssignedSpotify
      : null;

  const hasTeacherCustomAudio = Boolean(
    assignedSpotify?.url &&
    assignedSpotify.url.trim() !== '' &&
    assignedSpotify.url.trim() !== dailySpotifyTrack.url.trim()
  );

  const effectiveTrackTitle = hasTeacherCustomAudio && assignedSpotify?.title && assignedSpotify.title !== 'Teacher Recommended Audio'
    ? assignedSpotify.title
    : dailySpotifyTrack.title;
  const effectiveArtist = hasTeacherCustomAudio && assignedSpotify?.artistOrHost
    ? assignedSpotify.artistOrHost
    : dailySpotifyTrack.artist;
  const effectiveEmbedUrl = hasTeacherCustomAudio && assignedSpotify?.url
    ? (getSpotifyEmbedUrl(assignedSpotify.url) || dailySpotifyTrack.embedUrl)
    : dailySpotifyTrack.embedUrl;
  const effectiveDirectUrl = hasTeacherCustomAudio && assignedSpotify?.url
    ? getSpotifyDirectUrl(assignedSpotify.url)
    : dailySpotifyTrack.url;
  const effectiveTeacherTip = hasTeacherCustomAudio && assignedSpotify?.instructions
    ? assignedSpotify.instructions
    : (isEn ? dailySpotifyTrack.teacherTipEn : dailySpotifyTrack.teacherTipPt);
  const currentDaySeqIndex = DAYS_SEQUENCE.indexOf(selectedDay) + 1;

  // End of day reminder calculation
  const lastActivity = getLastActivityOfTheDay(sortedActivities);
  const reminderTime = lastActivity ? getEndOfDayReminderTime(lastActivity.time) : '07:00';

  // Topic / Playlist selection & auto video injection handler
  const handleSelectPlaylistForActivity = async (activityId: string, playlistId: string) => {
    if (!playlistId) return;

    // Exclusive behavior for "Your Suggestion" / "Sua Sugestão"
    if (playlistId === 'custom_suggestion') {
      setCustomSuggestionActivities((prev) => ({ ...prev, [activityId]: true }));
      setSuggestingUrlActivityId(activityId);

      // Rule 2a: Do NOT auto-fill any URL; keep existing custom URL if already set, else empty
      const targetAct = currentDayList.find((a) => a.id === activityId);
      const existingCustomVid = targetAct?.teacherVideos?.[0];
      const isAlreadyCustom =
        (existingCustomVid as any)?.isCustomSuggestion ||
        (existingCustomVid as any)?.playlistId === 'custom_suggestion';

      setSuggestingUrlValues((prev) => ({
        ...prev,
        [activityId]: isAlreadyCustom ? (existingCustomVid?.url || '') : '',
      }));

      setPlaylistFeedback({
        activityId,
        type: 'success',
        message: isEn ? '💡 Paste your YouTube link below' : '💡 Cole seu link do YouTube abaixo',
      });
      setTimeout(() => setPlaylistFeedback(null), 3500);
      onSelectActivity(activityId);
      return;
    }

    // Behavior for "Repeat Previous Video" / "Repetir Vídeo Anterior"
    if (playlistId === 'repeat_previous_video') {
      setCustomSuggestionActivities((prev) => ({ ...prev, [activityId]: false }));
      setSuggestingUrlActivityId(null);
      setLoadingPlaylistAssignId(activityId);
      setPlaylistFeedback(null);

      // Search prior active study day from the student's study plan
      const calendarOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const activeDaysInOrder = calendarOrder.filter((d) => activeStudyDays.includes(d));
      const effectiveActive = activeDaysInOrder.length > 0 ? activeDaysInOrder : calendarOrder;
      const currentActiveIdx = effectiveActive.indexOf(selectedDay);

      let targetPrevActiveDay: DayOfWeek;
      if (currentActiveIdx > 0) {
        // Immediately previous active study day in the student's weekly plan
        targetPrevActiveDay = effectiveActive[currentActiveIdx - 1];
      } else if (currentActiveIdx === 0 && effectiveActive.length > 1) {
        // First active study day: wrap to the last active day of the plan
        targetPrevActiveDay = effectiveActive[effectiveActive.length - 1];
      } else {
        const selCalIdx = calendarOrder.indexOf(selectedDay);
        const preceding = effectiveActive.filter((d) => calendarOrder.indexOf(d) < selCalIdx);
        targetPrevActiveDay = preceding.length > 0 ? preceding[preceding.length - 1] : (effectiveActive[effectiveActive.length - 1] || 'monday');
      }

      let prevVideo: TeacherAssignedVideo | null = null;
      let prevDayName = getDayLabel(targetPrevActiveDay, currentLanguage);

      // 1. Search prior study day from targetPrevActiveDay in routinesByDay
      const targetActs = routinesByDay[targetPrevActiveDay] || [];
      for (const a of targetActs) {
        const v = a.teacherVideos?.[0];
        if (v && (v.url || v.videoId)) {
          prevVideo = v;
          prevDayName = getDayLabel(targetPrevActiveDay, currentLanguage);
          break;
        }
      }

      // 2. Search other active days in reverse order if targetPrevActiveDay has no video yet
      if (!prevVideo) {
        const otherActiveDays = [...effectiveActive].filter((d) => d !== selectedDay && d !== targetPrevActiveDay).reverse();
        for (const d of otherActiveDays) {
          const dayActs = routinesByDay[d] || [];
          for (const a of dayActs) {
            const v = a.teacherVideos?.[0];
            if (v && (v.url || v.videoId)) {
              prevVideo = v;
              prevDayName = getDayLabel(d, currentLanguage);
              break;
            }
          }
          if (prevVideo) break;
        }
      }

      // 3. Fallback: curriculum default for targetPrevActiveDay
      if (!prevVideo) {
        const normLevel = normalizeStudentLevel(userProfile?.level || 'beginner');
        const fallbackCurriculumVid = getDailyYouTubeVideoForStudent(normLevel, targetPrevActiveDay);
        if (fallbackCurriculumVid) {
          prevVideo = {
            id: `vid-${selectedDay}-repeat-${Date.now()}`,
            url: fallbackCurriculumVid.url,
            videoId: fallbackCurriculumVid.videoId,
            title: fallbackCurriculumVid.title,
            duration: fallbackCurriculumVid.duration || '5-10 min',
            instructions: isEn
              ? `Repeated video practice from ${getDayLabel(targetPrevActiveDay, 'en')}.`
              : `Prática de repetição do vídeo de ${getDayLabel(targetPrevActiveDay, 'pt')}.`,
            addedAt: new Date().toISOString(),
          };
          prevDayName = getDayLabel(targetPrevActiveDay, currentLanguage);
        }
      }

      const studentEmail = userProfile?.email || 'aluno@itssimple.com';
      try {
        const res = await fetch('/api/student-video-assignments/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail,
            playlistId: 'repeat_previous_video',
            activityId,
            day: selectedDay,
            videoUrl: prevVideo?.url,
          }),
        });

        const data = await res.json();
        const finalVideo: TeacherAssignedVideo = data.video || prevVideo || {
          id: `vid-${selectedDay}-repeat-${Date.now()}`,
          url: prevVideo?.url || 'https://www.youtube.com/watch?v=V1bFr2KGq1g',
          videoId: extractYouTubeVideoId(prevVideo?.url || '') || 'V1bFr2KGq1g',
          title: prevVideo?.title || 'Daily English Video Practice',
          duration: prevVideo?.duration || '5-10 min',
          instructions: isEn ? 'Repeated previous video' : 'Vídeo anterior repetido',
          addedAt: new Date().toISOString(),
        };

        const repeatedWithMeta: TeacherAssignedVideo = {
          ...finalVideo,
          playlistId: 'repeat_previous_video',
          playlistTitle: isEn ? 'Repeat Previous Video' : 'Repetir Vídeo Anterior',
        } as any;

        if (onAssignVideoToActivity) {
          onAssignVideoToActivity(activityId, repeatedWithMeta, selectedDay);
        }

        setPlaylistFeedback({
          activityId,
          type: 'success',
          message: isEn
            ? `🔁 Previous video repeated (${prevDayName || 'prior day'})!`
            : `🔁 Vídeo anterior repetido com sucesso (${prevDayName || 'dia anterior'})!`,
        });
        setTimeout(() => setPlaylistFeedback(null), 4500);
        onSelectActivity(activityId);
      } catch (err) {
        console.warn('Error repeating previous video:', err);
        if (prevVideo && onAssignVideoToActivity) {
          const repeatedWithMeta: TeacherAssignedVideo = {
            ...prevVideo,
            playlistId: 'repeat_previous_video',
            playlistTitle: isEn ? 'Repeat Previous Video' : 'Repetir Vídeo Anterior',
          } as any;
          onAssignVideoToActivity(activityId, repeatedWithMeta, selectedDay);
          setPlaylistFeedback({
            activityId,
            type: 'success',
            message: isEn ? '🔁 Previous video repeated!' : '🔁 Vídeo anterior repetido com sucesso!',
          });
          setTimeout(() => setPlaylistFeedback(null), 4000);
          onSelectActivity(activityId);
        }
      } finally {
        setLoadingPlaylistAssignId(null);
      }
      return;
    }

    // Reset custom suggestion mode if switching to a predefined topic
    setCustomSuggestionActivities((prev) => ({ ...prev, [activityId]: false }));
    setSuggestingUrlActivityId(null);
    setLoadingPlaylistAssignId(activityId);
    setPlaylistFeedback(null);
    setSavedTopicsBeforeRepeat((prev) => ({ ...prev, [activityId]: playlistId }));

    const studentEmail = userProfile?.email || 'aluno@itssimple.com';

    try {
      const res = await fetch('/api/student-video-assignments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail,
          playlistId,
          activityId,
          day: selectedDay,
        }),
      });

      const data = await res.json();
      if (data.allConsumed) {
        setPlaylistFeedback({
          activityId,
          type: 'warning',
          message: data.message || (isEn ? 'All videos in this playlist were already assigned.' : 'Todos os vídeos desta playlist já foram assistidos.'),
        });
      } else if (data.success && data.video) {
        setPlaylistFeedback({
          activityId,
          type: 'success',
          message: `✨ ${data.video.title}`,
        });
        setTimeout(() => setPlaylistFeedback(null), 4500);

        if (onAssignVideoToActivity) {
          onAssignVideoToActivity(activityId, data.video, selectedDay);
        }
        onSelectActivity(activityId);
      } else {
        setPlaylistFeedback({
          activityId,
          type: 'error',
          message: data.error || (isEn ? 'Error assigning video.' : 'Erro ao injetar vídeo.'),
        });
      }
    } catch (err) {
      console.warn('Error assigning video from playlist:', err);
      setPlaylistFeedback({
        activityId,
        type: 'error',
        message: isEn ? 'Connection error assigning video.' : 'Erro na conexão ao injetar vídeo.',
      });
    } finally {
      setLoadingPlaylistAssignId(null);
    }
  };

  // Handler: Toggle "Repeat Previous Video" checkbox/button
  const handleToggleRepeatPreviousVideo = async (activityId: string, shouldRepeat: boolean) => {
    if (shouldRepeat) {
      // Find current playlist topic and remember it before repeating
      const currentAct = currentDayList.find((a) => a.id === activityId);
      const currentVid = currentAct?.teacherVideos?.[0];
      const currentPlId = (currentVid as any)?.playlistId || '';
      if (currentPlId && currentPlId !== 'repeat_previous_video' && currentPlId !== 'custom_suggestion') {
        setSavedTopicsBeforeRepeat((prev) => ({ ...prev, [activityId]: currentPlId }));
      }
      await handleSelectPlaylistForActivity(activityId, 'repeat_previous_video');
    } else {
      await handleUncheckRepeatPreviousVideo(activityId);
    }
  };

  // Handler: Uncheck "Repeat Previous Video", restoring topic selection and resetting video
  const handleUncheckRepeatPreviousVideo = async (activityId: string) => {
    setLoadingPlaylistAssignId(activityId);
    setPlaylistFeedback(null);

    const normLevel = normalizeStudentLevel(userProfile?.level || 'beginner');
    const defaultDailyVid = getDailyYouTubeVideoForStudent(normLevel, selectedDay);
    const studentEmail = userProfile?.email || 'aluno@itssimple.com';
    const studentUid = userProfile?.id || (userProfile as any)?.uid;

    const resetVideo: TeacherAssignedVideo = {
      id: `vid-${selectedDay}-reset-${Date.now()}`,
      url: defaultDailyVid.url,
      videoId: defaultDailyVid.videoId,
      title: defaultDailyVid.title,
      duration: defaultDailyVid.duration || '5-10 min',
      instructions: isEn ? 'Daily English video practice.' : 'Prática diária de vídeo em inglês.',
      addedAt: new Date().toISOString(),
      playlistId: '',
      playlistTitle: isEn ? 'Video of the Day' : 'Vídeo do Dia',
    } as any;

    if (onAssignVideoToActivity) {
      onAssignVideoToActivity(activityId, resetVideo, selectedDay);
    }

    setCustomSuggestionActivities((prev) => ({ ...prev, [activityId]: false }));
    setSuggestingUrlActivityId(null);

    try {
      await fetch('/api/routines/teacher-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          activityName: isEn ? 'Video of the Day' : 'Vídeo do Dia',
          playlistTitle: isEn ? 'Video of the Day' : 'Vídeo do Dia',
          playlistId: '',
          videos: [resetVideo],
          teacherNotes: resetVideo.instructions,
          days: [selectedDay],
          day: selectedDay,
          studentEmail,
          studentUid,
        }),
      });
    } catch (err) {
      console.warn('Error syncing uncheck repeat video:', err);
    } finally {
      setLoadingPlaylistAssignId(null);
    }

    setPlaylistFeedback({
      activityId,
      type: 'info',
      message: isEn
        ? 'Topic selector re-enabled. Choose a topic or your suggestion.'
        : 'Seletor de tópicos reabilitado. Escolha um tema ou sua sugestão.',
    });
    setTimeout(() => setPlaylistFeedback(null), 3500);
    onSelectActivity(activityId);
  };

  // Handler: Save / Confirm custom YouTube video URL suggested by student
  const handleSaveCustomVideoSuggestion = async (activityId: string) => {
    const rawUrl = (suggestingUrlValues[activityId] || '').trim();
    if (!rawUrl) {
      setPlaylistFeedback({
        activityId,
        type: 'warning',
        message: isEn ? 'Please paste a YouTube URL.' : 'Por favor, informe a URL do YouTube.',
      });
      setTimeout(() => setPlaylistFeedback(null), 3000);
      return;
    }

    const vidId = extractYouTubeVideoId(rawUrl);
    if (!vidId) {
      setPlaylistFeedback({
        activityId,
        type: 'error',
        message: isEn ? 'Invalid YouTube link. Please verify.' : 'Link do YouTube inválido. Verifique o endereço.',
      });
      setTimeout(() => setPlaylistFeedback(null), 3500);
      return;
    }

    setIsSavingSuggestionId(activityId);
    setPlaylistFeedback(null);

    const canonicalUrl = `https://www.youtube.com/watch?v=${vidId}`;
    const suggestionTitle = isEn ? 'Your Suggestion' : 'Sua Sugestão';
    const customVideo: TeacherAssignedVideo = {
      id: `custom-suggest-${Date.now()}`,
      videoId: vidId,
      title: suggestionTitle,
      url: canonicalUrl,
      instructions: isEn ? 'Student suggested video for this routine' : 'Vídeo sugerido pelo aluno para esta rotina',
      playlistTitle: suggestionTitle,
      playlistId: 'custom_suggestion',
      isCustomSuggestion: true,
      addedAt: new Date().toISOString(),
    };

    try {
      if (onAssignVideoToActivity) {
        onAssignVideoToActivity(activityId, customVideo, selectedDay);
      }

      setSuggestingUrlActivityId(null);
      setCustomSuggestionActivities((prev) => ({ ...prev, [activityId]: true }));
      setSuggestingUrlValues((prev) => ({ ...prev, [activityId]: canonicalUrl }));
      setPlaylistFeedback({
        activityId,
        type: 'success',
        message: isEn ? '✨ Suggested video saved!' : '✨ Sugestão de vídeo salva com sucesso!',
      });
      setTimeout(() => setPlaylistFeedback(null), 4000);
      onSelectActivity(activityId);
    } catch (err) {
      console.warn('Error saving custom video suggestion:', err);
      setPlaylistFeedback({
        activityId,
        type: 'error',
        message: isEn ? 'Error saving video suggestion.' : 'Erro ao salvar sugestão de vídeo.',
      });
    } finally {
      setIsSavingSuggestionId(null);
    }
  };

  // Add default activity pre-filled with profile routine video time
  const handleAddDefaultActivity = () => {
    if (!onAddCustomActivity) return;
    const hasVideoAct = sortedActivities.some(
      (act) =>
        (act.teacherVideos && act.teacherVideos.length > 0) ||
        act.id.endsWith('1') ||
        act.activityName?.toLowerCase().includes('vídeo') ||
        act.activityName?.toLowerCase().includes('video')
    );

    if (!hasVideoAct) {
      onAddCustomActivity({
        time: userProfile?.routineVideoTime || '09:00',
        activityName: isEn ? 'Morning Coffee & Routine (Video)' : 'Rotina Matinal e Café da Manhã (Vídeo)',
        dayOfWeek: selectedDay,
        completed: false,
        learnedWords: [],
        category: 'morning',
      });
    } else {
      onAddCustomActivity({
        time: '14:00',
        activityName: isEn ? 'Afternoon English Routine' : 'Rotina da Tarde em Inglês',
        dayOfWeek: selectedDay,
        completed: false,
        learnedWords: [],
        category: 'afternoon',
      });
    }
  };

  return (
    <div className="space-y-4" id="daily-routine-guide-section">
      {/* 1. Header Banner with Week Counter & Start New Week */}
      <div className="bg-gradient-to-br from-[#000035] via-[#062863] to-[#1C4C96] text-white rounded-3xl p-5 border border-[#1C4C96] shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] text-[#9AB4FF] flex items-center justify-center shrink-0 border border-[#9AB4FF]/40 shadow-xs">
              <Sparkles className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  {isEn ? 'Daily Routine Guide' : 'Guia da Rotina Diária'}
                </h2>
              </div>
              <p className="text-xs text-[#9AB4FF]/85 mt-0.5">
                {isEn
                  ? 'Your personalized daily English immersion routine and interactive practice'
                  : 'Sua rotina diária personalizada de imersão e prática de inglês'}
              </p>
            </div>
          </div>

          {/* Right Side: Week Counter and Start New Week */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <div className="bg-[#000035]/90 px-3 py-1.5 rounded-2xl border border-[#9AB4FF]/40 flex items-center gap-1.5 shadow-xs">
              <RotateCcw className="w-3.5 h-3.5 text-[#F4CA54]" />
              <span className="text-xs font-black text-white">
                {isEn ? `Week ${weeklyCycle}` : `Semana ${weeklyCycle}`}
              </span>
            </div>
            {userProfile?.weeklyStudyDaysTarget && (
              <div
                className="bg-[#062863] px-2.5 py-1.5 rounded-2xl border border-[#607EC9]/40 flex items-center gap-1 shadow-xs"
                title={isEn ? `Weekly Study Goal: ${userProfile.weeklyStudyDaysTarget} days/week` : `Meta Semanal: ${userProfile.weeklyStudyDaysTarget} dias/semana`}
              >
                <Target className="w-3.5 h-3.5 text-[#F4CA54]" />
                <span className="text-[11px] font-bold text-[#F4CA54]">
                  {userProfile.weeklyStudyDaysTarget}{isEn ? 'd/wk' : 'd/sem'}
                </span>
              </div>
            )}
            {onStartNewWeek && (
              <button
                type="button"
                onClick={() => setIsNewWeekModalOpen(true)}
                className="px-3.5 py-1.5 rounded-2xl bg-[#F4CA54] hover:bg-[#e0b840] text-[#000035] font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#F4CA54]/40"
                title={isEn ? 'Start a fresh weekly cycle with brand new content' : 'Iniciar novo ciclo semanal com conteúdos inéditos'}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#000035]" />
                <span>{isEn ? 'Start New Week' : 'Iniciar Nova Semana'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Controls Row: Day Selector + Activities Timeline (Definitive 2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left: Day Selector with Today's Focus */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-4 border border-[#607EC9]/30 shadow-xs flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#607EC9] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>
                {isEn
                  ? `Select Day (${getDayLabel(selectedDay, currentLanguage)})`
                  : `Selecione o Dia (${getDayLabel(selectedDay, currentLanguage)})`}
              </span>
            </span>

            {/* Today's Focus Pill Indicator */}
            {activeStudyDays.includes(todayDay) ? (
              selectedDay !== todayDay ? (
                <button
                  type="button"
                  onClick={() => onSelectDay(todayDay)}
                  className="text-[10px] font-extrabold text-[#000035] bg-[#F4CA54] hover:bg-[#e0b840] px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition shadow-xs"
                  title={isEn ? "Jump directly to today's focus" : 'Ir diretamente para o foco de hoje'}
                >
                  <Sparkles className="w-3 h-3 text-[#000035]" />
                  <span>{isEn ? "Today's Focus" : 'Foco de Hoje'}</span>
                </button>
              ) : (
                <span className="text-[10px] font-extrabold text-[#000035] bg-[#F4CA54] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-[#000035]" />
                  <span>{isEn ? "Today's Focus" : 'Foco de Hoje'}</span>
                </span>
              )
            ) : (
              <span
                className="text-[10px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1"
                title={isEn ? 'Rest day in your study plan' : 'Dia de descanso no seu plano'}
              >
                <span>{isEn ? 'Rest Day' : 'Dia de Descanso'}</span>
              </span>
            )}
          </div>

          {/* 7 Days Buttons Grid with active student plan filter */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = day === todayDay;
              const isActiveInPlan = activeStudyDays.includes(day);
              const dayCount = (routinesByDay[day] || []).length;

              if (!isActiveInPlan) {
                return (
                  <div
                    key={day}
                    className="py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center opacity-30 bg-slate-100 text-slate-400 border border-dashed border-slate-300 cursor-not-allowed select-none transition"
                    title={
                      isEn
                        ? `Day not in your weekly study plan (${getDayLabel(day, 'en')})`
                        : `Dia não selecionado no seu plano semanal (${getDayLabel(day, 'pt')})`
                    }
                  >
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {getDayShortLabel(day, currentLanguage)}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                      {isEn ? 'Off' : 'Folga'}
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center justify-center cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#000035] text-white shadow-sm border-2 border-[#1C4C96]'
                      : isToday
                      ? 'bg-amber-50/80 hover:bg-amber-100 text-[#000035] border-2 border-[#F4CA54]'
                      : 'bg-slate-50 hover:bg-[#9AB4FF]/20 text-[#000035] border border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase flex items-center gap-0.5">
                    {getDayShortLabel(day, currentLanguage)}
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#F4CA54] inline-block" />}
                  </span>
                  <span
                    className={`text-[9px] font-bold ${
                      isSelected ? 'text-[#9AB4FF]' : 'text-[#607EC9]'
                    }`}
                  >
                    {dayCount}
                  </span>
                  {isToday && (
                    <span className="text-[7px] font-black uppercase px-1 rounded-full bg-[#F4CA54] text-[#000035] leading-tight mt-0.5">
                      {isEn ? 'Today' : 'Hoje'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick jump */}
          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onSelectDay(todayDay)}
              className={`font-black cursor-pointer hover:underline flex items-center gap-1 ${
                selectedDay === todayDay ? 'text-[#000035]' : 'text-[#1C4C96]'
              }`}
            >
              <Star className="w-3 h-3 text-[#F4CA54] fill-[#F4CA54]" />
              <span>{isEn ? `Today (${getDayShortLabel(todayDay, currentLanguage)})` : `Hoje (${getDayShortLabel(todayDay, currentLanguage)})`}</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleJumpWeekdays}
                className="text-[#607EC9] hover:underline font-bold cursor-pointer"
              >
                {isEn ? 'Mon-Fri' : 'Seg-Sex'}
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleJumpWeekends}
                className="text-[#607EC9] hover:underline font-bold cursor-pointer"
              >
                {isEn ? 'Sat-Sun' : 'Sáb-Dom'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Activities Timeline with Integrated Topic/Playlist Selector */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-4 border border-[#607EC9]/30 shadow-xs flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#607EC9] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>
                {isEn
                  ? `Activities Timeline (${sortedActivities.length} ${
                      sortedActivities.length === 1 ? 'activity' : 'activities'
                    })`
                  : `Linha do Tempo (${sortedActivities.length} ${
                      sortedActivities.length === 1 ? 'atividade' : 'atividades'
                    })`}
              </span>
            </span>

            {onAddCustomActivity && (
              <button
                type="button"
                onClick={handleAddDefaultActivity}
                className="text-[11px] font-bold text-[#1C4C96] hover:text-[#062863] bg-[#9AB4FF]/15 hover:bg-[#9AB4FF]/30 px-2.5 py-1 rounded-xl flex items-center gap-1 cursor-pointer transition"
                title={isEn ? 'Add activity to today\'s timeline' : 'Adicionar atividade à rotina de hoje'}
              >
                <Plus className="w-3 h-3 text-[#1C4C96]" />
                <span>{isEn ? '+ Add Activity' : '+ Adicionar Atividade'}</span>
              </button>
            )}
          </div>

          {/* Activities list/timeline */}
          <div className="space-y-2 overflow-y-auto max-h-[190px] pr-1">
            {sortedActivities.length === 0 ? (
              <div className="py-5 px-4 bg-[#9AB4FF]/5 rounded-2xl border border-dashed border-[#607EC9]/40 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#000035]">
                  <Clock className="w-4 h-4 text-[#1C4C96]" />
                  <span>
                    {isEn
                      ? `No routine configured for ${getDayLabel(selectedDay, currentLanguage)} yet.`
                      : `Nenhuma rotina configurada para ${getDayLabel(selectedDay, currentLanguage)} ainda.`}
                  </span>
                </div>
                <p className="text-[11px] text-[#607EC9] max-w-md mx-auto">
                  {isEn
                    ? `Set up your daily video activity with your profile's preferred study time (${formatToAmPm(userProfile?.routineVideoTime || '09:00')}). You can edit the time anytime.`
                    : `Configure sua atividade diária de vídeo com o horário preferencial do seu perfil (${formatToAmPm(userProfile?.routineVideoTime || '09:00')}). O horário permanece totalmente editável.`}
                </p>
                {onAddCustomActivity && (
                  <button
                    type="button"
                    onClick={handleAddDefaultActivity}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#9AB4FF]" />
                    <span>
                      {isEn
                        ? `+ Configure Daily Video (${formatToAmPm(userProfile?.routineVideoTime || '09:00')})`
                        : `+ Configurar Vídeo do Dia (${formatToAmPm(userProfile?.routineVideoTime || '09:00')})`}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              sortedActivities.map((act) => {
                const isSelected = act.id === activeActivity?.id;
                const wordsCount = act.learnedWords ? act.learnedWords.length : 0;

                const isCustomSuggestion =
                  Boolean(customSuggestionActivities[act.id]) ||
                  (act.teacherVideos?.[0] as any)?.playlistId === 'custom_suggestion' ||
                  (act.teacherVideos?.[0] as any)?.isCustomSuggestion === true ||
                  act.activityName === 'Your Suggestion' ||
                  act.activityName === 'Sua Sugestão' ||
                  (act.teacherVideos?.[0] as any)?.playlistTitle === 'Your Suggestion' ||
                  (act.teacherVideos?.[0] as any)?.playlistTitle === 'Sua Sugestão';

                const isVideoAct =
                  isCustomSuggestion ||
                  (act.teacherVideos && act.teacherVideos.length > 0) ||
                  act.id.endsWith('1') ||
                  act.activityName?.toLowerCase().includes('vídeo') ||
                  act.activityName?.toLowerCase().includes('video') ||
                  playlists.some((pl) => pl.title?.toLowerCase().trim() === act.activityName?.toLowerCase().trim());

                const isAudioAct =
                  Boolean(act.teacherSpotify) ||
                  act.id.endsWith('2') ||
                  act.activityName?.toLowerCase().includes('áudio') ||
                  act.activityName?.toLowerCase().includes('audio') ||
                  act.activityName?.toLowerCase().includes('podcast');

                const badgeLabel = isVideoAct
                  ? isEn ? 'Video of the Day' : 'Vídeo do Dia'
                  : isAudioAct
                  ? isEn ? 'Audio / Podcast' : 'Áudio do Dia'
                  : isEn ? 'Daily Activity' : 'Atividade Diária';

                const badgeClasses = isVideoAct
                  ? isSelected
                    ? 'bg-[#1C4C96] text-[#9AB4FF]'
                    : 'bg-[#9AB4FF]/20 text-[#062863]'
                  : isAudioAct
                  ? isSelected
                    ? 'bg-emerald-800 text-emerald-200'
                    : 'bg-emerald-100 text-emerald-800'
                  : isSelected
                  ? 'bg-white/10 text-slate-300'
                  : 'bg-slate-100 text-slate-600';

                // Find currently active playlist ID for this activity
                const assignedVid = act.teacherVideos?.[0];
                const isRepeatVideo =
                  (assignedVid as any)?.playlistId === 'repeat_previous_video' ||
                  (assignedVid as any)?.playlistTitle === 'Repeat Previous Video' ||
                  (assignedVid as any)?.playlistTitle === 'Repetir Vídeo Anterior' ||
                  act.activityName === 'Repeat Previous Video' ||
                  act.activityName === 'Repetir Vídeo Anterior';

                let currentPlaylistId = (assignedVid as any)?.playlistId || '';

                if (isCustomSuggestion) {
                  currentPlaylistId = 'custom_suggestion';
                } else if (isRepeatVideo) {
                  currentPlaylistId = 'repeat_previous_video';
                } else {
                  if (!currentPlaylistId && (assignedVid as any)?.playlistTitle && playlists.length > 0) {
                    const foundPl = playlists.find(
                      (pl) => pl.title?.toLowerCase().trim() === (assignedVid as any).playlistTitle?.toLowerCase().trim()
                    );
                    if (foundPl) currentPlaylistId = foundPl.id;
                  }

                  if (!currentPlaylistId && playlists.length > 0 && act.activityName) {
                    const foundPl = playlists.find(
                      (pl) =>
                        pl.title?.toLowerCase().trim() === act.activityName?.toLowerCase().trim() ||
                        pl.id === act.activityName
                    );
                    if (foundPl) currentPlaylistId = foundPl.id;
                  }

                  if (!currentPlaylistId && assignedVid && playlists.length > 0) {
                    const vidId = extractYouTubeVideoId(assignedVid.videoId || assignedVid.url || '');
                    if (vidId) {
                      const foundPl = playlists.find((pl) =>
                        pl.videos?.some((v) => extractYouTubeVideoId(v.videoId || v.url || v.id || '') === vidId)
                      );
                      if (foundPl) currentPlaylistId = foundPl.id;
                    }
                  }

                  if (!currentPlaylistId && playlists.length > 0 && act.activityName) {
                    const lowerName = act.activityName.toLowerCase();
                    const foundPl = playlists.find((pl) => lowerName.includes(pl.title.toLowerCase()));
                    if (foundPl) currentPlaylistId = foundPl.id;
                  }
                }

                return (
                  <div
                    key={act.id}
                    onClick={() => onSelectActivity(act.id)}
                    className={`p-2.5 rounded-2xl border text-left transition flex flex-col md:flex-row md:items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#000035] text-white border-[#1C4C96] shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-[#000035] border-slate-200'
                    }`}
                  >
                    {/* Left: Checkbox + Time + Badges + Name */}
                    <div className="flex items-center gap-2 min-w-0 flex-wrap flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleActivityComplete(act.id);
                        }}
                        className="cursor-pointer shrink-0"
                        title={act.completed ? (isEn ? 'Completed' : 'Concluído') : (isEn ? 'Mark completed' : 'Marcar concluído')}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            act.completed
                              ? isSelected
                                ? 'text-[#9AB4FF]'
                                : 'text-emerald-600'
                              : isSelected
                              ? 'text-slate-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>

                      {/* Time display with punctual inline edit */}
                      {editingTimeActivityId === act.id ? (
                        <div
                          className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-[#1C4C96] shadow-xs shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="time"
                            value={editingTimeValue}
                            onChange={(e) => setEditingTimeValue(e.target.value)}
                            className="text-[11px] font-mono font-bold text-[#000035] bg-transparent focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingTimeValue && onUpdateTimeActivity) {
                                onUpdateTimeActivity(act.id, editingTimeValue);
                              }
                              setEditingTimeActivityId(null);
                            }}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            title={isEn ? 'Save time' : 'Salvar horário'}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTimeActivityId(null);
                            }}
                            className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                            title={isEn ? 'Cancel' : 'Cancelar'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTimeActivityId(act.id);
                            setEditingTimeValue(act.time || '09:00');
                          }}
                          className={`group/time flex items-center gap-1 px-2 py-0.5 rounded-lg transition text-[11px] font-mono font-bold shrink-0 cursor-pointer ${
                            isSelected
                              ? 'text-[#9AB4FF] bg-white/10 hover:bg-white/20 hover:text-white'
                              : 'text-[#1C4C96] bg-[#9AB4FF]/15 hover:bg-[#9AB4FF]/30 hover:text-[#062863]'
                          }`}
                          title={isEn ? 'Click to change activity time' : 'Clique para alterar pontualmente o horário'}
                        >
                          <span>{formatToAmPm(act.time)}</span>
                          <Edit3 className="w-2.5 h-2.5 opacity-60 group-hover/time:opacity-100 transition shrink-0" />
                        </button>
                      )}

                      {/* Accurate Activity Type Badge */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${badgeClasses}`}>
                        {badgeLabel}
                      </span>

                      <span
                        className={`text-[9px] font-bold shrink-0 ${
                          isSelected ? 'text-[#F4CA54]' : 'text-slate-500'
                        }`}
                      >
                        {wordsCount}/5 Words
                      </span>

                      {isVideoAct ? (
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {/* Topic Dropdown (Predefined topics + "Your Suggestion") */}
                          <div
                            className="relative inline-flex items-center min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={isRepeatVideo ? '' : (currentPlaylistId || '')}
                              onChange={(e) => handleSelectPlaylistForActivity(act.id, e.target.value)}
                              disabled={isRepeatVideo || loadingPlaylistAssignId === act.id}
                              aria-label={isEn ? 'Playlist Topic / Routine name' : 'Tópico da Playlist / Nome da Rotina'}
                              className={`text-xs font-bold py-1 pl-2.5 pr-7 rounded-xl border appearance-none transition focus:outline-hidden max-w-[180px] sm:max-w-[240px] truncate shadow-2xs ${
                                isRepeatVideo
                                  ? isSelected
                                    ? 'bg-[#062863]/60 text-slate-300 border-[#607EC9]/40 opacity-70 cursor-not-allowed'
                                    : 'bg-slate-100 text-slate-500 border-slate-300 opacity-70 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#062863] text-white border-[#607EC9] hover:bg-[#1C4C96] hover:border-[#9AB4FF] cursor-pointer'
                                  : 'bg-white text-[#000035] border-slate-300 hover:border-[#1C4C96] cursor-pointer'
                              }`}
                              title={
                                isRepeatVideo
                                  ? (isEn
                                      ? 'Topic selection is disabled while "Repeat Previous Video" is checked'
                                      : 'Seleção de tópicos desabilitada enquanto "Repetir Vídeo Anterior" estiver marcado')
                                  : (isEn
                                      ? 'Topic: Choose playlist to unify routine name & inject exclusive video'
                                      : 'Tópico: Escolha a playlist para unificar o nome da rotina e injetar o vídeo exclusivo')
                              }
                            >
                              <option value="" disabled>
                                {loadingPlaylistAssignId === act.id
                                  ? (isEn ? '⏳ Assigning Topic...' : '⏳ Injetando Tópico...')
                                  : isRepeatVideo
                                  ? (isEn ? '🔁 Repeat Previous Video' : '🔁 Repetir Vídeo Anterior')
                                  : (isEn ? '🎯 Choose Topic...' : '🎯 Escolher Tópico...')}
                              </option>
                              {playlists.map((pl) => (
                                <option key={pl.id} value={pl.id} className="text-[#000035] bg-white">
                                  {pl.title}
                                </option>
                              ))}
                              <option value="custom_suggestion" className="text-[#000035] bg-white font-semibold">
                                {isEn ? '💡 Your Suggestion' : '💡 Sua Sugestão'}
                              </option>
                            </select>
                            <ChevronDown
                              className={`w-3.5 h-3.5 pointer-events-none absolute right-2 ${
                                isRepeatVideo
                                  ? 'text-slate-400'
                                  : isSelected
                                  ? 'text-[#9AB4FF]'
                                  : 'text-[#1C4C96]'
                              }`}
                            />
                          </div>

                          {/* Requirement 2 & 3: "Repeat Previous Video" Checkbox/Toggle, shown ONLY from 2nd active study day onwards */}
                          {canShowRepeatVideoOption && (
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer select-none shrink-0 shadow-2xs ${
                                isSelected
                                  ? isRepeatVideo
                                    ? 'bg-[#1C4C96] text-white border-[#9AB4FF] ring-1 ring-[#9AB4FF]/50'
                                    : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20 hover:text-white'
                                  : isRepeatVideo
                                  ? 'bg-[#1C4C96]/15 text-[#062863] border-[#1C4C96] font-extrabold'
                                  : 'bg-white text-[#000035] border-slate-300 hover:border-[#1C4C96]'
                              } ${loadingPlaylistAssignId === act.id ? 'opacity-60 cursor-wait' : ''}`}
                              title={
                                isEn
                                  ? 'Repeat video from the previous active study day of this week'
                                  : 'Repetir vídeo do último dia de estudo ativo da semana'
                              }
                            >
                              <input
                                type="checkbox"
                                checked={isRepeatVideo}
                                onChange={(e) => handleToggleRepeatPreviousVideo(act.id, e.target.checked)}
                                disabled={loadingPlaylistAssignId === act.id}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#1C4C96] focus:ring-0 cursor-pointer accent-[#1C4C96]"
                              />
                              <span className="whitespace-nowrap">
                                {isEn ? 'Repeat Previous Video' : 'Repetir Vídeo Anterior'}
                              </span>
                            </label>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold truncate max-w-[160px] sm:max-w-[220px]" title={act.activityName}>
                          {getActivityDisplayName(act.activityName, currentLanguage)}
                        </span>
                      )}

                      {/* Custom Suggestion URL Input & Confirmation Controls */}
                      {isCustomSuggestion && (
                        <div
                          className="inline-flex items-center gap-1.5 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {suggestingUrlActivityId === act.id || !assignedVid?.url ? (
                            <div className="inline-flex items-center gap-1.5 min-w-0">
                              <div className="relative w-44 sm:w-60 md:w-72">
                                <Youtube className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none shrink-0" />
                                <input
                                  type="url"
                                  value={
                                    suggestingUrlValues[act.id] !== undefined
                                      ? suggestingUrlValues[act.id]
                                      : (assignedVid?.url || '')
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSuggestingUrlValues((prev) => ({ ...prev, [act.id]: val }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveCustomVideoSuggestion(act.id);
                                    } else if (e.key === 'Escape') {
                                      setSuggestingUrlActivityId(null);
                                    }
                                  }}
                                  placeholder={isEn ? 'Paste YouTube link (https://...)' : 'Cole o link do YouTube (https://...)'}
                                  className={`w-full text-xs py-1 pl-8 pr-2 rounded-xl border focus:outline-hidden transition shadow-2xs font-mono ${
                                    isSelected
                                      ? 'bg-[#062863] text-white border-[#607EC9] placeholder-slate-400 focus:border-[#9AB4FF]'
                                      : 'bg-white text-[#000035] border-slate-300 placeholder-slate-400 focus:border-[#1C4C96]'
                                  }`}
                                  autoFocus
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSaveCustomVideoSuggestion(act.id)}
                                disabled={isSavingSuggestionId === act.id}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                                title={isEn ? 'Save YouTube URL' : 'Salvar link do YouTube'}
                              >
                                {isSavingSuggestionId === act.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>{isEn ? 'Save' : 'Salvar'}</span>
                              </button>
                              {assignedVid?.url && (
                                <button
                                  type="button"
                                  onClick={() => setSuggestingUrlActivityId(null)}
                                  className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${
                                    isSelected ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                  title={isEn ? 'Cancel' : 'Cancelar'}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 shrink-0">
                              <a
                                href={assignedVid.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition truncate max-w-[130px] sm:max-w-[180px] ${
                                  isSelected
                                    ? 'bg-white/10 text-[#9AB4FF] border-[#607EC9]/40 hover:bg-white/20'
                                    : 'bg-slate-100 text-[#1C4C96] border-slate-200 hover:bg-slate-200'
                                }`}
                                title={assignedVid.url}
                              >
                                <Youtube className="w-3 h-3 text-red-500 shrink-0" />
                                <span className="truncate">{assignedVid.url}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  setSuggestingUrlActivityId(act.id);
                                  setSuggestingUrlValues((prev) => ({
                                    ...prev,
                                    [act.id]: assignedVid.url || '',
                                  }));
                                }}
                                className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${
                                  isSelected
                                    ? 'text-[#9AB4FF] hover:bg-white/10 hover:text-white'
                                    : 'text-[#1C4C96] hover:bg-slate-200'
                                }`}
                                title={isEn ? 'Edit suggested YouTube link' : 'Editar link sugerido do YouTube'}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Feedback message pill & Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">

                      {/* Feedback message pill */}
                      {playlistFeedback?.activityId === act.id && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md truncate max-w-[140px] ${
                            playlistFeedback.type === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : playlistFeedback.type === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title={playlistFeedback.message}
                        >
                          {playlistFeedback.message}
                        </span>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        {onEditActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditActivity(act);
                            }}
                            className={`p-1 rounded hover:bg-white/10 cursor-pointer ${
                              isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title={isEn ? 'Edit activity' : 'Editar atividade'}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteActivity(act.id);
                            }}
                            className={`p-1 rounded hover:bg-rose-500/20 cursor-pointer ${
                              isSelected ? 'text-rose-300' : 'text-slate-400 hover:text-rose-600'
                            }`}
                            title={isEn ? 'Delete activity' : 'Excluir atividade'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Media Row: YouTube Video Player (Left) + Spotify Teacher's Suggestion (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: YouTube Video Player */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-[#607EC9]/30 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                <Youtube className="w-4 h-4" />
              </div>
              <h3 className="font-black text-xs text-[#000035] truncate">
                {defaultVideoTitle}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#607EC9] font-bold shrink-0">
              {formatToAmPm(activeActivity?.time || '07:30')}
            </span>
          </div>

          {/* Video Iframe Container */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-200">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={defaultVideoTitle}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : isCustomWithoutVideo ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-white space-y-2 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-1">
                  <Youtube className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-100">
                  {isEn ? 'Waiting for your YouTube suggestion' : 'Aguardando sua sugestão de vídeo do YouTube'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  {isEn
                    ? 'Paste your YouTube link in the activity row above and click Save to embed it.'
                    : 'Cole o link do YouTube na linha da atividade acima e clique em Salvar.'}
                </p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white space-y-2">
                <Play className="w-10 h-10 text-[#9AB4FF]" />
                <p className="text-xs text-slate-300">
                  {isEn ? 'Video ready for your routine' : 'Vídeo pronto para sua rotina'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Teacher's Daily Listening Suggestion • Spotify */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-[#1DB954]/30 shadow-xs space-y-3 flex flex-col justify-between">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1DB954] text-[#000035] flex items-center justify-center font-black shrink-0 shadow-xs">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-black text-xs text-[#000035] tracking-tight">
                    {isEn
                      ? "Teacher's Daily Listening • Spotify"
                      : 'Sugestão Diária do Teacher • Spotify'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#1DB954]/15 text-emerald-800 border border-[#1DB954]/30">
                    {isEn ? levelPlaylistConfig.levelLabelEn : levelPlaylistConfig.levelLabelPt}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isEn
                    ? `${dailySpotifyTrack.dayLabelEn} • Track ${currentDaySeqIndex} of 7 • Adm Itissimple`
                    : `${dailySpotifyTrack.dayLabelPt} • Faixa ${currentDaySeqIndex} de 7 • Adm Itissimple`}
                </p>
              </div>
            </div>

            {/* Mode switch */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
              <button
                type="button"
                onClick={() => setSpotifyPlayerMode('app')}
                className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                  spotifyPlayerMode === 'app'
                    ? 'bg-white text-[#000035] shadow-2xs'
                    : 'text-slate-500 hover:text-[#000035]'
                }`}
              >
                {isEn ? 'App Player' : 'No App'}
              </button>
              <button
                type="button"
                onClick={() => setSpotifyPlayerMode('web')}
                className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                  spotifyPlayerMode === 'web'
                    ? 'bg-white text-[#000035] shadow-2xs'
                    : 'text-slate-500 hover:text-[#000035]'
                }`}
              >
                {isEn ? 'Spotify Web' : 'Spotify'}
              </button>
            </div>
          </div>

          {/* Subtitle / Playlist tag + View toggle */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 shrink-0">
                It's simple
              </span>
              <span className="text-[11px] font-bold text-slate-700 truncate">
                {levelPlaylistConfig.playlistTitle}
              </span>
            </div>

            {spotifyPlayerMode === 'app' ? (
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSpotifyEmbedView('track')}
                  className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                    spotifyEmbedView === 'track'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isEn ? 'Song of the Day' : 'Música de Hoje'}
                </button>
                <button
                  type="button"
                  onClick={() => setSpotifyEmbedView('playlist')}
                  className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                    spotifyEmbedView === 'playlist'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isEn ? 'Full Playlist' : 'Playlist Completa'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={levelPlaylistConfig.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-extrabold text-[#1DB954] hover:underline flex items-center gap-1 shrink-0"
                  title={isEn ? 'Open complete playlist on Spotify' : 'Abrir playlist completa no Spotify'}
                >
                  <span>{isEn ? 'Open in Spotify' : 'Abrir no Spotify'}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://open.spotify.com/home?facet=music-chip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1 shrink-0"
                  title="Spotify Web Home"
                >
                  <span>Spotify Web</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>

          {/* Spotify Item Card or Embed */}
          {spotifyPlayerMode === 'app' ? (
            spotifyEmbedView === 'playlist' ? (
              <div className="space-y-1.5">
                <div className="rounded-2xl overflow-hidden border border-[#1DB954]/40 shadow-xs h-[280px] bg-black">
                  <iframe
                    src={levelPlaylistConfig.embedPlaylistUrl}
                    width="100%"
                    height="280"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title="Spotify Playlist Player - It's simple"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span className="font-semibold truncate">
                    🎶 {levelPlaylistConfig.playlistTitle} • Adm Itissimple
                  </span>
                  <a
                    href={levelPlaylistConfig.playlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-extrabold text-[#1DB954] hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>{isEn ? 'Open Spotify' : 'No Spotify'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="rounded-2xl overflow-hidden border border-[#1DB954]/40 shadow-xs h-[152px] bg-black">
                  <iframe
                    src={effectiveEmbedUrl}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title="Spotify Daily Track Player"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span className="font-semibold truncate">
                    🎵 {effectiveTrackTitle} • {effectiveArtist}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {isEn ? `Track ${currentDaySeqIndex}/7` : `Faixa ${currentDaySeqIndex}/7`}
                    </span>
                    <a
                      href={effectiveDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-extrabold text-[#1DB954] hover:underline flex items-center gap-0.5"
                    >
                      <span>{isEn ? 'Open' : 'Abrir'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/60 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954] text-[#000035] flex items-center justify-center shrink-0 shadow-xs">
                  <Music className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 uppercase">
                      {isEn ? levelPlaylistConfig.levelLabelEn : levelPlaylistConfig.levelLabelPt}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-semibold">
                      {isEn ? `Track ${currentDaySeqIndex}/7` : `Faixa ${currentDaySeqIndex}/7`}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-[#000035] truncate mt-0.5">
                    {effectiveTrackTitle}
                  </h4>
                  <p className="text-[10px] text-emerald-800 font-semibold truncate">
                    {effectiveArtist}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <a
                  href={effectiveDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-[#000035] rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition shadow-xs cursor-pointer"
                >
                  <span>{isEn ? 'Play Track' : 'Tocar Faixa'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={levelPlaylistConfig.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 text-center text-[10px] font-bold text-emerald-800 hover:underline"
                >
                  {isEn ? 'Open Playlist' : 'Ver Playlist'}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Practice & Learning Row: 5 Key Words (Left) + Sentence of the Day (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: 5 Key Words for this Moment */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 border border-[#607EC9]/30 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#000035] text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-[#9AB4FF]" />
                </div>
                <h3 className="font-black text-xs text-[#000035] tracking-tight">
                  {isEn ? '5 Key Words for this Moment' : '5 Palavras-Chave para este Momento'}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#062863] border border-[#9AB4FF]/40">
                {words.filter((w) => w.trim().length > 0).length}/5 {isEn ? 'recorded' : 'anotadas'}
              </span>
            </div>

            <p className="text-xs text-[#607EC9] mt-2 leading-relaxed">
              {isEn
                ? 'Record 5 English words or phrases you heard in the video or will use during this everyday moment.'
                : 'Anote 5 palavras ou expressões em inglês que você ouviu no vídeo ou usará durante este momento diário.'}
            </p>

            {/* 5 Input Fields */}
            <form onSubmit={handleSaveWords} className="space-y-2 mt-3">
              {words.map((w, idx) => {
                const cleanWord = w.trim();
                const def = cleanWord
                  ? wordDefinitions[idx] || getInstantOrCachedWord(cleanWord)
                  : null;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-[#1C4C96] focus-within:ring-1 focus-within:ring-[#1C4C96] transition"
                  >
                    <span className="w-6 h-6 rounded-lg bg-[#000035] text-[#9AB4FF] text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Word Input - reduced width */}
                    <input
                      type="text"
                      value={w}
                      onChange={(e) => handleWordChange(idx, e.target.value)}
                      placeholder={
                        isEn
                          ? `Word ${idx + 1}`
                          : `Palavra ${idx + 1}`
                      }
                      className="w-24 sm:w-32 md:w-36 shrink-0 text-xs font-bold text-[#000035] bg-transparent focus:outline-none placeholder:text-slate-400"
                    />

                    {/* Subtle divider */}
                    <div className="w-px h-4 bg-slate-300/80 shrink-0" />

                    {/* English Description from the Free Dictionary API */}
                    {cleanWord && def ? (
                      <div
                        className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden"
                        title={
                          def.notFound
                            ? (isEn ? 'Word not found in the official dictionary.' : 'Palavra não localizada no dicionário oficial.')
                            : def.definitionEn
                            ? `${def.partOfSpeech ? `[${def.partOfSpeech}] ` : ''}${def.definitionEn}${
                                def.exampleSentenceEn ? ` — e.g. "${def.exampleSentenceEn}"` : ''
                              }`
                            : undefined
                        }
                      >
                        {def.notFound ? (
                          <span className="text-xs text-amber-600 font-medium italic truncate flex items-center gap-1">
                            <span className="text-xs">⚠️</span>
                            <span>{isEn ? 'Word not found in official dictionary.' : 'Palavra não localizada no dicionário oficial.'}</span>
                          </span>
                        ) : def.definitionEn ? (
                          <>
                            {def.partOfSpeech && (
                              <span className="text-[9px] font-bold text-[#1C4C96] bg-[#9AB4FF]/20 border border-[#9AB4FF]/40 px-1 py-0.2 rounded uppercase tracking-wider shrink-0 select-none">
                                {def.partOfSpeech.split('/')[0].trim()}
                              </span>
                            )}
                            <span className="text-xs text-slate-700 truncate font-normal leading-tight">
                              {def.definitionEn}
                            </span>
                            {def.exampleSentenceEn && (
                              <span className="text-[11px] text-slate-500 italic truncate font-normal hidden md:inline">
                                — "{def.exampleSentenceEn}"
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic truncate select-none">
                            {isEn ? 'Consulting official dictionary...' : 'Consultando dicionário oficial...'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 flex items-center overflow-hidden">
                        <span className="text-[11px] text-slate-400 italic truncate select-none">
                          {isEn ? 'English definition from official dictionary...' : 'Definição oficial em inglês...'}
                        </span>
                      </div>
                    )}

                    {/* Audio pronunciation & completion mark */}
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      {cleanWord.length > 0 && (
                        <button
                          type="button"
                          onClick={() => speakText(cleanWord)}
                          className="p-1 text-[#1C4C96] hover:bg-[#9AB4FF]/20 rounded-lg transition cursor-pointer shrink-0"
                          title={isEn ? 'Listen to pronunciation' : 'Ouvir pronúncia'}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {cleanWord.length > 0 && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mr-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </form>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#9AB4FF]/30">
            <div>
              {wordsSaveFeedback && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {isEn ? '5 Words saved successfully!' : '5 Palavras salvas com sucesso!'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveWords}
                className="px-4 py-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs border border-[#9AB4FF]/40"
              >
                <Save className="w-3 h-3" />
                <span>{isEn ? 'Save 5 Words' : 'Salvar 5 Palavras'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sentence of the Day (Daily Wrap-up) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 border border-[#607EC9]/30 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#9AB4FF]/30 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#9AB4FF]/20 text-[#062863] flex items-center justify-center shrink-0 border border-[#9AB4FF]/40">
                  <PenTool className="w-4 h-4 text-[#1C4C96]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-xs text-[#000035] tracking-tight">
                    {isEn ? 'Sentence of the Day' : 'Frase do Dia'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#062863] border border-[#9AB4FF]/40">
                    {isEn ? 'Daily Wrap-up' : 'Encerramento'}
                  </span>
                </div>
              </div>

              {onTest30MinReminder && (
                <button
                  type="button"
                  onClick={onTest30MinReminder}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[10px] font-bold flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
                >
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>
                    {isEn ? `Test 30-min reminder (${reminderTime})` : `Testar lembrete (${reminderTime})`}
                  </span>
                </button>
              )}
            </div>

            <p className="text-xs text-[#607EC9] mt-2 leading-relaxed">
              {isEn
                ? 'Create a meaningful English sentence connecting your routine moments and the words you recorded today.'
                : 'Crie uma frase em inglês conectando os momentos da sua rotina e as palavras que você registrou hoje.'}
            </p>

            {/* Routine Words Chips */}
            <div className="mt-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-[#607EC9] block">
                {isEn ? "Today's Routine Words to include:" : 'Palavras da rotina de hoje para incluir:'}{' '}
                <span className="text-[#000035] font-black">
                  ({matchedSentenceWords.length}/{displayRoutineWords.length} used)
                </span>
              </span>
              <div className="flex flex-wrap gap-1">
                {displayRoutineWords.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">
                    {isEn
                      ? 'No routine words recorded yet. Type your 5 keywords on the left panel!'
                      : 'Nenhuma palavra registrada ainda. Digite suas 5 palavras-chave no painel ao lado!'}
                  </span>
                ) : (
                  displayRoutineWords.map((word) => {
                    const isUsed = (sentenceInput || '')
                      .toLowerCase()
                      .includes(word.toLowerCase());
                    return (
                      <span
                        key={word}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                          isUsed
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-white text-[#062863] border-[#9AB4FF]/50'
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sentence Textarea */}
            <form onSubmit={handleSaveSentence} className="mt-3">
              <textarea
                value={sentenceInput}
                onChange={(e) => setSentenceInput(e.target.value)}
                rows={3}
                placeholder={
                  isEn
                    ? 'Your Daily English Sentence: e.g., Today I had my morning coffee at 7:30, caught the bus, and worked on my English goals...'
                    : 'Sua Frase do Dia em Inglês: ex: Today I had my morning coffee at 7:30, caught the bus, and worked on my English goals...'
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-[#000035] focus:outline-none focus:ring-1 focus:ring-[#1C4C96] placeholder:text-slate-400 placeholder:font-normal"
              />
            </form>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#9AB4FF]/30">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#607EC9]">
                {sentenceInput.trim().split(/\s+/).filter(Boolean).length}{' '}
                {isEn ? 'words' : 'palavras'}
              </span>
              {sentenceSavedSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {isEn ? 'Saved to your journal!' : 'Salvo no seu diário!'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCheckGrammar}
                disabled={isCheckingSentence}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#000035] rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-300"
              >
                <Wand2 className="w-3 h-3 text-[#1C4C96]" />
                <span>
                  {isCheckingSentence
                    ? isEn ? 'Checking...' : 'Verificando...'
                    : isEn ? 'Check Grammar' : 'Verificar Gramática'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSaveSentence}
                className="px-4 py-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs border border-[#9AB4FF]/40"
              >
                <Save className="w-3 h-3" />
                <span>{isEn ? 'Save Sentence of the Day' : 'Salvar Frase do Dia'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Start New Week Configuration Modal */}
      <StartNewWeekModal
        isOpen={isNewWeekModalOpen}
        onClose={() => setIsNewWeekModalOpen(false)}
        onConfirm={async (studyDaysTarget, selectedDays) => {
          if (!onStartNewWeek) return;
          setIsStartingNewWeek(true);
          try {
            await onStartNewWeek(studyDaysTarget, selectedDays);
          } finally {
            setIsStartingNewWeek(false);
          }
        }}
        currentCycle={weeklyCycle || userProfile?.weeklyCycle || 1}
        currentLanguage={currentLanguage}
        initialStudyDaysTarget={userProfile?.weeklyStudyDaysTarget || 7}
        initialSelectedDays={userProfile?.weeklyStudyDays}
        weeklyNativeLessonsTarget={userProfile?.weeklyNativeLessonsTarget || 1}
      />
    </div>
  );
};
