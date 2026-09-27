import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import {
  StudentDictionaryEntry,
  DailyJournalEntry,
  LiveLesson,
  StudentJournalEntry,
  StudentJournalActivityType,
  DayOfWeek,
  WeeklyHomeworkData,
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
 * Retrieve cached vocabulary from localStorage for immediate, non-empty rendering
 */
export function getCachedLocalVocabulary(studentUid?: string | null, studentEmail?: string | null): StudentDictionaryEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const cleanUid = studentUid?.trim();
    const cleanEmail = studentEmail?.toLowerCase().trim();
    const keysToCheck = [
      cleanUid ? `its_simple_vocabulary_${cleanUid}` : '',
      cleanEmail ? `its_simple_vocabulary_${cleanEmail}` : '',
      'its_simple_vocabulary_cached',
    ].filter(Boolean);

    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {}
  return [];
}

/**
 * Cache vocabulary in localStorage for instant retrieval across page loads and component switches
 */
export function cacheVocabularyLocally(
  studentUid?: string | null,
  studentEmail?: string | null,
  entries?: StudentDictionaryEntry[]
) {
  if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(entries)) return;
  try {
    const cleanUid = studentUid?.trim();
    const cleanEmail = studentEmail?.toLowerCase().trim();
    const jsonStr = JSON.stringify(entries);
    if (cleanUid) localStorage.setItem(`its_simple_vocabulary_${cleanUid}`, jsonStr);
    if (cleanEmail) localStorage.setItem(`its_simple_vocabulary_${cleanEmail}`, jsonStr);
    localStorage.setItem('its_simple_vocabulary_cached', jsonStr);
  } catch {}
}

/**
 * Persist student vocabulary entries directly and permanently to Cloud Firestore.
 * CUMULATIVE: Loads existing words first and merges, ensuring words accumulate permanently over time
 * and are never overwritten or cleared.
 * Stores in both users/{studentUID} (consolidated vocabulary array) and subcollection users/{studentUID}/vocabulary/{wordId}.
 */
