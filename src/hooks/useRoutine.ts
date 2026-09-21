import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getDb, auth } from '../firebase';
import { DayOfWeek } from '../types';
import { normalizeStudentIdForPath, handleFirestoreError, OperationType } from '../utils/routineSync';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtube';

export interface SavedRoutineVideo {
  videoId: string;
  title: string;
  videoTitle?: string;
  url: string;
  playlistId?: string;
  playlistTitle?: string;
  dayOfWeek: DayOfWeek;
  activityId?: string;
  isRepeatVideo?: boolean;
  instructions?: string;
  duration?: string;
  updatedAt?: string;
}

const ALL_DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Persists selected video and topic for a specific day in Firestore:
 * Path: users/{studentUID}/routines/{dayOfWeek}
 */
export async function saveRoutineVideoToFirestore(
  studentUid: string,
  dayOfWeek: DayOfWeek,
  videoData: {
    videoId: string;
    title: string;
    videoTitle?: string;
    url?: string;
    playlistId?: string;
    playlistTitle?: string;
    activityId?: string;
    isRepeatVideo?: boolean;
    instructions?: string;
    duration?: string;
  }
): Promise<boolean> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  if (!cleanUid || !dayOfWeek) return false;

  const validVidId = extractYouTubeVideoId(videoData.videoId || videoData.url || '') || videoData.videoId;
  if (!validVidId) return false;

  const cleanUrl = videoData.url || `https://www.youtube.com/watch?v=${validVidId}`;
  const cleanTitle = videoData.title || videoData.videoTitle || 'Daily Video Practice';
  const path = `users/${cleanUid}/routines/${dayOfWeek}`;

  const payload: SavedRoutineVideo = {
    videoId: validVidId,
    title: cleanTitle,
    videoTitle: cleanTitle,
    url: cleanUrl,
    playlistId: videoData.playlistId || '',
    playlistTitle: videoData.playlistTitle || '',
    dayOfWeek,
    activityId: videoData.activityId || 'act-1',
    isRepeatVideo: Boolean(videoData.isRepeatVideo),
    instructions: videoData.instructions || '',
    duration: videoData.duration || '5-10 min',
    updatedAt: new Date().toISOString(),
  };

  try {
    const db = getDb();
    const routineRef = doc(db, 'users', cleanUid, 'routines', dayOfWeek);
    await setDoc(routineRef, payload, { merge: true });

    // Also record video into watchedVideosHistory in Firestore (users/{studentUID})
    await addVideoToWatchedHistoryInFirestore(cleanUid, validVidId);

    // Mirror to server for backend persistence
    fetch('/api/routines/daily-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentUid: cleanUid,
        day: dayOfWeek,
        dayOfWeek,
        ...payload,
      }),
    }).catch(() => {});

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Reads the persisted video for a specific day from Firestore:
 * Path: users/{studentUID}/routines/{dayOfWeek}
 */
export async function fetchRoutineVideoFromFirestore(
  studentUid: string,
  dayOfWeek: DayOfWeek
): Promise<SavedRoutineVideo | null> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  if (!cleanUid || !dayOfWeek) return null;

  const path = `users/${cleanUid}/routines/${dayOfWeek}`;
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'users', cleanUid, 'routines', dayOfWeek));
    if (snap.exists()) {
      return snap.data() as SavedRoutineVideo;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Reads all 7 daily routine video selections for a student from Firestore.
 */
export async function fetchAllRoutineVideosFromFirestore(
  studentUid: string
): Promise<Partial<Record<DayOfWeek, SavedRoutineVideo>>> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  if (!cleanUid) return {};

  const result: Partial<Record<DayOfWeek, SavedRoutineVideo>> = {};
  const db = getDb();

  await Promise.all(
    ALL_DAYS_OF_WEEK.map(async (day) => {
      try {
        const snap = await getDoc(doc(db, 'users', cleanUid, 'routines', day));
        if (snap.exists()) {
          result[day] = snap.data() as SavedRoutineVideo;
        }
      } catch (err) {
        // Individual day read failure handled gracefully
      }
    })
  );

  return result;
}

