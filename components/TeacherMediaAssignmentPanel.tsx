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
import { isValidSpotifyUrl } from '../utils/spotify';
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
}) => {
  // Find current active student info
  const selectedStudent = (students || []).find(
    (s) =>
      (selectedStudentEmail && (s.email?.toLowerCase() === selectedStudentEmail.toLowerCase() || s.uid === selectedStudentEmail || s.id === selectedStudentEmail)) ||
      (selectedStudentUid && (s.uid === selectedStudentUid || s.id === selectedStudentUid))
  );

  const activeStudentEmail = selectedStudent?.email || (selectedStudentEmail && selectedStudentEmail !== 'all' ? selectedStudentEmail : '') || students[0]?.email || '';
  const activeStudentUid = selectedStudent?.uid || selectedStudent?.id || selectedStudentUid || '';

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

  // Save feedback state per day
  const [savedDayFeedback, setSavedDayFeedback] = useState<Record<string, boolean>>({});
  const [savingYtDay, setSavingYtDay] = useState<DayOfWeek | null>(null);

  // YouTube Playlist & Anti-Repetition Video Assignment State
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('pl-eating-habits');
  const [dayPlaylistIds, setDayPlaylistIds] = useState<Partial<Record<DayOfWeek, string>>>({});
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);
  const [studentWatched, setStudentWatched] = useState<string[]>([]);
  const [assignLoadingDay, setAssignLoadingDay] = useState<string | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

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

      if (activeStudentEmail || activeStudentUid) {
        const params = new URLSearchParams();
        if (activeStudentEmail) params.append('studentEmail', activeStudentEmail);
        if (activeStudentUid) params.append('uid', activeStudentUid);

        const [routinesRes, assignmentsRes] = await Promise.all([
          fetch(`/api/student-routines?${params.toString()}`).catch(() => null),
          fetch(`/api/student-video-assignments?${params.toString()}`).catch(() => null),
        ]);

        if (routinesRes && routinesRes.ok) {
          routinesData = await routinesRes.json();
        }
        if (assignmentsRes && assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          assignmentsList = assignmentsData?.assignments || [];
          watchedList = assignmentsData?.watched || [];
        }
      }

      setStudentAssignments(assignmentsList);
      setStudentWatched(watchedList);

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

        // Spotify sync
        const itemWithSpot = dayItems.find((i) => i && i.teacherSpotify?.url) || dayItems[0];
        if (itemWithSpot?.teacherSpotify?.url) {
          newSpot[d.id] = itemWithSpot.teacherSpotify.url;
        }
        if (itemWithSpot?.teacherSpotify?.type) {
          newSpotTypes[d.id] = (itemWithSpot.teacherSpotify.type as 'podcast' | 'music') || 'podcast';
        }
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
  }, [activeStudentEmail, activeStudentUid, routinesByDay, playlists]);

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

  // Handler: Save individual Spotify Audio for a day
  const handleSaveSpotifyDay = async (dayId: DayOfWeek) => {
    const dayItems = (studentRoutines && studentRoutines[dayId]) || (routinesByDay && routinesByDay[dayId]) || [];
    const targetActivity =
      dayItems.find((i) => i && (i.id.endsWith('2') || i.activityName?.toLowerCase().includes('podcast') || i.activityName?.toLowerCase().includes('áudio'))) ||
      dayItems[0];
    if (!targetActivity) return;

    const url = (spotifyUrls[dayId] || '').trim();
    const type = spotifyTypes[dayId] || 'podcast';
    let finalSpotify: TeacherAssignedSpotify | null = null;

    if (url) {
      finalSpotify = {
        id: `spot-${dayId}-${Date.now()}`,
        url,
        title: type === 'podcast' ? 'Recommended English Podcast' : 'Recommended English Song',
        type,
        addedAt: new Date().toISOString(),
      };
    }

    try {
      await fetch('/api/routines/teacher-spotify', {
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
    } catch (err) {
      console.warn('Error saving teacher spotify:', err);
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

    setSavedDayFeedback((prev) => ({ ...prev, [`spot-${dayId}`]: true }));
    setTimeout(() => {
      setSavedDayFeedback((prev) => ({ ...prev, [`spot-${dayId}`]: false }));
    }, 2500);
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
              <div className="text-[10px] font-bold text-[#9AB4FF] uppercase tracking-wider flex items-center gap-2">
                <span>ATRIBUIÇÃO INDIVIDUAL DE MÍDIA DO ALUNO</span>
                {activeStudentUid && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1C4C96] text-white font-mono">
                    UID: {activeStudentUid.slice(0, 10)}...
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

      {/* TABLE 2: Assign Spotify Podcasts & Music (Matching attached image 4) */}
      <div className="bg-white rounded-2xl border border-[#607EC9]/30 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4 text-[#1DB954]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#000035] uppercase tracking-wider">
                Assign Spotify Podcasts & Music
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Curate daily podcasts or songs directly to the student's Spotify player
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#000035] text-white uppercase text-[10px] font-black tracking-wider">
                <th className="p-3 w-32 border-b border-[#062863]">Week day</th>
                <th className="p-3 border-b border-[#062863]">Spotify audio url</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {WEEK_DAYS.map((day) => {
                const isSaved = savedDayFeedback[`spot-${day.id}`];
                const currentUrl = spotifyUrls[day.id] || '';
                const currentType = spotifyTypes[day.id] || 'podcast';

                return (
                  <tr key={day.id} className="hover:bg-slate-50/70 transition">
                    {/* Day column */}
                    <td className="p-3 font-bold text-[#000035] whitespace-nowrap">
                      {day.name}
                    </td>

                    {/* Spotify Audio URL input row with Podcast/Music switch, Trash and Save */}
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
                          >
                            <Disc className="w-3 h-3 text-amber-400" />
                            <span>Music</span>
                          </button>
                        </div>

                        {/* URL input */}
                        <div className="relative flex-1">
                          <input
                            type="url"
                            value={currentUrl}
                            onChange={(e) =>
                              setSpotifyUrls((prev) => ({ ...prev, [day.id]: e.target.value }))
                            }
                            placeholder="https://open.spotify.com/episode/... or track/..."
                            className="w-full px-3 py-1.5 text-xs text-[#000035] bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1DB954] focus:bg-white transition"
                          />
                        </div>

                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setSpotifyUrls((prev) => ({ ...prev, [day.id]: '' }));
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition rounded-md hover:bg-rose-50 cursor-pointer shrink-0"
                            title="Clear Spotify URL"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveSpotifyDay(day.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                            isSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#1DB954] hover:bg-[#1ed760] text-[#000035]'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Saved</span>
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