export async function saveStudentVocabularyToFirestore(
  studentUid: string,
  entries: StudentDictionaryEntry[],
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  if (!entries || entries.length === 0) return true;

  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const emailDocId = cleanEmail ? normalizeUid(null, cleanEmail) : '';
  const hyphenDocId = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9]/g, '-') : '';

  try {
    const sanitizedEntries: StudentDictionaryEntry[] = JSON.parse(JSON.stringify(entries || []));
    const targetDocIds = Array.from(new Set([cleanUid, emailDocId, hyphenDocId].filter(Boolean)));

    // Step A: Load all existing words from local cache + Firestore to guarantee 100% accumulation
    const masterMap = new Map<string, StudentDictionaryEntry>();

    // 1. Pre-seed with local cache
    const cached = getCachedLocalVocabulary(cleanUid, cleanEmail);
    cached.forEach((item) => {
      if (item && item.word) masterMap.set(item.word.toLowerCase().trim(), item);
    });

    // 2. Fetch existing words from Firestore users doc & subcollection across all target IDs
    for (const docId of targetDocIds) {
      try {
        const userRef = doc(db, 'users', docId);
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
        if (userSnap && userSnap.exists()) {
          const data = userSnap.data();
          if (Array.isArray(data?.vocabulary)) {
            data.vocabulary.forEach((item: StudentDictionaryEntry) => {
              if (item?.word) {
                const key = item.word.toLowerCase().trim();
                masterMap.set(key, { ...(masterMap.get(key) || {}), ...item });
              }
            });
          }
        }
      } catch {}

      try {
        const subColRef = collection(db, 'users', docId, 'vocabulary');
        const subSnap = await withFirestoreTimeout(getDocs(subColRef), 2000, null);
        if (subSnap && !subSnap.empty) {
          subSnap.forEach((docItem) => {
            const item = docItem.data() as StudentDictionaryEntry;
            if (item && item.word) {
              const key = item.word.toLowerCase().trim();
              masterMap.set(key, { ...(masterMap.get(key) || {}), ...item });
            }
          });
        }
      } catch {}
    }

    // 3. Merge new entries into masterMap (accumulating, never dropping existing ones)
    sanitizedEntries.forEach((entry) => {
      if (!entry || !entry.word || !entry.word.trim()) return;
      const key = entry.word.toLowerCase().trim();
      const existing = masterMap.get(key);

      const mergedEntry: StudentDictionaryEntry = {
        id: entry.id || existing?.id || `dict_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`,
        word: entry.word.trim(),
        partOfSpeech: entry.partOfSpeech || existing?.partOfSpeech || '',
        definitionEn: entry.definitionEn || existing?.definitionEn || '',
        exampleSentenceEn: entry.exampleSentenceEn || existing?.exampleSentenceEn || '',
        translationPt: entry.translationPt || existing?.translationPt || '',
        phonetic: entry.phonetic || existing?.phonetic || '',
        sourceActivityName: entry.sourceActivityName || existing?.sourceActivityName || 'Personal Dictionary',
        sourceDay: entry.sourceDay || existing?.sourceDay,
        source: entry.source || existing?.source || 'api',
        learnedAt: entry.learnedAt || existing?.learnedAt || new Date().toISOString(),
        notFound: entry.notFound ?? existing?.notFound ?? false,
      };

      masterMap.set(key, mergedEntry);
    });

    const accumulatedList = Array.from(masterMap.values()).sort((a, b) =>
      (a.word || '').localeCompare(b.word || '', ['en', 'pt'], { sensitivity: 'base' })
    );

    // Step B: Cache accumulated list locally immediately
    cacheVocabularyLocally(cleanUid, cleanEmail, accumulatedList);

    // Step C: Write to Cloud Firestore permanently
    const writePromises: Promise<any>[] = [];

    for (const docId of targetDocIds) {
      const userRef = doc(db, 'users', docId);

      // 1. Write the consolidated accumulated list to user doc
      writePromises.push(
        setDoc(
          userRef,
          {
            vocabulary: accumulatedList,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      );

      // 2. Write each entry into subcollection users/{docId}/vocabulary/{wordDocId}
      sanitizedEntries.forEach((entry) => {
        if (!entry || !entry.word || !entry.word.trim()) return;
        const key = entry.word.toLowerCase().trim();
        const fullItem = masterMap.get(key);
        if (!fullItem) return;
        const wordDocId = key.replace(/[^a-zA-Z0-9_-]/g, '_');
        const itemRef = doc(db, 'users', docId, 'vocabulary', wordDocId);
        writePromises.push(
          setDoc(
            itemRef,
            {
              ...fullItem,
              studentUid: cleanUid,
              studentEmail: cleanEmail,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          )
        );
      });
    }

    await withFirestoreTimeout(Promise.all(writePromises), 4500, null);

    // Step D: Mirror to backend server API for disk persistence
    if (cleanEmail || cleanUid) {
      fetch('/api/student-dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: cleanEmail,
          uid: cleanUid,
          entries: accumulatedList,
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
 * Always returns accumulated words across document and subcollection,
 * pre-seeding with local cache so the dictionary never starts empty.
 */
export async function fetchStudentVocabularyFromFirestore(
  studentUid: string,
  studentEmail?: string
): Promise<StudentDictionaryEntry[]> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const emailDocId = cleanEmail ? normalizeUid(null, cleanEmail) : '';
  const hyphenDocId = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9]/g, '-') : '';

  const entryMap = new Map<string, StudentDictionaryEntry>();

  // 1. First, check local cache for immediate display
  const localCached = getCachedLocalVocabulary(cleanUid, cleanEmail);
  localCached.forEach((item) => {
    if (item && item.word) entryMap.set(item.word.toLowerCase().trim(), item);
  });

  if (!db || (!cleanUid && !cleanEmail)) {
    return Array.from(entryMap.values());
  }

  const targetDocIds = Array.from(new Set([cleanUid, emailDocId, hyphenDocId].filter(Boolean)));

  try {
    for (const docId of targetDocIds) {
      // A. Fetch from users/{docId} user profile document
      try {
        const userRef = doc(db, 'users', docId);
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2500, null);
        if (userSnap && userSnap.exists()) {
          const data = userSnap.data();
          if (Array.isArray(data?.vocabulary)) {
            data.vocabulary.forEach((item: StudentDictionaryEntry) => {
              if (item?.word) {
                const key = item.word.toLowerCase().trim();
                entryMap.set(key, { ...(entryMap.get(key) || {}), ...item });
              }
            });
          }
        }
      } catch {}

      // B. Fetch from subcollection users/{docId}/vocabulary
      try {
        const subColRef = collection(db, 'users', docId, 'vocabulary');
        const subSnap = await withFirestoreTimeout(getDocs(subColRef), 2500, null);
        if (subSnap && !subSnap.empty) {
          subSnap.forEach((docItem) => {
            const item = docItem.data() as StudentDictionaryEntry;
            if (item && item.word) {
              const key = item.word.toLowerCase().trim();
              entryMap.set(key, { ...(entryMap.get(key) || {}), ...item });
            }
          });
        }
      } catch {}
    }

    const result = Array.from(entryMap.values()).sort((a, b) =>
      (a.word || '').localeCompare(b.word || '', ['en', 'pt'], { sensitivity: 'base' })
    );

    if (result.length > 0) {
      cacheVocabularyLocally(cleanUid, cleanEmail, result);
    }

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUid}/vocabulary`);
    return Array.from(entryMap.values());
  }
}

/**
 * Real-time subscription to student vocabulary on Firestore.
 * Immediately notifies when any word is added by student, teacher, or routine.
 */
export function subscribeToStudentVocabulary(
  studentUid: string,
  studentEmail: string | undefined,
  callback: (entries: StudentDictionaryEntry[]) => void
): () => void {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const emailDocId = cleanEmail ? normalizeUid(null, cleanEmail) : '';

  if (!db || (!cleanUid && !cleanEmail)) {
    return () => {};
  }

  const activeDocId = cleanUid || emailDocId;
  const vocabColRef = collection(db, 'users', activeDocId, 'vocabulary');
  const userDocRef = doc(db, 'users', activeDocId);

  const accumulatedMap = new Map<string, StudentDictionaryEntry>();
  // Seed with current cache
  getCachedLocalVocabulary(cleanUid, cleanEmail).forEach((item) => {
    if (item && item.word) accumulatedMap.set(item.word.toLowerCase().trim(), item);
  });

  const notify = () => {
    const list = Array.from(accumulatedMap.values()).sort((a, b) =>
      (a.word || '').localeCompare(b.word || '', ['en', 'pt'], { sensitivity: 'base' })
    );
    if (list.length > 0) {
      cacheVocabularyLocally(cleanUid, cleanEmail, list);
      callback(list);
    }
  };

  // Subcollection listener
  const unsubCol = onSnapshot(
    vocabColRef,
    (snapshot) => {
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          const item = d.data() as StudentDictionaryEntry;
          if (item && item.word) {
            const key = item.word.toLowerCase().trim();
            accumulatedMap.set(key, { ...(accumulatedMap.get(key) || {}), ...item });
          }
        });
        notify();
      }
    },
    (err) => {
      console.warn('Real-time vocabulary subcollection notice:', err);
    }
  );

  // User document listener
  const unsubDoc = onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.vocabulary)) {
          data.vocabulary.forEach((item: StudentDictionaryEntry) => {
            if (item && item.word) {
              const key = item.word.toLowerCase().trim();
              accumulatedMap.set(key, { ...(accumulatedMap.get(key) || {}), ...item });
            }
          });
          notify();
        }
      }
    },
    (err) => {
      console.warn('Real-time vocabulary user doc notice:', err);
    }
  );

  return () => {
    unsubCol();
    unsubDoc();
  };
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

/**
 * Helper to get the current date in YYYY-MM-DD format
 */
export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculates the calendar date (YYYY-MM-DD) for a specific day of the week in the current week.
 * Reference week starts Monday (index 0) and ends Sunday (index 6).
 */
export function getDateForDayInCurrentWeek(targetDay: DayOfWeek, refDate: Date = new Date()): string {
  const dayIndexMap: Record<DayOfWeek, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };
  const currentDayIndex = refDate.getDay(); // 0 is Sunday, 1 is Monday...
  const targetDayIndex = dayIndexMap[targetDay];

  // In Monday-first week: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
  const currentMonFirst = (currentDayIndex + 6) % 7;
  const targetMonFirst = (targetDayIndex + 6) % 7;
  const diffDays = targetMonFirst - currentMonFirst;

  const targetDate = new Date(refDate);
  targetDate.setDate(refDate.getDate() + diffDays);
  return targetDate.toISOString().split('T')[0];
}

/**
 * Maps a routine row stepId to its corresponding StudentJournalActivityType
 */
export function mapStepIdToJournalType(
  stepId: 'video_day' | 'audio_day' | 'tutor_live' | 'memorization' | string
): StudentJournalActivityType {
  switch (stepId) {
    case 'video_day':
    case 'video':
      return 'video';
    case 'audio_day':
    case 'audio':
      return 'audio';
    case 'tutor_live':
    case 'lesson':
    case 'live_lesson':
      return 'lesson';
    case 'memorization':
      return 'memorization';
    default:
      return 'video';
  }
}

/**
 * Maps StudentJournalActivityType to routine stepId
 */
export function mapJournalTypeToStepId(
  type: StudentJournalActivityType
): 'video_day' | 'audio_day' | 'tutor_live' | 'memorization' {
  switch (type) {
    case 'video':
      return 'video_day';
    case 'audio':
      return 'audio_day';
    case 'lesson':
      return 'tutor_live';
    case 'memorization':
      return 'memorization';
  }
}

/**
 * Derives the weeklyChecks map (e.g. video_day_thursday: true) from studentJournal records for the given week.
 */
export function deriveWeeklyChecksFromJournal(
  journal: StudentJournalEntry[],
  targetWeek?: number
): Record<string, boolean> {
  const checks: Record<string, boolean> = {};
  if (!Array.isArray(journal)) return checks;

  journal.forEach((entry) => {
    if (!entry || !entry.type) return;
    if (targetWeek !== undefined && entry.week !== undefined && entry.week !== targetWeek) {
      return;
    }
    const stepId = mapJournalTypeToStepId(entry.type);
    if (entry.dayOfWeek) {
      checks[`${stepId}_${entry.dayOfWeek}`] = true;
    }
  });

  return checks;
}

/**
 * Persist an activity record directly to the student profile document: users/{studentUID}
 * Maintains an array and subcollection `studentJournal`.
 * Each completed activity record saves: { id, type, date, week, timestamp, dayOfWeek, ... }
 */
export async function recordActivityInStudentJournal(
  studentUid: string,
  entry: StudentJournalEntry,
  studentEmail?: string
): Promise<{ success: boolean; updatedJournal: StudentJournalEntry[] }> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();

  const sanitizedEntry: StudentJournalEntry = {
    id: String(entry.id || `${entry.type}_${entry.dayOfWeek || 'any'}_${Date.now()}`).trim(),
    type: entry.type,
    date: entry.date || getTodayIsoDate(),
    week: Number(entry.week) || 1,
    timestamp: Number(entry.timestamp) || Date.now(),
    dayOfWeek: entry.dayOfWeek,
    title: entry.title ? String(entry.title).trim() : undefined,
    artist: entry.artist ? String(entry.artist).trim() : undefined,
    partNumber: entry.partNumber !== undefined ? Number(entry.partNumber) : undefined,
    url: entry.url ? String(entry.url).trim() : undefined,
    details: entry.details ? String(entry.details).trim() : undefined,
    studentUid: cleanUid,
    studentEmail: cleanEmail,
  };

  try {
    let existingJournal: StudentJournalEntry[] = [];

    // 1. Fetch current user document
    if (db && cleanUid) {
      const userRef = doc(db, 'users', cleanUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        if (Array.isArray(data?.studentJournal)) {
          existingJournal = data.studentJournal;
        }
      }

      // Check if entry for same type + dayOfWeek + week already exists, or same id
      const filtered = existingJournal.filter((e) => {
        if (!e) return false;
        if (e.id && e.id === sanitizedEntry.id) return false;
        if (
          e.type === sanitizedEntry.type &&
          e.week === sanitizedEntry.week &&
          e.dayOfWeek &&
          sanitizedEntry.dayOfWeek &&
          e.dayOfWeek === sanitizedEntry.dayOfWeek
        ) {
          return false;
        }
        return true;
      });

      const updatedJournal = [sanitizedEntry, ...filtered];

      // Prepare updated weeklyChecks and watched/listened arrays for complete cross-compatibility
      const stepId = mapJournalTypeToStepId(sanitizedEntry.type);
      const checkKey = sanitizedEntry.dayOfWeek ? `${stepId}_${sanitizedEntry.dayOfWeek}` : null;
      const currentChecks = userSnap?.exists() ? (userSnap.data()?.weeklyChecks || {}) : {};
      const updatedChecks = checkKey ? { ...currentChecks, [checkKey]: true } : currentChecks;

      const payload: Record<string, any> = {
        studentJournal: updatedJournal,
        weeklyChecks: updatedChecks,
        sPathChecks: updatedChecks,
        updatedAt: new Date().toISOString(),
      };

      if (sanitizedEntry.type === 'video' && sanitizedEntry.id) {
        const curWatched = userSnap?.exists() ? (userSnap.data()?.watchedVideosHistory || []) : [];
        if (!curWatched.includes(sanitizedEntry.id)) {
          payload.watchedVideosHistory = [...curWatched, sanitizedEntry.id];
        }
      } else if (sanitizedEntry.type === 'audio' && sanitizedEntry.id) {
        const curListened = userSnap?.exists() ? (userSnap.data()?.listenedTracksHistory || []) : [];
        const exists = curListened.some((t: any) =>
          typeof t === 'string' ? t === sanitizedEntry.id : t?.id === sanitizedEntry.id || t?.trackId === sanitizedEntry.id
        );
        if (!exists) {
          payload.listenedTracksHistory = [
            ...curListened,
            { id: sanitizedEntry.id, trackId: sanitizedEntry.id, title: sanitizedEntry.title || '', artist: sanitizedEntry.artist || '' },
          ];
        }
      }

      // Direct write to users/{cleanUid}
      await withFirestoreTimeout(setDoc(userRef, payload, { merge: true }), 3500, null);

      // Write discrete entry to subcollection users/{cleanUid}/studentJournal/{entryId}
      const entryRef = doc(db, 'users', cleanUid, 'studentJournal', sanitizedEntry.id);
      await withFirestoreTimeout(setDoc(entryRef, sanitizedEntry, { merge: true }), 2000, null);

      // Also mirror to emailDocId if different for dual-device lookup resilience
      if (cleanEmail) {
        const emailDocId = normalizeUid(null, cleanEmail);
        if (emailDocId && emailDocId !== cleanUid) {
          const altRef = doc(db, 'users', emailDocId);
          await withFirestoreTimeout(setDoc(altRef, payload, { merge: true }), 2000, null);
        }
      }

      // Mirror to server backend API
      fetch('/api/student-journal/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUid: cleanUid,
          studentEmail: cleanEmail,
          entry: sanitizedEntry,
        }),
      }).catch(() => {});

      return { success: true, updatedJournal };
    }

    return { success: false, updatedJournal: [sanitizedEntry] };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/studentJournal`);
    return { success: false, updatedJournal: [sanitizedEntry] };
  }
}

