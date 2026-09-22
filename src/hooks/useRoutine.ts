import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { getDb, auth } from '../firebase';
import { DayOfWeek, TeacherOverrideTrack } from '../types';
import { normalizeStudentIdForPath, handleFirestoreError, OperationType, withFirestoreTimeout } from '../utils/routineSync';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtube';
import { recordConsumedVideo } from './useStudentHistory';

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
  teacherOverrideTrack?: TeacherOverrideTrack | null;
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
    await withFirestoreTimeout(setDoc(routineRef, payload, { merge: true }), 3500, undefined);

    // Record into weekly history subcollection asynchronously
    const videoTitle = videoData.videoTitle || videoData.title || 'Daily Video Practice';
    recordConsumedVideo(cleanUid, 'weekData', {
      id: validVidId,
      videoId: validVidId,
      title: videoTitle,
      videoTitle,
      url: videoData.url || `https://www.youtube.com/watch?v=${validVidId}`,
      dayOfWeek,
      watchedAt: new Date().toISOString(),
    }).catch(() => {});

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

export interface WatchedVideoEntry {
  videoId: string;
  videoTitle: string;
  watchedAt: string;
}

export function extractVideoIdFromHistoryItem(item: any): string {
  if (typeof item === 'string') {
    return (extractYouTubeVideoId(item) || item || '').trim();
  }
  if (item && typeof item === 'object') {
    const raw = item.videoId || item.id || item.url || '';
    return (extractYouTubeVideoId(raw) || raw || '').trim();
  }
  return '';
}

export function extractVideoTitleFromHistoryItem(item: any): string {
  if (item && typeof item === 'object') {
    return (item.videoTitle || item.title || 'Daily Video Practice').trim();
  }
  return 'Daily Video Practice';
}

/**
 * Reads the global watched videos history array from Firestore:
 * Path: users/{studentUID} -> field: watchedVideosHistory
 * Always returns clean array of YouTube videoId strings for exclusivity checks.
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
        return Array.from(
          new Set(
            history
              .map((item) => extractVideoIdFromHistoryItem(item))
              .filter((id) => Boolean(id && id.trim().length > 0))
          )
        );
      }
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

/**
 * Reads the global watched videos history array from Firestore with full metadata objects:
 * Path: users/{studentUID} -> field: watchedVideosHistory
 */
