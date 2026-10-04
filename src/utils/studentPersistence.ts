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
  runTransaction,
} from 'firebase/firestore';
import { getDb, auth } from '../firebase';
import {
  StudentDictionaryEntry,
  DailyJournalEntry,
  LiveLesson,
  StudentJournalEntry,
  StudentJournalActivityType,
  DayOfWeek,
  WeeklyHomeworkData,
  UserProfile,
  NativeFriendTutor,
} from '../types';
import { handleFirestoreError, OperationType, withFirestoreTimeout } from './routineSync';
import { DAYS_OF_WEEK, getTodayDayOfWeek } from './notifications';
import {
  assertSafeFirestoreWrite,
  validateFirestoreDocument,
  stampSchemaVersion,
  CURRENT_SCHEMA_VERSION,
  migrateLegacyLocalStorageToFirestore,
} from './firestoreSchemaValidator';

// Pure in-memory session caches to provide instant zero-delay UI rendering during active session
// ZERO dependency on localStorage: 100% of persistent data is stored in Cloud Firestore
const inMemoryVocabularyCache = new Map<string, StudentDictionaryEntry[]>();
const inMemoryWeeklyChecksCache = new Map<string, Record<string, boolean>>();

export { migrateLegacyLocalStorageToFirestore };

export function normalizeUid(rawId?: string | null, email?: string | null): string {
  const cleanRawId = (rawId || '').trim();
  const rawIsEmail = cleanRawId.includes('@');

  // 1. Single source of truth: ALWAYS prioritize Firebase Auth UID (auth.currentUser.uid)
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  // 2. If a valid, non-placeholder, non-email UID was provided, use it
  if (
    cleanRawId &&
    !rawIsEmail &&
    !cleanRawId.startsWith('usr-') &&
    cleanRawId !== 'user-default' &&
    cleanRawId !== 'anonymous_student' &&
    cleanRawId !== 'undefined' &&
    cleanRawId !== 'null'
  ) {
    return cleanRawId;
  }

  // Never fall back to email as document ID in Firestore
  return cleanRawId && !rawIsEmail ? cleanRawId : '';
}

export function getUserDocIds(rawId?: string | null, email?: string | null): string[] {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanUid = normalizeUid(rawId, cleanEmail);
  const rawClean = (rawId || '').trim();
  const emailUnderscore = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
  const emailHyphen = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9]/g, '-') : '';
  const emailUsr = cleanEmail ? `usr-${emailHyphen}` : '';

  return Array.from(
    new Set([cleanUid, rawClean, emailUnderscore, emailHyphen, emailUsr, cleanEmail].filter(Boolean))
  );
}

/**
 * Retrieve cached vocabulary from in-memory session cache for immediate, non-empty rendering.
 * ZERO localStorage dependency: 100% backed permanently by Cloud Firestore.
 */
export function getCachedLocalVocabulary(studentUid?: string | null, studentEmail?: string | null): StudentDictionaryEntry[] {
  const cleanUid = studentUid?.trim();
  const cleanEmail = studentEmail?.toLowerCase().trim();
  if (cleanUid && inMemoryVocabularyCache.has(cleanUid)) {
    return inMemoryVocabularyCache.get(cleanUid) || [];
  }
  if (cleanEmail && inMemoryVocabularyCache.has(cleanEmail)) {
    return inMemoryVocabularyCache.get(cleanEmail) || [];
  }
  return [];
}

/**
 * Retrieve cached weekly checks from in-memory session cache for instant, non-flickering checkmarks.
 * ZERO localStorage dependency: 100% backed permanently by Cloud Firestore.
 */
export function getCachedWeeklyChecks(studentUid?: string | null, studentEmail?: string | null): Record<string, boolean> {
  const cleanUid = studentUid?.trim();
  const cleanEmail = studentEmail?.toLowerCase().trim();
  if (cleanUid && inMemoryWeeklyChecksCache.has(cleanUid)) {
    return inMemoryWeeklyChecksCache.get(cleanUid) || {};
  }
  if (cleanEmail && inMemoryWeeklyChecksCache.has(cleanEmail)) {
    return inMemoryWeeklyChecksCache.get(cleanEmail) || {};
  }
  return {};
}

/**
 * Cache weekly checks in in-memory session cache for instant active session reflection.
 * Never touches browser localStorage; Firestore users/{studentUID} is the exclusive master.
 */
export function cacheWeeklyChecksLocally(
  studentUid?: string | null,
  studentEmail?: string | null,
  checks?: Record<string, boolean>
) {
  if (!checks) return;
  const cleanUid = studentUid?.trim();
  const cleanEmail = studentEmail?.toLowerCase().trim();
  if (cleanUid) inMemoryWeeklyChecksCache.set(cleanUid, checks);
  if (cleanEmail) inMemoryWeeklyChecksCache.set(cleanEmail, checks);
}

/**
 * Cache vocabulary in in-memory session cache for instant retrieval across component switches.
 * Never touches browser localStorage; Firestore users/{studentUID}/vocabulary is the exclusive master.
 */