/**
 * Remove an activity record from studentJournal (e.g. when unchecking an activity circle)
 */
export async function removeActivityFromStudentJournal(
  studentUid: string,
  type: StudentJournalActivityType,
  dayOfWeek: DayOfWeek,
  week: number,
  studentEmail?: string
): Promise<{ success: boolean; updatedJournal: StudentJournalEntry[] }> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();

  try {
    let updatedJournal: StudentJournalEntry[] = [];
    if (db && cleanUid) {
      const userRef = doc(db, 'users', cleanUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        const curJournal: StudentJournalEntry[] = Array.isArray(data?.studentJournal) ? data.studentJournal : [];
        const toDelete: StudentJournalEntry[] = [];

        updatedJournal = curJournal.filter((e) => {
          if (e.type === type && e.week === week && e.dayOfWeek === dayOfWeek) {
            toDelete.push(e);
            return false;
          }
          return true;
        });

        const stepId = mapJournalTypeToStepId(type);
        const checkKey = `${stepId}_${dayOfWeek}`;
        const curChecks = data.weeklyChecks || {};
        const updatedChecks = { ...curChecks, [checkKey]: false };

        const payload: Record<string, any> = {
          studentJournal: updatedJournal,
          weeklyChecks: updatedChecks,
          sPathChecks: updatedChecks,
          updatedAt: new Date().toISOString(),
        };

        await withFirestoreTimeout(setDoc(userRef, payload, { merge: true }), 3000, null);

        // Delete from subcollection
        for (const item of toDelete) {
          if (item?.id) {
            const subRef = doc(db, 'users', cleanUid, 'studentJournal', item.id);
            await withFirestoreTimeout(deleteDoc(subRef), 1500, null);
          }
        }

        // Email doc mirror
        if (cleanEmail) {
          const emailDocId = normalizeUid(null, cleanEmail);
          if (emailDocId && emailDocId !== cleanUid) {
            const altRef = doc(db, 'users', emailDocId);
            await withFirestoreTimeout(setDoc(altRef, payload, { merge: true }), 2000, null);
          }
        }

        // Mirror delete to server
        fetch('/api/student-journal/activity', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentUid: cleanUid,
            studentEmail: cleanEmail,
            type,
            dayOfWeek,
            week,
          }),
        }).catch(() => {});

        return { success: true, updatedJournal };
      }
    }
    return { success: false, updatedJournal: [] };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/studentJournal/remove`);
    return { success: false, updatedJournal: [] };
  }
}

/**
 * Fetch the complete studentJournal array from Firestore users/{studentUID}
 */
export async function fetchStudentJournalActivitiesFromFirestore(
  studentUid: string,
  studentEmail?: string
): Promise<StudentJournalEntry[]> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  if (!db || !cleanUid) return [];

  try {
    const journalMap = new Map<string, StudentJournalEntry>();

    // 1. Direct fetch from users/{cleanUid} document
    const userRef = doc(db, 'users', cleanUid);
    const userSnap = await withFirestoreTimeout(getDoc(userRef), 2500, null);
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      if (Array.isArray(data?.studentJournal)) {
        data.studentJournal.forEach((entry: StudentJournalEntry) => {
          if (entry && entry.id) journalMap.set(entry.id, entry);
        });
      }
    }

    // 2. Fetch from subcollection users/{cleanUid}/studentJournal
    const subColRef = collection(db, 'users', cleanUid, 'studentJournal');
    const subSnap = await withFirestoreTimeout(getDocs(subColRef), 2000, null);
    if (subSnap && !subSnap.empty) {
      subSnap.forEach((d) => {
        const entry = d.data() as StudentJournalEntry;
        if (entry && entry.id && !journalMap.has(entry.id)) {
          journalMap.set(entry.id, entry);
        }
      });
    }

    // 3. Fallback: check email doc if different
    if (journalMap.size === 0 && cleanEmail) {
      const emailDocId = normalizeUid(null, cleanEmail);
      if (emailDocId !== cleanUid) {
        const altRef = doc(db, 'users', emailDocId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          if (Array.isArray(altData?.studentJournal)) {
            altData.studentJournal.forEach((entry: StudentJournalEntry) => {
              if (entry && entry.id) journalMap.set(entry.id, entry);
            });
          }
        }
      }
    }

    // 4. Server API fallback if still empty
    if (journalMap.size === 0 && (cleanEmail || cleanUid)) {
      try {
        const res = await fetch(
          `/api/student-journal/activity?studentEmail=${encodeURIComponent(cleanEmail)}&studentUid=${encodeURIComponent(cleanUid)}`
        );
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData?.entries)) {
            apiData.entries.forEach((e: StudentJournalEntry) => {
              if (e && e.id) journalMap.set(e.id, e);
            });
          }
        }
      } catch {}
    }

    const list = Array.from(journalMap.values());
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUid}/studentJournal`);
    return [];
  }
}

