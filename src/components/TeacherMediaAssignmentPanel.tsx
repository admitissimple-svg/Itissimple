import React, { useState } from 'react';
import {
  Youtube,
  Music,
  Headphones,
  Save,
  Check,
  Radio,
  Disc,
  Trash2,
  ExternalLink,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
  ListVideo,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  Play,
  Volume2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  RoutineItem,
  DayOfWeek,
  TeacherAssignedVideo,
  TeacherAssignedSpotify,
  Language,
  GoogleAccount,
} from '../types';
import { extractYouTubeVideoId } from '../utils/youtube';
import {
  isValidSpotifyUrl,
  parseSpotifyUrl,
  getSpotifyEmbedUrl,
  getDailySpotifyTrackForStudent,
  normalizeStudentLevel,
  getSpotifyPlaylistForLevel,
  getSpotifyContentType,
  getSpotifyDirectUrl,
  CORRUPT_SPOTIFY_IDS,
} from '../utils/spotify';
import { Translations, getActivityDisplayName } from '../utils/i18n';
import { defaultRoutinesByDay } from '../data/defaultRoutines';

interface TeacherMediaAssignmentPanelProps {
  routinesByDay: Record<DayOfWeek, RoutineItem[]>;
  students: GoogleAccount[];
  selectedStudentEmail?: string;
  selectedStudentUid?: string;
  currentAccount?: GoogleAccount | null;
  onSelectStudentEmail?: (email: string) => void;
  onTeacherSaveVideos?: (
    activityId: string,
    videos: TeacherAssignedVideo[],
    teacherNotes?: string,
    replicateToAllDays?: boolean,
    targetDays?: DayOfWeek[],
    spotify?: TeacherAssignedSpotify | null,
    targetStudentEmail?: string,
    targetStudentUid?: string,
    activityName?: string
  ) => void;
  currentLanguage: Language;
  t: Translations;
}

const WEEK_DAYS: { id: DayOfWeek; name: string }[] = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' },
];

