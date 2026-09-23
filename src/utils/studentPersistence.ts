import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import {
  StudentDictionaryEntry,
  DailyJournalEntry,
  LiveLesson,
} from '../types';
import { handleFirestoreError, OperationType, withFirestoreTimeout } from './routineSync';

export function normalizeUid(rawId?: string | null, email?: string | null): string {
  if (rawId && typeof rawId === 'string' && rawId.trim()) {
    return rawId.trim();
  }
  if (email && typeof email === 'string' && email.trim()) {
    return email.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return 'anonymous_student';
}

/**
 * Persist student vocabulary entries directly to Firestore.
 * Saves to users/{studentUID} and subcollection users/{studentUID}/vocabulary.
 */
export async function saveStudentVocabularyToFirestore(
  studentUid: string,
  entries: StudentDictionaryEntry[],
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const cleanUid = normalizeUid(studentUid, studentEmail);

  try {
    const sanitizedEntries = JSON.parse(JSON.stringify(entries || []));
    const userRef = doc(db, 'users', cleanUid);

    // 1. Save list directly to user profile doc
    await withFirestoreTimeout(
      setDoc(
        userRef,
        {
          vocabulary: sanitizedEntries,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      3500,
      null
    );

    // 2. Also write individual items into subcollection for fast discrete queries
    const saveIndividualPromises = sanitizedEntries.map((entry: StudentDictionaryEntry) => {
      const entryId = entry.id || entry.word.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const itemRef = doc(db, 'users', cleanUid, 'vocabulary', entryId);
      return setDoc(itemRef, { ...entry, studentUid: cleanUid, studentEmail: studentEmail || '' }, { merge: true });
    });

    await withFirestoreTimeout(Promise.all(saveIndividualPromises), 4000, []);

    // 3. Mirror to backend server API for disk persistence
    const cleanEmail = (studentEmail || '').toLowerCase().trim();
    if (cleanEmail || cleanUid) {
      fetch('/api/student-dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: cleanEmail,
          uid: cleanUid,
          entries: sanitizedEntries,
        }),
      }).catch(() => {});
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/vocabulary`);
    return false;
  }
}

/**
 * Fetch student vocabulary directly from Firestore.
 */
export async function fetchStudentVocabularyFromFirestore(
  studentUid: string,
  studentEmail?: string
): Promise<StudentDictionaryEntry[]> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  if (!db || !cleanUid) return [];

  try {
    const entryMap = new Map<string, StudentDictionaryEntry>();

    // 1. Try fetching from the user document
    const userRef = doc(db, 'users', cleanUid);
    const userSnap = await withFirestoreTimeout(getDoc(userRef), 2500, null);
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      if (Array.isArray(data?.vocabulary)) {
        data.vocabulary.forEach((item: StudentDictionaryEntry) => {
          if (item?.word) entryMap.set(item.word.toLowerCase().trim(), item);
        });
      }
    }

    // 2. Try fetching from the subcollection
    const subColRef = collection(db, 'users', cleanUid, 'vocabulary');
    const subSnap = await withFirestoreTimeout(getDocs(subColRef), 2500, null);
    if (subSnap && !subSnap.empty) {
      subSnap.forEach((d) => {
        const item = d.data() as StudentDictionaryEntry;
        if (item?.word) entryMap.set(item.word.toLowerCase().trim(), item);
      });
    }

    // If we have items from Firestore, return them
    if (entryMap.size > 0) {
      return Array.from(entryMap.values());
    }

    // Fallback: check email-based doc id if studentEmail is available
    if (studentEmail) {
      const emailDocId = normalizeUid(null, studentEmail);
      if (emailDocId !== cleanUid) {
        const altRef = doc(db, 'users', emailDocId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          if (Array.isArray(altData?.vocabulary)) {
            altData.vocabulary.forEach((item: StudentDictionaryEntry) => {
              if (item?.word) entryMap.set(item.word.toLowerCase().trim(), item);
            });
          }
        }
      }
    }

    return Array.from(entryMap.values());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUid}/vocabulary`);
    return [];
  }
}

/**
 * Persist student daily journal entry directly to Firestore.
 * Saves to users/{studentUID} and subcollection users/{studentUID}/journal/{entryId}.
 */
