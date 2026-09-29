import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Check,
  Calendar,
  History,
  Lightbulb,
  Copy,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Minus,
  Clock,
  RotateCcw,
  Save,
  Download,
  Share2,
  ChevronDown,
  Loader2,
  BookOpen,
  ExternalLink,
  FolderSync,
  FolderCheck,
  AlertCircle,
  CloudUpload,
} from 'lucide-react';
import {
  LiveLesson,
  StudentProfile,
  GoogleAccount,
  LiveLessonVocabNote,
  StudentDictionaryEntry,
  SessionNotesDocument,
} from '../types';
import { formatDateInTimeZone, formatTimeInTimeZone } from '../utils/timezone';
import { doc, setDoc } from 'firebase/firestore';
import { getDb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { getGoogleOAuthToken } from '../utils/auth';
import {
  syncSessionNotesToGoogleDrive,
  formatSessionNotesFileName,
  findExistingSessionNotesFile,
  getOrCreateSessionNotesFolder,
  GOOGLE_DRIVE_SESSION_FOLDER,
} from '../utils/googleDrive';

interface TeacherLiveLessonNotesPanelProps {
  lessons: LiveLesson[];
  students: StudentProfile[];
  currentAccount: GoogleAccount | null;
  selectedStudentFilter?: string;
  onSaveLessonNotes: (
    lessonId: string,
    notes: {
      topic?: string;
      liveNotes?: string;
      recommendations?: string;
      pronunciationNotes?: string;
      grammarAndPhrasing?: string;
      vocabularyNotes?: LiveLessonVocabNote[];
      sessionNotesDocument?: string;
      sessionDate?: string;
      driveFileId?: string;
      driveFileUrl?: string;
      driveFolderName?: string;
      driveLastSyncedAt?: string;
    }
  ) => void;
  onAddWordsToDictionary?: (words: StudentDictionaryEntry[], studentEmail?: string) => void;
  onAddWordsToWeeklyActivity?: (words: string[], studentEmail: string) => void;
  onSendStudentNotification?: (
    studentEmail: string,
    title: string,
    message: string
  ) => void;
  timeZone?: string;
}

export const TeacherLiveLessonNotesPanel: React.FC<TeacherLiveLessonNotesPanelProps> = ({
  lessons,
  students,
  currentAccount,
  selectedStudentFilter,
  onSaveLessonNotes,
  onAddWordsToDictionary,
  onAddWordsToWeeklyActivity,
  onSendStudentNotification,
  timeZone = 'America/Sao_Paulo',
}) => {
  // Filter scheduled or completed lessons for this teacher
  const teacherLessons = lessons.filter((l) => {
    if (!currentAccount?.email) return true;
    const tEmail = (currentAccount.email || '').toLowerCase().trim();
    const tUid = (currentAccount.id || (currentAccount as any).uid || '').trim();
    const lTeacherEmail = (l.teacherEmail || (l as any).tutorEmail || '').toLowerCase().trim();
    const lTeacherUid = (l.teacherUid || (l as any).tutorUid || '').trim();
    return (
      (lTeacherEmail && lTeacherEmail === tEmail) ||
      (lTeacherUid && tUid && lTeacherUid === tUid)
    );
  });

  // Selected session ID and student
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Note fields
  const [topic, setTopic] = useState<string>('');
  const [notesContent, setNotesContent] = useState<string>('');

  // UI state
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [savedSuccessBanner, setSavedSuccessBanner] = useState<boolean>(false);

  // Google Drive state
  const { googleOAuthToken, connectGoogleDrive } = useAuth();
  const [driveSyncStatus, setDriveSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'not_connected'>('idle');
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);
  const [driveFileName, setDriveFileName] = useState<string | null>(null);
  const [driveLastSyncedAt, setDriveLastSyncedAt] = useState<string | null>(null);
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);
  const [driveSuccessToast, setDriveSuccessToast] = useState<string | null>(null);
  const [driveAutoUpdateConfirmed, setDriveAutoUpdateConfirmed] = useState<boolean>(false);

  // Explicit User Confirmation Dialog for modifying existing Google Drive file
  const [showDriveConfirmModal, setShowDriveConfirmModal] = useState<boolean>(false);
  const [pendingDriveUpdate, setPendingDriveUpdate] = useState<{
    fileId: string;
    fileName: string;
    content: string;
    topic: string;
  } | null>(null);

  // Textarea ref for cursor manipulation and keyboard shortcuts
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Synchronize when selectedStudentFilter changes from parent
  useEffect(() => {
    if (selectedStudentFilter && selectedStudentFilter !== 'all') {
      setSelectedStudentEmail(selectedStudentFilter);
      const studentLesson = teacherLessons.find(
        (l) => l.studentEmail?.toLowerCase() === selectedStudentFilter.toLowerCase()
      );
      if (studentLesson) {
        setSelectedLessonId(studentLesson.id);
      } else {
        setSelectedLessonId('');
      }
    } else {
      if (teacherLessons.length > 0 && !selectedLessonId) {
        const scheduled = teacherLessons.find((l) => l.status === 'scheduled');
        const first = scheduled || teacherLessons[0];
        if (first) {
          setSelectedLessonId(first.id);
          setSelectedStudentEmail(first.studentEmail);
        }
      } else if (students.length > 0 && !selectedStudentEmail) {
        setSelectedStudentEmail(students[0].email);
      }
    }
  }, [selectedStudentFilter, teacherLessons, students]);

  // Selected student object
  const activeStudent = students.find(
    (s) => s.email.toLowerCase() === selectedStudentEmail.toLowerCase()
  );

  const activeLesson = teacherLessons.find((l) => l.id === selectedLessonId);

  // Compute effective session date from lesson or state
  useEffect(() => {
    if (activeLesson?.startDateTime) {
      const datePart = activeLesson.startDateTime.split('T')[0];
      if (datePart) setSessionDate(datePart);
    } else {
      setSessionDate(new Date().toISOString().split('T')[0]);
    }
  }, [activeLesson]);

  // Generate initial starter template: completely blank page with only Date, Student, and Topic annotations as shown in user screenshot
  const getStarterTemplate = useCallback(
    (studentName: string, dateStr: string, currentTopic: string) => {
      const topicStr = (currentTopic || '').trim() || 'Trial';
      return `Native Friend In-Session Notes & Recommendations\nDate: ${dateStr} | Student: ${studentName || 'Student'}\nTopic: ${topicStr}\n\n`;
    },
    []
  );

  // Helper to detect if existing content is merely the old boilerplate template
  const isOnlyOldTemplate = (content: string) => {
    if (!content || !content.trim()) return true;
    const cleaned = content.replace(/\r\n/g, '\n').trim();
    if (
      cleaned.includes('🎯 PRONUNCIATION & PHONETICS:') &&
      cleaned.includes('💬 KEY VOCABULARY & NATURAL PHRASES:') &&
      cleaned.includes('⚡ GRAMMAR & PHRASING CORRECTIONS:')
    ) {
      const lines = cleaned.split('\n');
      const hasCustomNotes = lines.some((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•') && trimmed.replace(/^[•\-\s]+/, '').trim().length > 0) {
          return true;
        }
        if (trimmed.startsWith('Instead of:') && trimmed.replace('Instead of:', '').trim().length > 0) {
          return true;
        }
        if (trimmed.startsWith('Say:') && trimmed.replace('Say:', '').trim().length > 0) {
          return true;
        }
        return false;
      });
      return !hasCustomNotes;
    }
    return false;
  };

  // When selected lesson or student changes, populate document
  useEffect(() => {
    isInitialLoadRef.current = true;
    const currentLesson = teacherLessons.find((l) => l.id === selectedLessonId);

    if (currentLesson) {
      setSelectedStudentEmail(currentLesson.studentEmail);
      const lessonTopic = currentLesson.title || 'Trial';
      setTopic(lessonTopic);

      // Preferred unified document: sessionNotesDocument > liveNotes > recommendations
      const docContent =
        currentLesson.sessionNotesDocument ||
        currentLesson.liveNotes ||
        currentLesson.recommendations ||
        '';

      if (docContent.trim() && !isOnlyOldTemplate(docContent)) {
        setNotesContent(docContent);
      } else {
        const sName =
          currentLesson.studentName ||
          activeStudent?.name ||
          currentLesson.studentEmail.split('@')[0];
        const dateStr = currentLesson.startDateTime
          ? currentLesson.startDateTime.split('T')[0]
          : sessionDate;
        setNotesContent(getStarterTemplate(sName, dateStr, lessonTopic));
      }

      if (currentLesson.notesLastSavedAt) {
        setLastSavedTimestamp(currentLesson.notesLastSavedAt);
      }

      if (currentLesson.driveFileId) {
        setDriveFileId(currentLesson.driveFileId);
        setDriveFileUrl(currentLesson.driveFileUrl || null);
        setDriveLastSyncedAt(currentLesson.driveLastSyncedAt || null);
        setDriveSyncStatus('synced');
      } else {
        setDriveFileId(null);
        setDriveFileUrl(null);
        setDriveLastSyncedAt(null);
        setDriveSyncStatus('idle');
      }
    } else if (selectedStudentEmail) {
      // Find latest notes for this student if any
      const studentLessons = teacherLessons.filter(
        (l) => l.studentEmail?.toLowerCase() === selectedStudentEmail.toLowerCase()
      );
      const latestWithNotes = studentLessons.find(
        (l) => l.sessionNotesDocument || l.liveNotes || l.recommendations
      );

      if (
        latestWithNotes &&
        !isOnlyOldTemplate(
          latestWithNotes.sessionNotesDocument ||
            latestWithNotes.liveNotes ||
            latestWithNotes.recommendations ||
            ''
        )
      ) {
        setTopic(latestWithNotes.title || '');
        setNotesContent(
          latestWithNotes.sessionNotesDocument ||
            latestWithNotes.liveNotes ||
            latestWithNotes.recommendations ||
            ''
        );
        if (latestWithNotes.notesLastSavedAt) {
          setLastSavedTimestamp(latestWithNotes.notesLastSavedAt);
        }
        if (latestWithNotes.driveFileId) {
          setDriveFileId(latestWithNotes.driveFileId);
          setDriveFileUrl(latestWithNotes.driveFileUrl || null);
          setDriveLastSyncedAt(latestWithNotes.driveLastSyncedAt || null);
          setDriveSyncStatus('synced');
        } else {
          setDriveFileId(null);
          setDriveFileUrl(null);
          setDriveLastSyncedAt(null);
          setDriveSyncStatus('idle');
        }
      } else {
        const defaultTopic = activeLesson?.title || 'Trial';
        setTopic(defaultTopic);
        const sName = activeStudent?.name || selectedStudentEmail.split('@')[0];
        setNotesContent(getStarterTemplate(sName, sessionDate, defaultTopic));
        setDriveFileId(null);
        setDriveFileUrl(null);
        setDriveLastSyncedAt(null);
        setDriveSyncStatus('idle');
      }
    }

    setTimeout(() => {
      isInitialLoadRef.current = false;
      // Focus and place cursor on the blank line ready to type
      if (textareaRef.current) {
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 400);
  }, [selectedLessonId, selectedStudentEmail]);

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    setNotesContent((prev) => {
      if (!prev) return prev;
      const lines = prev.split('\n');
      if (
        lines.length <= 5 &&
        lines[0]?.includes('Native Friend In-Session Notes') &&
        lines[2]?.startsWith('Topic:')
      ) {
        lines[2] = `Topic: ${newTopic}`;
        return lines.join('\n');
      }
      return prev;
    });
  };

  const handleDateChange = (newDate: string) => {
    setSessionDate(newDate);
    setNotesContent((prev) => {
      if (!prev) return prev;
      const lines = prev.split('\n');
      if (
        lines.length <= 5 &&
        lines[0]?.includes('Native Friend In-Session Notes') &&
        lines[1]?.startsWith('Date:')
      ) {
        const studentPart = lines[1].includes('|')
          ? lines[1].split('|')[1]
          : ` Student: ${activeStudent?.name || 'Student'}`;
        lines[1] = `Date: ${newDate} |${studentPart}`;
        return lines.join('\n');
      }
      return prev;
    });
  };

  const handleResetDocument = () => {
    const sName =
      activeStudent?.name ||
      (selectedStudentEmail ? selectedStudentEmail.split('@')[0] : 'Student');
    const effTopic = topic || activeLesson?.title || 'Trial';
    setNotesContent(getStarterTemplate(sName, sessionDate, effTopic));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 10);
  };

  // Past notes history for this student
  const studentHistory = teacherLessons.filter(
    (l) =>
      l.studentEmail?.toLowerCase() === selectedStudentEmail.toLowerCase() &&
      (l.sessionNotesDocument ||
        l.liveNotes ||
        l.recommendations ||
        (l.vocabularyNotes && l.vocabularyNotes.length > 0))
  );

  /**
   * Executes Google Drive file upload/update using the teacher's Google OAuth credentials
   */
  const executeDriveSync = useCallback(
    async (
      contentToSync: string,
      topicToSync: string,
      sName: string,
      effDate: string,
      targetFileId?: string
    ) => {
      const token = googleOAuthToken || getGoogleOAuthToken();
      if (!token) {
        setDriveSyncStatus('not_connected');
        return;
      }

      setDriveSyncStatus('syncing');
      setDriveSyncError(null);

      const targetLessonId = selectedLessonId || (activeLesson ? activeLesson.id : '');
      const cleanEmail = selectedStudentEmail.toLowerCase().trim();
      const sessionKey =
        targetLessonId ||
        `session_${effDate}_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      try {
        const res = await syncSessionNotesToGoogleDrive({
          accessToken: token,
          studentName: sName,
          sessionDate: effDate,
          content: contentToSync,
          existingFileId: targetFileId || driveFileId || (activeLesson as any)?.driveFileId || undefined,
        });

        if (res.success && res.fileId) {
          const syncedIso = new Date().toISOString();
          setDriveFileId(res.fileId);
          setDriveFileName(res.fileName || formatSessionNotesFileName(sName, effDate));
          if (res.webViewLink) setDriveFileUrl(res.webViewLink);
          setDriveLastSyncedAt(syncedIso);
          setDriveSyncStatus('synced');

          const toastMsg = res.isUpdated
            ? `Google Drive document updated in "It's Simple - Session Notes"`
            : `Google Drive document created in "It's Simple - Session Notes"`;
          setDriveSuccessToast(toastMsg);
          setTimeout(() => setDriveSuccessToast(null), 4500);

          const drivePayload = {
            driveFileId: res.fileId,
            driveFileUrl: res.webViewLink || '',
            driveFolderName: res.folderName || GOOGLE_DRIVE_SESSION_FOLDER,
            driveLastSyncedAt: syncedIso,
          };

          // 1. Update Firestore docs with Drive sync metadata
          const firestore = getDb();
          if (firestore) {
            setDoc(doc(firestore, 'session_notes', sessionKey), drivePayload, { merge: true }).catch(() => null);
            const userDocId = activeStudent?.uid || cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (userDocId) {
              setDoc(doc(firestore, 'users', userDocId, 'session_notes', sessionKey), drivePayload, { merge: true }).catch(() => null);
            }
            if (targetLessonId) {
              setDoc(doc(firestore, 'lessons', targetLessonId), drivePayload, { merge: true }).catch(() => null);
            }
          }

          // 2. Server API sync with Drive metadata
          fetch('/api/session-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: sessionKey,
              sessionDate: effDate,
              lessonId: targetLessonId || undefined,
              studentEmail: cleanEmail,
              topic: topicToSync,
              content: contentToSync,
              ...drivePayload,
            }),
          }).catch(() => null);

          // 3. Update lesson state in parent
          if (targetLessonId) {
            onSaveLessonNotes(targetLessonId, {
              topic: topicToSync,
              liveNotes: contentToSync,
              recommendations: contentToSync,
              sessionNotesDocument: contentToSync,
              sessionDate: effDate,
              ...drivePayload,
            });
          }
        } else {
          setDriveSyncStatus('error');
          setDriveSyncError(res.error || 'Failed to sync with Google Drive.');
        }
      } catch (err: any) {
        setDriveSyncStatus('error');
        setDriveSyncError(err.message || 'Error communicating with Google Drive.');
      }
    },
    [
      googleOAuthToken,
      selectedLessonId,
      activeLesson,
      selectedStudentEmail,
      driveFileId,
      activeStudent,
      onSaveLessonNotes,
    ]
  );

  /**
   * Save In-Session Notes to Firestore, Server, and Google Drive
   * Automatically persists document keyed by specific session date/ID
   */
  const persistSessionDocument = useCallback(
    async (contentToSave: string, topicToSave: string, explicitSave: boolean = false) => {
      if (!selectedStudentEmail && !selectedLessonId) return;

      setIsSaving(true);
      const cleanEmail = selectedStudentEmail.toLowerCase().trim();
      const effectiveDate = sessionDate || new Date().toISOString().split('T')[0];
      const targetLessonId = selectedLessonId || (activeLesson ? activeLesson.id : '');
      const sessionKey =
        targetLessonId ||
        `session_${effectiveDate}_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      const nowIso = new Date().toISOString();

      const documentPayload: SessionNotesDocument = {
        id: sessionKey,
        sessionDate: effectiveDate,
        lessonId: targetLessonId || undefined,
        studentEmail: cleanEmail,
        studentUid: activeStudent?.uid || undefined,
        teacherEmail: currentAccount?.email || undefined,
        teacherName: currentAccount?.name || 'Native Friend',
        topic: topicToSave,
        content: contentToSave,
        driveFileId: driveFileId || undefined,
        driveFileUrl: driveFileUrl || undefined,
        driveFolderName: GOOGLE_DRIVE_SESSION_FOLDER,
        driveLastSyncedAt: driveLastSyncedAt || undefined,
        updatedAt: nowIso,
      };

      // 1. Client-Side Firestore Persistence
      try {
        const firestore = getDb();
        if (firestore) {
          // Top-level /session_notes/{sessionKey}
          setDoc(doc(firestore, 'session_notes', sessionKey), documentPayload, {
            merge: true,
          }).catch((err) => console.warn('Firestore /session_notes notice:', err));

          // Under student user record: /users/{studentId}/session_notes/{sessionKey}
          const userDocId = activeStudent?.uid || cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (userDocId) {
            setDoc(
              doc(firestore, 'users', userDocId, 'session_notes', sessionKey),
              documentPayload,
              { merge: true }
            ).catch((err) => console.warn('Firestore /users/.../session_notes notice:', err));
          }

          // Under /lessons/{lessonId} if lesson exists
          if (targetLessonId) {
            setDoc(
              doc(firestore, 'lessons', targetLessonId),
              {
                sessionNotesDocument: contentToSave,
                liveNotes: contentToSave,
                recommendations: contentToSave,
                title: topicToSave,
                sessionDate: effectiveDate,
                notesLastSavedAt: nowIso,
                updatedAt: nowIso,
                ...(driveFileId ? { driveFileId } : {}),
                ...(driveFileUrl ? { driveFileUrl } : {}),
                ...(driveLastSyncedAt ? { driveLastSyncedAt } : {}),
                driveFolderName: GOOGLE_DRIVE_SESSION_FOLDER,
              },
              { merge: true }
            ).catch((err) => console.warn('Firestore /lessons notice:', err));
          }
        }
      } catch (err) {
        console.warn('Direct Firestore save notice:', err);
      }

      // 2. Server API Persistence (ensures persistence in app_state & Firestore)
      fetch('/api/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentPayload),
      }).catch((err) => console.warn('Server /api/session-notes notice:', err));

      // 3. Update lesson state in parent
      if (targetLessonId) {
        onSaveLessonNotes(targetLessonId, {
          topic: topicToSave,
          liveNotes: contentToSave,
          recommendations: contentToSave,
          sessionNotesDocument: contentToSave,
          sessionDate: effectiveDate,
          driveFileId: driveFileId || undefined,
          driveFileUrl: driveFileUrl || undefined,
          driveFolderName: GOOGLE_DRIVE_SESSION_FOLDER,
          driveLastSyncedAt: driveLastSyncedAt || undefined,
        });
      }

      setLastSavedTimestamp(nowIso);
      setIsSaving(false);

      if (explicitSave) {
        setSavedSuccessBanner(true);
        setTimeout(() => setSavedSuccessBanner(false), 3000);

        // Google Drive Synchronization per User
        const token = googleOAuthToken || getGoogleOAuthToken();
        const sName =
          activeStudent?.name ||
          (selectedStudentEmail ? selectedStudentEmail.split('@')[0] : 'Student');

        if (!token) {
          setDriveSyncStatus('not_connected');
        } else {
          const calculatedFileName = formatSessionNotesFileName(sName, effectiveDate);
          const currentFileId = driveFileId || (activeLesson as any)?.driveFileId;

          // Check if file already exists in Drive and if confirmation is needed for overwrite
          if (!driveAutoUpdateConfirmed) {
            getOrCreateSessionNotesFolder(token)
              .then(async (folder) => {
                let existingFile = currentFileId
                  ? { id: currentFileId, name: calculatedFileName }
                  : await findExistingSessionNotesFile(token, folder.id, calculatedFileName);

                if (existingFile) {
                  // User Confirmation Dialog required before mutating existing user Drive file
                  setPendingDriveUpdate({
                    fileId: existingFile.id,
                    fileName: calculatedFileName,
                    content: contentToSave,
                    topic: topicToSave,
                  });
                  setShowDriveConfirmModal(true);
                } else {
                  // Safe to create new document in folder without overwrite prompt
                  executeDriveSync(contentToSave, topicToSave, sName, effectiveDate);
                }
              })
              .catch(() => {
                executeDriveSync(contentToSave, topicToSave, sName, effectiveDate);
              });
          } else {
            // Already confirmed by user for this session
            executeDriveSync(contentToSave, topicToSave, sName, effectiveDate, currentFileId);
          }
        }
      }
    },
    [
      selectedStudentEmail,
      selectedLessonId,
      sessionDate,
      activeLesson,
      activeStudent,
      currentAccount,
      driveFileId,
      driveFileUrl,
      driveLastSyncedAt,
      driveAutoUpdateConfirmed,
      googleOAuthToken,
      onSaveLessonNotes,
      executeDriveSync,
    ]
  );

  const handleConfirmDriveUpdate = () => {
    if (!pendingDriveUpdate) return;
    const { fileId, content, topic } = pendingDriveUpdate;
    setShowDriveConfirmModal(false);
    setPendingDriveUpdate(null);
    setDriveAutoUpdateConfirmed(true);

    const sName =
      activeStudent?.name ||
      (selectedStudentEmail ? selectedStudentEmail.split('@')[0] : 'Student');
    const effDate = sessionDate || new Date().toISOString().split('T')[0];
    executeDriveSync(content, topic, sName, effDate, fileId);
  };

  const handleConnectDrive = async () => {
    try {
      setDriveSyncStatus('syncing');
      setDriveSyncError(null);
      const token = await connectGoogleDrive();
      if (token) {
        setDriveSyncStatus('idle');
        const sName =
          activeStudent?.name ||
          (selectedStudentEmail ? selectedStudentEmail.split('@')[0] : 'Student');
        const effDate = sessionDate || new Date().toISOString().split('T')[0];
        executeDriveSync(notesContent, topic, sName, effDate);
      } else {
        setDriveSyncStatus('not_connected');
      }
    } catch {
      setDriveSyncStatus('error');
      setDriveSyncError('Could not connect to Google Drive.');
    }
  };

  // Debounced auto-save when typing in editor
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      persistSessionDocument(notesContent, topic, false);
    }, 1200);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [notesContent, topic, persistSessionDocument]);

  /**
   * Helper: Wrap selected text with prefix and suffix (e.g. bold, italic, underline)
   */
  const applyInlineFormatting = (prefix: string, suffix: string = prefix, placeholder: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selectedText = currentVal.substring(start, end);

    const replacement = selectedText
      ? `${prefix}${selectedText}${suffix}`
      : `${prefix}${placeholder}${suffix}`;

    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setNotesContent(nextVal);

    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + prefix.length;
      const newCursorEnd = selectedText
        ? start + prefix.length + selectedText.length
        : newCursorStart + placeholder.length;
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 10);
  };

  /**
   * Helper: Insert line prefix or list bullet
   */
  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    // Find start of current line
    const lastNewline = currentVal.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const nextVal = currentVal.substring(0, lineStart) + prefix + currentVal.substring(lineStart);
    setNotesContent(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  /**
   * Helper: Insert snippet block at cursor
   */
  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const before = currentVal.substring(0, start);
    const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
    const fullSnippet = (needsLeadingNewline ? '\n' : '') + snippet + '\n';

    const nextVal = before + fullSnippet + currentVal.substring(end);
    setNotesContent(nextVal);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + fullSnippet.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  /**
   * Keyboard Shortcuts Handler:
   * - Enter: clean newline with auto-continuation for bullet/numbered lists
   * - Tab: inserts 4 spaces or indents without losing focus
   * - Shift+Tab: un-indents 4 spaces
   * - Ctrl+B / Cmd+B: Bold
   * - Ctrl+I / Cmd+I: Italic
   * - Ctrl+U / Cmd+U: Underline
   */
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl+B: Bold
    if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyInlineFormatting('**', '**', 'bold text');
      return;
    }

    // Ctrl+I: Italic
    if (isCmdOrCtrl && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyInlineFormatting('*', '*', 'italic text');
      return;
    }

    // Ctrl+U: Underline
    if (isCmdOrCtrl && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      applyInlineFormatting('<u>', '</u>', 'underlined text');
      return;
    }

    // Tab / Shift+Tab: Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      if (e.shiftKey) {
        // Shift+Tab: Un-indent
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineContent = val.substring(lineStart, start);
        if (lineContent.startsWith('    ')) {
          const nextVal = val.substring(0, lineStart) + val.substring(lineStart + 4);
          setNotesContent(nextVal);
          setTimeout(() => {
            textarea.setSelectionRange(Math.max(lineStart, start - 4), Math.max(lineStart, end - 4));
          }, 0);
        } else if (lineContent.startsWith('\t')) {
          const nextVal = val.substring(0, lineStart) + val.substring(lineStart + 1);
          setNotesContent(nextVal);
          setTimeout(() => {
            textarea.setSelectionRange(Math.max(lineStart, start - 1), Math.max(lineStart, end - 1));
          }, 0);
        }
      } else {
        // Tab: Insert 4 spaces
        const tabSpaces = '    ';
        const nextVal = val.substring(0, start) + tabSpaces + val.substring(end);
        setNotesContent(nextVal);
        setTimeout(() => {
          textarea.setSelectionRange(start + tabSpaces.length, start + tabSpaces.length);
        }, 0);
      }
      return;
    }

    // Enter: Auto-continue bullet or numbered list
    if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const val = textarea.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);

      // Match bullet point ("• " or "- ")
      const bulletMatch = currentLine.match(/^(\s*)([•\-])\s+/);
      if (bulletMatch) {
        const [fullMatch, indent] = bulletMatch;
        // If line is empty with only bullet, clear bullet on Enter
        if (currentLine.trim() === '•' || currentLine.trim() === '-') {
          e.preventDefault();
          const nextVal = val.substring(0, lineStart) + val.substring(start);
          setNotesContent(nextVal);
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        // Auto-continue bullet on next line
        e.preventDefault();
        const continuation = '\n' + indent + '• ';
        const nextVal = val.substring(0, start) + continuation + val.substring(start);
        setNotesContent(nextVal);
        setTimeout(() => {
          const nextPos = start + continuation.length;
          textarea.setSelectionRange(nextPos, nextPos);
        }, 0);
        return;
      }

      // Match numbered list ("1. ", "2. ")
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+/);
      if (numMatch) {
        const [fullMatch, indent, numStr] = numMatch;
        if (currentLine.trim() === `${numStr}.`) {
          e.preventDefault();
          const nextVal = val.substring(0, lineStart) + val.substring(start);
          setNotesContent(nextVal);
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        e.preventDefault();
        const nextNum = parseInt(numStr, 10) + 1;
        const continuation = `\n${indent}${nextNum}. `;
        const nextVal = val.substring(0, start) + continuation + val.substring(start);
        setNotesContent(nextVal);
        setTimeout(() => {
          const nextPos = start + continuation.length;
          textarea.setSelectionRange(nextPos, nextPos);
        }, 0);
        return;
      }
    }
  };

  /**
   * 1-Click Copy formatted notes for Google Meet Chat
   */
  const handleCopyForMeetChat = () => {
    if (!notesContent.trim()) return;
    navigator.clipboard.writeText(notesContent);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Word and character statistics
  const wordCount = notesContent.trim() ? notesContent.trim().split(/\s+/).length : 0;
  const charCount = notesContent.length;

  return (
    <div
      className="bg-white rounded-3xl p-5 sm:p-7 border border-[#607EC9]/30 shadow-xs space-y-5"
      id="teacher-live-lesson-notes-panel"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#9AB4FF]/30 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#000035] text-white flex items-center justify-center shrink-0 border border-[#9AB4FF]/40 shadow-sm">
            <FileText className="w-6 h-6 text-[#F4CA54]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-[#000035] tracking-tight">
                Native Friend In-Session Notes & Recommendations
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#1C4C96]/10 text-[#1C4C96] text-[10px] font-bold uppercase tracking-wider border border-[#1C4C96]/20">
                Word-Doc Editor
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Unified free-form document keyed by session date • Live synchronized with Firestore
            </p>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-[#1C4C96] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#1C4C96] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Session History ({studentHistory.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-4">
          {/* Session Metadata & Topic Control Bar */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#607EC9]/30 flex flex-col md:flex-row md:items-center gap-3 shadow-2xs">
            {/* Session Selector */}
            <div className="flex items-center gap-2 shrink-0 min-w-[240px] md:max-w-[340px]">
              <Calendar className="w-4 h-4 text-[#1C4C96] shrink-0" />
              <span className="text-xs font-black text-[#000035] uppercase tracking-wider shrink-0">
                Session:
              </span>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full bg-white border border-[#607EC9]/40 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] cursor-pointer shadow-2xs truncate"
              >
                <option value="">-- Custom Date Session ({sessionDate}) --</option>
                {teacherLessons
                  .filter(
                    (l) =>
                      !selectedStudentEmail ||
                      l.studentEmail?.toLowerCase() === selectedStudentEmail.toLowerCase()
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {formatDateInTimeZone(l.startDateTime, timeZone, 'en')} at{' '}
                      {formatTimeInTimeZone(l.startDateTime, timeZone)} - {l.title || 'Lesson'} (
                      {l.status})
                    </option>
                  ))}
              </select>
            </div>

            <div className="hidden md:block w-px h-6 bg-slate-200 shrink-0" />

            {/* Session Date */}
            <div className="flex items-center gap-2 shrink-0">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-600">Date:</span>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-white border border-[#607EC9]/40 rounded-xl px-2.5 py-1 text-xs font-medium text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
              />
            </div>

            <div className="hidden md:block w-px h-6 bg-slate-200 shrink-0" />

            {/* Session Topic */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Lightbulb className="w-4 h-4 text-[#F4CA54] shrink-0" />
              <span className="text-xs font-black text-[#000035] uppercase tracking-wider shrink-0">
                Topic:
              </span>
              <input
                type="text"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                placeholder="e.g. Job Interview Prep, Travel Roleplay, Small Talk..."
                className="flex-1 bg-white border border-[#607EC9]/40 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#000035] placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] min-w-0"
              />
            </div>
          </div>

          {/* Unified Word-Document Rich Canvas */}
          <div className="bg-slate-50/80 rounded-2xl border-2 border-[#9AB4FF]/40 shadow-xs overflow-hidden">
            {/* Document Header & Quick Toolbar */}
            <div className="bg-white border-b border-slate-200 p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5">
              {/* Left: Text Formatting Tools */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyInlineFormatting('**', '**', 'bold text')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#000035] transition cursor-pointer border border-transparent hover:border-slate-200"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyInlineFormatting('*', '*', 'italic text')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#000035] transition cursor-pointer border border-transparent hover:border-slate-200"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyInlineFormatting('<u>', '</u>', 'underlined text')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#000035] transition cursor-pointer border border-transparent hover:border-slate-200"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                <button
                  type="button"
                  onClick={() => applyLinePrefix('• ')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#000035] transition cursor-pointer border border-transparent hover:border-slate-200"
                  title="Bullet Point List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyLinePrefix('1. ')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#000035] transition cursor-pointer border border-transparent hover:border-slate-200"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => applyLinePrefix('> ')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#000035] transition cursor-pointer border border-transparent hover:border-slate-200"
                  title="Blockquote / Tip"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('\n---\n')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#000035] transition cursor-pointer border border-transparent hover:border-slate-200"
                  title="Insert Section Divider"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Quick Section Stamps */}
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet('🎯 PRONUNCIATION TIP:\n• word /ˈfəʊ.nɪks/ - ')
                  }
                  className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  title="Insert Pronunciation Block"
                >
                  <span>🎯 Pronunciation</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet('💬 KEY PHRASE & IDIOM:\n• "expression" - meaning and natural usage: ')
                  }
                  className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-[#1C4C96] border border-blue-200 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  title="Insert Key Phrase Block"
                >
                  <span>💬 Phrase</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet('⚡ CORRECTION & POLISHING:\n• Instead of: \n  Say: ')
                  }
                  className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  title="Insert Correction Block"
                >
                  <span>⚡ Correction</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertSnippet('📝 NEXT STEPS & RECOMMENDATION:\n• ')
                  }
                  className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  title="Insert Recommendation Block"
                >
                  <span>📝 Next Steps</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nowStr = new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    insertSnippet(`[${nowStr}] - `);
                  }}
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  title="Insert Timestamp"
                >
                  <Clock className="w-3 h-3" />
                  <span>Time</span>
                </button>
              </div>

              {/* Right: Copy & Status Badges */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyForMeetChat}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#000035] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
                  title="Copy formatted document to paste into Google Meet Chat"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied for Meet!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy for Meet Chat</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetDocument}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer"
                  title="Reset to clean document template"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Paper Canvas */}
            <div className="p-4 sm:p-6 bg-slate-100/50 flex justify-center">
              <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-300 shadow-sm p-6 sm:p-8 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                  <span>DOCUMENT: Native Friend Coaching Record</span>
                  <span>Session Date: {sessionDate}</span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  placeholder="Type words, phrases, sentences, pronunciation notes, and practice recommendations freely here... Use Enter for new lines, Tab to indent, and Ctrl+B / Ctrl+I for formatting."
                  rows={20}
                  className="w-full bg-transparent border-0 text-[#000035] text-sm leading-relaxed placeholder:text-slate-400 focus:outline-hidden resize-y min-h-[380px] font-sans selection:bg-[#9AB4FF]/40"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Document Status & Statistics Footer */}
            <div className="bg-white border-t border-slate-200 p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-slate-600">
                  {wordCount} words • {charCount} characters
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="text-[11px] text-slate-400">
                  Shortcuts: <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">Enter</kbd> newline, <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">Tab</kbd> indent, <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">Ctrl+B</kbd> bold
                </span>
              </div>

              {/* Firestore & Google Drive Real-time Persistence Status */}
              <div className="flex items-center gap-3 flex-wrap">
                {isSaving ? (
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Auto-saving to Firestore...</span>
                  </div>
                ) : lastSavedTimestamp ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      Saved to Firestore (Session: {sessionDate})
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">Firestore Ready</span>
                )}

                <span className="text-slate-300">•</span>

                {driveSyncStatus === 'syncing' ? (
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing to Google Drive...</span>
                  </div>
                ) : driveFileUrl ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Synced to Google Drive</span>
                    <a
                      href={driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#1C4C96] hover:underline flex items-center gap-0.5 ml-0.5"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : driveSyncStatus === 'not_connected' || (!googleOAuthToken && !getGoogleOAuthToken()) ? (
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    className="text-xs font-semibold text-[#1C4C96] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-[#1C4C96]" />
                    <span>Connect Google Drive</span>
                  </button>
                ) : (
                  <span className="text-slate-400 text-xs">Drive Ready</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar (Save Document & Drive Sync) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {savedSuccessBanner && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in duration-200 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Document securely stored in Firestore!</span>
                </div>
              )}
              {driveSuccessToast && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold animate-in fade-in duration-200 shadow-2xs">
                  <FolderCheck className="w-4 h-4 text-blue-700" />
                  <span>{driveSuccessToast}</span>
                  {driveFileUrl && (
                    <a
                      href={driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-800 hover:text-blue-950 ml-1 inline-flex items-center gap-0.5 font-extrabold"
                    >
                      View in Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {driveSyncError && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold animate-in fade-in duration-200 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{driveSyncError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sName =
                        activeStudent?.name ||
                        (selectedStudentEmail ? selectedStudentEmail.split('@')[0] : 'Student');
                      executeDriveSync(notesContent, topic, sName, sessionDate);
                    }}
                    className="underline font-bold text-rose-900 hover:text-black ml-1 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-end">
              {/* Google Drive Status & Connection Button */}
              {driveSyncStatus === 'syncing' ? (
                <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Syncing to Drive...</span>
                </div>
              ) : driveFileUrl ? (
                <a
                  href={driveFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="View this session notes document in your Google Drive"
                >
                  <FolderCheck className="w-4 h-4 text-emerald-600" />
                  <span>Drive Synced</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                </a>
              ) : !googleOAuthToken && !getGoogleOAuthToken() ? (
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Authenticate with Google to enable automatic Google Drive synchronization in 'It's Simple - Session Notes'"
                >
                  <FolderSync className="w-4 h-4 text-[#1C4C96]" />
                  <span>Connect Google Drive</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const sName =
                      activeStudent?.name ||
                      (selectedStudentEmail ? selectedStudentEmail.split('@')[0] : 'Student');
                    executeDriveSync(notesContent, topic, sName, sessionDate);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-[#000035] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Sync current document to Google Drive folder 'It's Simple - Session Notes'"
                >
                  <CloudUpload className="w-4 h-4 text-[#1C4C96]" />
                  <span>Sync to Drive</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => persistSessionDocument(notesContent, topic, true)}
                className="px-6 py-2.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md border border-[#9AB4FF]/40 active:scale-98"
              >
                <Save className="w-4 h-4 text-[#9AB4FF]" />
                <span>Save Document</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History of Past Notes for this student */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#607EC9] font-semibold border-b border-slate-100 pb-2">
            <span>
              Past session records for {activeStudent?.name || selectedStudentEmail}
            </span>
            <span>{studentHistory.length} recorded session(s)</span>
          </div>

          {studentHistory.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No previous session records found for this student.</p>
              <p className="text-[11px] text-slate-400">
                Write in the Document Editor tab to save your first in-session coaching document.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {studentHistory.map((hist) => {
                const effectiveText =
                  hist.sessionNotesDocument ||
                  hist.liveNotes ||
                  hist.recommendations ||
                  '';
                const formattedDate = formatDateInTimeZone(
                  hist.startDateTime,
                  timeZone,
                  'en'
                );
                const formattedTime = formatTimeInTimeZone(
                  hist.startDateTime,
                  timeZone
                );

                return (
                  <div
                    key={hist.id}
                    className="p-4 bg-slate-50/90 rounded-2xl border border-[#607EC9]/30 space-y-2.5 shadow-2xs hover:border-[#607EC9] transition"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#000035]">
                          {hist.title || 'Live Coaching Session'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#9AB4FF]/20 text-[#062863] text-[10px] font-mono font-bold">
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hist.driveFileUrl && (
                          <a
                            href={hist.driveFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 transition cursor-pointer flex items-center gap-1"
                            title="Open session notes in Google Drive"
                          >
                            <FolderCheck className="w-3 h-3 text-emerald-600" />
                            <span>Drive</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(effectiveText);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer flex items-center gap-1"
                          title="Copy session notes to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLessonId(hist.id);
                            if (hist.startDateTime) {
                              setSessionDate(hist.startDateTime.split('T')[0]);
                            }
                            setActiveTab('editor');
                          }}
                          className="px-2.5 py-1 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Load into Editor
                        </button>
                      </div>
                    </div>

                    {effectiveText ? (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto leading-relaxed">
                        {effectiveText}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No text recorded for this session.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Explicit User Confirmation Dialog before Updating/Overwriting existing Google Drive document */}
      {showDriveConfirmModal && pendingDriveUpdate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
                <FileText className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-[#000035]">Update Google Drive File?</h4>
                <p className="text-xs text-slate-500 font-medium">
                  A document already exists in your dedicated Drive folder.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-500 shrink-0">File:</span>
                <span className="font-mono font-bold text-[#000035] truncate">{pendingDriveUpdate.fileName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-500 shrink-0">Folder:</span>
                <span className="font-semibold text-slate-800">{GOOGLE_DRIVE_SESSION_FOLDER}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 leading-relaxed">
                Confirming will update this document in your Google Drive with your latest session notes and recommendations.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDriveConfirmModal(false);
                  setPendingDriveUpdate(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDriveUpdate}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1C4C96] hover:bg-[#062863] transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <FolderCheck className="w-4 h-4 text-[#9AB4FF]" />
                <span>Confirm & Update in Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
