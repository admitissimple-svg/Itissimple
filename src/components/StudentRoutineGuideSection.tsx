import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtube';
import { getSpotifyEmbedUrl, getSpotifyDirectUrl } from '../utils/spotify';
import { speakText } from '../utils/audio';
import { checkStudentWritingApi } from '../utils/writingChecker';
import { getInstantOrCachedWord, lookupWord, DictionaryLookupResult } from '../utils/dictionaryService';
import {
  DAYS_OF_WEEK,
  getDayLabel,
  getDayShortLabel,
  getLastActivityOfTheDay,
  getEndOfDayReminderTime,
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
}) => {
  const isEn = currentLanguage === 'en';

  // Playlists from active admin YouTube channel
  const [playlists, setPlaylists] = useState<YouTubePlaylistItem[]>([]);
  const [loadingPlaylistAssignId, setLoadingPlaylistAssignId] = useState<string | null>(null);
  const [playlistFeedback, setPlaylistFeedback] = useState<{
    activityId: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

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
  const currentDayList = routinesByDay[selectedDay] || [];
  const sortedActivities = [...currentDayList].sort((a, b) => a.time.localeCompare(b.time));

  // Current active activity
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

  // Spotify view toggle: App Player or Spotify Web
  const [spotifyPlayerMode, setSpotifyPlayerMode] = useState<'app' | 'web'>('app');

  // Sentence of the day State
  const [sentenceInput, setSentenceInput] = useState<string>('');
  const [sentenceSavedSuccess, setSentenceSavedSuccess] = useState<boolean>(false);
  const [sentenceEvaluation, setSentenceEvaluation] = useState<WritingEvaluationResult | null>(null);
  const [isCheckingSentence, setIsCheckingSentence] = useState<boolean>(false);

  // Quick jump helpers
  const handleJumpWeekdays = () => onSelectDay('monday');
  const handleJumpWeekends = () => onSelectDay('saturday');

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

  // Active YouTube video extraction
  const assignedVideo: TeacherAssignedVideo | null =
    activeActivity?.teacherVideos && activeActivity.teacherVideos.length > 0
      ? activeActivity.teacherVideos[0]
      : null;

  const rawVideoUrl = assignedVideo?.videoId || assignedVideo?.url || '';
  const validVidId = extractYouTubeVideoId(rawVideoUrl);
  // Fallback to verified valid video (OT1YRzt1f8A - BBC Learning English Eating habits) if none assigned
  const defaultVideoUrl = validVidId ? `https://www.youtube.com/watch?v=${validVidId}` : 'https://www.youtube.com/watch?v=OT1YRzt1f8A';
  const defaultVideoTitle =
    assignedVideo?.title ||
    (activeActivity
      ? `English Routine: ${getActivityDisplayName(activeActivity.activityName, currentLanguage)}`
      : 'Morning Coffee & Routine in English');
  const embedUrl = getYouTubeEmbedUrl(validVidId || 'OT1YRzt1f8A');

  // Active Spotify suggestion
  const spotifyData: TeacherAssignedSpotify =
    activeActivity?.teacherSpotify || {
      id: 'default-spot',
      url: 'https://open.spotify.com/episode/5kY9Qe3x0k6y9q0k6y9q0k',
      title: '6 Minute English: The Power of Coffee (BBC Learning English)',
      type: 'podcast',
      artistOrHost: 'BBC Learning English',
    };
  const spotifyEmbedUrl = getSpotifyEmbedUrl(spotifyData.url);
  const spotifyDirectUrl = getSpotifyDirectUrl(spotifyData.url);

  // End of day reminder calculation
  const lastActivity = getLastActivityOfTheDay(sortedActivities);
  const reminderTime = lastActivity ? getEndOfDayReminderTime(lastActivity.time) : '07:00';

  // Topic / Playlist selection & auto video injection handler
  const handleSelectPlaylistForActivity = async (activityId: string, playlistId: string) => {
    if (!playlistId) return;
    setLoadingPlaylistAssignId(activityId);
    setPlaylistFeedback(null);

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
        time: userProfile?.routineAudioTime || '14:00',
        activityName: isEn ? 'Active Listening & Daily Podcast (Audio)' : 'Escuta Ativa & Podcast Diário (Áudio)',
        dayOfWeek: selectedDay,
        completed: false,
        learnedWords: [],
        category: 'afternoon',
      });
    }
  };

  return (
    <div className="space-y-4" id="daily-routine-guide-section">
      {/* 1. Pedagogical Header Banner with 2 Steps */}
      <div className="bg-gradient-to-br from-[#000035] via-[#062863] to-[#1C4C96] text-white rounded-3xl p-5 border border-[#1C4C96] shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] text-[#9AB4FF] flex items-center justify-center shrink-0 border border-[#9AB4FF]/40 shadow-xs">
              <Sparkles className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  {isEn ? 'Daily Routine Guide' : 'Guia da Rotina Diária'}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#9AB4FF] text-[#000035] rounded-full uppercase">
                  {isEn ? 'Step by Step' : 'Passo a Passo'}
                </span>
              </div>
              <p className="text-xs text-[#9AB4FF]/85 mt-0.5">
                {isEn
                  ? 'Follow these 2 simple steps to build your custom English learning routine:'
                  : 'Siga os 2 passos abaixo para personalizar o seu aprendizado de inglês:'}
              </p>
            </div>
          </div>

          {/* Stepper Indicators */}
          <div className="flex items-center gap-3 bg-[#000035]/60 px-4 py-2 rounded-2xl border border-[#607EC9]/40 self-start md:self-auto">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1C4C96] text-[#9AB4FF] font-black text-xs flex items-center justify-center border border-[#9AB4FF]/40">
                1
              </span>
              <span className="text-xs font-bold text-white">
                {isEn ? '1. Fill in your daily routine' : '1. Preencha sua rotina'}
              </span>
            </div>

            <span className="text-[#607EC9] font-mono">--------</span>

            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#9AB4FF] text-[#000035] font-black text-xs flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-bold text-[#9AB4FF]">
                {isEn ? '2. Choose daily topic & practice' : '2. Escolha o tema & pratique diariamente'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Controls Row: Day Selector + Activities Timeline (Definitive 2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left: Day Selector */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-4 border border-[#607EC9]/30 shadow-xs flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#607EC9] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>
                {isEn
                  ? `Select Day (${getDayLabel(selectedDay, currentLanguage)})`
                  : `Selecione o Dia (${getDayLabel(selectedDay, currentLanguage)})`}
              </span>
            </span>
          </div>

          {/* 7 Days Buttons Grid */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDay === day;
              const dayCount = (routinesByDay[day] || []).length;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={`py-2 px-1 rounded-xl text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-[#000035] text-white shadow-sm border border-[#1C4C96]'
                      : 'bg-slate-50 hover:bg-[#9AB4FF]/20 text-[#000035] border border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase">
                    {getDayShortLabel(day, currentLanguage)}
                  </span>
                  <span
                    className={`text-[9px] font-bold ${
                      isSelected ? 'text-[#9AB4FF]' : 'text-[#607EC9]'
                    }`}
                  >
                    {dayCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick jump */}
          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleJumpWeekdays}
              className="text-[#1C4C96] hover:underline font-bold cursor-pointer"
            >
              {isEn ? 'Mon to Fri (Weekdays)' : 'Seg a Sex (Dias úteis)'}
            </button>
            <button
              type="button"
              onClick={handleJumpWeekends}
              className="text-[#607EC9] hover:underline font-bold cursor-pointer"
            >
              {isEn ? 'Sat & Sun (Weekends)' : 'Sáb e Dom (Fim de semana)'}
            </button>
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

                const isVideoAct =
                  (act.teacherVideos && act.teacherVideos.length > 0) ||
                  act.id.endsWith('1') ||
                  act.activityName?.toLowerCase().includes('vídeo') ||
                  act.activityName?.toLowerCase().includes('video');

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
                let currentPlaylistId = (assignedVid as any)?.playlistId || '';
                if (!currentPlaylistId && assignedVid && playlists.length > 0) {
                  const vidId = extractYouTubeVideoId(assignedVid.videoId || assignedVid.url || '');
                  if (vidId) {
                    const foundPl = playlists.find((pl) =>
                      pl.videos?.some((v) => extractYouTubeVideoId(v.videoId || v.url || v.id || '') === vidId)
                    );
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

                      <span className="text-xs font-bold truncate max-w-[150px] sm:max-w-[200px]" title={act.activityName}>
                        {getActivityDisplayName(act.activityName, currentLanguage)}
                      </span>
                    </div>

                    {/* Right: Integrated Topic / Playlist Selector (for Video) + Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      {isVideoAct && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-flex items-center">
                            <select
                              value={currentPlaylistId || ''}
                              onChange={(e) => handleSelectPlaylistForActivity(act.id, e.target.value)}
                              disabled={loadingPlaylistAssignId === act.id}
                              className={`text-[11px] font-bold py-1 pl-2.5 pr-7 rounded-lg border appearance-none cursor-pointer transition focus:outline-hidden ${
                                isSelected
                                  ? 'bg-[#062863] text-white border-[#607EC9] hover:bg-[#1C4C96]'
                                  : 'bg-white text-[#000035] border-[#9AB4FF]/60 hover:border-[#1C4C96]'
                              }`}
                              title={isEn ? 'Select topic to automatically inject exclusive video' : 'Selecione o tema para injetar automaticamente o vídeo exclusivo'}
                            >
                              <option value="" disabled>
                                {loadingPlaylistAssignId === act.id
                                  ? (isEn ? '⏳ Assigning...' : '⏳ Injetando...')
                                  : (isEn ? '🎯 Choose Topic...' : '🎯 Escolher Tema...')}
                              </option>
                              {playlists.map((pl) => (
                                <option key={pl.id} value={pl.id} className="text-[#000035] bg-white">
                                  {pl.title} ({pl.videos?.length || 0} {isEn ? 'videos' : 'vídeos'})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2 ${isSelected ? 'text-[#9AB4FF]' : 'text-slate-400'}`} />
                          </div>
                        </div>
                      )}

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
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-[#607EC9]/30 shadow-xs space-y-3.5 flex flex-col justify-between">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-xs text-[#000035] tracking-tight">
                  {isEn
                    ? "Teacher's Daily Listening Suggestion • Spotify"
                    : 'Sugestão Diária do Teacher • Spotify'}
                </h3>
              </div>
            </div>

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
                {isEn ? 'App Player' : 'Player no App'}
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
                {isEn ? 'Spotify Web' : 'Ouvir no Spotify'}
              </button>
            </div>
          </div>

          <p className="text-xs text-[#607EC9] leading-relaxed">
            {isEn
              ? 'Curated daily audio suggestion (podcast or song) directly from your Native Friend.'
              : 'Sugestão diária de áudio (podcast ou música) indicada diretamente pelo seu Amigo Nativo.'}
          </p>

          {/* Spotify Item Card or Embed */}
          {spotifyPlayerMode === 'app' && spotifyEmbedUrl ? (
            <div className="rounded-2xl overflow-hidden border border-[#9AB4FF]/40 shadow-xs h-[152px]">
              <iframe
                src={spotifyEmbedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Audio"
              />
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Radio className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 uppercase">
                    Podcast
                  </span>
                  <h4 className="text-xs font-black text-[#000035] truncate mt-0.5">
                    {spotifyData.title}
                  </h4>
                  <p className="text-[10px] text-emerald-800 truncate">
                    {spotifyData.artistOrHost || 'BBC Learning English'}
                  </p>
                </div>
              </div>

              <a
                href={spotifyDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 transition shadow-2xs cursor-pointer"
              >
                <span>{isEn ? 'Open in Spotify' : 'Abrir no Spotify'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Teacher Tip */}
          <div className="p-3 bg-[#9AB4FF]/10 rounded-2xl border border-[#9AB4FF]/35 text-[11px] text-[#062863] leading-relaxed">
            <span className="font-extrabold text-[#000035] block mb-0.5">
              {isEn ? '💡 Teacher Tip:' : '💡 Dica do Teacher:'}
            </span>
            {isEn
              ? 'Daily suggestion from teacher: Listen to the podcast while having your coffee. Focus on the vocabulary and natural rhythm.'
              : 'Sugestão diária do Teacher: Ouça o podcast enquanto toma seu café. Preste atenção no vocabulário e no ritmo natural.'}
          </div>
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
    </div>
  );
};