export async function saveStudentJournalEntryToFirestore(
  studentUid: string,
  entry: DailyJournalEntry,
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const cleanUid = normalizeUid(studentUid, studentEmail);

  try {
    const sanitizedEntry: DailyJournalEntry = JSON.parse(
      JSON.stringify({
        ...entry,
        studentUid: cleanUid,
        studentEmail: studentEmail || '',
        createdAt: entry.createdAt || new Date().toISOString(),
      })
    );

    // 1. Save in dedicated subcollection
    const entryRef = doc(db, 'users', cleanUid, 'journal', sanitizedEntry.id);
    await withFirestoreTimeout(setDoc(entryRef, sanitizedEntry, { merge: true }), 3000, null);

    // 2. Also retrieve and update list in user profile doc for single-fetch efficiency
    const userRef = doc(db, 'users', cleanUid);
    const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
    let existingList: DailyJournalEntry[] = [];
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      if (Array.isArray(data?.dailyJournalEntries)) {
        existingList = data.dailyJournalEntries;
      }
    }

    const filtered = existingList.filter((e) => e.id !== sanitizedEntry.id);
    const updatedList = [sanitizedEntry, ...filtered];

    await withFirestoreTimeout(
      setDoc(
        userRef,
        {
          dailyJournalEntries: updatedList,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      2500,
      null
    );

    // 3. Mirror to server backend API
    const cleanEmail = (studentEmail || '').toLowerCase().trim();
    fetch('/api/student-journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: cleanEmail,
        studentUid: cleanUid,
        entry: sanitizedEntry,
      }),
    }).catch(() => {});

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/journal/${entry.id}`);
    return false;
  }
}

/**
 * Fetch student daily journal entries directly from Firestore.
 */
export async function fetchStudentJournalFromFirestore(
  studentUid: string,
  studentEmail?: string
): Promise<DailyJournalEntry[]> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  if (!db || !cleanUid) return [];

  try {
    const journalMap = new Map<string, DailyJournalEntry>();

    // 1. Try subcollection
    const colRef = collection(db, 'users', cleanUid, 'journal');
    const colSnap = await withFirestoreTimeout(getDocs(colRef), 2500, null);
    if (colSnap && !colSnap.empty) {
      colSnap.forEach((d) => {
        const item = d.data() as DailyJournalEntry;
        if (item?.id) journalMap.set(item.id, item);
      });
    }

    // 2. Also check parent user doc
    const userRef = doc(db, 'users', cleanUid);
    const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      if (Array.isArray(data?.dailyJournalEntries)) {
        data.dailyJournalEntries.forEach((item: DailyJournalEntry) => {
          if (item?.id) journalMap.set(item.id, item);
        });
      }
    }

    // Check email doc if UID doc was empty
    if (journalMap.size === 0 && studentEmail) {
      const emailDocId = normalizeUid(null, studentEmail);
      if (emailDocId !== cleanUid) {
        const altRef = doc(db, 'users', emailDocId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          if (Array.isArray(altData?.dailyJournalEntries)) {
            altData.dailyJournalEntries.forEach((item: DailyJournalEntry) => {
              if (item?.id) journalMap.set(item.id, item);
            });
          }
        }
      }
    }

    // Sort newest first
    const list = Array.from(journalMap.values());
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUid}/journal`);
    return [];
  }
}

/**
 * Persist a scheduled Live or Trial lesson directly to Firestore.
 * Saves to root `lessons/{lessonId}` and mirrors to `users/{studentUID}/lessons/{lessonId}`.
 */
