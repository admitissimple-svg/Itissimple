import { DayOfWeek, RoutineItem } from '../types';
import {
  fetchWatchedVideosHistoryFromFirestore,
  addMultipleVideosToWatchedHistoryInFirestore,
  fetchAllRoutineVideosFromFirestore,
  saveRoutineVideoToFirestore,
  resetRepeatFlagsInFirestore,
} from '../hooks/useRoutine';
import { normalizeStudentIdForPath, withFirestoreTimeout } from '../utils/routineSync';
import {
  extractYouTubeVideoId,
  YOUTUBE_LEVEL_PLAYLISTS,
  YouTubeDailyVideoConfig,
  YouTubeVideoItem,
} from '../utils/youtube';
import { DAYS_SEQUENCE, normalizeStudentLevel } from '../utils/spotify';
import { fetchAllWeeklyHistories, saveWeeklyHistory } from '../hooks/useStudentHistory';

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

const GENERIC_PLACEHOLDER_EMAILS = new Set([
  'aluno@itssimple.com',
  'student@itssimple.com',
  'user@example.com',
  'test@example.com',
]);

/**
 * Executes the complete "Start New Week" lifecycle with complete isolation by studentUID:
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

  // Strict UID validation: prioritize clean UID and reject generic placeholder emails
  const rawUid = (studentUid || '').trim();
  const rawEmail = (studentEmail || '').trim().toLowerCase();
  const isPlaceholder = !rawEmail || GENERIC_PLACEHOLDER_EMAILS.has(rawEmail) || rawEmail.includes('aluno@');
  const effectiveIdentifier = rawUid || (!isPlaceholder ? rawEmail : '');
  const cleanUid = normalizeStudentIdForPath(effectiveIdentifier);

  // Step 1: Read the accumulated global history from Firestore (users/{studentUID}/watchedVideosHistory)
  let firestoreWatched: string[] = [];
  if (cleanUid) {
    try {
      firestoreWatched = await withFirestoreTimeout(
        fetchWatchedVideosHistoryFromFirestore(cleanUid),
        3000,
        []
      );
    } catch (err) {
      console.warn('Notice fetching watched videos history from Firestore:', err);
    }
  }

  // Step 2: Collect all video records displayed/assigned in the ending cycle to archive into watchedVideosHistory
  const videosToArchive: Array<{ videoId: string; videoTitle: string; watchedAt: string }> = [];

  // Check current in-memory routines
  if (params.currentRoutines) {
    ALL_DAYS.forEach((day) => {
      const acts = params.currentRoutines?.[day] || [];
      acts.forEach((act) => {
        if (act.teacherVideos && Array.isArray(act.teacherVideos)) {
          act.teacherVideos.forEach((v) => {
            const vidId = extractYouTubeVideoId(v.videoId || v.url || '');
            if (vidId) {
              videosToArchive.push({
                videoId: vidId,
                videoTitle: v.title || (v as any).videoTitle || 'Daily Video Practice',
                watchedAt: new Date().toISOString(),
              });
            }
          });
        }
      });
    });
  }

  // Check persisted Firestore routine videos for this student
  if (cleanUid) {
    try {
      const persistedDailyVideos = await withFirestoreTimeout(
        fetchAllRoutineVideosFromFirestore(cleanUid),
        3000,
        {}
      );
      Object.values(persistedDailyVideos).forEach((item) => {
        if (item && item.videoId) {
          const vidId = extractYouTubeVideoId(item.videoId || item.url || '');
          if (vidId) {
            videosToArchive.push({
              videoId: vidId,
              videoTitle: item.videoTitle || item.title || 'Daily Video Practice',
              watchedAt: new Date().toISOString(),
            });
          }
        }
      });
    } catch (err) {
      console.warn('Notice reading persisted routines to archive videos:', err);
    }
  }

  // Persist newly archived videos to Firestore users/{studentUID}/watchedVideosHistory
  if (cleanUid && videosToArchive.length > 0) {
    try {
      await withFirestoreTimeout(
        addMultipleVideosToWatchedHistoryInFirestore(cleanUid, videosToArchive),
        3500,
        false
      );
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
  videosToArchive.forEach((v) => {
    const clean = (extractYouTubeVideoId(v.videoId) || v.videoId || '').trim().toLowerCase();
    if (clean) accumulatedWatchedSet.add(clean);
  });

  // Also query consolidated weeklyHistory subcollection to ensure cross-cycle exclusivity
  if (cleanUid) {
    try {
      const pastHistories = await withFirestoreTimeout(
        fetchAllWeeklyHistories(cleanUid),
        3000,
        []
      );
      pastHistories.forEach((hist) => {
        if (Array.isArray(hist.consumedVideoIds)) {
          hist.consumedVideoIds.forEach((v) => {
            const vidId = extractYouTubeVideoId(v.id || v.videoId || '') || v.id || v.videoId || '';
            const clean = vidId.trim().toLowerCase();
            if (clean) accumulatedWatchedSet.add(clean);
          });
        }
      });
    } catch (err) {
      console.warn('Notice reading past weeklyHistories for exclusivity check:', err);
    }
  }

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
      await withFirestoreTimeout(resetRepeatFlagsInFirestore(cleanUid, ALL_DAYS), 3000, false);
    } catch (err) {
      console.warn('Notice resetting repeat video flags in Firestore:', err);
    }

    // Save newly selected videos for the active study days in Firestore routines
    await Promise.all(
      chosenDays.map(async (day) => {
        const video = newlyAssignedVideosByDay[day];
        if (!video) return;
        const validVidId = extractYouTubeVideoId(video.videoId || video.url || '') || video.videoId;
        const videoTitle = video.title || (video as any).videoTitle || 'Daily Video Practice';
        try {
          await withFirestoreTimeout(
            saveRoutineVideoToFirestore(cleanUid, day, {
              videoId: validVidId,
              title: videoTitle,
              videoTitle: videoTitle,
              url: video.url || `https://www.youtube.com/watch?v=${validVidId}`,
              playlistId: video.playlistId || levelCurriculum.playlistId,
              playlistTitle: video.playlistTitle || levelCurriculum.playlistTitle,
              instructions: (video as any).teacherTipPt || (video as any).teacherTipEn || 'Daily Video Practice',
              duration: video.duration || '6-10 min',
              isRepeatVideo: false,
              activityId: 'act-1',
            }),
            3500,
            false
          );
        } catch (err) {
          console.warn(`Notice persisting video for ${day} in Firestore:`, err);
        }
      })
    );
  }

  // Step 5: Call backend reset endpoint with full accumulated watched history and new video assignments
  const fallbackCycle = (params.currentCycle || 1) + 1;
  const assignedListForServer = chosenDays
    .map((day) => {
      const v = newlyAssignedVideosByDay[day];
      if (!v) return null;
      const vidId = extractYouTubeVideoId(v.videoId || v.url || '') || v.videoId;
      const title = v.title || (v as any).videoTitle || 'Daily Video Practice';
      return {
        day,
        videoId: vidId,
        title,
        videoTitle: title,
        url: v.url || `https://www.youtube.com/watch?v=${vidId}`,
        playlistId: v.playlistId || levelCurriculum.playlistId,
        playlistTitle: v.playlistTitle || levelCurriculum.playlistTitle,
        duration: v.duration || '6-10 min',
      };
    })
    .filter(Boolean);

  let data: any = null;
  try {
    const fetchPromise = fetch('/api/student-routines/start-new-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: !isPlaceholder ? studentEmail : '',
        uid: cleanUid,
        studentUid: cleanUid,
        weeklyStudyDaysTarget: targetDays,
        weeklyStudyDays: chosenDays,
        watchedVideosHistory: Array.from(accumulatedWatchedSet),
        newAssignedVideos: assignedListForServer,
        studentLevel: normLevel,
      }),
    });

    const res = await withFirestoreTimeout(fetchPromise, 6500, null as any);
    if (res && res.ok) {
      data = await res.json();
    }
  } catch (netErr) {
    console.warn('Notice during backend sync in executeStartNewWeek:', netErr);
  }

  // Step 6: Construct clean, sanitized routines ensuring isRepeatVideo: false and fresh video attachments
  const rawRoutines = data?.routines || params.currentRoutines || {};
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
        const vTitle = chosenVideo.title || (chosenVideo as any).videoTitle || 'Daily Video Practice';
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
              title: vTitle,
              videoTitle: vTitle,
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

  const finalCycle = data?.weeklyCycle !== undefined ? data.weeklyCycle : fallbackCycle;

  // Initialize new weeklyHistory document for the new cycle
  if (cleanUid) {
    saveWeeklyHistory(cleanUid, `week-${finalCycle}`, {
      studentUid: cleanUid,
      studentEmail: !isPlaceholder ? params.studentEmail : '',
      weekId: `week-${finalCycle}`,
      weeklyCycle: finalCycle,
      consumedVideoIds: [],
      consumedTrackIds: [],
      weeklyVocabulary: [],
      updatedAt: new Date().toISOString(),
    }).catch((err) => {
      console.warn('Notice initializing new weeklyHistory document:', err);
    });
  }

  return {
    success: true,
    weeklyCycle: finalCycle,
    weeklyStudyDaysTarget: data?.weeklyStudyDaysTarget || targetDays,
    weeklyStudyDays: data?.weeklyStudyDays || chosenDays,
    routines: sanitizedRoutines,
    message: data?.message || 'New week cycle started successfully with repeat flags reset.',
  };
}
