import { DayOfWeek, RoutineItem } from '../types';
import {
  fetchWatchedVideosHistoryFromFirestore,
  addMultipleVideosToWatchedHistoryInFirestore,
  fetchAllRoutineVideosFromFirestore,
  saveRoutineVideoToFirestore,
  resetRepeatFlagsInFirestore,
} from '../hooks/useRoutine';
import { normalizeStudentIdForPath } from '../utils/routineSync';
import {
  extractYouTubeVideoId,
  YOUTUBE_LEVEL_PLAYLISTS,
  YouTubeDailyVideoConfig,
  YouTubeVideoItem,
} from '../utils/youtube';
import { DAYS_SEQUENCE, normalizeStudentLevel } from '../utils/spotify';

export interface StartNewWeekParams {
  studentEmail: string;
  studentUid: string;
  weeklyStudyDaysTarget?: number;
  weeklyStudyDays?: DayOfWeek[];
  currentCycle?: number;
  studentLevel?: string;
  currentRoutines?: Record<DayOfWeek, RoutineItem[]>;
}

export interface StartNewWeekResult {
  success: boolean;
  weeklyCycle: number;
  weeklyStudyDaysTarget: number;
  weeklyStudyDays: DayOfWeek[];
  routines: Record<DayOfWeek, RoutineItem[]>;
  message: string;
}

const ALL_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Executes the complete "Start New Week" lifecycle:
 * 1. Reads accumulated global watched history from Firestore: users/{studentUID}/watchedVideosHistory
 * 2. Archives all displayed/completed videos of the previous cycle into watchedVideosHistory
 * 3. Enforces 100% exclusivity: selects consecutive unseen videos from student's level playlist
 * 4. Persists the new unseen videos to Firestore routines for each study day with isRepeatVideo: false
 * 5. Resets the "Repeat Previous Video" button state for all days
 * 6. Advances weeklyCycle and synchronizes state with backend
 */