export async function saveLiveLessonToFirestore(lesson: LiveLesson): Promise<boolean> {
  const db = getDb();
  if (!db || !lesson?.id) return false;

  try {
    const sanitizedLesson: LiveLesson = JSON.parse(JSON.stringify(lesson));

    // 1. Root lessons collection
    const lessonRef = doc(db, 'lessons', sanitizedLesson.id);
    await withFirestoreTimeout(setDoc(lessonRef, sanitizedLesson, { merge: true }), 3000, null);

    // 2. Student user subcollection
    const studentUid = normalizeUid(sanitizedLesson.studentUid, sanitizedLesson.studentEmail);
    if (studentUid) {
      const userLessonRef = doc(db, 'users', studentUid, 'lessons', sanitizedLesson.id);
      await withFirestoreTimeout(setDoc(userLessonRef, sanitizedLesson, { merge: true }), 2500, null);

      // Also update lessons array on user doc
      const userRef = doc(db, 'users', studentUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        const prevLessons: LiveLesson[] = Array.isArray(data?.scheduledLessons) ? data.scheduledLessons : [];
        const filtered = prevLessons.filter((l) => l.id !== sanitizedLesson.id);
        await withFirestoreTimeout(
          setDoc(userRef, { scheduledLessons: [sanitizedLesson, ...filtered] }, { merge: true }),
          2000,
          null
        );
      }
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lessons/${lesson.id}`);
    return false;
  }
}

/**
 * Update an existing lesson in Firestore.
 */
export async function updateLiveLessonInFirestore(
  lessonId: string,
  updates: Partial<LiveLesson>,
  studentUid?: string
): Promise<boolean> {
  const db = getDb();
  if (!db || !lessonId) return false;

  try {
    const sanitized = JSON.parse(JSON.stringify(updates));
    const lessonRef = doc(db, 'lessons', lessonId);
    await withFirestoreTimeout(setDoc(lessonRef, sanitized, { merge: true }), 3000, null);

    if (studentUid) {
      const cleanUid = normalizeUid(studentUid);
      const userLessonRef = doc(db, 'users', cleanUid, 'lessons', lessonId);
      await withFirestoreTimeout(setDoc(userLessonRef, sanitized, { merge: true }), 2500, null);
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `lessons/${lessonId}`);
    return false;
  }
}

/**
 * Delete a lesson in Firestore.
 */
export async function deleteLiveLessonFromFirestore(
  lessonId: string,
  studentUid?: string
): Promise<boolean> {
  const db = getDb();
  if (!db || !lessonId) return false;

  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    await withFirestoreTimeout(deleteDoc(lessonRef), 2500, null);

    if (studentUid) {
      const cleanUid = normalizeUid(studentUid);
      const userLessonRef = doc(db, 'users', cleanUid, 'lessons', lessonId);
      await withFirestoreTimeout(deleteDoc(userLessonRef), 2000, null);
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lessons/${lessonId}`);
    return false;
  }
}

/**
 * Fetch all lessons for a student directly from Firestore.
 */
export async function fetchStudentLessonsFromFirestore(
  studentUid: string,
  studentEmail?: string
): Promise<LiveLesson[]> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  if (!db) return [];

  try {
    const lessonsMap = new Map<string, LiveLesson>();

    // 1. Query root collection by studentUid
    if (cleanUid) {
      try {
        const qUid = query(collection(db, 'lessons'), where('studentUid', '==', cleanUid));
        const snapUid = await withFirestoreTimeout(getDocs(qUid), 2500, null);
        if (snapUid && !snapUid.empty) {
          snapUid.forEach((d) => {
            const lesson = d.data() as LiveLesson;
            if (lesson?.id) lessonsMap.set(lesson.id, lesson);
          });
        }
      } catch (err) {
        // Fall back to subcollection or email query
      }
    }

    // 2. Query root collection by studentEmail
    if (cleanEmail) {
      try {
        const qEmail = query(collection(db, 'lessons'), where('studentEmail', '==', cleanEmail));
        const snapEmail = await withFirestoreTimeout(getDocs(qEmail), 2500, null);
        if (snapEmail && !snapEmail.empty) {
          snapEmail.forEach((d) => {
            const lesson = d.data() as LiveLesson;
            if (lesson?.id) lessonsMap.set(lesson.id, lesson);
          });
        }
      } catch (err) {
        // Fall back
      }
    }

    // 3. Query student's subcollection `users/{cleanUid}/lessons`
    if (cleanUid) {
      try {
        const subCol = collection(db, 'users', cleanUid, 'lessons');
        const subSnap = await withFirestoreTimeout(getDocs(subCol), 2000, null);
        if (subSnap && !subSnap.empty) {
          subSnap.forEach((d) => {
            const lesson = d.data() as LiveLesson;
            if (lesson?.id) lessonsMap.set(lesson.id, lesson);
          });
        }
      } catch (err) {
        // Ignore
      }
    }

    // 4. Query user doc scheduledLessons
    if (cleanUid) {
      try {
        const userRef = doc(db, 'users', cleanUid);
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
        if (userSnap && userSnap.exists()) {
          const data = userSnap.data();
          if (Array.isArray(data?.scheduledLessons)) {
            data.scheduledLessons.forEach((l: LiveLesson) => {
              if (l?.id) lessonsMap.set(l.id, l);
            });
          }
        }
      } catch (err) {
        // Ignore
      }
    }

    const list = Array.from(lessonsMap.values());
    list.sort((a, b) => {
      const tA = new Date(a.startDateTime).getTime();
      const tB = new Date(b.startDateTime).getTime();
      return tB - tA;
    });

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'lessons');
    return [];
  }
}