export function cacheVocabularyLocally(
  studentUid?: string | null,
  studentEmail?: string | null,
  entries?: StudentDictionaryEntry[]
) {
  if (!Array.isArray(entries)) return;
  const cleanUid = studentUid?.trim();
  const cleanEmail = studentEmail?.toLowerCase().trim();
  if (cleanUid) inMemoryVocabularyCache.set(cleanUid, entries);
  if (cleanEmail) inMemoryVocabularyCache.set(cleanEmail, entries);
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

  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!cleanUid) return false;

  try {
    const sanitizedEntries: StudentDictionaryEntry[] = JSON.parse(JSON.stringify(entries || []));
    const masterMap = new Map<string, StudentDictionaryEntry>();

    // 1. Seed masterMap with local cache first to ensure zero data loss during network latency
    const cached = getCachedLocalVocabulary(cleanUid, cleanEmail);
    cached.forEach((item) => {
      if (item?.word) {
        const key = item.word.toLowerCase().trim();
        masterMap.set(key, item);
      }
    });

    // 2. Load existing words from Firestore users/{cleanUid} & subcollection (authoritative)
    try {
      const userRef = doc(db, 'users', cleanUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 4000, null);
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
      const subColRef = collection(db, 'users', cleanUid, 'vocabulary');
      const subSnap = await withFirestoreTimeout(getDocs(subColRef), 4000, null);
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

    // 3. Check legacy doc IDs if masterMap is still small or for accounts migrated from email
    const allDocIds = getUserDocIds(cleanUid, cleanEmail);
    for (const altId of allDocIds) {
      if (altId === cleanUid) continue;
      try {
        const altRef = doc(db, 'users', altId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          if (Array.isArray(altData?.vocabulary)) {
            altData.vocabulary.forEach((item: StudentDictionaryEntry) => {
              if (item?.word) {
                const key = item.word.toLowerCase().trim();
                if (!masterMap.has(key)) {
                  masterMap.set(key, item);
                }
              }
            });
          }
        }
      } catch {}
    }

    // 4. Merge new entries into masterMap (strictly accumulating, never dropping existing ones)
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
        cefrLevel: entry.cefrLevel || existing?.cefrLevel || '',
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

    // Cache accumulated list locally immediately
    cacheVocabularyLocally(cleanUid, cleanEmail, accumulatedList);

    // Write strictly to Cloud Firestore users/{cleanUid} with accumulatedList and schema validation
    const userPayload = stampSchemaVersion({
      vocabulary: accumulatedList,
      updatedAt: new Date().toISOString(),
    });
    assertSafeFirestoreWrite(`users/${cleanUid}`, userPayload, undefined, true);

    const userRef = doc(db, 'users', cleanUid);
    const writePromises: Promise<any>[] = [
      setDoc(userRef, userPayload, { merge: true }),
    ];

    // Write individual entries to subcollection users/{cleanUid}/vocabulary/{wordDocId}
    sanitizedEntries.forEach((entry) => {
      if (!entry || !entry.word || !entry.word.trim()) return;
      const key = entry.word.toLowerCase().trim();
      const fullItem = masterMap.get(key);
      if (!fullItem) return;
      const wordDocId = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const itemRef = doc(db, 'users', cleanUid, 'vocabulary', wordDocId);
      const wordPayload = stampSchemaVersion({
        ...fullItem,
        studentUid: cleanUid,
        studentEmail: cleanEmail,
        updatedAt: new Date().toISOString(),
      });
      assertSafeFirestoreWrite(`users/${cleanUid}/vocabulary/${wordDocId}`, wordPayload, undefined, true);
      writePromises.push(
        setDoc(itemRef, wordPayload, { merge: true })
      );
    });

    await withFirestoreTimeout(Promise.all(writePromises), 6000, null);

    // Mirror to backend server API for disk persistence
    if (cleanEmail || cleanUid) {
      fetch('/api/student-dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: cleanEmail,
          studentUid: cleanUid,
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
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);

  if (!db || !cleanUid) {
    return getCachedLocalVocabulary(cleanUid, cleanEmail);
  }

  const entryMap = new Map<string, StudentDictionaryEntry>();

  // A. Pre-populate from local cache so we never start empty
  const localCache = getCachedLocalVocabulary(cleanUid, cleanEmail);
  localCache.forEach((item) => {
    if (item?.word) entryMap.set(item.word.toLowerCase().trim(), item);
  });

  try {
    // 1. Fetch from users/{cleanUid} user profile document
    try {
      const userRef = doc(db, 'users', cleanUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 4000, null);
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

    // 2. Fetch from subcollection users/{cleanUid}/vocabulary
    try {
      const subColRef = collection(db, 'users', cleanUid, 'vocabulary');
      const subSnap = await withFirestoreTimeout(getDocs(subColRef), 4000, null);
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

    // 3. Fallback to legacy document IDs if cleanUid had no words
    if (entryMap.size === 0) {
      const allDocIds = getUserDocIds(cleanUid, cleanEmail);
      for (const altId of allDocIds) {
        if (altId === cleanUid) continue;
        try {
          const altRef = doc(db, 'users', altId);
          const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
          if (altSnap && altSnap.exists()) {
            const altData = altSnap.data();
            if (Array.isArray(altData?.vocabulary) && altData.vocabulary.length > 0) {
              altData.vocabulary.forEach((item: StudentDictionaryEntry) => {
                if (item?.word) entryMap.set(item.word.toLowerCase().trim(), item);
              });
              // Migrate to cleanUid
              setDoc(doc(db, 'users', cleanUid), { vocabulary: altData.vocabulary, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
              break;
            }
          }
        } catch {}
      }
    }

    const result = Array.from(entryMap.values()).sort((a, b) =>
      (a.word || '').localeCompare(b.word || '', ['en', 'pt'], { sensitivity: 'base' })
    );

    // CRITICAL: Only cache if we actually have words - NEVER wipe local cache with empty result!
    if (result.length > 0) {
      cacheVocabularyLocally(cleanUid, cleanEmail, result);
    }

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUid}/vocabulary`);
    return getCachedLocalVocabulary(cleanUid, cleanEmail);
  }
}

/**
 * Delete a student vocabulary entry directly from Cloud Firestore and clean up local cache.
 */
export async function deleteStudentVocabularyFromFirestore(
  studentUid: string,
  word: string,
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db || !word) return false;
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!cleanUid) return false;

  const cleanWord = word.trim().toLowerCase();
  const wordDocId = cleanWord.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    // 1. Delete from subcollection by predictable wordDocId
    const itemRef = doc(db, 'users', cleanUid, 'vocabulary', wordDocId);
    await withFirestoreTimeout(deleteDoc(itemRef), 3000, null);

    // Also remove any documents in the subcollection where word matches cleanWord
    try {
      const subCol = collection(db, 'users', cleanUid, 'vocabulary');
      const subSnap = await withFirestoreTimeout(getDocs(subCol), 2500, null);
      if (subSnap && !subSnap.empty) {
        for (const docItem of subSnap.docs) {
          const itemData = docItem.data();
          if ((itemData?.word || '').trim().toLowerCase() === cleanWord) {
            await deleteDoc(docItem.ref).catch(() => {});
          }
        }
      }
    } catch {}

    // 2. Remove from users/{cleanUid}.vocabulary array
    const userRef = doc(db, 'users', cleanUid);
    const snap = await withFirestoreTimeout(getDoc(userRef), 2500, null);
    if (snap && snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.vocabulary)) {
        const filtered = data.vocabulary.filter(
          (item: StudentDictionaryEntry) => (item?.word || '').trim().toLowerCase() !== cleanWord
        );
        await withFirestoreTimeout(
          setDoc(userRef, { vocabulary: filtered, updatedAt: new Date().toISOString() }, { merge: true }),
          3000,
          null
        );
        cacheVocabularyLocally(cleanUid, cleanEmail, filtered);
      }
    }

    // Also remove from any legacy doc IDs
    const allDocIds = getUserDocIds(cleanUid, cleanEmail);
    for (const altId of allDocIds) {
      if (altId === cleanUid) continue;
      try {
        const altRef = doc(db, 'users', altId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          if (Array.isArray(altData?.vocabulary)) {
            const filtered = altData.vocabulary.filter(
              (item: StudentDictionaryEntry) => (item?.word || '').trim().toLowerCase() !== cleanWord
            );
            await setDoc(altRef, { vocabulary: filtered, updatedAt: new Date().toISOString() }, { merge: true });
          }
        }
      } catch {}
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${cleanUid}/vocabulary/${wordDocId}`);
    return false;
  }
}

/**
 * Real-time subscription to student vocabulary on Firestore.
 * Immediately notifies when any word is added, updated, or removed by student, teacher, or routine across devices.
 * Firestore is the single authoritative source of truth.
 */
export function subscribeToStudentVocabulary(
  studentUid: string,
  studentEmail: string | undefined,
  callback: (entries: StudentDictionaryEntry[]) => void
): () => void {
  const db = getDb();
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);

  if (!db || !cleanUid) {
    return () => {};
  }

  const vocabColRef = collection(db, 'users', cleanUid, 'vocabulary');
  const userDocRef = doc(db, 'users', cleanUid);

  let docVocab: StudentDictionaryEntry[] = [];
  const colMap = new Map<string, StudentDictionaryEntry>();
  let hasReceivedSnapshot = false;

  const notify = () => {
    const mergedMap = new Map<string, StudentDictionaryEntry>();

    // Pre-populate with local cache if we haven't received remote data yet
    if (!hasReceivedSnapshot) {
      const cached = getCachedLocalVocabulary(cleanUid, cleanEmail);
      cached.forEach((item) => {
        if (item && item.word) {
          mergedMap.set(item.word.toLowerCase().trim(), item);
        }
      });
    }

    // Authoritative userDocRef vocabulary array
    docVocab.forEach((item) => {
      if (item && item.word) {
        mergedMap.set(item.word.toLowerCase().trim(), item);
      }
    });

    // Subcollection items
    colMap.forEach((item, key) => {
      if (!mergedMap.has(key)) {
        mergedMap.set(key, item);
      }
    });

    const list = Array.from(mergedMap.values()).sort((a, b) =>
      (a.word || '').localeCompare(b.word || '', ['en', 'pt'], { sensitivity: 'base' })
    );

    if (list.length > 0) {
      cacheVocabularyLocally(cleanUid, cleanEmail, list);
    }
    callback(list);
  };

  // Subcollection listener
  const unsubCol = onSnapshot(
    vocabColRef,
    (snapshot) => {
      hasReceivedSnapshot = true;
      colMap.clear();
      snapshot.forEach((d) => {
        const item = d.data() as StudentDictionaryEntry;
        if (item && item.word) {
          colMap.set(item.word.toLowerCase().trim(), item);
        }
      });
      notify();
    },
    (err) => {
      console.warn('Real-time vocabulary subcollection notice:', err);
    }
  );

  // User document listener
  const unsubDoc = onSnapshot(
    userDocRef,
    (snap) => {
      hasReceivedSnapshot = true;
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.vocabulary)) {
          docVocab = data.vocabulary;
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
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!cleanUid) return false;

  try {
    const sanitizedEntry: DailyJournalEntry = JSON.parse(
      JSON.stringify({
        ...entry,
        studentUid: cleanUid,
        studentEmail: cleanEmail,
        createdAt: entry.createdAt || new Date().toISOString(),
      })
    );

    // 1. Save in dedicated subcollection
    const stampedEntry = stampSchemaVersion(sanitizedEntry);
    assertSafeFirestoreWrite(`users/${cleanUid}/journal/${sanitizedEntry.id}`, stampedEntry, undefined, true);
    const entryRef = doc(db, 'users', cleanUid, 'journal', sanitizedEntry.id);
    await withFirestoreTimeout(setDoc(entryRef, stampedEntry, { merge: true }), 3000, null);

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
    const stampedUserUpdate = stampSchemaVersion({
      dailyJournalEntries: updatedList,
      updatedAt: new Date().toISOString(),
    });
    assertSafeFirestoreWrite(`users/${cleanUid}`, stampedUserUpdate, userSnap?.data(), true);

    await withFirestoreTimeout(
      setDoc(userRef, stampedUserUpdate, { merge: true }),
      2500,
      null
    );

    // 3. Mirror to server backend API
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
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
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
    const cleanStudentEmail = (lesson.studentEmail || '').toLowerCase().trim();
    const cleanTeacherEmail = (lesson.teacherEmail || '').toLowerCase().trim();
    const studentUid = normalizeUid(lesson.studentUid, cleanStudentEmail);
    const teacherUid = normalizeUid(lesson.teacherUid, cleanTeacherEmail);

    const sanitizedLesson: LiveLesson = stampSchemaVersion({
      ...JSON.parse(JSON.stringify(lesson)),
      id: lesson.id,
      studentUid: studentUid || lesson.studentUid,
      teacherUid: teacherUid || lesson.teacherUid,
      studentEmail: cleanStudentEmail,
      teacherEmail: cleanTeacherEmail,
      updatedAt: lesson.updatedAt || new Date().toISOString(),
    });

    assertSafeFirestoreWrite(`lessons/${sanitizedLesson.id}`, sanitizedLesson, undefined, true);

    // 1. Root lessons collection
    const lessonRef = doc(db, 'lessons', sanitizedLesson.id);
    await withFirestoreTimeout(setDoc(lessonRef, sanitizedLesson, { merge: true }), 2500, null);

    // 2. Student user subcollections across canonical student doc IDs (concurrent execution)
    const studentDocIds = getUserDocIds(studentUid, cleanStudentEmail);
    const studentPromises = studentDocIds.map(async (sDocId) => {
      try {
        const userLessonRef = doc(db, 'users', sDocId, 'lessons', sanitizedLesson.id);
        await withFirestoreTimeout(setDoc(userLessonRef, sanitizedLesson, { merge: true }), 2000, null);

        // Also update scheduledLessons array on user doc
        const userRef = doc(db, 'users', sDocId);
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 1500, null);
        if (userSnap && userSnap.exists()) {
          const data = userSnap.data();
          const prevLessons: LiveLesson[] = Array.isArray(data?.scheduledLessons) ? data.scheduledLessons : [];
          const filtered = prevLessons.filter((l) => l.id !== sanitizedLesson.id);
          await withFirestoreTimeout(
            setDoc(userRef, { scheduledLessons: [sanitizedLesson, ...filtered], updatedAt: new Date().toISOString() }, { merge: true }),
            1500,
            null
          );
        }
      } catch (subErr) {
        console.warn(`Notice persisting lesson to student doc ${sDocId}:`, subErr);
      }
    });

    // 3. Teacher user subcollections across canonical teacher doc IDs (concurrent execution)
    const teacherDocIds = getUserDocIds(teacherUid, cleanTeacherEmail);
    const teacherPromises = teacherDocIds.map(async (tDocId) => {
      try {
        const teacherLessonRef = doc(db, 'users', tDocId, 'lessons', sanitizedLesson.id);
        await withFirestoreTimeout(setDoc(teacherLessonRef, sanitizedLesson, { merge: true }), 2000, null);

        const tUserRef = doc(db, 'users', tDocId);
        const tUserSnap = await withFirestoreTimeout(getDoc(tUserRef), 1500, null);
        if (tUserSnap && tUserSnap.exists()) {
          const tData = tUserSnap.data();
          const prevLessons: LiveLesson[] = Array.isArray(tData?.scheduledLessons) ? tData.scheduledLessons : [];
          const filtered = prevLessons.filter((l) => l.id !== sanitizedLesson.id);
          await withFirestoreTimeout(
            setDoc(tUserRef, { scheduledLessons: [sanitizedLesson, ...filtered], updatedAt: new Date().toISOString() }, { merge: true }),
            1500,
            null
          );
        }
      } catch (tErr) {
        console.warn(`Notice persisting lesson to teacher doc ${tDocId}:`, tErr);
      }
    });

    await Promise.allSettled([...studentPromises, ...teacherPromises]);

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lessons/${lesson.id}`);
    return false;
  }
}

export interface ScheduleLessonTransactionParams {
  lesson: LiveLesson;
  isTrialLesson?: boolean;
}

/**
 * ATOMIC FIRESTORE TRANSACTION FOR LESSON SCHEDULING (TRIAL & PACKAGE LESSONS)
 * Guarantees that:
 * 1. Lesson booking in root `lessons` and student/teacher subcollections occurs atomically.
 * 2. Balance decrement (or trial lesson allocation) happens synchronously with zero discrepancy.
 * 3. Exact student-teacher IDs (`teacherUid`, `studentUid`, `assignedNativeFriendUID`) are linked safely.
 * 4. Reverts completely in case of conflict or network error.
 */
export async function scheduleLessonWithTransaction(params: ScheduleLessonTransactionParams): Promise<{
  success: boolean;
  lesson?: LiveLesson;
  remainingLessons?: number;
  contractedLessons?: number;
  error?: string;
}> {
  const db = getDb();
  if (!db || !params.lesson?.id) {
    return { success: false, error: 'Database or lesson ID missing' };
  }

  const { lesson, isTrialLesson } = params;
  const cleanStudentEmail = (lesson.studentEmail || '').toLowerCase().trim();
  const cleanTeacherEmail = (lesson.teacherEmail || '').toLowerCase().trim();
  const studentUid = normalizeUid(lesson.studentUid, cleanStudentEmail);
  const teacherUid =
    normalizeUid(lesson.teacherUid, cleanTeacherEmail) ||
    (cleanTeacherEmail ? `usr-${cleanTeacherEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '');

  if (!studentUid) {
    return { success: false, error: 'Student UID missing' };
  }

  const nowIso = new Date().toISOString();
  const lessonRef = doc(db, 'lessons', lesson.id);
  const studentRef = doc(db, 'users', studentUid);
  const teacherRef = teacherUid ? doc(db, 'users', teacherUid) : null;
  const studentSubLessonRef = doc(db, 'users', studentUid, 'lessons', lesson.id);

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. All transaction reads first
      const studentSnap = await transaction.get(studentRef);
      const teacherSnap = teacherRef ? await transaction.get(teacherRef) : null;
      const lessonSnap = await transaction.get(lessonRef);

      const studentData = studentSnap.exists() ? (studentSnap.data() as Partial<UserProfile>) : {};
      const currentContracted = Number(studentData.contractedLessons ?? 0);
      const currentAvailable =
        studentData.availableLessons !== undefined ? Number(studentData.availableLessons) : currentContracted;

      let newContracted = currentContracted;
      let newAvailable = currentAvailable;

      if (isTrialLesson) {
        // Trial lesson grant: ensure at least 1 contracted lesson and mark trial completed/booked
        newContracted = Math.max(currentContracted, 1);
        newAvailable = Math.max(0, currentAvailable);
      } else {
        // Decrement available lesson balance atomically
        newContracted = currentContracted;
        newAvailable = Math.max(0, currentAvailable - 1);
      }

      // Resolve authoritative teacher details from teacher user document if available
      const teacherData = teacherSnap && teacherSnap.exists() ? teacherSnap.data() : null;
      const effectiveTeacherName = lesson.teacherName || teacherData?.name || studentData.teacherName || null;
      const effectiveTeacherEmail = cleanTeacherEmail || teacherData?.email || studentData.teacherEmail || null;
      const effectiveTeacherMeet = lesson.meetLink || teacherData?.meetUrl || teacherData?.meetLink || '';

      const sanitizedLesson: LiveLesson = stampSchemaVersion({
        ...lesson,
        id: lesson.id,
        studentUid,
        studentEmail: cleanStudentEmail,
        studentName: lesson.studentName || studentData.name || cleanStudentEmail.split('@')[0],
        teacherUid: teacherUid || null,
        teacherEmail: effectiveTeacherEmail,
        teacherName: effectiveTeacherName,
        meetLink: effectiveTeacherMeet || lesson.meetLink || '',
        status: 'scheduled',
        isTrialLesson: Boolean(isTrialLesson),
        createdAt: lesson.createdAt || nowIso,
        updatedAt: nowIso,
      });

      // 2. Transaction writes
      transaction.set(lessonRef, sanitizedLesson, { merge: true });
      transaction.set(studentSubLessonRef, sanitizedLesson, { merge: true });

      // Student main document update with decremented balance and exact teacher ID binding
      const studentUpdate: Record<string, any> = stampSchemaVersion({
        contractedLessons: newContracted,
        availableLessons: newAvailable,
        teacherUid: teacherUid || null,
        teacherEmail: effectiveTeacherEmail,
        teacherName: effectiveTeacherName,
        teacherMeetUrl: effectiveTeacherMeet,
        assignedNativeFriendUID: teacherUid || null,
        nativeFriendUID: teacherUid || null,
        enrollmentStatus: 'active',
        hasCompletedTrialLesson: isTrialLesson ? true : (studentData.hasCompletedTrialLesson ?? false),
        updatedAt: nowIso,
      });
      transaction.set(studentRef, studentUpdate, { merge: true });

      // Teacher user doc update if teacher doc exists in `users`
      if (teacherRef && teacherSnap && teacherSnap.exists()) {
        const teacherSubLessonRef = doc(db, 'users', teacherUid, 'lessons', lesson.id);
        transaction.set(teacherSubLessonRef, sanitizedLesson, { merge: true });
        transaction.set(teacherRef, { updatedAt: nowIso }, { merge: true });
      }

      return {
        lesson: sanitizedLesson,
        contractedLessons: newContracted,
        remainingLessons: newAvailable,
      };
    });

    return {
      success: true,
      lesson: result.lesson,
      contractedLessons: result.contractedLessons,
      remainingLessons: result.remainingLessons,
    };
  } catch (error) {
    console.error('Error in scheduleLessonWithTransaction:', error);
    handleFirestoreError(error, OperationType.WRITE, `lessons/${lesson.id}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface PurchasePackageTransactionParams {
  studentUid: string;
  studentEmail: string;
  teacherEmail: string;
  teacherName: string;
  teacherUid?: string | null;
  packageLessons: number;
}

/**
 * ATOMIC FIRESTORE TRANSACTION FOR LESSON PACKAGE PURCHASES
 * Safely adds package lessons to contracted and available balances, and binds teacher ID.
 */
export async function purchasePackageWithTransaction(params: PurchasePackageTransactionParams): Promise<{
  success: boolean;
  contractedLessons?: number;
  availableLessons?: number;
  error?: string;
}> {
  const db = getDb();
  if (!db || !params.studentUid) {
    return { success: false, error: 'Database or student UID missing' };
  }

  const cleanStudentEmail = (params.studentEmail || '').toLowerCase().trim();
  const cleanTeacherEmail = (params.teacherEmail || '').toLowerCase().trim();
  const studentUid = normalizeUid(params.studentUid, cleanStudentEmail);
  const teacherUid =
    params.teacherUid ||
    normalizeUid(null, cleanTeacherEmail) ||
    (cleanTeacherEmail ? `usr-${cleanTeacherEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '');

  const studentRef = doc(db, 'users', studentUid);
  const teacherRef = teacherUid ? doc(db, 'users', teacherUid) : null;
  const nowIso = new Date().toISOString();

  // Align weekly live lesson target with purchased frequency (4 -> 1x, 8 -> 2x, 12 -> 3x)
  let newWeeklyTarget = 1;
  if (params.packageLessons === 4) newWeeklyTarget = 1;
  else if (params.packageLessons === 8) newWeeklyTarget = 2;
  else if (params.packageLessons === 12) newWeeklyTarget = 3;
  else if (params.packageLessons > 0) newWeeklyTarget = Math.min(7, Math.ceil(params.packageLessons / 4));

  try {
    const result = await runTransaction(db, async (transaction) => {
      const studentSnap = await transaction.get(studentRef);
      const teacherSnap = teacherRef ? await transaction.get(teacherRef) : null;

      const studentData = studentSnap.exists() ? (studentSnap.data() as Partial<UserProfile>) : {};
      const currentContracted = Number(studentData.contractedLessons ?? 0);
      const currentAvailable =
        studentData.availableLessons !== undefined ? Number(studentData.availableLessons) : currentContracted;

      const newContracted = currentContracted + params.packageLessons;
      const newAvailable = currentAvailable + params.packageLessons;

      const studentUpdate: Record<string, any> = stampSchemaVersion({
        contractedLessons: newContracted,
        availableLessons: newAvailable,
        teacherUid: teacherUid || studentData.teacherUid || null,
        teacherEmail: cleanTeacherEmail,
        teacherName: params.teacherName,
        assignedNativeFriendUID: teacherUid || studentData.assignedNativeFriendUID || null,
        nativeFriendUID: teacherUid || studentData.nativeFriendUID || null,
        enrollmentStatus: 'active',
        weeklyNativeLessonsTarget: newWeeklyTarget,
        subscriptionType: 'package',
        updatedAt: nowIso,
      });

      transaction.set(studentRef, studentUpdate, { merge: true });

      if (teacherRef && teacherSnap && teacherSnap.exists()) {
        transaction.set(teacherRef, { updatedAt: nowIso }, { merge: true });
      }

      return {
        contractedLessons: newContracted,
        availableLessons: newAvailable,
      };
    });

    return {
      success: true,
      contractedLessons: result.contractedLessons,
      availableLessons: result.availableLessons,
    };
  } catch (error) {
    console.error('Error in purchasePackageWithTransaction:', error);
    handleFirestoreError(error, OperationType.WRITE, `users/${studentUid}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface CancelLessonTransactionParams {
  lessonId: string;
  studentUid?: string;
  studentEmail?: string;
  cancelledBy?: 'student' | 'teacher' | 'admin';
  cancellationReason?: string;
}

/**
 * ATOMIC FIRESTORE TRANSACTION FOR LESSON CANCELLATION
 * Cancels lesson across collections and restores balance if cancelled by teacher or admin.
 */
export async function cancelLessonWithTransaction(params: CancelLessonTransactionParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const db = getDb();
  if (!db || !params.lessonId) return { success: false, error: 'Lesson ID missing' };

  const lessonRef = doc(db, 'lessons', params.lessonId);
  const nowIso = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      const lessonSnap = await transaction.get(lessonRef);
      if (!lessonSnap.exists()) {
        throw new Error('Lesson document not found');
      }

      const lessonData = lessonSnap.data() as LiveLesson;
      const studentUid = normalizeUid(
        params.studentUid || lessonData.studentUid,
        params.studentEmail || lessonData.studentEmail
      );
      const studentRef = studentUid ? doc(db, 'users', studentUid) : null;
      const studentSnap = studentRef ? await transaction.get(studentRef) : null;

      const cancelledLesson: LiveLesson = {
        ...lessonData,
        status: 'cancelled',
        cancelledAt: nowIso,
        cancelledBy: params.cancelledBy || 'student',
        cancellationReason: params.cancellationReason || 'Cancelled',
        updatedAt: nowIso,
      };

      transaction.set(lessonRef, cancelledLesson, { merge: true });

      if (studentRef && studentSnap && studentSnap.exists()) {
        const studentData = studentSnap.data();
        const studentSubLessonRef = doc(db, 'users', studentUid, 'lessons', params.lessonId);
        transaction.set(studentSubLessonRef, cancelledLesson, { merge: true });

        // If cancelled by teacher/admin, restore the student's lesson balance
        const shouldRestoreBalance = params.cancelledBy === 'teacher' || params.cancelledBy === 'admin';
        if (shouldRestoreBalance) {
          const curAvail =
            studentData.availableLessons !== undefined
              ? Number(studentData.availableLessons)
              : Number(studentData.contractedLessons || 0);
          transaction.set(
            studentRef,
            {
              availableLessons: curAvail + 1,
              updatedAt: nowIso,
            },
            { merge: true }
          );
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in cancelLessonWithTransaction:', error);
    handleFirestoreError(error, OperationType.UPDATE, `lessons/${params.lessonId}`);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fetch all Native Friend / Teacher profiles directly from the unified `users` collection
 * filtering by role == 'teacher'.
 * Also migrates any legacy documents from `tutors` into `users` to guarantee zero reference loss.
 */
export async function fetchTeachersFromFirestore(): Promise<NativeFriendTutor[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const teachersMap = new Map<string, NativeFriendTutor>();

    // 1. Query unified users collection where role == 'teacher'
    try {
      const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const snap = await withFirestoreTimeout(getDocs(qTeachers), 3500, null);
      if (snap && !snap.empty) {
        snap.forEach((d) => {
          const data = d.data();
          if (data && data.email && d.id !== 'test_user_id') {
            const key = (data.email || d.id).toLowerCase().trim();
            teachersMap.set(key, {
              id: d.id,
              uid: data.uid || d.id,
              name: data.name || key.split('@')[0],
              email: data.email,
              avatar: data.avatar || data.picture || '',
              picture: data.picture || data.avatar || '',
              country: data.country || 'Global',
              headline: data.headline || '',
              bio: data.bio || '',
              accent: data.accent || '',
              specialties: Array.isArray(data.specialties) ? data.specialties : [],
              videoUrl: data.videoUrl || '',
              youtubeVideoId: data.youtubeVideoId || '',
              meetUrl: data.meetUrl || data.meetLink || '',
              meetLink: data.meetLink || data.meetUrl || '',
              rating: typeof data.rating === 'number' ? data.rating : 5.0,
              reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
              hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : 0,
              approvalStatus: data.approvalStatus || 'approved',
              isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
              availableDays: Array.isArray(data.availableDays)
                ? data.availableDays
                : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
              timezone: data.timezone || 'America/Sao_Paulo',
              role: 'teacher',
            } as unknown as NativeFriendTutor);
          }
        });
      }
    } catch (err) {
      console.warn('fetchTeachersFromFirestore users query notice:', err);
    }

    // 2. Migration check: If tutors collection has entries not in users, migrate them to users
    try {
      const snapTutors = await withFirestoreTimeout(getDocs(collection(db, 'tutors')), 2500, null);
      if (snapTutors && !snapTutors.empty) {
        for (const d of snapTutors.docs) {
          const data = d.data();
          if (data && data.email && d.id !== 'test_tutor_id') {
            const key = data.email.toLowerCase().trim();
            if (!teachersMap.has(key)) {
              const teacherObj: NativeFriendTutor = {
                id: d.id,
                uid: data.uid || d.id,
                name: data.name || key.split('@')[0],
                email: data.email,
                avatar: data.avatar || data.picture || '',
                picture: data.picture || data.avatar || '',
                country: data.country || 'Global',
                headline: data.headline || '',
                bio: data.bio || '',
                accent: data.accent || '',
                specialties: Array.isArray(data.specialties) ? data.specialties : [],
                videoUrl: data.videoUrl || '',
                youtubeVideoId: data.youtubeVideoId || '',
                meetUrl: data.meetUrl || data.meetLink || '',
                meetLink: data.meetLink || data.meetUrl || '',
                rating: typeof data.rating === 'number' ? data.rating : 5.0,
                reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
                hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : 0,
                approvalStatus: data.approvalStatus || 'approved',
                isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
                availableDays: Array.isArray(data.availableDays)
                  ? data.availableDays
                  : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                timezone: data.timezone || 'America/Sao_Paulo',
                role: 'teacher',
              } as unknown as NativeFriendTutor;
              teachersMap.set(key, teacherObj);

              // Seamless one-time write to users collection to unify
              const targetDocId = d.id;
              setDoc(
                doc(db, 'users', targetDocId),
                {
                  ...teacherObj,
                  role: 'teacher',
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              ).catch(() => {});
            }
          }
        }
      }
    } catch {}

    return Array.from(teachersMap.values());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

/**
 * Real-time subscription to Native Friends / Teachers from the unified `users` collection.
 * Listens strictly to `users` where `role == 'teacher'`.
 */
export function subscribeToTeachers(callback: (teachers: NativeFriendTutor[]) => void): () => void {
  const db = getDb();
  if (!db) return () => {};

  try {
    const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsub = onSnapshot(
      qTeachers,
      (snapshot) => {
        const teachersList: NativeFriendTutor[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data && data.email && d.id !== 'test_user_id') {
            teachersList.push({
              id: d.id,
              uid: data.uid || d.id,
              name: data.name || (data.email || '').split('@')[0],
              email: data.email,
              avatar: data.avatar || data.picture || '',
              picture: data.picture || data.avatar || '',
              country: data.country || 'Global',
              headline: data.headline || '',
              bio: data.bio || '',
              accent: data.accent || '',
              specialties: Array.isArray(data.specialties) ? data.specialties : [],
              videoUrl: data.videoUrl || '',
              youtubeVideoId: data.youtubeVideoId || '',
              meetUrl: data.meetUrl || data.meetLink || '',
              meetLink: data.meetLink || data.meetUrl || '',
              rating: typeof data.rating === 'number' ? data.rating : 5.0,
              reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
              hourlyRate: typeof data.hourlyRate === 'number' ? data.hourlyRate : 0,
              approvalStatus: data.approvalStatus || 'approved',
              isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
              availableDays: Array.isArray(data.availableDays)
                ? data.availableDays
                : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
              timezone: data.timezone || 'America/Sao_Paulo',
              role: 'teacher',
            } as unknown as NativeFriendTutor);
          }
        });
        callback(teachersList);
      },
      (err) => {
        console.warn('Real-time teachers subscription notice:', err);
      }
    );

    return () => unsub();
  } catch (err) {
    console.warn('Error initiating subscribeToTeachers:', err);
    return () => {};
  }
}

/**
 * Persist student's assigned Native Friend and enrollment status directly to Firestore.
 * Updates all canonical user doc representations (UID, cleanEmail, emailDocId, hyphenDocId, usrDocId),
 * ensuring immediate and permanent persistence across reloads.
 */
export async function saveStudentNativeFriendToFirestore(
  studentUid: string,
  studentEmail?: string,
  teacherData?: {
    teacherEmail?: string | null;
    teacherName?: string | null;
    teacherUid?: string | null;
    assignedNativeFriendUID?: string | null;
    nativeFriendUID?: string | null;
    enrollmentStatus?: string;
  }
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!cleanUid) return false;

  const payload: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (teacherData?.teacherEmail !== undefined) {
    payload.teacherEmail = teacherData.teacherEmail;
  }
  if (teacherData?.teacherName !== undefined) {
    payload.teacherName = teacherData.teacherName;
  }

  const cleanTeacherEmail = (teacherData?.teacherEmail || '').toLowerCase().trim();
  const cleanTeacherUid =
    teacherData?.teacherUid ||
    teacherData?.assignedNativeFriendUID ||
    teacherData?.nativeFriendUID ||
    (cleanTeacherEmail ? `usr-${cleanTeacherEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '');

  if (cleanTeacherUid) {
    payload.teacherUid = cleanTeacherUid;
    payload.assignedNativeFriendUID = cleanTeacherUid;
    payload.nativeFriendUID = cleanTeacherUid;
  } else if (teacherData?.teacherUid !== undefined) {
    payload.teacherUid = teacherData.teacherUid;
    payload.assignedNativeFriendUID = teacherData.assignedNativeFriendUID || teacherData.teacherUid;
    payload.nativeFriendUID = teacherData.nativeFriendUID || teacherData.teacherUid;
  }

  if (teacherData?.enrollmentStatus !== undefined) {
    payload.enrollmentStatus = teacherData.enrollmentStatus;
    payload.status = teacherData.enrollmentStatus;
  }

  try {
    // Strictly write to doc(db, 'users', cleanUid) - authenticated user UID single source of truth
    await withFirestoreTimeout(setDoc(doc(db, 'users', cleanUid), payload, { merge: true }), 3000, null);
    return true;
  } catch (error) {
    console.error(`[Firestore Error] Failed to save student Native Friend for ${cleanUid}:`, error);
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}`);
    return false;
  }
}

/**
 * Persist the entire student profile directly to Firestore strictly using users/{cleanUid}.
 */
export async function saveStudentProfileToFirestore(
  studentUid: string,
  profile: Partial<UserProfile>,
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const cleanEmail = (profile.email || studentEmail || '').toLowerCase().trim();
  const cleanUid = auth?.currentUser?.uid || normalizeUid(studentUid, cleanEmail);
  if (!cleanUid) return false;

  const cleanTeacherEmail = (profile.teacherEmail || '').toLowerCase().trim();
  const cleanTeacherUid =
    profile.teacherUid ||
    profile.assignedNativeFriendUID ||
    profile.nativeFriendUID ||
    (cleanTeacherEmail ? `usr-${cleanTeacherEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '');

  const sanitized = JSON.parse(JSON.stringify(profile));
  const payload: Record<string, any> = {
    ...sanitized,
    id: cleanUid,
    uid: cleanUid,
    updatedAt: new Date().toISOString(),
  };

  if (cleanEmail || sanitized.email) {
    payload.email = cleanEmail || sanitized.email;
  }
  if (profile.teacherEmail !== undefined) {
    payload.teacherEmail = profile.teacherEmail;
  }
  if (profile.teacherName !== undefined) {
    payload.teacherName = profile.teacherName;
  }
  if (profile.teacherUid !== undefined) {
    payload.teacherUid = profile.teacherUid;
  } else if (cleanTeacherUid) {
    payload.teacherUid = cleanTeacherUid;
  }
  if (profile.assignedNativeFriendUID !== undefined) {
    payload.assignedNativeFriendUID = profile.assignedNativeFriendUID;
  } else if (cleanTeacherUid) {
    payload.assignedNativeFriendUID = cleanTeacherUid;
  }
  if (profile.nativeFriendUID !== undefined) {
    payload.nativeFriendUID = profile.nativeFriendUID;
  } else if (cleanTeacherUid) {
    payload.nativeFriendUID = cleanTeacherUid;
  }
  if (profile.enrollmentStatus !== undefined) {
    payload.enrollmentStatus = profile.enrollmentStatus;
  }

  try {
    const stampedPayload = stampSchemaVersion(payload);
    assertSafeFirestoreWrite(`users/${cleanUid}`, stampedPayload, undefined, true);

    // Strictly write to doc(db, 'users', cleanUid) - authenticated user UID single source of truth
    await withFirestoreTimeout(setDoc(doc(db, 'users', cleanUid), stampedPayload, { merge: true }), 3000, null);
    return true;
  } catch (error) {
    console.error(`[Firestore Error] Failed to save student profile for ${cleanUid}:`, error);
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}`);
    return false;
  }
}

/**
 * Fetch student profile directly from Firestore users/{cleanUid}.
 * Reads strictly from users/{cleanUid}. Performs one-time migration if a legacy
 * email-keyed document exists, ensuring data integrity without fragmenting records.
 */
export async function fetchStudentProfileFromFirestore(
  studentUid: string,
  studentEmail?: string
): Promise<Partial<UserProfile> | null> {
  const db = getDb();
  if (!db) return null;
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = auth?.currentUser?.uid || normalizeUid(studentUid, cleanEmail);
  if (!cleanUid) return null;

  try {
    // 1. Strict primary read from users/{cleanUid}
    const snap = await withFirestoreTimeout(getDoc(doc(db, 'users', cleanUid)), 2500, null);
    if (snap && snap.exists()) {
      const data = snap.data() as Partial<UserProfile>;
      // Validate schema and detect if migration is needed
      validateFirestoreDocument('users', data, { path: `users/${cleanUid}` });

      if (data && (data.email || data.name || data.teacherEmail !== undefined)) {
        return {
          ...data,
          id: cleanUid,
          uid: cleanUid,
          email: cleanEmail || data.email,
        };
      }
    }

    // 2. One-time migration fallback for legacy accounts where user was created under an email doc
    if (cleanEmail) {
      const legacyDocIds = [
        `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`,
        cleanEmail.replace(/[^a-zA-Z0-9]/g, '-'),
        cleanEmail,
      ];
      for (const legacyId of legacyDocIds) {
        if (legacyId === cleanUid) continue;
        const legacySnap = await withFirestoreTimeout(getDoc(doc(db, 'users', legacyId)), 2000, null);
        if (legacySnap && legacySnap.exists()) {
          const legacyData = legacySnap.data() as Partial<UserProfile>;
          if (legacyData && (legacyData.email || legacyData.name || legacyData.teacherEmail !== undefined)) {
            // Migrate to users/{cleanUid}
            const migrated: Partial<UserProfile> = {
              ...legacyData,
              id: cleanUid,
              uid: cleanUid,
              email: cleanEmail,
              updatedAt: new Date().toISOString(),
            };
            await withFirestoreTimeout(setDoc(doc(db, 'users', cleanUid), migrated, { merge: true }), 2500, null);
            return migrated;
          }
        }
      }
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUid}`);
    return null;
  }
}

/**
 * Update an existing lesson in Firestore.
 * Automatically mirrors the updated or cancelled status across root `lessons`,
 * the student's subcollection `users/{studentUid}/lessons`, user doc `scheduledLessons`,
 * teacher subcollection, and eliminates any duplicate/conflicting active slots.
 */
export async function updateLiveLessonInFirestore(
  lessonId: string,
  updates: Partial<LiveLesson>,
  studentUid?: string,
  teacherUid?: string,
  lessonData?: Partial<LiveLesson>,
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db || !lessonId) return false;

  try {
    const sanitized = JSON.parse(JSON.stringify(updates));
    const nowIso = new Date().toISOString();
    const isCancelling = sanitized.status === 'cancelled' || sanitized.status === 'canceled' || Boolean(sanitized.cancelledAt);
    const fullUpdates = {
      ...sanitized,
      ...(isCancelling ? { status: 'cancelled', cancelledAt: sanitized.cancelledAt || nowIso } : {}),
      updatedAt: nowIso,
    };

    // 1. Fetch current lesson doc if studentUid or teacherUid is missing
    let effStudentUid = studentUid ? normalizeUid(studentUid, studentEmail) : '';
    let effStudentEmail = (studentEmail || '').toLowerCase().trim();
    let effTeacherUid = teacherUid ? normalizeUid(teacherUid) : '';
    let effTeacherEmail = (lessonData?.teacherEmail || '').toLowerCase().trim();
    let effStartDateTime = lessonData?.startDateTime || '';

    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonSnap = await withFirestoreTimeout(getDoc(lessonRef), 2000, null);
    if (lessonSnap && lessonSnap.exists()) {
      const lData = lessonSnap.data();
      if (!effStudentUid && lData.studentUid) effStudentUid = normalizeUid(lData.studentUid, lData.studentEmail);
      if (!effStudentEmail && lData.studentEmail) effStudentEmail = (lData.studentEmail || '').toLowerCase().trim();
      if (!effTeacherUid && lData.teacherUid) effTeacherUid = normalizeUid(lData.teacherUid, lData.teacherEmail);
      if (!effTeacherEmail && lData.teacherEmail) effTeacherEmail = (lData.teacherEmail || '').toLowerCase().trim();
      if (!effStartDateTime && lData.startDateTime) effStartDateTime = lData.startDateTime;
    } else if (lessonData) {
      if (!effStudentUid && lessonData.studentUid) effStudentUid = normalizeUid(lessonData.studentUid, lessonData.studentEmail);
      if (!effStudentEmail && lessonData.studentEmail) effStudentEmail = (lessonData.studentEmail || '').toLowerCase().trim();
      if (!effTeacherUid && lessonData.teacherUid) effTeacherUid = normalizeUid(lessonData.teacherUid, lessonData.teacherEmail);
      if (!effTeacherEmail && lessonData.teacherEmail) effTeacherEmail = (lessonData.teacherEmail || '').toLowerCase().trim();
      if (!effStartDateTime && lessonData.startDateTime) effStartDateTime = lessonData.startDateTime;
    }

    // 2. Prepare complete root lesson payload
    const rootPayload = stampSchemaVersion({
      ...(lessonData || {}),
      id: lessonId,
      ...(effStudentUid ? { studentUid: effStudentUid } : {}),
      ...(effStudentEmail ? { studentEmail: effStudentEmail } : {}),
      ...(effTeacherUid ? { teacherUid: effTeacherUid } : {}),
      ...(effTeacherEmail ? { teacherEmail: effTeacherEmail } : {}),
      ...(effStartDateTime ? { startDateTime: effStartDateTime } : {}),
      ...fullUpdates,
    });

    assertSafeFirestoreWrite(`lessons/${lessonId}`, rootPayload, lessonSnap?.data(), true);

    // Update root lessons/{lessonId}
    await withFirestoreTimeout(setDoc(lessonRef, rootPayload, { merge: true }), 3000, null);

    // 3. Update student subcollection and scheduledLessons array across all canonical doc IDs
    const studentDocIds = Array.from(
      new Set(
        [
          effStudentUid,
          effStudentEmail,
          effStudentEmail ? normalizeUid(null, effStudentEmail) : '',
          effStudentEmail ? effStudentEmail.replace(/[^a-zA-Z0-9]/g, '-') : '',
          effStudentEmail ? `usr-${effStudentEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '',
        ].filter(Boolean)
      )
    );

    for (const docId of studentDocIds) {
      try {
        const userLessonRef = doc(db, 'users', docId, 'lessons', lessonId);
        await withFirestoreTimeout(setDoc(userLessonRef, rootPayload, { merge: true }), 2500, null);

        // Also update scheduledLessons array on student user doc
        const userRef = doc(db, 'users', docId);
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
        if (userSnap && userSnap.exists()) {
          const uData = userSnap.data();
          if (Array.isArray(uData?.scheduledLessons)) {
            let updatedScheduled: LiveLesson[];
            if (isCancelling) {
              // Remove cancelled lesson from scheduledLessons array permanently so it never reappears on reload
              updatedScheduled = uData.scheduledLessons.filter((l: LiveLesson) => l.id !== lessonId);
            } else {
              updatedScheduled = uData.scheduledLessons.map((l: LiveLesson) =>
                l.id === lessonId ? { ...l, ...fullUpdates } : l
              );
            }
            await withFirestoreTimeout(
              setDoc(userRef, { scheduledLessons: updatedScheduled, updatedAt: nowIso }, { merge: true }),
              2000,
              null
            );
          }
        }
      } catch (subErr) {
        console.warn(`Notice updating student doc ${docId} for lesson:`, subErr);
      }
    }

    // 4. Update teacher subcollection and scheduledLessons array if applicable
    const teacherDocIds = Array.from(
      new Set(
        [
          effTeacherUid,
          effTeacherEmail,
          effTeacherEmail ? normalizeUid(null, effTeacherEmail) : '',
          effTeacherEmail ? effTeacherEmail.replace(/[^a-zA-Z0-9]/g, '-') : '',
          effTeacherEmail ? `usr-${effTeacherEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '',
        ].filter(Boolean)
      )
    );

    for (const tDocId of teacherDocIds) {
      try {
        const teacherLessonRef = doc(db, 'users', tDocId, 'lessons', lessonId);
        await withFirestoreTimeout(setDoc(teacherLessonRef, rootPayload, { merge: true }), 2000, null);

        const tUserRef = doc(db, 'users', tDocId);
        const tUserSnap = await withFirestoreTimeout(getDoc(tUserRef), 2000, null);
        if (tUserSnap && tUserSnap.exists()) {
          const tData = tUserSnap.data();
          if (Array.isArray(tData?.scheduledLessons)) {
            const updatedScheduled = isCancelling
              ? tData.scheduledLessons.filter((l: LiveLesson) => l.id !== lessonId)
              : tData.scheduledLessons.map((l: LiveLesson) => (l.id === lessonId ? { ...l, ...fullUpdates } : l));
            await withFirestoreTimeout(
              setDoc(tUserRef, { scheduledLessons: updatedScheduled, updatedAt: nowIso }, { merge: true }),
              2000,
              null
            );
          }
        }
      } catch {}
    }

    // 5. If cancelling, also cancel any duplicate root lesson entries for this student at the same startDateTime
    if (isCancelling && effStudentEmail && effStartDateTime) {
      try {
        const qDuplicate = query(
          collection(db, 'lessons'),
          where('studentEmail', '==', effStudentEmail),
          where('startDateTime', '==', effStartDateTime)
        );
        const dupSnap = await withFirestoreTimeout(getDocs(qDuplicate), 2000, null);
        if (dupSnap && !dupSnap.empty) {
          for (const d of dupSnap.docs) {
            if (d.id !== lessonId) {
              await withFirestoreTimeout(
                setDoc(
                  d.ref,
                  {
                    status: 'cancelled',
                    cancelledAt: nowIso,
                    cancelledBy: fullUpdates.cancelledBy || 'user',
                    cancellationReason: fullUpdates.cancellationReason || 'Cancelled',
                    updatedAt: nowIso,
                  },
                  { merge: true }
                ),
                1500,
                null
              );
            }
          }
        }
      } catch {}
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `lessons/${lessonId}`);
    return false;
  }
}

/**
 * Delete a lesson in Firestore permanently.
 */
export async function deleteLiveLessonFromFirestore(
  lessonId: string,
  studentUid?: string,
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db || !lessonId) return false;

  try {
    let effStudentUid = studentUid ? normalizeUid(studentUid, studentEmail) : '';
    let effStudentEmail = (studentEmail || '').toLowerCase().trim();
    const lessonRef = doc(db, 'lessons', lessonId);
    if (!effStudentUid) {
      const lessonSnap = await withFirestoreTimeout(getDoc(lessonRef), 2000, null);
      if (lessonSnap && lessonSnap.exists()) {
        const lData = lessonSnap.data();
        effStudentUid = normalizeUid(lData.studentUid, lData.studentEmail);
        if (!effStudentEmail && lData.studentEmail) effStudentEmail = (lData.studentEmail || '').toLowerCase().trim();
      }
    }

    await withFirestoreTimeout(deleteDoc(lessonRef), 2500, null);

    const studentDocIds = Array.from(
      new Set(
        [
          effStudentUid,
          effStudentEmail,
          effStudentEmail ? normalizeUid(null, effStudentEmail) : '',
          effStudentEmail ? effStudentEmail.replace(/[^a-zA-Z0-9]/g, '-') : '',
          effStudentEmail ? `usr-${effStudentEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '',
        ].filter(Boolean)
      )
    );

    for (const docId of studentDocIds) {
      try {
        const userLessonRef = doc(db, 'users', docId, 'lessons', lessonId);
        await withFirestoreTimeout(deleteDoc(userLessonRef), 2000, null);

        // Remove from user doc scheduledLessons
        const userRef = doc(db, 'users', docId);
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
        if (userSnap && userSnap.exists()) {
          const uData = userSnap.data();
          if (Array.isArray(uData?.scheduledLessons)) {
            const filtered = uData.scheduledLessons.filter((l: LiveLesson) => l.id !== lessonId);
            await withFirestoreTimeout(
              setDoc(userRef, { scheduledLessons: filtered, updatedAt: new Date().toISOString() }, { merge: true }),
              2000,
              null
            );
          }
        }
      } catch {}
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lessons/${lessonId}`);
    return false;
  }
}

/**
 * Fetch all lessons for a student or teacher directly from Firestore.
 * Supports both student and teacher queries, prioritizing root `lessons` and
 * ensuring cancelled status is never overwritten by stale local snapshots.
 */
export async function fetchStudentLessonsFromFirestore(
  uid: string,
  email?: string,
  isTeacher?: boolean
): Promise<LiveLesson[]> {
  const db = getDb();
  const cleanUid = normalizeUid(uid, email);
  const cleanEmail = (email || '').toLowerCase().trim();
  const hyphenUid = cleanEmail ? `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
  const rawHyphen = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9]/g, '-') : '';
  if (!db) return [];

  try {
    const lessonsMap = new Map<string, LiveLesson>();

    const addOrUpdate = (item: LiveLesson) => {
      if (!item || !item.id) return;
      const isItemCancelled = item.status === 'cancelled' || (item.status as string) === 'canceled' || Boolean(item.cancelledAt);
      const normalizedItem: LiveLesson = {
        ...item,
        ...(isItemCancelled ? { status: 'cancelled', cancelledAt: item.cancelledAt || new Date().toISOString() } : {}),
      };

      const existing = lessonsMap.get(normalizedItem.id);
      if (existing) {
        // Strict invariant: If existing or item is cancelled, strictly keep cancelled!
        const isCancelled = existing.status === 'cancelled' || normalizedItem.status === 'cancelled' || Boolean(existing.cancelledAt) || Boolean(normalizedItem.cancelledAt);
        const cancelledAt = existing.cancelledAt || normalizedItem.cancelledAt;
        const cancelledBy = existing.cancelledBy || normalizedItem.cancelledBy;
        const cancellationReason = existing.cancellationReason || normalizedItem.cancellationReason;
        const merged: LiveLesson = { ...existing, ...normalizedItem };
        if (isCancelled) {
          merged.status = 'cancelled';
          merged.cancelledAt = cancelledAt || new Date().toISOString();
          if (cancelledBy) merged.cancelledBy = cancelledBy;
          if (cancellationReason) merged.cancellationReason = cancellationReason;
        }
        lessonsMap.set(normalizedItem.id, merged);
      } else {
        lessonsMap.set(normalizedItem.id, normalizedItem);
      }
    };

    // 1. If teacher or admin, query root lessons by teacherUid / teacherEmail
    if (isTeacher) {
      if (cleanUid) {
        try {
          const qTeacherUid = query(collection(db, 'lessons'), where('teacherUid', '==', cleanUid));
          const snap = await withFirestoreTimeout(getDocs(qTeacherUid), 2500, null);
          if (snap && !snap.empty) {
            snap.forEach((d) => addOrUpdate(d.data() as LiveLesson));
          }
        } catch {}
      }
      if (cleanEmail) {
        try {
          const qTeacherEmail = query(collection(db, 'lessons'), where('teacherEmail', '==', cleanEmail));
          const snap = await withFirestoreTimeout(getDocs(qTeacherEmail), 2500, null);
          if (snap && !snap.empty) {
            snap.forEach((d) => addOrUpdate(d.data() as LiveLesson));
          }
        } catch {}
      }
      if (hyphenUid && hyphenUid !== cleanUid) {
        try {
          const qTeacherHyphen = query(collection(db, 'lessons'), where('teacherUid', '==', hyphenUid));
          const snap = await withFirestoreTimeout(getDocs(qTeacherHyphen), 2500, null);
          if (snap && !snap.empty) {
            snap.forEach((d) => addOrUpdate(d.data() as LiveLesson));
          }
        } catch {}
      }
    }

    // 2. Query root collection by studentUid
    if (cleanUid) {
      try {
        const qUid = query(collection(db, 'lessons'), where('studentUid', '==', cleanUid));
        const snapUid = await withFirestoreTimeout(getDocs(qUid), 2500, null);
        if (snapUid && !snapUid.empty) {
          snapUid.forEach((d) => addOrUpdate(d.data() as LiveLesson));
        }
      } catch {}
    }

    // 3. Query root collection by studentEmail
    if (cleanEmail) {
      try {
        const qEmail = query(collection(db, 'lessons'), where('studentEmail', '==', cleanEmail));
        const snapEmail = await withFirestoreTimeout(getDocs(qEmail), 2500, null);
        if (snapEmail && !snapEmail.empty) {
          snapEmail.forEach((d) => addOrUpdate(d.data() as LiveLesson));
        }
      } catch {}
    }

    // 3b. Query root collection by hyphenUid (legacy format e.g. usr-reginahelena1980-gmail-com)
    if (hyphenUid && hyphenUid !== cleanUid) {
      try {
        const qHyphen = query(collection(db, 'lessons'), where('studentUid', '==', hyphenUid));
        const snapHyphen = await withFirestoreTimeout(getDocs(qHyphen), 2500, null);
        if (snapHyphen && !snapHyphen.empty) {
          snapHyphen.forEach((d) => addOrUpdate(d.data() as LiveLesson));
        }
      } catch {}
    }

    // 4. Query student's subcollection users/{cleanUid}/lessons
    const targetStudentDocIds = Array.from(new Set([cleanUid, hyphenUid, rawHyphen, cleanEmail].filter(Boolean)));
    for (const sDocId of targetStudentDocIds) {
      try {
        const subCol = collection(db, 'users', sDocId, 'lessons');
        const subSnap = await withFirestoreTimeout(getDocs(subCol), 2000, null);
        if (subSnap && !subSnap.empty) {
          subSnap.forEach((d) => addOrUpdate(d.data() as LiveLesson));
        }
      } catch {}

      // 5. Query user doc scheduledLessons
      try {
        const userRef = doc(db, 'users', sDocId);
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
        if (userSnap && userSnap.exists()) {
          const data = userSnap.data();
          if (Array.isArray(data?.scheduledLessons)) {
            data.scheduledLessons.forEach((l: LiveLesson) => addOrUpdate(l));
          }
        }
      } catch {}
    }

    // Invariant: If a student has a cancelled lesson at a specific startDateTime,
    // any duplicate active lesson at that startDateTime must also be marked cancelled!
    const cancelledSlots = new Set<string>();
    lessonsMap.forEach((l) => {
      if (l.status === 'cancelled' || l.cancelledAt) {
        const slotKey = `${(l.studentEmail || '').toLowerCase().trim()}_${l.startDateTime}`;
        cancelledSlots.add(slotKey);
      }
    });

    lessonsMap.forEach((l, id) => {
      const slotKey = `${(l.studentEmail || '').toLowerCase().trim()}_${l.startDateTime}`;
      if (cancelledSlots.has(slotKey) && l.status !== 'cancelled') {
        lessonsMap.set(id, {
          ...l,
          status: 'cancelled',
          cancelledAt: l.cancelledAt || new Date().toISOString(),
        });
      }
    });

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
 * Subscribe to real-time lessons updates in Firestore for a student or teacher.
 * Robust cross-device sync with query doc mapping across root lessons and user subcollections.
 */
export function subscribeToStudentLessons(
  studentUid: string,
  studentEmail: string | undefined,
  isTeacher: boolean,
  callback: (lessons: LiveLesson[]) => void
): () => void {
  const db = getDb();
  if (!db) return () => {};
  const cleanUid = normalizeUid(studentUid, studentEmail);
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const hyphenUid = cleanEmail ? `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}` : '';

  const unsubscribers: (() => void)[] = [];
  const queryDocsMap = new Map<string, Map<string, LiveLesson>>();
  let notifyTimer: any = null;

  const rebuildAndNotify = () => {
    if (notifyTimer) clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => {
      const consolidatedMap = new Map<string, LiveLesson>();

      // Merge docs across all active query snapshots, respecting latest updatedAt and strictly preserving cancelled state
      queryDocsMap.forEach((docsMap) => {
        docsMap.forEach((item, id) => {
          if (!item || !id) return;
          const isItemCancelled =
            item.status === 'cancelled' ||
            (item.status as string) === 'canceled' ||
            Boolean(item.cancelledAt);
          const normalizedItem: LiveLesson = {
            ...item,
            id,
            ...(isItemCancelled
              ? { status: 'cancelled', cancelledAt: item.cancelledAt || new Date().toISOString() }
              : {}),
          };
          const existing = consolidatedMap.get(id);
          if (existing) {
            const isCancelled =
              existing.status === 'cancelled' ||
              normalizedItem.status === 'cancelled' ||
              Boolean(existing.cancelledAt) ||
              Boolean(normalizedItem.cancelledAt);
            const cancelledAt = existing.cancelledAt || normalizedItem.cancelledAt;
            const cancelledBy = existing.cancelledBy || normalizedItem.cancelledBy;
            const cancellationReason = existing.cancellationReason || normalizedItem.cancellationReason;
            const timeExisting = new Date(existing.updatedAt || existing.startDateTime || 0).getTime();
            const timeItem = new Date(normalizedItem.updatedAt || normalizedItem.startDateTime || 0).getTime();
            const latest =
              timeItem >= timeExisting ? { ...existing, ...normalizedItem } : { ...normalizedItem, ...existing };
            if (isCancelled) {
              latest.status = 'cancelled';
              latest.cancelledAt = cancelledAt || new Date().toISOString();
              if (cancelledBy) latest.cancelledBy = cancelledBy;
              if (cancellationReason) latest.cancellationReason = cancellationReason;
            }
            consolidatedMap.set(id, latest);
          } else {
            consolidatedMap.set(id, normalizedItem);
          }
        });
      });

      // Invariant: If a student has a cancelled lesson at a specific startDateTime,
      // any duplicate active lesson at that startDateTime must also be marked cancelled
      const cancelledSlots = new Set<string>();
      consolidatedMap.forEach((l) => {
        if (l.status === 'cancelled' || l.cancelledAt) {
          const slotKey = `${(l.studentEmail || '').toLowerCase().trim()}_${l.startDateTime}`;
          cancelledSlots.add(slotKey);
        }
      });

      consolidatedMap.forEach((l, id) => {
        const slotKey = `${(l.studentEmail || '').toLowerCase().trim()}_${l.startDateTime}`;
        if (cancelledSlots.has(slotKey) && l.status !== 'cancelled') {
          consolidatedMap.set(id, {
            ...l,
            status: 'cancelled',
            cancelledAt: l.cancelledAt || new Date().toISOString(),
          });
        }
      });

      const list = Array.from(consolidatedMap.values());
      list.sort((a, b) => {
        const tA = new Date(a.startDateTime).getTime();
        const tB = new Date(b.startDateTime).getTime();
        return tB - tA;
      });

      callback(list);
    }, 50);
  };

  const handleQuerySnap = (queryKey: string, snap: any) => {
    const docsMap = new Map<string, LiveLesson>();
    snap.forEach((d: any) => {
      const data = d.data() as LiveLesson;
      const lessonId = data.id || d.id;
      docsMap.set(lessonId, { ...data, id: lessonId });
    });
    queryDocsMap.set(queryKey, docsMap);
    rebuildAndNotify();
  };

  try {
    if (isTeacher) {
      if (cleanUid) {
        const qUid = query(collection(db, 'lessons'), where('teacherUid', '==', cleanUid));
        unsubscribers.push(
          onSnapshot(
            qUid,
            (snap) => handleQuerySnap('t_uid', snap),
            (err) => console.warn('Teacher UID lessons snapshot notice:', err)
          )
        );
      }
      if (cleanEmail && cleanEmail !== cleanUid) {
        const qEmail = query(collection(db, 'lessons'), where('teacherEmail', '==', cleanEmail));
        unsubscribers.push(
          onSnapshot(
            qEmail,
            (snap) => handleQuerySnap('t_email', snap),
            (err) => console.warn('Teacher email lessons snapshot notice:', err)
          )
        );
      }
    } else {
      if (cleanUid) {
        const qUid = query(collection(db, 'lessons'), where('studentUid', '==', cleanUid));
        unsubscribers.push(
          onSnapshot(
            qUid,
            (snap) => handleQuerySnap('s_uid', snap),
            (err) => console.warn('Student UID lessons snapshot notice:', err)
          )
        );
      }
      if (cleanEmail && cleanEmail !== cleanUid) {
        const qEmail = query(collection(db, 'lessons'), where('studentEmail', '==', cleanEmail));
        unsubscribers.push(
          onSnapshot(
            qEmail,
            (snap) => handleQuerySnap('s_email', snap),
            (err) => console.warn('Student email lessons snapshot notice:', err)
          )
        );
      }
    }
  } catch (err) {
    console.warn('subscribeToStudentLessons init notice:', err);
  }

  return () => {
    if (notifyTimer) clearTimeout(notifyTimer);
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Subscribe to real-time student profile updates in Firestore strictly using users/{cleanUid}.
 */
export function subscribeToStudentProfile(
  studentUid: string,
  studentEmail: string | undefined,
  callback: (profile: Partial<UserProfile>) => void
): () => void {
  const db = getDb();
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!db || !cleanUid) return () => {};

  try {
    const userRef = doc(db, 'users', cleanUid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data) {
            callback({
              ...data,
              id: cleanUid,
              uid: cleanUid,
            } as Partial<UserProfile>);
          }
        }
      },
      (err) => console.warn(`subscribeToStudentProfile notice for ${cleanUid}:`, err)
    );
    return unsub;
  } catch {
    return () => {};
  }
}

/**
 * Real-time subscription to student S-Path (Gráfico S) weekly checks on Firestore document users/{studentUID}
 * Guarantees instantaneous cross-device reflection whenever a checkmark or target is updated.
 */
export function subscribeToStudentWeeklyChecks(
  studentUid: string,
  studentEmail: string | undefined,
  callback: (data: {
    checks: Record<string, boolean>;
    weeklyNativeLessonsTarget?: number;
    weeklyStudyDaysTarget?: number;
  }) => void
): () => void {
  const db = getDb();
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!db || !cleanUid) return () => {};

  try {
    const userRef = doc(db, 'users', cleanUid);
    const unsub = onSnapshot(
      userRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const baseChecks: Record<string, boolean> = {
            ...(data?.weeklyChecks || {}),
            ...(data?.sPathChecks || {}),
          };

          // Synchronize any completed memorization days from weeklyHomework
          if (data?.weeklyHomework?.completedPartsByDay && typeof data.weeklyHomework.completedPartsByDay === 'object') {
            Object.entries(data.weeklyHomework.completedPartsByDay).forEach(([day, isDone]) => {
              if (isDone) {
                baseChecks[`memorization_${day}`] = true;
              }
            });
          }

          // Also check memorization subcollection under users/{cleanUid}/memorization
          try {
            const memoCol = collection(db, 'users', cleanUid, 'memorization');
            const memoSnaps = await withFirestoreTimeout(getDocs(memoCol), 1500, null);
            if (memoSnaps && !memoSnaps.empty) {
              memoSnaps.forEach((d) => {
                if (d.data()?.completed) {
                  baseChecks[`memorization_${d.id}`] = true;
                }
              });
            }
          } catch {}

          cacheWeeklyChecksLocally(cleanUid, cleanEmail, baseChecks);

          callback({
            checks: baseChecks,
            weeklyNativeLessonsTarget: data?.weeklyNativeLessonsTarget,
            weeklyStudyDaysTarget: data?.weeklyStudyDaysTarget,
          });
        }
      },
      (err) => {
        console.warn('Real-time weeklyChecks notice:', err);
      }
    );
    return unsub;
  } catch {
    return () => {};
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
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);

  try {
    const sanitizedChecks: Record<string, boolean> = JSON.parse(JSON.stringify(checks || {}));

    // 1. Direct write strictly to Firestore document users/{cleanUid}
    if (db && cleanUid) {
      const userRef = doc(db, 'users', cleanUid);

      // Fetch existing checks first to guarantee no past checkmark is ever erased
      let existingChecks: Record<string, boolean> = {};
      try {
        const snap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
        if (snap && snap.exists()) {
          const data = snap.data();
          existingChecks = {
            ...(data?.weeklyChecks || {}),
            ...(data?.sPathChecks || {}),
          };
          if (data?.weeklyHomework?.completedPartsByDay) {
            Object.entries(data.weeklyHomework.completedPartsByDay).forEach(([day, isDone]) => {
              if (isDone) existingChecks[`memorization_${day}`] = true;
            });
          }
        }
      } catch {}

      const mergedChecks: Record<string, boolean> = {
        ...existingChecks,
        ...sanitizedChecks,
      };

      const payload: Record<string, any> = {
        weeklyChecks: mergedChecks,
        sPathChecks: mergedChecks,
        updatedAt: new Date().toISOString(),
      };
      if (typeof weeklyNativeLessonsTarget === 'number') {
        payload.weeklyNativeLessonsTarget = weeklyNativeLessonsTarget;
      }
      if (typeof weeklyStudyDaysTarget === 'number') {
        payload.weeklyStudyDaysTarget = weeklyStudyDaysTarget;
      }

      const stampedPayload = stampSchemaVersion(payload);
      assertSafeFirestoreWrite(`users/${cleanUid}`, stampedPayload, existingChecks, true);

      await withFirestoreTimeout(setDoc(userRef, stampedPayload, { merge: true }), 3500, null);

      // Ensure memorization checkmarks are also recorded in users/{cleanUid}/memorization/{day} subcollection
      const memoPromises: Promise<any>[] = [];
      Object.entries(mergedChecks).forEach(([key, isDone]) => {
        if (key.startsWith('memorization_') && isDone) {
          const day = key.replace('memorization_', '');
          const memoDocRef = doc(db, 'users', cleanUid, 'memorization', day);
          memoPromises.push(
            setDoc(
              memoDocRef,
              stampSchemaVersion({
                day,
                completed: true,
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
              { merge: true }
            )
          );
        }
      });
      if (memoPromises.length > 0) {
        await Promise.all(memoPromises).catch(() => {});
      }

      cacheWeeklyChecksLocally(cleanUid, cleanEmail, mergedChecks);
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
 * Persists the completion status of the Weekly Memorization Activity directly and permanently
 * to Firestore under the student's UID collection: users/{cleanUid}.
 * Writes:
 * 1. users/{cleanUid} (fields: weeklyChecks.memorization_{day}: isCompleted, sPathChecks.memorization_{day}: isCompleted, weeklyHomework.completedPartsByDay.{day}: isCompleted)
 * 2. users/{cleanUid}/memorization/{day} subcollection document ({ day, completed: isCompleted, completedAt: ISO, updatedAt: ISO })
 * 3. users/{cleanUid}/homework/{weekId} subcollection document ({ completedPartsByDay: { [day]: isCompleted }, isDayPartCompleted: isCompleted })
 * 4. users/{cleanUid}/studentJournal/memorization_{day}_{weekId} subcollection document & journal entry
 * 5. Mirrors to server API and in-memory session cache
 */
export async function saveMemorizationCompletionToFirestore(
  studentUid: string,
  studentEmail: string | undefined,
  day: DayOfWeek,
  isCompleted: boolean = true,
  homeworkData?: WeeklyHomeworkData,
  weekId: string = 'current_week'
): Promise<boolean> {
  const db = getDb();
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);

  if (!day) return false;

  const checkKey = `memorization_${day}`;
  const nowIso = new Date().toISOString();

  // 1. Immediately update in-memory session cache for instant 0ms non-blocking hydration
  if (cleanUid) {
    const currentCached = getCachedWeeklyChecks(cleanUid, cleanEmail);
    cacheWeeklyChecksLocally(cleanUid, cleanEmail, {
      ...currentCached,
      [checkKey]: isCompleted,
    });
  }

  // 2. Direct Firestore writes strictly under users/{cleanUid} collection
  if (db && cleanUid) {
    try {
      const userRef = doc(db, 'users', cleanUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
      const existingData = userSnap && userSnap.exists() ? userSnap.data() : {};

      const existingChecks = {
        ...(existingData?.weeklyChecks || {}),
        ...(existingData?.sPathChecks || {}),
      };
      const updatedChecks = {
        ...existingChecks,
        [checkKey]: isCompleted,
      };

      const existingHw = existingData?.weeklyHomework || homeworkData || {};
      const existingParts = existingHw?.completedPartsByDay || {};
      const updatedParts = {
        ...existingParts,
        [day]: isCompleted,
      };
      const updatedHw = {
        ...existingHw,
        isDayPartCompleted: isCompleted,
        completedPartsByDay: updatedParts,
        updatedAt: nowIso,
      };

      // 2a. Update user root document: users/{cleanUid}
      await withFirestoreTimeout(
        setDoc(
          userRef,
          {
            weeklyChecks: updatedChecks,
            sPathChecks: updatedChecks,
            weeklyHomework: updatedHw,
            updatedAt: nowIso,
          },
          { merge: true }
        ),
        3500,
        null
      );

      // 2b. Write to users/{cleanUid}/memorization/{day}
      const memoDocRef = doc(db, 'users', cleanUid, 'memorization', day);
      await withFirestoreTimeout(
        setDoc(
          memoDocRef,
          {
            day,
            completed: isCompleted,
            completedAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        ),
        2500,
        null
      );

      // 2c. Write to users/{cleanUid}/homework/{weekId}
      const hwDocRef = doc(db, 'users', cleanUid, 'homework', weekId);
      await withFirestoreTimeout(
        setDoc(
          hwDocRef,
          {
            id: weekId,
            completedPartsByDay: updatedParts,
            isDayPartCompleted: isCompleted,
            studentUid: cleanUid,
            studentEmail: cleanEmail,
            updatedAt: nowIso,
          },
          { merge: true }
        ),
        2500,
        null
      );

      // 2d. Record in studentJournal
      const currentWeekNumber = Number(existingData?.weeklyCycle) || 1;
      const journalEntryId = `memorization_${day}_${currentWeekNumber}`;
      const journalEntry: StudentJournalEntry = {
        id: journalEntryId,
        type: 'memorization',
        date: getDateForDayInCurrentWeek(day),
        dayOfWeek: day,
        week: currentWeekNumber,
        timestamp: Date.now(),
        title: 'Weekly Memorization Activity',
        details: `Completed Memorization for ${day}`,
        studentUid: cleanUid,
        studentEmail: cleanEmail,
      };

      const existingJournal: StudentJournalEntry[] = Array.isArray(existingData?.studentJournal)
        ? existingData.studentJournal
        : [];
      const filteredJournal = existingJournal.filter(
        (e) => !(e.type === 'memorization' && e.dayOfWeek === day && e.week === currentWeekNumber)
      );
      const updatedJournal = isCompleted ? [journalEntry, ...filteredJournal] : filteredJournal;

      await withFirestoreTimeout(
        setDoc(userRef, { studentJournal: updatedJournal }, { merge: true }),
        2000,
        null
      );

      const journalEntryRef = doc(db, 'users', cleanUid, 'studentJournal', journalEntryId);
      if (isCompleted) {
        await withFirestoreTimeout(setDoc(journalEntryRef, journalEntry, { merge: true }), 2000, null);
      } else {
        await withFirestoreTimeout(deleteDoc(journalEntryRef), 2000, null);
      }

      // 2e. Top-level student_homework partition for cross-device synchronization
      const topLevelRef = doc(db, 'student_homework', cleanUid);
      await withFirestoreTimeout(
        setDoc(
          topLevelRef,
          {
            completedPartsByDay: updatedParts,
            isDayPartCompleted: isCompleted,
            updatedAt: nowIso,
          },
          { merge: true }
        ),
        2000,
        null
      );
    } catch (err) {
      console.warn('saveMemorizationCompletionToFirestore notice:', err);
    }
  }

  // 3. Mirror to server API endpoints
  if (cleanEmail || cleanUid) {
    fetch('/api/routines/weekly-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: cleanEmail || cleanUid,
        studentUid: cleanUid,
        checks: { [checkKey]: isCompleted },
      }),
    }).catch(() => {});

    fetch('/api/homework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: cleanEmail,
        uid: cleanUid,
        weeklyHomework: {
          completedPartsByDay: { [day]: isCompleted },
          isDayPartCompleted: isCompleted,
        },
      }),
    }).catch(() => {});
  }

  return true;
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
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);

  // Check in-memory session cache first for fast 0ms hydration
  const localCached = getCachedWeeklyChecks(cleanUid, cleanEmail);

  // 1. Try reading directly strictly from Firestore users/{cleanUid}
  if (db && cleanUid) {
    try {
      const userRef = doc(db, 'users', cleanUid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2500, null);
      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        validateFirestoreDocument('users', data, { path: `users/${cleanUid}` });
        const mergedChecks: Record<string, boolean> = {
          ...localCached,
          ...(data?.weeklyChecks || {}),
          ...(data?.sPathChecks || {}),
        };

        // If weeklyHomework has completed parts, merge them
        if (data?.weeklyHomework?.completedPartsByDay && typeof data.weeklyHomework.completedPartsByDay === 'object') {
          Object.entries(data.weeklyHomework.completedPartsByDay).forEach(([day, isDone]) => {
            if (isDone) mergedChecks[`memorization_${day}`] = true;
          });
        }

        // Also check memorization subcollection under users/{cleanUid}/memorization
        try {
          const memoCol = collection(db, 'users', cleanUid, 'memorization');
          const memoSnaps = await withFirestoreTimeout(getDocs(memoCol), 2000, null);
          if (memoSnaps && !memoSnaps.empty) {
            memoSnaps.forEach((d) => {
              if (d.data()?.completed) {
                mergedChecks[`memorization_${d.id}`] = true;
              }
            });
          }
        } catch {}

        // Also check homework subcollection under users/{cleanUid}/homework/current_week
        try {
          const hwSubDoc = doc(db, 'users', cleanUid, 'homework', 'current_week');
          const hwSubSnap = await withFirestoreTimeout(getDoc(hwSubDoc), 1500, null);
          if (hwSubSnap && hwSubSnap.exists()) {
            const hwData = hwSubSnap.data();
            if (hwData?.completedPartsByDay && typeof hwData.completedPartsByDay === 'object') {
              Object.entries(hwData.completedPartsByDay).forEach(([day, isDone]) => {
                if (isDone) mergedChecks[`memorization_${day}`] = true;
              });
            }
          }
        } catch {}

        cacheWeeklyChecksLocally(cleanUid, cleanEmail, mergedChecks);

        return {
          checks: mergedChecks,
          weeklyNativeLessonsTarget: data?.weeklyNativeLessonsTarget,
          weeklyStudyDaysTarget: data?.weeklyStudyDaysTarget,
        };
      }
    } catch (err) {
      console.warn('Notice fetching weeklyChecks from Firestore UID:', err);
    }
  }

  // 2. Check legacy email doc once if not found on cleanUid
  if (db && cleanEmail) {
    const legacyDocId = `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;
    if (legacyDocId !== cleanUid) {
      try {
        const altRef = doc(db, 'users', legacyDocId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          const altChecks: Record<string, boolean> = {
            ...localCached,
            ...(altData?.weeklyChecks || {}),
            ...(altData?.sPathChecks || {}),
          };
          if (altData?.weeklyHomework?.completedPartsByDay) {
            Object.entries(altData.weeklyHomework.completedPartsByDay).forEach(([day, isDone]) => {
              if (isDone) altChecks[`memorization_${day}`] = true;
            });
          }
          const result = {
            checks: altChecks,
            weeklyNativeLessonsTarget: altData.weeklyNativeLessonsTarget,
            weeklyStudyDaysTarget: altData.weeklyStudyDaysTarget,
          };
          // Migrate to cleanUid
          if (cleanUid) {
            setDoc(doc(db, 'users', cleanUid), {
              weeklyChecks: result.checks,
              sPathChecks: result.checks,
              weeklyNativeLessonsTarget: result.weeklyNativeLessonsTarget,
              weeklyStudyDaysTarget: result.weeklyStudyDaysTarget,
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
          cacheWeeklyChecksLocally(cleanUid, cleanEmail, result.checks);
          return result;
        }
      } catch {}
    }
  }

  // 3. Fallback to server API
  if (cleanEmail || cleanUid) {
    try {
      const res = await fetch(
        `/api/routines/weekly-checks?studentEmail=${encodeURIComponent(cleanEmail)}&uid=${encodeURIComponent(cleanUid)}`
      );
      if (res.ok) {
        const apiData = await res.json();
        const apiChecks = { ...localCached, ...(apiData?.checks || {}) };
        cacheWeeklyChecksLocally(cleanUid, cleanEmail, apiChecks);
        return {
          checks: apiChecks,
          weeklyNativeLessonsTarget: apiData?.weeklyNativeLessonsTarget,
          weeklyStudyDaysTarget: apiData?.weeklyStudyDaysTarget,
        };
      }
    } catch {}
  }

  return { checks: localCached };
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
    // Do not mark past/retroactive day reviews, but do mark the scheduled day even if it was a repeated video
    if ((entry as any).reviewedPastDay) {
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
    id: String(
      entry.id && !entry.id.startsWith('video_') && !entry.id.startsWith('audio_') && !entry.id.startsWith('memorization_')
        ? `${entry.type}_${entry.dayOfWeek || 'any'}_${entry.week || 1}_${entry.id}`
        : (entry.id || `${entry.type}_${entry.dayOfWeek || 'any'}_${Date.now()}`)
    ).trim(),
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
    ...(entry as any),
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
          e.dayOfWeek.toLowerCase() === sanitizedEntry.dayOfWeek.toLowerCase()
        ) {
          return false;
        }
        return true;
      });

      const updatedJournal = [sanitizedEntry, ...filtered];

      // Prepare updated weeklyChecks and watched/listened arrays for complete cross-compatibility
      const todayDay = getTodayDayOfWeek();
      const entryDay = sanitizedEntry.dayOfWeek;
      const dayIndex = entryDay ? DAYS_OF_WEEK.indexOf(entryDay) : -1;
      const todayIndex = DAYS_OF_WEEK.indexOf(todayDay);
      const isPastDay = Boolean(
        (sanitizedEntry as any).reviewedPastDay ||
        (dayIndex !== -1 && todayIndex !== -1 && dayIndex < todayIndex)
      );

      const stepId = mapJournalTypeToStepId(sanitizedEntry.type);
      const checkKey = sanitizedEntry.dayOfWeek ? `${stepId}_${sanitizedEntry.dayOfWeek}` : null;
      const currentChecks = userSnap?.exists() ? (userSnap.data()?.weeklyChecks || {}) : {};

      // S-Path rule: Ensure completing an activity on a given day (even if repeated video) marks that day completed.
      // Do not mark past/retroactive days, but do mark active/current day.
      const updatedChecks = (checkKey && !isPastDay)
        ? { ...currentChecks, [checkKey]: true }
        : currentChecks;

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
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);

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
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
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

    // 3. Fallback: check legacy email doc if different and migrate
    if (journalMap.size === 0 && cleanEmail) {
      const legacyDocId = `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '-')}`;
      if (legacyDocId !== cleanUid) {
        const altRef = doc(db, 'users', legacyDocId);
        const altSnap = await withFirestoreTimeout(getDoc(altRef), 2000, null);
        if (altSnap && altSnap.exists()) {
          const altData = altSnap.data();
          if (Array.isArray(altData?.studentJournal)) {
            altData.studentJournal.forEach((entry: StudentJournalEntry) => {
              if (entry && entry.id) journalMap.set(entry.id, entry);
            });
            // Migrate to cleanUid
            if (journalMap.size > 0 && cleanUid) {
              setDoc(doc(db, 'users', cleanUid), {
                studentJournal: Array.from(journalMap.values()),
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch(() => {});
            }
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
    let existingHomework: any = {};
    if (db && cleanUid) {
      try {
        const userRef = doc(db, 'users', cleanUid);
        const uSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
        if (uSnap && uSnap.exists()) {
          existingHomework = uSnap.data()?.weeklyHomework || {};
        }
      } catch {}
    }

    const mergedCompletedParts = {
      ...(existingHomework?.completedPartsByDay || {}),
      ...(sanitizedHomework?.completedPartsByDay || {}),
    };

    const mergedStudentAnswers = {
      matching: { ...(existingHomework?.studentAnswers?.matching || {}), ...(sanitizedHomework?.studentAnswers?.matching || {}) },
      fillInBlanks: { ...(existingHomework?.studentAnswers?.fillInBlanks || {}), ...(sanitizedHomework?.studentAnswers?.fillInBlanks || {}) },
      sentences: { ...(existingHomework?.studentAnswers?.sentences || {}), ...(sanitizedHomework?.studentAnswers?.sentences || {}) },
      quizAnswers: { ...(existingHomework?.studentAnswers?.quizAnswers || {}), ...(sanitizedHomework?.studentAnswers?.quizAnswers || {}) },
    };

    const payload = stampSchemaVersion({
      ...existingHomework,
      ...sanitizedHomework,
      id: weekId,
      studentUid: cleanUid,
      studentEmail: cleanEmail,
      completedPartsByDay: mergedCompletedParts,
      studentAnswers: mergedStudentAnswers,
      updatedAt: new Date().toISOString(),
    });

    if (db && cleanUid) {
      assertSafeFirestoreWrite(`users/${cleanUid}/homework/${weekId}`, payload, undefined, true);
      assertSafeFirestoreWrite(`student_homework/${cleanUid}`, payload, undefined, true);

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
    }

    // 4. Mirror to server API for backup persistence
    if (cleanEmail || cleanUid) {
      fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: cleanEmail,
          uid: cleanUid,
          weeklyHomework: payload,
        }),
      }).catch(() => {});
    }

    return true;
  } catch (error) {
    console.error(`[Firestore Error] Failed to save homework for ${cleanUid}:`, error);
    handleFirestoreError(error, OperationType.WRITE, `users/${cleanUid}/homework/${weekId}`);
    return false;
  }
}

/**
 * Fetch student weekly homework and activity progress directly from Cloud Firestore.
 * Prioritizes Firestore users/{cleanUid}/homework/{weekId}, then users/{cleanUid}.weeklyHomework,
 * then top-level student_homework/{cleanUid}.
 */
export async function fetchStudentHomeworkProgressFromFirestore(
  studentUid: string,
  studentEmail?: string,
  weekId: string = 'current_week'
): Promise<WeeklyHomeworkData | null> {
  const db = getDb();
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);

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

    // 4. Server API fallback
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

  const unsubs: (() => void)[] = [];

  // 1. Subcollection users/{cleanUid}/homework/{weekId}
  try {
    const hwDocRef = doc(db, 'users', cleanUid, 'homework', weekId);
    unsubs.push(
      onSnapshot(
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
          console.warn('Real-time notice for student homework subcollection listener:', err);
        }
      )
    );
  } catch {}

  // 2. Parent doc users/{cleanUid} field weeklyHomework
  try {
    const userRef = doc(db, 'users', cleanUid);
    unsubs.push(
      onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (
              data?.weeklyHomework &&
              (data.weeklyHomework.completedPartsByDay ||
                data.weeklyHomework.studentAnswers ||
                data.weeklyHomework.matchingPairs)
            ) {
              callback(data.weeklyHomework as WeeklyHomeworkData);
            }
          }
        },
        () => {}
      )
    );
  } catch {}

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * Real-time subscription to student daily journal entries (Sentence of the Day).
 * Synchronizes instantly across devices when sentences are created, edited, or deleted.
 */