/**
 * Real-time subscription to studentJournal on users/{studentUID}
 * Ensures instantaneous cross-device synchronization between mobile and desktop!
 */
export function subscribeToStudentJournal(
  studentUid: string,
  studentEmail: string | undefined,
  callback: (journal: StudentJournalEntry[]) => void
): () => void {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  if (!db || !cleanUid) {
    return () => {};
  }

  const userRef = doc(db, 'users', cleanUid);
  const unsubscribe = onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.studentJournal)) {
          const entries = [...data.studentJournal];
          entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          callback(entries);
        }
      }
    },
    (err) => {
      console.warn('Real-time notice for studentJournal listener:', err);
    }
  );

  return unsubscribe;
}

/**
 * Persist student weekly homework and activity progress directly to Cloud Firestore.
 * Saves to:
 * 1. users/{studentUID}/homework/{weekId}
 * 2. users/{studentUID} (field: weeklyHomework)
 * 3. top-level student_homework/{studentUID} for fast cross-device queries
 * 4. Mirrors to /api/homework with studentEmail and uid
 */
export async function saveStudentHomeworkProgressToFirestore(
  studentUid: string,
  studentEmail: string | undefined,
  homework: WeeklyHomeworkData,
  weekId: string = 'current_week'
): Promise<boolean> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();

  if (!homework) return false;

  try {
    const sanitizedHomework = JSON.parse(JSON.stringify(homework));
    const payload = {
      ...sanitizedHomework,
      id: weekId,
      studentUid: cleanUid,
      studentEmail: cleanEmail,
      updatedAt: new Date().toISOString(),
    };

    if (db && cleanUid) {
      // 1. Save directly to subcollection users/{cleanUid}/homework/{weekId}
      const hwDocRef = doc(db, 'users', cleanUid, 'homework', weekId);
      await withFirestoreTimeout(
        setDoc(hwDocRef, payload, { merge: true }),
        3500,
        null
      );

      // 2. Also save to user profile doc for unified profile payload
      const userRef = doc(db, 'users', cleanUid);
      await withFirestoreTimeout(
        setDoc(userRef, { weeklyHomework: payload, updatedAt: new Date().toISOString() }, { merge: true }),
        3000,
        null
      );

      // 3. Top-level student_homework partition for cross-device synchronization
      const topLevelRef = doc(db, 'student_homework', cleanUid);
      await withFirestoreTimeout(
        setDoc(topLevelRef, payload, { merge: true }),
        3000,
        null
      );

      // 4. Redundant mirror if email differs
      if (cleanEmail) {
        const emailDocId = normalizeUid(null, cleanEmail);
        if (emailDocId && emailDocId !== cleanUid) {
          const altDocRef = doc(db, 'users', emailDocId, 'homework', weekId);
          await withFirestoreTimeout(setDoc(altDocRef, payload, { merge: true }), 2000, null);
        }
      }
    }

    // 5. Mirror to server API for backup persistence
    if (cleanEmail || cleanUid) {
      fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: cleanEmail,
          uid: cleanUid,
          weeklyHomework: sanitizedHomework,
        }),
      }).catch(() => {});
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/homework/${weekId}`);
    return false;
  }
}

/**
 * Fetch student weekly homework and activity progress directly from Cloud Firestore.
 * Prioritizes Firestore users/{cleanUid}/homework/{weekId}, then users/{cleanUid}.weeklyHomework,
 * then top-level student_homework/{cleanUid}, with fallbacks to alternate email IDs and server API.
 */
export async function fetchStudentHomeworkProgressFromFirestore(
  studentUid: string,
  studentEmail?: string,
  weekId: string = 'current_week'
): Promise<WeeklyHomeworkData | null> {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();

  if (!db || !cleanUid) return null;

  try {
    // 1. Fetch from subcollection users/{cleanUid}/homework/{weekId}
    const hwDocRef = doc(db, 'users', cleanUid, 'homework', weekId);
    const hwSnap = await withFirestoreTimeout(getDoc(hwDocRef), 2500, null);
    if (hwSnap && hwSnap.exists()) {
      const data = hwSnap.data();
      if (data && (data.completedPartsByDay || data.studentAnswers || data.matchingPairs)) {
        return data as WeeklyHomeworkData;
      }
    }

    // 2. Fetch from users/{cleanUid} document
    const userRef = doc(db, 'users', cleanUid);
    const userSnap = await withFirestoreTimeout(getDoc(userRef), 2500, null);
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      if (data?.weeklyHomework && (data.weeklyHomework.completedPartsByDay || data.weeklyHomework.studentAnswers)) {
        return data.weeklyHomework as WeeklyHomeworkData;
      }
    }

    // 3. Fetch from top-level student_homework/{cleanUid}
    const topRef = doc(db, 'student_homework', cleanUid);
    const topSnap = await withFirestoreTimeout(getDoc(topRef), 2000, null);
    if (topSnap && topSnap.exists()) {
      const data = topSnap.data();
      if (data && (data.completedPartsByDay || data.studentAnswers || data.matchingPairs)) {
        return data as WeeklyHomeworkData;
      }
    }

    // 4. Fallback: check email doc if different
    if (cleanEmail) {
      const emailDocId = normalizeUid(null, cleanEmail);
      if (emailDocId && emailDocId !== cleanUid) {
        const altRef = doc(db, 'users', emailDocId, 'homework', weekId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const data = altSnap.data();
          if (data && (data.completedPartsByDay || data.studentAnswers)) {
            return data as WeeklyHomeworkData;
          }
        }
      }
    }

    // 5. Server API fallback
    if (cleanEmail || cleanUid) {
      try {
        const res = await fetch(`/api/homework?studentEmail=${encodeURIComponent(cleanEmail)}&uid=${encodeURIComponent(cleanUid)}`);
        if (res.ok) {
          const apiData = await res.json();
          if (apiData && (apiData.completedPartsByDay || apiData.studentAnswers)) {
            return apiData as WeeklyHomeworkData;
          }
        }
      } catch {}
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUid}/homework/${weekId}`);
    return null;
  }
}

/**
 * Real-time subscription to student homework on Cloud Firestore.
 * Enables instant cross-device synchronization between PC, tablet, and mobile!
 */
export function subscribeToStudentHomeworkProgress(
  studentUid: string,
  studentEmail: string | undefined,
  callback: (homework: WeeklyHomeworkData) => void,
  weekId: string = 'current_week'
): () => void {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid, studentEmail);
  if (!db || !cleanUid) {
    return () => {};
  }

  const hwDocRef = doc(db, 'users', cleanUid, 'homework', weekId);
  const unsubscribe = onSnapshot(
    hwDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && (data.completedPartsByDay || data.studentAnswers || data.matchingPairs)) {
          callback(data as WeeklyHomeworkData);
        }
      }
    },
    (err) => {
      console.warn('Real-time notice for student homework listener:', err);
    }
  );

  return unsubscribe;
}