export async function executeStartNewWeek(
  params: StartNewWeekParams
): Promise<StartNewWeekResult | null> {
  const { studentEmail, studentUid, weeklyStudyDaysTarget, weeklyStudyDays } = params;
  const targetDays = weeklyStudyDaysTarget || 7;
  const chosenDays = weeklyStudyDays && weeklyStudyDays.length > 0 ? weeklyStudyDays : ALL_DAYS;
  const cleanUid = normalizeStudentIdForPath(studentUid || studentEmail);

  // Step 1: Read the accumulated global history from Firestore (users/{studentUID}/watchedVideosHistory)
  let firestoreWatched: string[] = [];
  if (cleanUid) {
    try {
      firestoreWatched = await fetchWatchedVideosHistoryFromFirestore(cleanUid);
    } catch (err) {
      console.warn('Notice fetching watched videos history from Firestore:', err);
    }
  }

  // Step 2: Collect all video IDs displayed/assigned in the ending cycle to archive into watchedVideosHistory
  const videosToArchive: string[] = [];

  // Check current in-memory routines
  if (params.currentRoutines) {
    ALL_DAYS.forEach((day) => {
      const acts = params.currentRoutines?.[day] || [];
      acts.forEach((act) => {
        if (act.teacherVideos && Array.isArray(act.teacherVideos)) {
          act.teacherVideos.forEach((v) => {
            const vidId = extractYouTubeVideoId(v.videoId || v.url || '');
            if (vidId) videosToArchive.push(vidId);
          });
        }
      });
    });
  }

  // Check persisted Firestore routine videos for this student
  if (cleanUid) {
    try {
      const persistedDailyVideos = await fetchAllRoutineVideosFromFirestore(cleanUid);
      Object.values(persistedDailyVideos).forEach((item) => {
        if (item && item.videoId) {
          const vidId = extractYouTubeVideoId(item.videoId || item.url || '');
          if (vidId) videosToArchive.push(vidId);
        }
      });
    } catch (err) {
      console.warn('Notice reading persisted routines to archive videos:', err);
    }
  }

  // Persist newly archived videos to Firestore users/{studentUID}/watchedVideosHistory
  if (cleanUid && videosToArchive.length > 0) {
    try {
      await addMultipleVideosToWatchedHistoryInFirestore(cleanUid, videosToArchive);
    } catch (err) {
      console.warn('Notice archiving videos to Firestore:', err);
    }
  }

  // Build the complete accumulated set of watched IDs (lowercased & trimmed)
  const accumulatedWatchedSet = new Set<string>();
  firestoreWatched.forEach((id) => {
    const clean = (extractYouTubeVideoId(id) || id || '').trim().toLowerCase();
    if (clean) accumulatedWatchedSet.add(clean);
  });
  videosToArchive.forEach((id) => {
    const clean = (extractYouTubeVideoId(id) || id || '').trim().toLowerCase();
    if (clean) accumulatedWatchedSet.add(clean);
  });

  // Step 3: Select the NEXT unseen videos from the student level playlist
  const normLevel = normalizeStudentLevel(params.studentLevel || 'intermediate');
  const levelCurriculum = YOUTUBE_LEVEL_PLAYLISTS[normLevel] || YOUTUBE_LEVEL_PLAYLISTS.intermediate;

  // Build candidate pool in strict pedagogical order: 7 daily sequence videos, then pool videos
  const candidatePool: Array<YouTubeDailyVideoConfig | YouTubeVideoItem> = [
    ...DAYS_SEQUENCE.map((d) => levelCurriculum.videos[d]),
    ...(levelCurriculum.pool || []),
  ].filter(Boolean);

  const assignedThisWeekSet = new Set<string>();
  const newlyAssignedVideosByDay: Partial<Record<DayOfWeek, YouTubeDailyVideoConfig | YouTubeVideoItem>> = {};

  // For each study day of the new week, pick the NEXT unseen candidate
  chosenDays.forEach((day) => {
    // 1. Next candidate not in accumulated global history and not assigned earlier in this new week
    let selectedCandidate = candidatePool.find((c) => {
      const cid = (extractYouTubeVideoId(c.videoId || c.url || '') || '').trim().toLowerCase();
      return cid && !accumulatedWatchedSet.has(cid) && !assignedThisWeekSet.has(cid);
    });

    // 2. Fallback if all videos in curriculum pool have been watched: pick one not yet assigned this week
    if (!selectedCandidate) {
      selectedCandidate = candidatePool.find((c) => {
        const cid = (extractYouTubeVideoId(c.videoId || c.url || '') || '').trim().toLowerCase();
        return cid && !assignedThisWeekSet.has(cid);
      });
    }

    // 3. Ultimate fallback to designated day video
    if (!selectedCandidate) {
      selectedCandidate = levelCurriculum.videos[day] || candidatePool[0];
    }

    if (selectedCandidate) {
      const chosenVidId = extractYouTubeVideoId(selectedCandidate.videoId || selectedCandidate.url || '') || selectedCandidate.videoId;
      const lowerId = chosenVidId.trim().toLowerCase();
      accumulatedWatchedSet.add(lowerId);
      assignedThisWeekSet.add(lowerId);
      newlyAssignedVideosByDay[day] = selectedCandidate;
    }
  });

  // Step 4: Persist newly selected videos to Firestore users/{studentUID}/routines/{day}
  if (cleanUid) {
    // Force reset isRepeatVideo: false across all days in Firestore
    try {
      await resetRepeatFlagsInFirestore(cleanUid, ALL_DAYS);
    } catch (err) {
      console.warn('Notice resetting repeat video flags in Firestore:', err);
    }

    // Save newly selected videos for the active study days in Firestore routines
    await Promise.all(
      chosenDays.map(async (day) => {
        const video = newlyAssignedVideosByDay[day];
        if (!video) return;
        const validVidId = extractYouTubeVideoId(video.videoId || video.url || '') || video.videoId;
        try {
          await saveRoutineVideoToFirestore(cleanUid, day, {
            videoId: validVidId,
            title: video.title,
            videoTitle: video.title,
            url: video.url || `https://www.youtube.com/watch?v=${validVidId}`,
            playlistId: video.playlistId || levelCurriculum.playlistId,
            playlistTitle: video.playlistTitle || levelCurriculum.playlistTitle,
            instructions: (video as any).teacherTipPt || (video as any).teacherTipEn || 'Daily Video Practice',
            duration: video.duration || '6-10 min',
            isRepeatVideo: false,
            activityId: 'act-1',
          });
        } catch (err) {
          console.warn(`Notice persisting video for ${day} in Firestore:`, err);
        }
      })
    );
  }

  // Step 5: Call backend reset endpoint with full accumulated watched history and new video assignments
  try {
    const assignedListForServer = chosenDays
      .map((day) => {
        const v = newlyAssignedVideosByDay[day];
        if (!v) return null;
        const vidId = extractYouTubeVideoId(v.videoId || v.url || '') || v.videoId;
        return {
          day,
          videoId: vidId,
          title: v.title,
          url: v.url || `https://www.youtube.com/watch?v=${vidId}`,
          playlistId: v.playlistId || levelCurriculum.playlistId,
          playlistTitle: v.playlistTitle || levelCurriculum.playlistTitle,
          duration: v.duration || '6-10 min',
        };
      })
      .filter(Boolean);

    const res = await fetch('/api/student-routines/start-new-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail,
        uid: cleanUid,
        studentUid: cleanUid,
        weeklyStudyDaysTarget: targetDays,
        weeklyStudyDays: chosenDays,
        watchedVideosHistory: Array.from(accumulatedWatchedSet),
        newAssignedVideos: assignedListForServer,
        studentLevel: normLevel,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    const rawRoutines = data.routines || {};

    // Step 6: Guarantee that every routine item returned has isRepeatVideo: false and fresh video attachments
    const sanitizedRoutines: Record<DayOfWeek, RoutineItem[]> = {} as any;
    ALL_DAYS.forEach((day) => {
      const dayList = rawRoutines[day] || [];
      const chosenVideo = newlyAssignedVideosByDay[day];
      sanitizedRoutines[day] = dayList.map((act: any) => {
        const isVideoAct =
          act.id?.endsWith('1') ||
          act.activityName?.toLowerCase().includes('vídeo') ||
          act.activityName?.toLowerCase().includes('video') ||
          (act.teacherVideos && act.teacherVideos.length > 0);

        if (isVideoAct && chosenVideo && chosenDays.includes(day)) {
          const vidId = extractYouTubeVideoId(chosenVideo.videoId || chosenVideo.url || '') || chosenVideo.videoId;
          return {
            ...act,
            activityName: chosenVideo.playlistTitle || act.activityName || 'Daily Video Practice',
            completed: false,
            completedToday: false,
            isRepeatVideo: false,
            repeatVideo: false,
            teacherVideos: [
              {
                id: `vid-${day}-${vidId}`,
                videoId: vidId,
                title: chosenVideo.title,
                url: chosenVideo.url || `https://www.youtube.com/watch?v=${vidId}`,
                duration: chosenVideo.duration || '6-10 min',
                playlistId: chosenVideo.playlistId || levelCurriculum.playlistId,
                playlistTitle: chosenVideo.playlistTitle || levelCurriculum.playlistTitle,
                instructions: (chosenVideo as any).teacherTipPt || (chosenVideo as any).teacherTipEn || '',
              },
            ],
          };
        }

        return {
          ...act,
          completed: false,
          completedToday: false,
          isRepeatVideo: false,
          repeatVideo: false,
        };
      });
    });

    return {
      success: true,
      weeklyCycle: data.weeklyCycle !== undefined ? data.weeklyCycle : (params.currentCycle || 1) + 1,
      weeklyStudyDaysTarget: data.weeklyStudyDaysTarget || targetDays,
      weeklyStudyDays: data.weeklyStudyDays || chosenDays,
      routines: sanitizedRoutines,
      message: data.message || 'New week cycle started successfully with repeat flags reset.',
    };
  } catch (err) {
    console.warn('Error in executeStartNewWeek:', err);
    return null;
  }
}