/**
 * Reads the global watched videos history array from Firestore:
 * Path: users/{studentUID} -> field: watchedVideosHistory
 */
export async function fetchWatchedVideosHistoryFromFirestore(
  studentUid: string
): Promise<string[]> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  if (!cleanUid) return [];

  const path = `users/${cleanUid}`;
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'users', cleanUid));
    if (snap.exists()) {
      const data = snap.data();
      const history = data.watchedVideosHistory || data.watchedVideos || [];
      if (Array.isArray(history)) {
        return history.filter((id) => typeof id === 'string' && id.trim().length > 0);
      }
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

/**
 * Appends a video ID to the student's watchedVideosHistory array in Firestore.
 * Path: users/{studentUID} -> field: watchedVideosHistory
 */
export async function addVideoToWatchedHistoryInFirestore(
  studentUid: string,
  videoId: string
): Promise<boolean> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  const cleanVidId = extractYouTubeVideoId(videoId) || videoId;
  if (!cleanUid || !cleanVidId) return false;

  const path = `users/${cleanUid}`;
  try {
    const db = getDb();
    const userRef = doc(db, 'users', cleanUid);

    // Use arrayUnion for atomic non-duplicating append
    await setDoc(
      userRef,
      {
        watchedVideosHistory: arrayUnion(cleanVidId),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Also register on server endpoint
    fetch('/api/student-video-assignments/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentUid: cleanUid,
        videoId: cleanVidId,
      }),
    }).catch(() => {});

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Resets "Repeat Previous Video" (isRepeatVideo: false) for all days in Firestore:
 * Path: users/{studentUID}/routines/{dayOfWeek}
 */
export async function resetRepeatFlagsInFirestore(
  studentUid: string,
  targetDays: DayOfWeek[] = ALL_DAYS_OF_WEEK
): Promise<boolean> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  if (!cleanUid) return false;

  const db = getDb();
  const daysToReset = targetDays.length > 0 ? targetDays : ALL_DAYS_OF_WEEK;

  try {
    await Promise.all(
      daysToReset.map(async (day) => {
        const ref = doc(db, 'users', cleanUid, 'routines', day);
        await setDoc(
          ref,
          {
            isRepeatVideo: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      })
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/routines`);
    return false;
  }
}

/**
 * Filter candidates against watched videos history to enforce 100% exclusivity.
 * Returns the first video that has NOT yet been watched.
 */
export function selectNextUnwatchedVideo<T extends { videoId?: string; id?: string; url?: string }>(
  candidateVideos: T[],
  watchedHistory: string[]
): T | null {
  if (!Array.isArray(candidateVideos) || candidateVideos.length === 0) {
    return null;
  }

  const watchedSet = new Set(
    (watchedHistory || []).map((id) => (extractYouTubeVideoId(id) || id || '').trim().toLowerCase())
  );

  const unwatched = candidateVideos.find((vid) => {
    const rawId = vid.videoId || vid.id || vid.url || '';
    const cleanId = (extractYouTubeVideoId(rawId) || rawId).trim().toLowerCase();
    return cleanId && !watchedSet.has(cleanId);
  });

  return unwatched || null;
}

/**
 * Custom React Hook: useRoutine
 * Manages daily video persistence, global watched history, and new week resets.
 */
export function useRoutine(studentUid?: string, selectedDay?: DayOfWeek) {
  const [routinesByDay, setRoutinesByDay] = useState<Partial<Record<DayOfWeek, SavedRoutineVideo>>>({});
  const [watchedHistory, setWatchedHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSavedDay, setLastSavedDay] = useState<DayOfWeek | null>(null);

  const effectiveUid = studentUid ? normalizeStudentIdForPath(studentUid) : '';

  // Load routines and watched history on mount / studentUid change
  useEffect(() => {
    if (!effectiveUid) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetchAllRoutineVideosFromFirestore(effectiveUid),
      fetchWatchedVideosHistoryFromFirestore(effectiveUid),
    ])
      .then(([routines, history]) => {
        if (!isMounted) return;
        setRoutinesByDay(routines);
        setWatchedHistory(history);
      })
      .catch((err) => {
        console.warn('Error loading routine data from Firestore:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveUid]);

  // Save selected video for a day and update local state immediately
  const saveVideoForDay = useCallback(
    async (
      day: DayOfWeek,
      videoData: {
        videoId: string;
        title: string;
        videoTitle?: string;
        url?: string;
        playlistId?: string;
        playlistTitle?: string;
        activityId?: string;
        isRepeatVideo?: boolean;
        instructions?: string;
      }
    ) => {
      if (!effectiveUid || !day) return false;

      const cleanVidId = extractYouTubeVideoId(videoData.videoId || videoData.url || '') || videoData.videoId;
      const cleanTitle = videoData.title || videoData.videoTitle || 'Daily Video Practice';
      const cleanUrl = videoData.url || `https://www.youtube.com/watch?v=${cleanVidId}`;

      const savedObj: SavedRoutineVideo = {
        videoId: cleanVidId,
        title: cleanTitle,
        videoTitle: cleanTitle,
        url: cleanUrl,
        playlistId: videoData.playlistId || '',
        playlistTitle: videoData.playlistTitle || '',
        dayOfWeek: day,
        activityId: videoData.activityId || 'act-1',
        isRepeatVideo: Boolean(videoData.isRepeatVideo),
        instructions: videoData.instructions || '',
        updatedAt: new Date().toISOString(),
      };

      // Optimistic local update
      setRoutinesByDay((prev) => ({ ...prev, [day]: savedObj }));
      if (cleanVidId && !watchedHistory.includes(cleanVidId)) {
        setWatchedHistory((prev) => [...prev, cleanVidId]);
      }
      setLastSavedDay(day);

      // Persist to Firestore
      return await saveRoutineVideoToFirestore(effectiveUid, day, videoData);
    },
    [effectiveUid, watchedHistory]
  );

  // Add video to watched history
  const markVideoAsWatched = useCallback(
    async (videoId: string) => {
      if (!effectiveUid || !videoId) return false;
      const cleanVidId = extractYouTubeVideoId(videoId) || videoId;
      if (!cleanVidId) return false;

      if (!watchedHistory.includes(cleanVidId)) {
        setWatchedHistory((prev) => [...prev, cleanVidId]);
      }
      return await addVideoToWatchedHistoryInFirestore(effectiveUid, cleanVidId);
    },
    [effectiveUid, watchedHistory]
  );

  // Reset repeat flags for all days on starting a new week
  const resetRepeatFlags = useCallback(
    async (studyDays?: DayOfWeek[]) => {
      if (!effectiveUid) return false;

      // Optimistic local state update
      setRoutinesByDay((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((d) => {
          const dayKey = d as DayOfWeek;
          if (updated[dayKey]) {
            updated[dayKey] = { ...updated[dayKey]!, isRepeatVideo: false };
          }
        });
        return updated;
      });

      return await resetRepeatFlagsInFirestore(effectiveUid, studyDays);
    },
    [effectiveUid]
  );

  const currentDayRoutine = selectedDay ? routinesByDay[selectedDay] || null : null;

  return {
    routinesByDay,
    currentDayRoutine,
    watchedHistory,
    isLoading,
    lastSavedDay,
    saveVideoForDay,
    markVideoAsWatched,
    resetRepeatFlags,
    selectNextUnwatchedVideo: <T extends { videoId?: string; id?: string; url?: string }>(candidates: T[]) =>
      selectNextUnwatchedVideo(candidates, watchedHistory),
  };
}