/**
 * Persist student S-Path (Gráfico S) weekly checks directly to Firestore document users/{studentUID}
 * Saves fields:
 * - weeklyChecks: Record<string, boolean>
 * - sPathChecks: Record<string, boolean>
 * - updatedAt: ISO string
 */
export async function saveStudentWeeklyChecksToFirestore(
  studentUid: string,
  checks: Record<string, boolean>,
  studentEmail?: string,
  weeklyNativeLessonsTarget?: number,
  weeklyStudyDaysTarget?: number
): Promise<boolean> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();

  try {
    const sanitizedChecks: Record<string, boolean> = JSON.parse(JSON.stringify(checks || {}));

    // 1. Direct write to Firestore document users/{studentUID}
    if (db && cleanUid) {
      const userRef = doc(db, 'users', cleanUid);
      const payload: Record<string, any> = {
        weeklyChecks: sanitizedChecks,
        sPathChecks: sanitizedChecks,
        updatedAt: new Date().toISOString(),
      };
      if (typeof weeklyNativeLessonsTarget === 'number') {
        payload.weeklyNativeLessonsTarget = weeklyNativeLessonsTarget;
      }
      if (typeof weeklyStudyDaysTarget === 'number') {
        payload.weeklyStudyDaysTarget = weeklyStudyDaysTarget;
      }

      await withFirestoreTimeout(setDoc(userRef, payload, { merge: true }), 3500, null);

      // If email differs from cleanUid, also mirror to email-based doc for multi-id lookup redundancy
      if (cleanEmail) {
        const emailDocId = normalizeUid(null, cleanEmail);
        if (emailDocId && emailDocId !== cleanUid) {
          const altRef = doc(db, 'users', emailDocId);
          await withFirestoreTimeout(
            setDoc(altRef, payload, { merge: true }),
            2000,
            null
          );
        }
      }
    }

    // 2. Mirror to backend server API for disk persistence & multi-device sync
    if (cleanEmail || cleanUid) {
      fetch('/api/routines/weekly-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: cleanEmail || cleanUid,
          studentUid: cleanUid,
          checks: sanitizedChecks,
          weeklyNativeLessonsTarget,
          weeklyStudyDaysTarget,
        }),
      }).catch(() => {});
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/weeklyChecks`);
    return false;
  }
}

/**
 * Fetch student S-Path (Gráfico S) weekly checks directly from Firestore document users/{studentUID}
 */
export async function fetchStudentWeeklyChecksFromFirestore(
  studentUid: string,
  studentEmail?: string
): Promise<{
  checks: Record<string, boolean>;
  weeklyNativeLessonsTarget?: number;
  weeklyStudyDaysTarget?: number;
}> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();

  // 1. Try reading directly from Firestore users/{studentUID}
  if (db && cleanUid) {
    try {
      const userRef = doc(db, 'users', cleanUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2500, null);
      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        if (data?.weeklyChecks || data?.sPathChecks) {
          return {
            checks: data.weeklyChecks || data.sPathChecks || {},
            weeklyNativeLessonsTarget: data.weeklyNativeLessonsTarget,
            weeklyStudyDaysTarget: data.weeklyStudyDaysTarget,
          };
        }
      }
    } catch (err) {
      console.warn('Notice fetching weeklyChecks from Firestore UID:', err);
    }
  }

  // 2. Try email-based doc fallback
  if (db && cleanEmail) {
    const emailDocId = normalizeUid(null, cleanEmail);
    if (emailDocId && emailDocId !== cleanUid) {
      try {
        const altRef = doc(db, 'users', emailDocId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          if (altData?.weeklyChecks || altData?.sPathChecks) {
            return {
              checks: altData.weeklyChecks || altData.sPathChecks || {},
              weeklyNativeLessonsTarget: altData.weeklyNativeLessonsTarget,
              weeklyStudyDaysTarget: altData.weeklyStudyDaysTarget,
            };
          }
        }
      } catch {}
    }
  }

  // 3. Fallback to server API
  if (cleanEmail) {
    try {
      const res = await fetch(
        `/api/routines/weekly-checks?studentEmail=${encodeURIComponent(cleanEmail)}`
      );
      if (res.ok) {
        const apiData = await res.json();
        return {
          checks: apiData?.checks || {},
          weeklyNativeLessonsTarget: apiData?.weeklyNativeLessonsTarget,
          weeklyStudyDaysTarget: apiData?.weeklyStudyDaysTarget,
        };
      }
    } catch {}
  }

  return { checks: {} };
}