export const TeacherMediaAssignmentPanel: React.FC<TeacherMediaAssignmentPanelProps> = ({
  routinesByDay,
  students,
  selectedStudentEmail,
  selectedStudentUid,
  currentAccount,
  onTeacherSaveVideos,
  currentLanguage = 'pt',
}) => {
  const isEn = currentLanguage === 'en';
  // Find current active student info
  const selectedStudent = (students || []).find(
    (s) =>
      (selectedStudentEmail && (s.email?.toLowerCase() === selectedStudentEmail.toLowerCase() || s.uid === selectedStudentEmail || s.id === selectedStudentEmail)) ||
      (selectedStudentUid && (s.uid === selectedStudentUid || s.id === selectedStudentUid))
  );

  const activeStudentEmail = selectedStudent?.email || (selectedStudentEmail && selectedStudentEmail !== 'all' ? selectedStudentEmail : '') || students[0]?.email || '';
  const activeStudentUid = selectedStudent?.uid || selectedStudent?.id || selectedStudentUid || '';
  const activeStudentName = selectedStudent?.name || (activeStudentEmail ? activeStudentEmail.split('@')[0] : 'Aluno');

  // Local state for student-specific routines loaded from backend
  const [studentRoutines, setStudentRoutines] = useState<Record<DayOfWeek, RoutineItem[]> | null>(null);
  const [isLoadingStudentRoutines, setIsLoadingStudentRoutines] = useState<boolean>(false);

  // Local state for each day's YouTube URL & Activity
  const [youtubeUrls, setYoutubeUrls] = useState<Record<DayOfWeek, string>>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
  });

  // Local state for each day's Spotify URL & Type
  const [spotifyUrls, setSpotifyUrls] = useState<Record<DayOfWeek, string>>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
  });

  const [spotifyTypes, setSpotifyTypes] = useState<Record<DayOfWeek, 'podcast' | 'music'>>({
    monday: 'podcast',
    tuesday: 'podcast',
    wednesday: 'podcast',
    thursday: 'podcast',
    friday: 'music',
    saturday: 'podcast',
    sunday: 'music',
  });

  // Spotify player preview and fallback states
  const [selectedPreviewDay, setSelectedPreviewDay] = useState<DayOfWeek>('monday');
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState<boolean>(true);
  const [isResettingAll, setIsResettingAll] = useState<boolean>(false);
  const [playerFallbackMode, setPlayerFallbackMode] = useState<Record<DayOfWeek, boolean>>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [spotValidationErrors, setSpotValidationErrors] = useState<Record<DayOfWeek, string>>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
  });

  // Save feedback state per day
  const [savedDayFeedback, setSavedDayFeedback] = useState<Record<string, boolean>>({});
  const [savingYtDay, setSavingYtDay] = useState<DayOfWeek | null>(null);
  const [savingSpotDay, setSavingSpotDay] = useState<DayOfWeek | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  // YouTube Playlist & Anti-Repetition Video Assignment State
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('pl-eating-habits');
  const [dayPlaylistIds, setDayPlaylistIds] = useState<Partial<Record<DayOfWeek, string>>>({});
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);
  const [studentWatched, setStudentWatched] = useState<string[]>([]);
  const [assignLoadingDay, setAssignLoadingDay] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Spotify Sequential Anti-Repetition Assignment State
  const [studentSpotifyAssignments, setStudentSpotifyAssignments] = useState<any[]>([]);
  const [studentListenedTracks, setStudentListenedTracks] = useState<string[]>([]);
  const [assigningSpotifyDay, setAssigningSpotifyDay] = useState<DayOfWeek | null>(null);

  // Resolved student level for automatic Spotify synchronization
  const currentLevelRaw =
    studentProfile?.level ||
    studentProfile?.studentLevel ||
    selectedStudent?.level ||
    selectedStudent?.studentLevel ||
    'iniciante';
  const currentNormalizedLevel = normalizeStudentLevel(currentLevelRaw);
  const currentLevelConfig = getSpotifyPlaylistForLevel(currentNormalizedLevel);

  // Fetch all playlists
  React.useEffect(() => {
    fetch('/api/youtube-playlists')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlaylists(data);
          if (!selectedPlaylistId) {
            setSelectedPlaylistId(data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch student routines & assignment history strictly synchronized with student page
  const loadStudentMediaData = React.useCallback(async () => {
    setIsLoadingStudentRoutines(true);

    try {
      let routinesData = null;
      let assignmentsList: any[] = [];
      let watchedList: any[] = [];
      let spotifyAssignList: any[] = [];
      let profileData: any = null;

      if (activeStudentEmail || activeStudentUid) {
        const params = new URLSearchParams();
        if (activeStudentEmail) params.append('studentEmail', activeStudentEmail);
        if (activeStudentUid) params.append('uid', activeStudentUid);

        const profileParams = new URLSearchParams();
        if (activeStudentEmail) profileParams.append('email', activeStudentEmail);
        if (activeStudentUid) profileParams.append('uid', activeStudentUid);

        const [routinesRes, assignmentsRes, spotAssignRes, profileRes] = await Promise.all([
          fetch(`/api/student-routines?${params.toString()}`).catch(() => null),
          fetch(`/api/student-video-assignments?${params.toString()}`).catch(() => null),
          fetch(`/api/student-spotify-assignments?${params.toString()}`).catch(() => null),
          fetch(`/api/user-profile?${profileParams.toString()}`).catch(() => null),
        ]);

        if (routinesRes && routinesRes.ok) {
          routinesData = await routinesRes.json();
        }
        if (assignmentsRes && assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          assignmentsList = assignmentsData?.assignments || [];
          watchedList = assignmentsData?.watched || [];
        }
        if (spotAssignRes && spotAssignRes.ok) {
          const spotData = await spotAssignRes.json();
          spotifyAssignList = spotData?.assignments || [];
        }
        if (profileRes && profileRes.ok) {
          const profData = await profileRes.json();
          profileData = profData?.profile || profData?.user || null;
        }
      }

      setStudentProfile(profileData);
      setStudentAssignments(assignmentsList);
      setStudentWatched(watchedList);

      const resolvedLevelRaw =
        profileData?.level ||
        profileData?.studentLevel ||
        selectedStudent?.level ||
        selectedStudent?.studentLevel ||
        'iniciante';
      const resolvedNormalizedLevel = normalizeStudentLevel(resolvedLevelRaw);

      const activeRoutines: Record<DayOfWeek, RoutineItem[]> =
        routinesData && typeof routinesData === 'object' && Object.keys(routinesData).length > 0
          ? routinesData
          : routinesByDay || defaultRoutinesByDay;

      setStudentRoutines(activeRoutines);

      const newYt: Record<DayOfWeek, string> = {
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
      };
      const newSpot: Record<DayOfWeek, string> = {
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
      };
      const newSpotTypes: Record<DayOfWeek, 'podcast' | 'music'> = {
        monday: 'podcast',
        tuesday: 'podcast',
        wednesday: 'podcast',
        thursday: 'podcast',
        friday: 'music',
        saturday: 'podcast',
        sunday: 'music',
      };
      const newDayPlaylistIds: Partial<Record<DayOfWeek, string>> = {};

      WEEK_DAYS.forEach((d) => {
        // 1. Check latest assignment for this day from student-video-assignments
        const dayAssignments = (assignmentsList || []).filter((a: any) => a && (a.day === d.id || a.dayOfWeek === d.id));
        const latestAssign = dayAssignments.length > 0 ? dayAssignments[dayAssignments.length - 1] : null;

        // 2. Check routine item with video for this day
        const dayItems = (activeRoutines && activeRoutines[d.id]) || (routinesByDay && routinesByDay[d.id]) || (defaultRoutinesByDay && defaultRoutinesByDay[d.id]) || [];
        const itemWithVid =
          dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) ||
          dayItems.find(
            (i) =>
              i &&
              (i.id.endsWith('1') ||
                i.activityName?.toLowerCase().includes('vídeo') ||
                i.activityName?.toLowerCase().includes('video') ||
                playlists.some((pl) => pl.title?.toLowerCase().trim() === i.activityName?.toLowerCase().trim()))
          ) ||
          dayItems[0];

        const assignedVid = itemWithVid?.teacherVideos?.[0];
        const assignedVidUrl = assignedVid?.url || (assignedVid?.videoId ? `https://www.youtube.com/watch?v=${assignedVid.videoId}` : '');

        // 3. Accurately resolve the active video assigned to this student's page
        let candidateUrl = '';
        if (latestAssign?.videoUrl && assignedVidUrl) {
          const assignTime = latestAssign.assignedAt ? new Date(latestAssign.assignedAt).getTime() : 0;
          const vidTime = assignedVid.addedAt ? new Date(assignedVid.addedAt).getTime() : 0;
          candidateUrl = assignTime >= vidTime ? latestAssign.videoUrl : assignedVidUrl;
        } else if (latestAssign?.videoUrl) {
          candidateUrl = latestAssign.videoUrl;
        } else if (assignedVidUrl) {
          candidateUrl = assignedVidUrl;
        } else {
          const fallback = defaultRoutinesByDay[d.id]?.[0]?.teacherVideos?.[0]?.url;
          candidateUrl = fallback || 'https://www.youtube.com/watch?v=OT1YRzt1f8A';
        }

        // Canonicalize URL to ensure standard https://www.youtube.com/watch?v=... format
        const vidId = extractYouTubeVideoId(candidateUrl);
        newYt[d.id] = vidId ? `https://www.youtube.com/watch?v=${vidId}` : candidateUrl;

        // Sync playlist ID for this day
        if (latestAssign?.playlistId) {
          newDayPlaylistIds[d.id] = latestAssign.playlistId;
        } else if ((assignedVid as any)?.playlistId) {
          newDayPlaylistIds[d.id] = (assignedVid as any).playlistId;
        } else if (itemWithVid?.activityName) {
          const pl = playlists.find(
            (p) =>
              p.title?.toLowerCase().trim() === itemWithVid.activityName?.toLowerCase().trim() ||
              p.id === itemWithVid.activityName
          );
          if (pl) newDayPlaylistIds[d.id] = pl.id;
        }

        // 4. Spotify sync: mirror student's level-based automated track or custom teacher assignment
        const defaultDailyTrack = getDailySpotifyTrackForStudent(resolvedNormalizedLevel, d.id);
        const daySpotifyAssign = (spotifyAssignList || []).find(
          (a: any) => a && (a.day === d.id || a.dayOfWeek === d.id)
        );
        const itemWithSpot = dayItems.find((i) => i && i.teacherSpotify && i.teacherSpotify.url);

        const toAudioType = (type?: string, url?: string): 'podcast' | 'music' => {
          if (type === 'podcast' || type === 'music') return type;
          if (url && (url.includes('/episode/') || url.includes('/show/'))) return 'podcast';
          return 'music';
        };

        let activeSpotUrl = '';
        let activeSpotType: 'podcast' | 'music' = 'music';

        if (daySpotifyAssign && daySpotifyAssign.url) {
          activeSpotUrl = daySpotifyAssign.url;
          activeSpotType = toAudioType(daySpotifyAssign.type, daySpotifyAssign.url);
        } else if (itemWithSpot?.teacherSpotify?.url) {
          activeSpotUrl = itemWithSpot.teacherSpotify.url;
          activeSpotType = toAudioType(itemWithSpot.teacherSpotify.type, itemWithSpot.teacherSpotify.url);
        } else {
          // Strictly synchronize with what student sees by default for their level
          activeSpotUrl = defaultDailyTrack.url;
          activeSpotType = 'music';
        }

        // Auto-sanitize on load: if broken or corrupted link, fallback cleanly to level default
        const parsedSpot = parseSpotifyUrl(activeSpotUrl);
        if (!parsedSpot.isValid) {
          activeSpotUrl = defaultDailyTrack.url;
          activeSpotType = 'music';
        } else if (parsedSpot.canonicalUrl) {
          activeSpotUrl = parsedSpot.canonicalUrl;
        }

        newSpot[d.id] = activeSpotUrl;
        newSpotTypes[d.id] = activeSpotType;
      });

      setYoutubeUrls(newYt);
      setSpotifyUrls(newSpot);
      setSpotifyTypes(newSpotTypes);
      setDayPlaylistIds((prev) => ({ ...newDayPlaylistIds, ...prev }));
    } catch (err) {
      console.warn('Error loading student media data:', err);
    } finally {
      setIsLoadingStudentRoutines(false);
    }
  }, [activeStudentEmail, activeStudentUid, selectedStudent, routinesByDay, playlists]);

  React.useEffect(() => {
    loadStudentMediaData();
  }, [loadStudentMediaData]);

  // Helper: Retrieve active playlist topic ID for a specific day
  const getDayPlaylistId = (dayId: DayOfWeek): string => {
    if (dayPlaylistIds[dayId]) return dayPlaylistIds[dayId]!;

    const dayItems = (studentRoutines && studentRoutines[dayId]) || (routinesByDay && routinesByDay[dayId]) || [];
    const itemWithVid =
      dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) ||
      dayItems.find(
        (i) =>
          i &&
          (i.id.endsWith('1') ||
            i.activityName?.toLowerCase().includes('vídeo') ||
            i.activityName?.toLowerCase().includes('video') ||
            playlists.some((pl) => pl.title?.toLowerCase().trim() === i.activityName?.toLowerCase().trim()))
      ) ||
      dayItems[0];

    const assignedVid = itemWithVid?.teacherVideos?.[0];
    if ((assignedVid as any)?.playlistId) return (assignedVid as any).playlistId;

    if ((assignedVid as any)?.playlistTitle && playlists.length > 0) {
      const pl = playlists.find(
        (p) => p.title?.toLowerCase().trim() === (assignedVid as any).playlistTitle?.toLowerCase().trim()
      );
      if (pl) return pl.id;
    }

    if (itemWithVid?.activityName && playlists.length > 0) {
      const pl = playlists.find(
        (p) =>
          p.title?.toLowerCase().trim() === itemWithVid.activityName?.toLowerCase().trim() ||
          p.id === itemWithVid.activityName
      );
      if (pl) return pl.id;
    }

    const vidId = extractYouTubeVideoId(assignedVid?.videoId || assignedVid?.url || youtubeUrls[dayId] || '');
    if (vidId && playlists.length > 0) {
      const pl = playlists.find((p) =>
        p.videos?.some((v: any) => extractYouTubeVideoId(v.videoId || v.url || v.id || '') === vidId)
      );
      if (pl) return pl.id;
    }

    if (itemWithVid?.activityName && playlists.length > 0) {
      const pl = playlists.find((p) => itemWithVid.activityName.toLowerCase().includes(p.title.toLowerCase()));
      if (pl) return pl.id;
    }

    return selectedPlaylistId || playlists[0]?.id || '';
  };

  // Handler: Change playlist topic for a specific day from teacher view
  const handleDayPlaylistChange = (dayId: DayOfWeek, newPlId: string) => {
    setDayPlaylistIds((prev) => ({ ...prev, [dayId]: newPlId }));
    const pl = playlists.find((p) => p.id === newPlId);
    if (!pl) return;

    const dayItems = (studentRoutines && studentRoutines[dayId]) || (routinesByDay && routinesByDay[dayId]) || [];
    const targetActivity =
      dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) ||
      dayItems.find(
        (i) =>
          i &&
          (i.id.endsWith('1') ||
            i.activityName?.toLowerCase().includes('vídeo') ||
            i.activityName?.toLowerCase().includes('video') ||
            playlists.some((p) => p.title?.toLowerCase().trim() === i.activityName?.toLowerCase().trim()))
      ) ||
      dayItems[0];

    if (targetActivity) {
      setStudentRoutines((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (updated[dayId]) {
          updated[dayId] = updated[dayId].map((item) =>
            item.id === targetActivity.id ? { ...item, activityName: pl.title } : item
          );
        }
        return updated;
      });

      if (activeStudentEmail || activeStudentUid) {
        fetch('/api/routines/teacher-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: activeStudentEmail,
            studentUid: activeStudentUid,
            teacherUid: currentAccount?.uid,
            teacherEmail: currentAccount?.email,
            activityId: targetActivity.id,
            activityName: pl.title,
            playlistTitle: pl.title,
            playlistId: pl.id,
            videos: targetActivity.teacherVideos || [],
            days: [dayId],
            day: dayId,
          }),
        }).catch(() => {});
      }

      if (onTeacherSaveVideos) {
        onTeacherSaveVideos(
          targetActivity.id,
          targetActivity.teacherVideos || [],
          targetActivity.teacherNotes,
          false,
          [dayId],
          undefined,
          activeStudentEmail,
          activeStudentUid,
          pl.title
        );
      }
    }
  };

  // Handler: Assign strict exclusive unseen video from playlist
  const handleAssignExclusive = async (dayId: DayOfWeek) => {
    if (!activeStudentEmail && !activeStudentUid) {
      setAssignFeedback({ type: 'warning', message: 'Selecione um aluno para atribuir vídeo exclusivo.' });
      return;
    }

    const dayItems = (studentRoutines && studentRoutines[dayId]) || (routinesByDay && routinesByDay[dayId]) || [];
    const targetActivity =
      dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) ||
      dayItems.find(
        (i) =>
          i &&
          (i.id.endsWith('1') ||
            i.activityName?.toLowerCase().includes('vídeo') ||
            i.activityName?.toLowerCase().includes('video') ||
            playlists.some((p) => p.title?.toLowerCase().trim() === i.activityName?.toLowerCase().trim()))
      ) ||
      dayItems[0];
    if (!targetActivity) return;

    const playlistIdToUse = getDayPlaylistId(dayId) || selectedPlaylistId;

    setAssignLoadingDay(dayId);
    setAssignFeedback(null);

    try {
      const res = await fetch('/api/student-video-assignments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: activeStudentEmail,
          studentUid: activeStudentUid,
          teacherUid: currentAccount?.uid,
          teacherEmail: currentAccount?.email,
          playlistId: playlistIdToUse,
          activityId: targetActivity.id,
          day: dayId,
        }),
      });

      const data = await res.json();
      if (data.allConsumed) {
        setAssignFeedback({
          type: 'warning',
          message: data.message || `Todos os vídeos da playlist selecionada já foram atribuídos ou assistidos por este aluno.`,
        });
      } else if (data.success && data.video) {
        setYoutubeUrls((prev) => ({ ...prev, [dayId]: data.video.url }));
        const assignedTopicTitle = data.playlistTitle || data.video.playlistTitle;

        // Optimistically update studentRoutines with unified activityName
        setStudentRoutines((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (updated[dayId]) {
            updated[dayId] = updated[dayId].map((item) =>
              item.id === targetActivity.id
                ? {
                    ...item,
                    activityName: assignedTopicTitle || item.activityName,
                    teacherVideos: [data.video],
                    teacherNotes: data.video.instructions,
                  }
                : item
            );
          }
          return updated;
        });

        if (onTeacherSaveVideos) {
          onTeacherSaveVideos(
            targetActivity.id,
            [data.video],
            data.video.instructions,
            false,
            [dayId],
            undefined,
            activeStudentEmail,
            activeStudentUid,
            assignedTopicTitle
          );
        }
        setAssignFeedback({
          type: 'success',
          message: `✨ Vídeo exclusivo inédito atribuído para ${dayId.toUpperCase()} (${assignedTopicTitle}): "${data.video.title}" (${data.remainingUnseen} restantes)`,
        });
        loadStudentMediaData();
      } else {
        setAssignFeedback({
          type: 'error',
          message: data.error || 'Erro ao atribuir vídeo exclusivo.',
        });
      }
    } catch {
      setAssignFeedback({
        type: 'error',
        message: 'Erro na conexão ao atribuir vídeo exclusivo.',
      });
    } finally {
      setAssignLoadingDay(null);
    }
  };

  // Handler: When teacher alters the URL in the input field
  const handleUrlChange = (dayId: DayOfWeek, value: string) => {
    setYoutubeUrls((prev) => ({ ...prev, [dayId]: value }));

    // Auto-detect if this URL matches any playlist topic
    const detectedId = extractYouTubeVideoId(value);
    if (detectedId) {
      const matchedPl = playlists.find((p) =>
        p.videos?.some((v: any) => extractYouTubeVideoId(v.videoId || v.url || v.id || '') === detectedId)
      );
      if (matchedPl && dayPlaylistIds[dayId] !== matchedPl.id) {
        setDayPlaylistIds((prev) => ({ ...prev, [dayId]: matchedPl.id }));
      }
    }
  };

  // Handler: Save individual YouTube Video for a day
  const handleSaveYouTubeDay = async (dayId: DayOfWeek) => {
    const dayItems = (studentRoutines && studentRoutines[dayId]) || (routinesByDay && routinesByDay[dayId]) || [];
    const targetActivity =
      dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) ||
      dayItems.find(
        (i) =>
          i &&
          (i.id.endsWith('1') ||
            i.activityName?.toLowerCase().includes('vídeo') ||
            i.activityName?.toLowerCase().includes('video') ||
            playlists.some((p) => p.title?.toLowerCase().trim() === i.activityName?.toLowerCase().trim()))
      ) ||
      dayItems[0];
    if (!targetActivity) return;

    const playlistIdToUse = getDayPlaylistId(dayId);
    const matchedPlaylist = playlists.find((p) => p.id === playlistIdToUse);
    const topicTitle = matchedPlaylist?.title || targetActivity.activityName;

    const url = (youtubeUrls[dayId] || '').trim();
    let finalVideos: TeacherAssignedVideo[] = [];

    setSavingYtDay(dayId);
    setAssignFeedback(null);

    let canonicalUrl = url;
    if (url) {
      const vidId = extractYouTubeVideoId(url);
      if (vidId) {
        canonicalUrl = `https://www.youtube.com/watch?v=${vidId}`;
      }

      // Check if video is found in any playlist to preserve authentic title
      let matchedVideoTitle = '';
      if (vidId) {
        for (const pl of playlists) {
          const found = pl.videos?.find(
            (v: any) => extractYouTubeVideoId(v.videoId || v.url || v.id || '') === vidId
          );
          if (found) {
            matchedVideoTitle = found.title;
            break;
          }
        }
      }

      finalVideos = [
        {
          id: `vid-${dayId}-${Date.now()}`,
          url: canonicalUrl,
          videoId: vidId || '',
          title: matchedVideoTitle || `${topicTitle} Practice Video`,
          addedAt: new Date().toISOString(),
          playlistId: playlistIdToUse,
          playlistTitle: topicTitle,
        },
      ];
    }

    // Keep input field cleanly formatted with canonical URL
    if (canonicalUrl !== url) {
      setYoutubeUrls((prev) => ({ ...prev, [dayId]: canonicalUrl }));
    }

    try {
      await fetch('/api/routines/teacher-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: activeStudentEmail,
          studentUid: activeStudentUid,
          teacherUid: currentAccount?.uid,
          teacherEmail: currentAccount?.email,
          activityId: targetActivity.id,
          activityName: topicTitle,
          playlistTitle: topicTitle,
          playlistId: playlistIdToUse,
          videos: finalVideos,
          days: [dayId],
          day: dayId,
        }),
      });

      setSavedDayFeedback((prev) => ({ ...prev, [`yt-${dayId}`]: true }));
      setTimeout(() => {
        setSavedDayFeedback((prev) => ({ ...prev, [`yt-${dayId}`]: false }));
      }, 3000);

      setAssignFeedback({
        type: 'success',
        message: `✓ URL do vídeo para ${dayId.toUpperCase()} salva e sincronizada com a página do aluno!`,
      });
      setTimeout(() => setAssignFeedback(null), 4000);
    } catch (err) {
      console.warn('Error saving teacher video:', err);
      setAssignFeedback({
        type: 'error',
        message: 'Erro ao salvar vídeo no servidor.',
      });
    } finally {
      setSavingYtDay(null);
    }

    setStudentRoutines((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (updated[dayId]) {
        updated[dayId] = updated[dayId].map((item) =>
          item.id === targetActivity.id ? { ...item, activityName: topicTitle, teacherVideos: finalVideos } : item
        );
      }
      return updated;
    });

    if (onTeacherSaveVideos) {
      onTeacherSaveVideos(
        targetActivity.id,
        finalVideos,
        undefined,
        false,
        [dayId],
        undefined,
        activeStudentEmail,
        activeStudentUid,
        topicTitle
      );
    }
  };

  // Handler: Reset a day's Spotify track to the student's verified level default
  const handleResetToDefaultTrack = (dayId: DayOfWeek) => {
    const defaultTrack = getDailySpotifyTrackForStudent(currentNormalizedLevel, dayId);
    setSpotifyUrls((prev) => ({ ...prev, [dayId]: defaultTrack.url }));
    setSpotifyTypes((prev) => ({ ...prev, [dayId]: 'music' }));
    setSpotValidationErrors((prev) => ({ ...prev, [dayId]: '' }));
    setPlayerFallbackMode((prev) => ({ ...prev, [dayId]: false }));
    handleSaveSpotifyDay(dayId, defaultTrack.url, 'music');
  };

  // Handler: Reset all 7 days to verified curriculum tracks with one click
  const handleResetAllDays = async () => {
    setIsResettingAll(true);
    try {
      const updatedUrls: Record<DayOfWeek, string> = { ...spotifyUrls };
      const updatedTypes: Record<DayOfWeek, 'podcast' | 'music'> = { ...spotifyTypes };

      for (const day of WEEK_DAYS) {
        const defTrack = getDailySpotifyTrackForStudent(currentNormalizedLevel, day.id);
        updatedUrls[day.id] = defTrack.url;
        updatedTypes[day.id] = 'music';
        await handleSaveSpotifyDay(day.id, defTrack.url, 'music');
      }

      setSpotifyUrls(updatedUrls);
      setSpotifyTypes(updatedTypes);
      setSpotValidationErrors({
        monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: ''
      });
      setAssignFeedback({
        type: 'success',
        message: isEn
          ? 'All 7 days restored and synchronized to verified curriculum audio!'
          : 'Todos os 7 dias foram restaurados e sincronizados com os áudios oficiais verificados!',
      });
    } catch (err) {
      console.error('Error resetting all days:', err);
    } finally {
      setIsResettingAll(false);
    }
  };

  // Handler: Save individual Spotify Audio for a day with strict validation and sanitization
  const handleSaveSpotifyDay = async (dayId: DayOfWeek, overrideUrl?: string, overrideType?: 'podcast' | 'music') => {
    const dayItems = (studentRoutines && studentRoutines[dayId]) || (routinesByDay && routinesByDay[dayId]) || [];
    const targetActivity =
      dayItems.find((i) => i && (i.id.endsWith('2') || i.activityName?.toLowerCase().includes('podcast') || i.activityName?.toLowerCase().includes('áudio'))) ||
      dayItems[1] ||
      dayItems[0];
    if (!targetActivity) return;

    const rawUrl = (overrideUrl !== undefined ? overrideUrl : (spotifyUrls[dayId] || '')).trim();
    const type = overrideType || spotifyTypes[dayId] || 'music';
    const defaultTrack = getDailySpotifyTrackForStudent(currentNormalizedLevel, dayId);

    // Strict validation
    if (rawUrl) {
      const validation = parseSpotifyUrl(rawUrl);
      if (!validation.isValid) {
        setSpotValidationErrors((prev) => ({
          ...prev,
          [dayId]: validation.errorMessage || 'Link inválido do Spotify. Use links /track/, /episode/ ou /show/.',
        }));
        setAssignFeedback({
          type: 'error',
          message: validation.errorMessage || 'URL do Spotify inválida. Use um link válido de /track/, /episode/ ou /show/.',
        });
        return;
      }
    }

    setSpotValidationErrors((prev) => ({ ...prev, [dayId]: '' }));
    setSavingSpotDay(dayId);

    const parsed = parseSpotifyUrl(rawUrl);
    const canonicalUrl = parsed.isValid && parsed.canonicalUrl ? parsed.canonicalUrl : rawUrl;
    const isDefault = canonicalUrl === defaultTrack.url.trim();

    // Ensure input field is populated with the clean canonical URL
    if (canonicalUrl !== spotifyUrls[dayId]) {
      setSpotifyUrls((prev) => ({ ...prev, [dayId]: canonicalUrl }));
    }

    let finalSpotify: TeacherAssignedSpotify | null = null;

    if (canonicalUrl) {
      finalSpotify = {
        id: `spot-${dayId}-${Date.now()}`,
        url: canonicalUrl,
        title: isDefault
          ? defaultTrack.title
          : type === 'podcast'
          ? (isEn ? 'Recommended English Podcast' : 'Podcast Recomendado em Inglês')
          : (isEn ? 'Recommended English Song' : 'Música Recomendada em Inglês'),
        artistOrHost: isDefault ? defaultTrack.artist : (currentAccount?.name || 'Native Friend'),
        instructions: isDefault
          ? (isEn ? defaultTrack.teacherTipEn : defaultTrack.teacherTipPt)
          : (isEn ? 'Listen attentively to practice your listening comprehension.' : 'Ouça com atenção para praticar sua compreensão auditiva.'),
        type,
        addedAt: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch('/api/routines/teacher-spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: activeStudentEmail,
          studentUid: activeStudentUid,
          teacherUid: currentAccount?.uid,
          teacherEmail: currentAccount?.email,
          activityId: targetActivity.id,
          spotify: finalSpotify,
          days: [dayId],
          day: dayId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao salvar áudio no servidor.');
      }

      setSavedDayFeedback((prev) => ({ ...prev, [`spot-${dayId}`]: true }));
      setTimeout(() => {
        setSavedDayFeedback((prev) => ({ ...prev, [`spot-${dayId}`]: false }));
      }, 2500);

      setAssignFeedback({
        type: 'success',
        message: `✓ Áudio do Spotify para ${dayId.toUpperCase()} salvo e sincronizado com o aluno!`,
      });
      setTimeout(() => setAssignFeedback(null), 3500);
    } catch (err: any) {
      console.warn('Error saving teacher spotify:', err);
      setAssignFeedback({
        type: 'error',
        message: err.message || 'Erro ao salvar áudio do Spotify no servidor.',
      });
    } finally {
      setSavingSpotDay(null);
    }

    setStudentRoutines((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (updated[dayId]) {
        updated[dayId] = updated[dayId].map((item) =>
          item.id === targetActivity.id ? { ...item, teacherSpotify: finalSpotify || undefined } : item
        );
      }
      return updated;
    });

    if (onTeacherSaveVideos) {
      onTeacherSaveVideos(
        targetActivity.id,
        targetActivity.teacherVideos || [],
        undefined,
        false,
        [dayId],
        finalSpotify,
        activeStudentEmail,
        activeStudentUid
      );
    }
  };

  // Helper to get first routine item display text (always in English for teacher)
  const getActivityLabel = (dayId: DayOfWeek) => {
    const dayItems = (studentRoutines && studentRoutines[dayId]) || (routinesByDay && routinesByDay[dayId]) || [];
    const itemWithVid =
      dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) ||
      dayItems.find((i) => i.id.endsWith('1') || i.activityName?.toLowerCase().includes('vídeo') || i.activityName?.toLowerCase().includes('video')) ||
      dayItems[0];
    if (!itemWithVid) return 'Morning routine';
    const englishName = getActivityDisplayName(itemWithVid.activityName, 'en');
    return `${itemWithVid.time || '09:00'} ${englishName}`;
  };

  return (
    <div className="space-y-6">
      {/* Student context banner if selected */}
      {(selectedStudent || activeStudentEmail) && (
        <div className="bg-[#000035] text-white p-4 rounded-2xl border border-[#1C4C96] flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1C4C96] flex items-center justify-center font-bold text-white border border-[#607EC9] shrink-0 overflow-hidden">
              {selectedStudent?.picture && selectedStudent.picture.trim() !== '' ? (
                <img
                  src={selectedStudent.picture}
                  alt={selectedStudent.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#9AB4FF] uppercase tracking-wider flex items-center gap-2 flex-wrap">
                <span>ATRIBUIÇÃO INDIVIDUAL DE MÍDIA DO ALUNO</span>
                {activeStudentUid && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1C4C96] text-white font-mono">
                    UID: {activeStudentUid.slice(0, 10)}...
                  </span>
                )}
                {currentLevelConfig && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-800/80 text-emerald-200 font-bold border border-emerald-500/40 flex items-center gap-1">
                    <Music className="w-2.5 h-2.5 text-[#1DB954]" />
                    <span>NÍVEL: {currentLevelConfig.levelLabelEn.toUpperCase()} ({currentLevelConfig.levelLabelPt.toUpperCase()})</span>
                  </span>
                )}
              </div>
              <div className="text-sm font-black text-white">
                {selectedStudent ? `${selectedStudent.name} (${selectedStudent.email})` : activeStudentEmail}
              </div>
            </div>
          </div>
          <div className="text-xs text-[#9AB4FF] flex items-center gap-2 font-medium">
            {isLoadingStudentRoutines ? (
              <span className="flex items-center gap-1.5 text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sincronizando com a rotina do aluno...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Espelhado em tempo real com a página do aluno</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* TABLE 1: Assign YouTube Videos (Matching attached image 3) */}
      <div className="bg-white rounded-2xl border border-[#607EC9]/30 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Youtube className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#000035] uppercase tracking-wider">
                Assign YouTube Videos
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Paste daily YouTube links or assign exclusive unseen videos from curated playlists
              </p>
            </div>
          </div>

          {/* Anti-Repetition Playlist Selector */}
          {playlists.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300 shadow-2xs">
                <ListVideo className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span className="text-[11px] font-bold text-slate-700">Playlist:</span>
                <select
                  value={selectedPlaylistId}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                  className="text-xs font-bold text-[#000035] bg-transparent focus:outline-hidden cursor-pointer"
                >
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.title} ({pl.videos?.length || 0} vídeos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time anti-repetition counter badge */}
              {(() => {
                const currentPl = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];
                const consumed = new Set<string>();
                studentWatched.forEach((id) => {
                  const cid = extractYouTubeVideoId(id);
                  if (cid) consumed.add(cid);
                });
                studentAssignments.forEach((assign) => {
                  const cid = extractYouTubeVideoId(assign.videoId || assign.videoUrl);
                  if (cid) consumed.add(cid);
                });

                const totalVids = currentPl?.videos?.length || 0;
                const unseenVids = (currentPl?.videos || []).filter((v: any) => {
                  const vid = extractYouTubeVideoId(v.videoId || v.url || v.id);
                  return vid && !consumed.has(vid);
                }).length;

                return (
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${
                      unseenVids > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>
                      {unseenVids > 0
                        ? `${unseenVids} de ${totalVids} vídeos inéditos para este aluno`
                        : `Todos os ${totalVids} vídeos já atribuídos/assistidos`}
                    </span>
                  </span>
                );
              })()}
            </div>
          )}
        </div>

        {/* Dynamic Assignment Feedback Alert */}
        {assignFeedback && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              assignFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : assignFeedback.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {assignFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{assignFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setAssignFeedback(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#000035] text-white uppercase text-[10px] font-black tracking-wider">
                <th className="p-3 w-28 border-b border-[#062863]">Week day</th>
                <th className="p-3 w-80 border-b border-[#062863]">Activity Moment & Playlist Topic</th>
                <th className="p-3 border-b border-[#062863]">Youtube video url</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {WEEK_DAYS.map((day) => {
                const isSaved = savedDayFeedback[`yt-${day.id}`];
                const currentUrl = youtubeUrls[day.id] || '';
                const isAssigningThisDay = assignLoadingDay === day.id;
                const isSavingThisDay = savingYtDay === day.id;
                const currentVidId = extractYouTubeVideoId(currentUrl);
                const isValidYt = Boolean(currentVidId);
                const currentDayPlId = getDayPlaylistId(day.id);
                const dayItems = (studentRoutines && studentRoutines[day.id]) || (routinesByDay && routinesByDay[day.id]) || [];
                const targetActivity =
                  dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) ||
                  dayItems.find(
                    (i) =>
                      i &&
                      (i.id.endsWith('1') ||
                        i.activityName?.toLowerCase().includes('vídeo') ||
                        i.activityName?.toLowerCase().includes('video') ||
                        playlists.some((p) => p.title?.toLowerCase().trim() === i.activityName?.toLowerCase().trim()))
                  ) ||
                  dayItems[0];

                return (
                  <tr key={day.id} className="hover:bg-slate-50/70 transition">
                    {/* Day column */}
                    <td className="p-3 font-bold text-[#000035] whitespace-nowrap">
                      {day.name}
                    </td>

                    {/* Activity Moment & Playlist Topic column */}
                    <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#1C4C96] bg-[#9AB4FF]/15 px-2 py-0.5 rounded-lg shrink-0">
                          {targetActivity?.time || '09:00'}
                        </span>
                        <div className="relative inline-flex items-center min-w-0">
                          <select
                            value={currentDayPlId}
                            onChange={(e) => handleDayPlaylistChange(day.id, e.target.value)}
                            aria-label="Playlist Topic"
                            className="text-xs font-bold py-1 pl-2.5 pr-7 bg-slate-50 hover:bg-white text-[#000035] border border-slate-300 hover:border-[#1C4C96] rounded-xl appearance-none cursor-pointer transition focus:outline-hidden max-w-[210px] truncate shadow-2xs"
                            title="Tópico da Playlist do YouTube unificado com a rotina do aluno"
                          >
                            {playlists.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2 text-[#1C4C96]" />
                        </div>
                      </div>
                    </td>

                    {/* Youtube Video URL input row with Recognition indicator, External Preview, Trash, Exclusive Video button, and Save button */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-[220px]">
                          <input
                            type="url"
                            value={currentUrl}
                            onChange={(e) => handleUrlChange(day.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveYouTubeDay(day.id);
                              }
                            }}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className={`w-full pl-3 pr-8 py-1.5 text-xs text-[#000035] bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1C4C96] focus:bg-white transition ${
                              isValidYt
                                ? 'border-emerald-400/80 bg-emerald-50/20'
                                : currentUrl
                                ? 'border-amber-300'
                                : 'border-slate-300'
                            }`}
                            title={isEn ? 'Press Enter or click Save to update student video' : 'Pressione Enter ou clique em Salvar para atualizar o vídeo do aluno'}
                          />
                          {/* Live recognition & external test link icon */}
                          {currentVidId && (
                            <a
                              href={`https://www.youtube.com/watch?v=${currentVidId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                              title={isEn ? `Recognized YouTube video (ID: ${currentVidId}) - Click to test` : `Vídeo do YouTube reconhecido (ID: ${currentVidId}) - Clique para testar`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Exclusive Unseen Video Button */}
                        <button
                          type="button"
                          onClick={() => handleAssignExclusive(day.id)}
                          disabled={isAssigningThisDay}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0 bg-amber-400 hover:bg-amber-300 text-[#000035] border border-amber-500/40 disabled:opacity-50 cursor-pointer shadow-2xs"
                          title="Atribuir estritamente um vídeo inédito da playlist selecionada (anti-repetição)"
                        >
                          {isAssigningThisDay ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[#000035]" />
                          )}
                          <span className="whitespace-nowrap">Vídeo Exclusivo</span>
                        </button>

                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUrlChange(day.id, '');
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition rounded-md hover:bg-rose-50 cursor-pointer shrink-0"
                            title={isEn ? 'Clear video URL' : 'Limpar URL do vídeo'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveYouTubeDay(day.id)}
                          disabled={isSavingThisDay}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                            isSaved
                              ? 'bg-emerald-600 text-white'
                              : isSavingThisDay
                              ? 'bg-[#1C4C96]/70 text-white'
                              : 'bg-[#1C4C96] hover:bg-[#062863] text-white'
                          }`}
                          title={isEn ? 'Save and synchronize URL to student page' : 'Salvar e sincronizar URL na página do aluno'}
                        >
                          {isSavingThisDay ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Salvando...</span>
                            </>
                          ) : isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Salvo ✓</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: Assign Spotify Podcasts & Music (Minimalist & Compact Layout) */}
      <div className="bg-white rounded-2xl border border-[#607EC9]/30 shadow-xs overflow-hidden">
        {/* Minimalist Header */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Headphones className="w-3.5 h-3.5 text-[#1DB954]" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-xs sm:text-sm text-[#000035] uppercase tracking-wider">
                {isEn ? 'Spotify Audio Assignment' : 'Atribuição de Áudios Spotify'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1DB954]/15 text-emerald-800 border border-[#1DB954]/30 flex items-center gap-1">
                <Music className="w-2.5 h-2.5 text-[#1DB954]" />
                <span>{currentLevelConfig.levelLabelPt}</span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsMiniPlayerOpen((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isMiniPlayerOpen
                  ? 'bg-[#000035] text-emerald-400 border border-[#000035]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
              }`}
              title={isEn ? 'Toggle compact preview player' : 'Alternar mini player de verificação'}
            >
              <Headphones className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>{isMiniPlayerOpen ? (isEn ? 'Ocultar Player' : 'Ocultar Player') : (isEn ? 'Mini Player' : 'Mini Player')}</span>
            </button>

            <button
              type="button"
              onClick={handleResetAllDays}
              disabled={isResettingAll}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title={isEn ? 'Restore all 7 days to verified curriculum tracks' : 'Restaurar todos os 7 dias para as faixas verificadas oficiais'}
            >
              <RotateCcw className={`w-3 h-3 text-emerald-600 ${isResettingAll ? 'animate-spin' : ''}`} />
              <span>{isResettingAll ? (isEn ? 'Restaurando...' : 'Restaurando...') : (isEn ? 'Restaurar 7 Dias' : 'Restaurar 7 Dias')}</span>
            </button>

            <a
              href={currentLevelConfig.playlistUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
              title="Abrir playlist oficial no Spotify"
            >
              <span className="hidden sm:inline">Playlist</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* MINIMALIST & COMPACT SPOTIFY DOCK (Super small 80px embed with day chips) */}
        {isMiniPlayerOpen && (() => {
          const previewUrl = (spotifyUrls[selectedPreviewDay] || '').trim();
          const defaultTrack = getDailySpotifyTrackForStudent(currentNormalizedLevel, selectedPreviewDay);
          const previewValidation = parseSpotifyUrl(previewUrl);
          const isCorrupted =
            CORRUPT_SPOTIFY_IDS.some((bad) => previewUrl.includes(bad)) ||
            (!previewValidation.isValid && previewUrl !== '');
          const embedUrl = previewValidation.isValid
            ? previewValidation.embedUrl
            : isCorrupted
            ? null
            : defaultTrack.embedUrl;
          const isFallbackForced = playerFallbackMode[selectedPreviewDay];
          const activeTitle = defaultTrack.title;
          const activeArtist = defaultTrack.artist;

          return (
            <div className="px-3.5 py-2.5 bg-slate-900 text-white border-b border-slate-800">
              {/* Compact top control line */}
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                {/* Mini Day selector chips */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
                    {isEn ? 'Preview' : 'Ouvir'}:
                  </span>
                  {WEEK_DAYS.map((wDay) => {
                    const isCur = selectedPreviewDay === wDay.id;
                    const wDayUrl = spotifyUrls[wDay.id] || '';
                    const wDayVal = parseSpotifyUrl(wDayUrl);
                    const isBad = CORRUPT_SPOTIFY_IDS.some((b) => wDayUrl.includes(b));

                    return (
                      <button
                        key={wDay.id}
                        type="button"
                        onClick={() => setSelectedPreviewDay(wDay.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                          isCur
                            ? 'bg-[#1DB954] text-[#000035] shadow-xs'
                            : 'bg-white/10 hover:bg-white/20 text-slate-300'
                        }`}
                      >
                        <span>{wDay.name.slice(0, 3)}</span>
                        {isBad ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        ) : wDayVal.isValid ? (
                          <span className={`w-1.5 h-1.5 rounded-full ${isCur ? 'bg-[#000035]' : 'bg-emerald-400'}`} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Active Track Title & Direct Link */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-300 truncate max-w-[220px] sm:max-w-xs text-[11px]">
                    <strong className="text-white capitalize">{selectedPreviewDay}:</strong>{' '}
                    {activeTitle} — {activeArtist}
                  </span>
                  {previewUrl && (
                    <a
                      href={getSpotifyDirectUrl(previewUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-[#1DB954] hover:underline flex items-center gap-0.5"
                      title="Abrir no Spotify"
                    >
                      <span>Spotify</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleResetToDefaultTrack(selectedPreviewDay)}
                    className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 ml-1"
                    title="Restaurar padrão deste dia"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Restaurar</span>
                  </button>
                </div>
              </div>

              {/* Ultra-compact 80px Spotify Embed or discreet 1-line fallback */}
              {isCorrupted || isFallbackForced || !embedUrl ? (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2 truncate">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate text-[11px]">
                      {isEn
                        ? 'Audio link unavailable in embed. Click to restore verified curriculum audio.'
                        : 'Link indisponível no catálogo. Clique para restaurar o áudio verificado.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetToDefaultTrack(selectedPreviewDay)}
                    className="px-2.5 py-1 rounded bg-[#1DB954] text-[#000035] font-bold text-[11px] hover:bg-[#1ed760] transition shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isEn ? 'Restore Audio' : 'Restaurar Áudio'}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-black">
                  <iframe
                    key={`teacher-spotify-embed-${selectedPreviewDay}-${embedUrl}`}
                    src={embedUrl}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={`Spotify Player - ${selectedPreviewDay}`}
                    className="w-full h-[80px]"
                  />
                </div>
              )}
            </div>
          );
        })()}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#000035] text-white uppercase text-[10px] font-black tracking-wider">
                <th className="p-3 w-36 border-b border-[#062863]">Week day</th>
                <th className="p-3 border-b border-[#062863]">Spotify audio url</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {WEEK_DAYS.map((day, idx) => {
                const isSaved = savedDayFeedback[`spot-${day.id}`];
                const isSavingThisDay = savingSpotDay === day.id;
                const currentUrl = spotifyUrls[day.id] || '';
                const currentType = spotifyTypes[day.id] || 'music';
                const defaultTrack = getDailySpotifyTrackForStudent(currentNormalizedLevel, day.id);
                const isDefault = currentUrl.trim() === defaultTrack.url.trim();
                const isValidSpot = isValidSpotifyUrl(currentUrl);

                return (
                  <tr key={day.id} className="hover:bg-slate-50/70 transition">
                    {/* Day column */}
                    <td className="p-3 font-bold text-[#000035] whitespace-nowrap">
                      <div>{day.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {isEn ? `Track ${idx + 1}/7` : `Faixa ${idx + 1}/7`}
                      </div>
                    </td>

                    {/* Spotify Audio URL input row with Podcast/Music switch, Preview, Reset, Trash and Save */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {/* Audio Type Pill Toggle */}
                        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setSpotifyTypes((prev) => ({ ...prev, [day.id]: 'podcast' }))
                            }
                            className={`px-2 py-1 rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                              currentType === 'podcast'
                                ? 'bg-[#000035] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-[#000035]'
                            }`}
                            title={isEn ? 'Podcast / Audio Talk' : 'Podcast / Conversa em Áudio'}
                          >
                            <Radio className="w-3 h-3 text-[#1DB954]" />
                            <span>Podcast</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSpotifyTypes((prev) => ({ ...prev, [day.id]: 'music' }))
                            }
                            className={`px-2 py-1 rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                              currentType === 'music'
                                ? 'bg-[#000035] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-[#000035]'
                            }`}
                            title={isEn ? 'Music / Song' : 'Música / Canção'}
                          >
                            <Disc className="w-3 h-3 text-amber-400" />
                            <span>Music</span>
                          </button>
                        </div>

                        {/* URL input and validation */}
                        <div className="relative flex-1 min-w-[220px]">
                          <input
                            type="url"
                            value={currentUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSpotifyUrls((prev) => ({ ...prev, [day.id]: val }));
                              // Clear error on edit
                              if (spotValidationErrors[day.id]) {
                                setSpotValidationErrors((prev) => ({ ...prev, [day.id]: '' }));
                              }
                              if (val.includes('/episode/') || val.includes('/show/')) {
                                setSpotifyTypes((prev) => ({ ...prev, [day.id]: 'podcast' }));
                              } else if (val.includes('/track/') || val.includes('/album/')) {
                                setSpotifyTypes((prev) => ({ ...prev, [day.id]: 'music' }));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveSpotifyDay(day.id);
                              }
                            }}
                            placeholder="https://open.spotify.com/track/... or episode/..."
                            className={`w-full pl-3 pr-8 py-1.5 text-xs text-[#000035] bg-slate-50 border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1DB954] focus:bg-white transition ${
                              spotValidationErrors[day.id] || (currentUrl && !isValidSpot)
                                ? 'border-rose-400 bg-rose-50/30'
                                : isValidSpot
                                ? 'border-emerald-400/80 bg-emerald-50/20'
                                : currentUrl
                                ? 'border-amber-300'
                                : 'border-slate-300'
                            }`}
                            title={isEn ? 'Press Enter or click Save to update student Spotify audio' : 'Pressione Enter ou clique em Salvar para atualizar o áudio do aluno'}
                          />
                          {isValidSpot && (
                            <a
                              href={getSpotifyDirectUrl(currentUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1DB954] transition p-0.5 rounded cursor-pointer"
                              title={isEn ? 'Open and test on Spotify' : 'Abrir e testar no Spotify'}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {spotValidationErrors[day.id] && (
                            <p className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>{spotValidationErrors[day.id]}</span>
                            </p>
                          )}
                        </div>

                        {/* Preview button to test this day in the upper player */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPreviewDay(day.id);
                            setIsMiniPlayerOpen(true);
                          }}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                            selectedPreviewDay === day.id && isMiniPlayerOpen
                              ? 'bg-[#000035] text-emerald-400 border-[#000035]'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                          title={isEn ? 'Preview and test this audio in the player above' : 'Ouvir e testar este áudio no player acima'}
                        >
                          <Headphones className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span className="hidden sm:inline text-[10px]">
                            {selectedPreviewDay === day.id && isMiniPlayerOpen ? 'Ouvindo' : 'Player'}
                          </span>
                        </button>

                        {/* Automated / Custom status badge */}
                        {isDefault ? (
                          <span
                            className="hidden xl:inline-flex text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 truncate max-w-[180px]"
                            title={`${defaultTrack.title} - ${defaultTrack.artist}`}
                          >
                            🎵 {defaultTrack.title}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              {isEn ? 'Custom' : 'Personalizado'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetToDefaultTrack(day.id)}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                              title={isEn ? `Restore level default (${defaultTrack.title})` : `Restaurar padrão do nível (${defaultTrack.title})`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setSpotifyUrls((prev) => ({ ...prev, [day.id]: '' }));
                              setSpotValidationErrors((prev) => ({ ...prev, [day.id]: '' }));
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition rounded-md hover:bg-rose-50 cursor-pointer shrink-0"
                            title={isEn ? 'Clear Spotify URL' : 'Limpar URL do Spotify'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveSpotifyDay(day.id)}
                          disabled={isSavingThisDay}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                            isSaved
                              ? 'bg-emerald-600 text-white'
                              : isSavingThisDay
                              ? 'bg-[#1DB954]/70 text-[#000035]'
                              : 'bg-[#1DB954] hover:bg-[#1ed760] text-[#000035]'
                          }`}
                          title={isEn ? 'Save and synchronize Spotify URL to student' : 'Salvar e sincronizar áudio na página do aluno'}
                        >
                          {isSavingThisDay ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{isEn ? 'Saving...' : 'Salvando...'}</span>
                            </>
                          ) : isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Saved ✓' : 'Salvo ✓'}</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