export async function fetchWatchedVideoObjectsFromFirestore(
  studentUid: string
): Promise<WatchedVideoEntry[]> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  if (!cleanUid) return [];

  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'users', cleanUid));
    if (snap.exists()) {
      const data = snap.data();
      const history = data.watchedVideosHistory || data.watchedVideos || [];
      if (Array.isArray(history)) {
        const result: WatchedVideoEntry[] = [];
        const seen = new Set<string>();
        history.forEach((item) => {
          const vidId = extractVideoIdFromHistoryItem(item);
          if (vidId && !seen.has(vidId.toLowerCase())) {
            seen.add(vidId.toLowerCase());
            result.push({
              videoId: vidId,
              videoTitle: extractVideoTitleFromHistoryItem(item),
              watchedAt: (item && typeof item === 'object' && item.watchedAt) || new Date().toISOString(),
            });
          }
        });
        return result;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Appends a video record to the student's watchedVideosHistory array in Firestore.
 * Path: users/{studentUID} -> field: watchedVideosHistory
 * Stores: { videoId: string, videoTitle: string, watchedAt: string }
 */
export async function addVideoToWatchedHistoryInFirestore(
  studentUid: string,
  videoId: string,
  videoTitle?: string
): Promise<boolean> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  const cleanVidId = extractYouTubeVideoId(videoId) || (videoId || '').trim();
  if (!cleanUid || !cleanVidId) return false;
  const cleanTitle = (videoTitle || 'Daily Video Practice').trim();

  const path = `users/${cleanUid}`;
  try {
    const db = getDb();
    const userRef = doc(db, 'users', cleanUid);
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? (snap.data().watchedVideosHistory || snap.data().watchedVideos || []) : [];
    const list = Array.isArray(existing) ? [...existing] : [];

    const alreadyExists = list.some(
      (item) => extractVideoIdFromHistoryItem(item).toLowerCase() === cleanVidId.toLowerCase()
    );

    const entry: WatchedVideoEntry = {
      videoId: cleanVidId,
      videoTitle: cleanTitle,
      watchedAt: new Date().toISOString(),
    };

    if (!alreadyExists) {
      list.push(entry);
    } else {
      const idx = list.findIndex(
        (item) => extractVideoIdFromHistoryItem(item).toLowerCase() === cleanVidId.toLowerCase()
      );
      if (idx >= 0 && typeof list[idx] === 'object') {
        list[idx] = {
          ...list[idx],
          videoTitle: cleanTitle || list[idx].videoTitle || 'Daily Video Practice',
        };
      }
    }

    await setDoc(
      userRef,
      {
        watchedVideosHistory: list,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Also mirror to backend endpoint specifically for this student
    fetch('/api/student-video-assignments/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentUid: cleanUid,
        videoId: cleanVidId,
        videoTitle: cleanTitle,
      }),
    }).catch(() => {});

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Appends multiple video records to the student's watchedVideosHistory array in Firestore.
 * Path: users/{studentUID} -> field: watchedVideosHistory
 */
export async function addMultipleVideosToWatchedHistoryInFirestore(
  studentUid: string,
  videos: Array<string | { videoId: string; videoTitle?: string; watchedAt?: string }>
): Promise<boolean> {
  const cleanUid = normalizeStudentIdForPath(studentUid);
  if (!cleanUid || !Array.isArray(videos) || videos.length === 0) return false;

  const path = `users/${cleanUid}`;
  try {
    const db = getDb();
    const userRef = doc(db, 'users', cleanUid);
    const snap = await withFirestoreTimeout(getDoc(userRef), 3500, null as any);
    const existing = snap && snap.exists() ? (snap.data().watchedVideosHistory || snap.data().watchedVideos || []) : [];
    const list = Array.isArray(existing) ? [...existing] : [];

    const seenIds = new Set<string>();
    list.forEach((item) => {
      const vid = extractVideoIdFromHistoryItem(item).toLowerCase();
      if (vid) seenIds.add(vid);
    });

    let modified = false;
    videos.forEach((v) => {
      const rawId = typeof v === 'string' ? v : v.videoId;
      const cleanVidId = (extractYouTubeVideoId(rawId) || rawId || '').trim();
      if (!cleanVidId || seenIds.has(cleanVidId.toLowerCase())) return;

      seenIds.add(cleanVidId.toLowerCase());
      const title = typeof v === 'object' && v.videoTitle ? v.videoTitle : 'Daily Video Practice';
      const watchedAt = typeof v === 'object' && v.watchedAt ? v.watchedAt : new Date().toISOString();

      list.push({
        videoId: cleanVidId,
        videoTitle: title,
        watchedAt,
      });
      modified = true;
    });

    if (modified) {
      await withFirestoreTimeout(
        setDoc(
          userRef,
          {
            watchedVideosHistory: list,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        3500,
        undefined
      );
    }

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
    const promises = daysToReset.map((day) => {
      const ref = doc(db, 'users', cleanUid, 'routines', day);
      return setDoc(
        ref,
        {
          isRepeatVideo: false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await withFirestoreTimeout(Promise.all(promises), 3500, []);
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

  // Load routines and watched history on mount / studentUid change + real-time onSnapshot sync
  useEffect(() => {
    // Immediately clear state on change so previous student's history NEVER leaks into another student
    setRoutinesByDay({});
    setWatchedHistory([]);

    if (!effectiveUid) {
      setIsLoading(false);
      return;
    }

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

    const db = getDb();

    // Listen in real-time to the student user document for changes to watchedVideosHistory
    let userUnsub = () => {};
    try {
      const userRef = doc(db, 'users', effectiveUid);
      userUnsub = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists() && isMounted) {
            const data = snap.data();
            const history = data.watchedVideosHistory || data.watchedVideos || [];
            if (Array.isArray(history)) {
              const ids = Array.from(
                new Set(
                  history
                    .map((item) => extractVideoIdFromHistoryItem(item))
                    .filter((id) => Boolean(id && id.trim().length > 0))
                )
              );
              setWatchedHistory(ids);
            }
          }
        },
        () => {}
      );
    } catch {}

    // Subscribe in real-time to each day of the week to mirror teacher updates instantly
    const unsubs = ALL_DAYS_OF_WEEK.map((day) => {
      try {
        const dayRef = doc(db, 'users', effectiveUid, 'routines', day);
        return onSnapshot(
          dayRef,
          (snap) => {
            if (snap.exists() && isMounted) {
              const data = snap.data() as SavedRoutineVideo;
              setRoutinesByDay((prev) => ({ ...prev, [day]: data }));
            }
          },
          () => {}
        );
      } catch {
        return () => {};
      }
    });

    return () => {
      isMounted = false;
      userUnsub();
      unsubs.forEach((u) => u());
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
    async (videoId: string, videoTitle?: string) => {
      if (!effectiveUid || !videoId) return false;
      const cleanVidId = extractYouTubeVideoId(videoId) || videoId;
      if (!cleanVidId) return false;

      if (!watchedHistory.includes(cleanVidId)) {
        setWatchedHistory((prev) => [...prev, cleanVidId]);
      }
      return await addVideoToWatchedHistoryInFirestore(effectiveUid, cleanVidId, videoTitle);
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