export function subscribeToStudentDailyJournal(
  studentUid: string,
  studentEmail: string | undefined,
  callback: (entries: DailyJournalEntry[]) => void
): () => void {
  const db = getDb();
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!db || !cleanUid) return () => {};

  const unsubscribers: (() => void)[] = [];
  const journalMap = new Map<string, DailyJournalEntry>();

  const rebuildAndNotify = () => {
    const list = Array.from(journalMap.values());
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });
    callback(list);
  };

  try {
    const subCol = collection(db, 'users', cleanUid, 'journal');
    unsubscribers.push(
      onSnapshot(
        subCol,
        (snap) => {
          journalMap.clear();
          snap.forEach((d) => {
            const item = d.data() as DailyJournalEntry;
            if (item?.id) journalMap.set(item.id, item);
          });
          rebuildAndNotify();
        },
        () => {}
      )
    );

    const userRef = doc(db, 'users', cleanUid);
    unsubscribers.push(
      onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.dailyJournalEntries)) {
              data.dailyJournalEntries.forEach((item: DailyJournalEntry) => {
                if (item?.id) journalMap.set(item.id, item);
              });
              rebuildAndNotify();
            }
          }
        },
        () => {}
      )
    );
  } catch {}

  return () => {
    unsubscribers.forEach((u) => u());
  };
}

/**
 * Delete a student daily journal entry directly from Cloud Firestore and sync across all devices.
 */
export async function deleteStudentJournalEntryFromFirestore(
  studentUid: string,
  entryId: string,
  studentEmail?: string
): Promise<boolean> {
  const db = getDb();
  if (!db || !entryId) return false;
  const cleanEmail = (studentEmail || '').toLowerCase().trim();
  const cleanUid = normalizeUid(studentUid, cleanEmail);
  if (!cleanUid) return false;

  try {
    // 1. Delete from subcollection
    const entryRef = doc(db, 'users', cleanUid, 'journal', entryId);
    await withFirestoreTimeout(deleteDoc(entryRef), 2000, null);

    // 2. Remove from user profile doc dailyJournalEntries array
    const userRef = doc(db, 'users', cleanUid);
    const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000, null);
    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      if (Array.isArray(data?.dailyJournalEntries)) {
        const filtered = data.dailyJournalEntries.filter((e: DailyJournalEntry) => e.id !== entryId);
        await withFirestoreTimeout(
          setDoc(userRef, { dailyJournalEntries: filtered, updatedAt: new Date().toISOString() }, { merge: true }),
          2000,
          null
        );
      }
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${cleanUid}/journal/${entryId}`);
    return false;
  }
}

/**
 * Real-time subscription to student daily routine video/topic selections across Monday-Sunday.
 * Ensures that topic choices or custom video suggestions made on one device appear instantly on other devices.
 */
export function subscribeToStudentDailyRoutines(
  studentUid: string,
  callback: (routines: Partial<Record<DayOfWeek, any>>) => void
): () => void {
  const db = getDb();
  const cleanUid = normalizeUid(studentUid);
  if (!db || !cleanUid) return () => {};

  try {
    const routinesCol = collection(db, 'users', cleanUid, 'routines');
    const unsub = onSnapshot(
      routinesCol,
      (snapshot) => {
        const routinesMap: Partial<Record<DayOfWeek, any>> = {};
        snapshot.forEach((docSnap) => {
          routinesMap[docSnap.id as DayOfWeek] = docSnap.data();
        });
        callback(routinesMap);
      },
      (err) => console.warn('Real-time student routines subscription notice:', err)
    );
    return unsub;
  } catch (err) {
    console.warn('subscribeToStudentDailyRoutines error:', err);
    return () => {};
  }
}


