import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Sparkles,
  BookOpen,
  Volume2,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Trash2,
  ExternalLink,
  User,
  Calendar,
  History,
  Lightbulb,
  MessageSquare,
  CornerDownLeft,
  Edit3,
  Globe,
  Loader2,
} from 'lucide-react';
import {
  LiveLesson,
  StudentProfile,
  GoogleAccount,
  LiveLessonVocabNote,
  StudentDictionaryEntry,
} from '../types';
import { formatDateInTimeZone, formatTimeInTimeZone } from '../utils/timezone';
import { getInstantVocabEntry } from '../data/dictionaryDatabase';
import { lookupWord, getInstantOrCachedWord } from '../utils/dictionaryService';
import { speakEnglish } from '../utils/audio';

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
    return (
      (l.teacherEmail || '').toLowerCase() === currentAccount.email.toLowerCase() ||
      !l.teacherEmail
    );
  });

  // Selected lesson ID
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>('');

  // Note fields
  const [topic, setTopic] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [pronunciationNotes, setPronunciationNotes] = useState<string>('');
  const [grammarAndPhrasing, setGrammarAndPhrasing] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [vocabList, setVocabList] = useState<LiveLessonVocabNote[]>([]);

  // Fast word input ref & state
  const [newWordInput, setNewWordInput] = useState<string>('');
  const [justAddedWord, setJustAddedWord] = useState<string | null>(null);
  const [isSearchingApi, setIsSearchingApi] = useState<boolean>(false);
  const [livePreview, setLivePreview] = useState<{
    word: string;
    partOfSpeech?: string;
    definitionEn: string;
    exampleSentenceEn: string;
    source?: string;
    notFound?: boolean;
  } | null>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  // Debounced live dictionary lookup for input preview
  useEffect(() => {
    const trimmed = newWordInput.trim();
    if (!trimmed) {
      setLivePreview(null);
      return;
    }

    // Instant local preview
    const instant = getInstantOrCachedWord(trimmed);
    if (instant && (instant.definitionEn || instant.notFound)) {
      setLivePreview({
        word: instant.word,
        partOfSpeech: instant.partOfSpeech,
        definitionEn: instant.definitionEn,
        exampleSentenceEn: instant.exampleSentenceEn,
        source: instant.source,
        notFound: instant.notFound,
      });
    }

    // Debounced query to Free Dictionary API for live accurate preview
    const timer = setTimeout(async () => {
      try {
        const live = await lookupWord(trimmed);
        if (live.word.toLowerCase() === trimmed.toLowerCase()) {
          setLivePreview({
            word: live.word,
            partOfSpeech: live.partOfSpeech,
            definitionEn: live.definitionEn,
            exampleSentenceEn: live.exampleSentenceEn,
            source: live.source,
            notFound: live.notFound,
          });
        }
      } catch (err) {
        // preserve instant
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [newWordInput]);

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [editingVocabId, setEditingVocabId] = useState<string | null>(null);

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
      // Default to first available scheduled lesson or student
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

  // When selected lesson changes, populate form
  useEffect(() => {
    const currentLesson = teacherLessons.find((l) => l.id === selectedLessonId);
    if (currentLesson) {
      setSelectedStudentEmail(currentLesson.studentEmail);
      setTopic(currentLesson.title || '');
      setGeneralNotes(currentLesson.liveNotes || '');
      setRecommendations(currentLesson.recommendations || '');
      setPronunciationNotes(currentLesson.pronunciationNotes || '');
      setGrammarAndPhrasing(currentLesson.grammarAndPhrasing || '');
      setVocabList(currentLesson.vocabularyNotes || []);
    } else if (selectedStudentEmail) {
      // Find latest notes for this student if any
      const studentLessons = teacherLessons.filter(
        (l) => l.studentEmail?.toLowerCase() === selectedStudentEmail.toLowerCase()
      );
      const latestWithNotes = studentLessons.find((l) => l.liveNotes || l.recommendations);
      if (latestWithNotes) {
        setTopic(latestWithNotes.title || '');
        setGeneralNotes(latestWithNotes.liveNotes || '');
        setRecommendations(latestWithNotes.recommendations || '');
        setPronunciationNotes(latestWithNotes.pronunciationNotes || '');
        setGrammarAndPhrasing(latestWithNotes.grammarAndPhrasing || '');
        setVocabList(latestWithNotes.vocabularyNotes || []);
      } else {
        setTopic('');
        setGeneralNotes('');
        setRecommendations('');
        setPronunciationNotes('');
        setGrammarAndPhrasing('');
        setVocabList([]);
      }
    }
  }, [selectedLessonId, selectedStudentEmail]);

  // Selected student object
  const activeStudent = students.find(
    (s) => s.email.toLowerCase() === selectedStudentEmail.toLowerCase()
  );

  const activeLesson = teacherLessons.find((l) => l.id === selectedLessonId);

  // Past notes history for this student
  const studentHistory = teacherLessons.filter(
    (l) =>
      l.studentEmail?.toLowerCase() === selectedStudentEmail.toLowerCase() &&
      (l.liveNotes || l.recommendations || (l.vocabularyNotes && l.vocabularyNotes.length > 0))
  );

  /**
   * Automatically adds word on Enter or Tab with real Dictionary API definition & authentic example sentence
   */
  const handleAutoAddWord = async (rawInput: string) => {
    const cleaned = rawInput.trim();
    if (!cleaned) return;

    // Handle comma or semicolon separated multiple words (e.g. "touch base, follow up")
    const wordsToAdd = cleaned
      .split(/[,;]+/)
      .map((w) => w.trim())
      .filter(Boolean);

    // 1. Instantly populate with local/cached data so teacher experiences zero UI latency
    const initialEntries: { note: LiveLessonVocabNote; rawWord: string }[] = wordsToAdd.map((wordStr) => {
      const instant = getInstantOrCachedWord(wordStr, topic || generalNotes || undefined);
      return {
        rawWord: wordStr,
        note: {
          id: 'voc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          word: instant.word,
          meaningOrTip: instant.definitionEn,
          exampleSentence: instant.exampleSentenceEn,
          partOfSpeech: instant.partOfSpeech,
          phonetic: instant.phonetic,
          audioUrl: instant.audio,
          source: instant.source,
        },
      };
    });

    setVocabList((prev) => [...prev, ...initialEntries.map((e) => e.note)]);
    setNewWordInput('');
    setJustAddedWord(wordsToAdd[wordsToAdd.length - 1]);

    setTimeout(() => {
      setJustAddedWord(null);
    }, 2500);

    // Keep focus on input for the next word
    setTimeout(() => {
      wordInputRef.current?.focus();
    }, 10);

    // 2. Concurrently look up real definition & example from Free Dictionary API
    setIsSearchingApi(true);
    try {
      await Promise.all(
        initialEntries.map(async ({ note, rawWord }) => {
          try {
            const realData = await lookupWord(rawWord, topic || generalNotes || undefined);
            setVocabList((prev) =>
              prev.map((item) => {
                if (item.id !== note.id) return item;
                return {
                  ...item,
                  word: realData.word || item.word,
                  meaningOrTip: realData.definitionEn || item.meaningOrTip,
                  exampleSentence: realData.exampleSentenceEn || item.exampleSentence,
                  partOfSpeech: realData.partOfSpeech || item.partOfSpeech,
                  phonetic: realData.phonetic || item.phonetic,
                  audioUrl: realData.audio || item.audioUrl,
                  source: realData.source || item.source,
                };
              })
            );
          } catch (err) {
            console.warn('Dictionary API async lookup error:', err);
          }
        })
      );
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleAutoAddWord(newWordInput);
    }
  };

  const handleRemoveVocab = (id: string) => {
    setVocabList((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateVocab = (
    id: string,
    field: 'meaningOrTip' | 'exampleSentence' | 'word',
    value: string
  ) => {
    setVocabList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Save notes handler
  const handleSave = () => {
    let targetLessonId = selectedLessonId;

    if (!targetLessonId) {
      // Find or associate with active lesson for this student
      const match = teacherLessons.find(
        (l) => l.studentEmail?.toLowerCase() === selectedStudentEmail.toLowerCase()
      );
      if (match) targetLessonId = match.id;
    }

    if (targetLessonId) {
      onSaveLessonNotes(targetLessonId, {
        topic,
        liveNotes: generalNotes,
        recommendations,
        pronunciationNotes,
        grammarAndPhrasing,
        vocabularyNotes: vocabList,
      });
    }

    // Also auto-add vocabulary words to student's personal dictionary
    if (vocabList.length > 0 && selectedStudentEmail) {
      const cleanStudentEmail = selectedStudentEmail.toLowerCase().trim();
      const dictEntries: StudentDictionaryEntry[] = vocabList.map((v) => ({
        id: 'dict_live_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        word: v.word.trim(),
        partOfSpeech: v.partOfSpeech || '',
        definitionEn: v.meaningOrTip || '',
        exampleSentenceEn: v.exampleSentence || '',
        learnedAt: new Date().toISOString(),
        source: 'api',
        sourceActivityName: `Live Session with ${currentAccount?.name || 'Native Friend'}`,
        teacherEmail: currentAccount?.email,
        teacherName: currentAccount?.name,
        studentEmail: cleanStudentEmail,
      }));

      if (onAddWordsToDictionary) {
        onAddWordsToDictionary(dictEntries, cleanStudentEmail);
      }

      // Direct asynchronous backend persistence for multi-device sync
      fetch('/api/student-dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: cleanStudentEmail,
          teacherEmail: currentAccount?.email,
          teacherName: currentAccount?.name,
          entries: dictEntries,
        }),
      }).catch((err) => console.warn('Sync student dictionary error:', err));
    }

    // Insert into student's weekly activity vocabulary
    if (onAddWordsToWeeklyActivity && vocabList.length > 0 && selectedStudentEmail) {
      const words = vocabList.map((v) => v.word.trim()).filter(Boolean);
      onAddWordsToWeeklyActivity(words, selectedStudentEmail);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Copy formatted notes for Google Meet Chat or WhatsApp
  const handleCopyFormatted = () => {
    const studentName = activeStudent?.name || activeLesson?.studentName || 'Student';
    const dateStr = activeLesson
      ? formatDateInTimeZone(activeLesson.startDateTime, timeZone, 'en')
      : new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });

    let text = `🌟 *Live Session Summary & Coaching Notes*\n`;
    text += `👤 *Student:* ${studentName}\n`;
    text += `📅 *Date:* ${dateStr}\n`;
    if (topic) text += `🎯 *Topic / Focus:* ${topic}\n\n`;

    if (Array.isArray(vocabList) && vocabList.length > 0) {
      text += `📚 *Key Vocabulary & Expressions:*\n`;
      vocabList.forEach((v) => {
        text += `• *${v.word}*`;
        if (v.meaningOrTip) text += ` — ${v.meaningOrTip}`;
        if (v.exampleSentence) text += ` (Ex: "${v.exampleSentence}")`;
        text += `\n`;
      });
      text += `\n`;
    }

    if (pronunciationNotes) {
      text += `🗣️ *Pronunciation & Phrasing Tips:*\n${pronunciationNotes}\n\n`;
    }

    if (generalNotes) {
      text += `📝 *Session Observations:*\n${generalNotes}\n\n`;
    }

    if (recommendations) {
      text += `🚀 *Weekly Recommendations & Action Steps:*\n${recommendations}\n\n`;
    }

    text += `Keep living your English every day! — ${currentAccount?.name || 'Your Native Friend'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Send summary notification to student
  const handleSendToStudent = () => {
    if (!selectedStudentEmail) return;
    handleSave();

    if (onSendStudentNotification) {
      const title = `🌟 New Live Session Vocabulary from ${currentAccount?.name || 'Native Friend'}`;
      const snippet = vocabList.length > 0
        ? `Added ${vocabList.length} new vocabulary expression(s) from your live session.`
        : `Your Native Friend updated your live session vocabulary list.`;
      onSendStudentNotification(selectedStudentEmail, title, snippet);
    }
  };

  return (
    <div
      className="bg-white rounded-3xl p-5 sm:p-6 border border-[#607EC9]/30 shadow-xs space-y-5"
      id="teacher-live-lesson-notes-panel"
    >
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#9AB4FF]/30 pb-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#000035] text-white flex items-center justify-center shrink-0 border border-[#9AB4FF]/40 shadow-xs mt-0.5">
            <BookOpen className="w-5 h-5 text-[#F4CA54]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-[#000035] tracking-tight">
                Live Session Real-Time Vocabulary
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Live In-Session Coaching
              </span>
              {(activeStudent || selectedStudentEmail) && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#1C4C96]/10 text-[#062863] text-[10px] font-extrabold border border-[#607EC9]/30 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#1C4C96]" />
                  <span>Student: {activeStudent?.name || selectedStudentEmail}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#607EC9] mt-1">
              Capture vocabulary, expressions, automatic simplified English definitions, and conversational examples during your Google Meet sessions.
            </p>
          </div>
        </div>

        {/* Quick Top Actions & Tab Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-[#1C4C96] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Active Vocabulary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#1C4C96] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Vocabulary History ({studentHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Active Lesson / Session Bar (Only if session options or Google Meet link exist) */}
      {((teacherLessons.length > 0 && teacherLessons.filter((l) => !selectedStudentEmail || l.studentEmail?.toLowerCase() === selectedStudentEmail.toLowerCase()).length > 0) || activeLesson?.meetLink) && (
        <div className="p-3 bg-[#9AB4FF]/10 rounded-2xl border border-[#9AB4FF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-[#1C4C96] shrink-0" />
            <span className="text-xs font-black text-[#000035] uppercase tracking-wider">
              Session:
            </span>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="bg-white border border-[#607EC9]/40 rounded-xl px-3 py-1.5 text-xs font-medium text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] cursor-pointer shadow-2xs max-w-[280px] truncate"
            >
              <option value="">-- General Student Notes --</option>
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

          {/* Quick Google Meet Join button if active lesson has link */}
          {activeLesson?.meetLink && (
            <a
              href={activeLesson.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs shrink-0 cursor-pointer"
            >
              <span>Open Google Meet Call</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {activeTab === 'editor' ? (
        <div className="space-y-4">
          {/* Session Topic / Focus (Clean compact bar) */}
          <div className="flex items-center gap-3 bg-slate-50 border border-[#607EC9]/30 rounded-2xl px-4 py-2.5">
            <label className="text-xs font-black text-[#000035] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Lightbulb className="w-4 h-4 text-[#F4CA54]" />
              <span>Session Topic:</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Job Interview Prep, Weekend Small Talk, Airport Travel Roleplay..."
              className="flex-1 bg-transparent border-0 text-xs font-semibold text-[#000035] placeholder:text-slate-400 focus:outline-hidden"
            />
          </div>

          {/* Real-Time Vocabulary Table Section */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-[#9AB4FF]/40 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#1C4C96]" />
                <span className="font-black text-sm text-[#000035] tracking-wider uppercase">
                  Real-Time Vocabulary Table ({vocabList.length})
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Type any word below and press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">Tab</kbd> for instant simplified English definition and example sentence
              </span>
            </div>

            {/* Quick Word Input Bar */}
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border-2 border-[#1C4C96]/40 focus-within:border-[#1C4C96] focus-within:ring-2 focus-within:ring-[#1C4C96]/20 transition">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse ml-2 shrink-0" />
                <input
                  ref={wordInputRef}
                  type="text"
                  value={newWordInput}
                  onChange={(e) => setNewWordInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type word/expression (e.g. 'coffee', 'touch base', 'brew') and press Enter or Tab..."
                  className="flex-1 bg-transparent border-0 px-2 py-1 text-xs font-bold text-[#000035] placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden min-w-0"
                />
                {isSearchingApi && (
                  <div className="flex items-center gap-1 text-[11px] text-[#1C4C96] font-semibold px-2 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden sm:inline">Consulting Dictionary API...</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleAutoAddWord(newWordInput)}
                  disabled={!newWordInput.trim()}
                  className="px-3 py-1.5 bg-[#1C4C96] hover:bg-[#062863] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>Enter / Tab</span>
                </button>
              </div>

              {justAddedWord && (
                <div className="sm:absolute sm:-top-8 sm:right-0 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md animate-in fade-in zoom-in-95 duration-150 z-20 self-start">
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>"{justAddedWord}" official definition added to table!</span>
                </div>
              )}
            </div>

            {/* Live Instant Preview while typing from Dictionary API */}
            {livePreview && (
              <div className={`p-3 rounded-xl border text-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center shadow-xs ${
                livePreview.notFound ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50/80 border-blue-200/80'
              }`}>
                {livePreview.notFound ? (
                  <div className="col-span-12 font-medium flex items-center gap-2 text-amber-800">
                    <span className="text-sm">⚠️</span>
                    <span>The word "<strong>{livePreview.word}</strong>" was not found in the official dictionary.</span>
                  </div>
                ) : (
                  <>
                    <div className="md:col-span-3 font-bold text-[#000035] flex items-center gap-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Word: <strong className="text-[#1C4C96]">{livePreview.word}</strong></span>
                      {livePreview.partOfSpeech && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#1C4C96] text-[9px] font-bold border border-blue-300 uppercase">
                          {livePreview.partOfSpeech}
                        </span>
                      )}
                    </div>
                    <div className="md:col-span-5 text-[#1C4C96] text-xs">
                      <strong className="text-slate-600 font-semibold">Meaning:</strong> {livePreview.definitionEn}
                    </div>
                    <div className="md:col-span-4 text-slate-600 italic text-xs flex items-center justify-between gap-2">
                      <span>
                        {livePreview.exampleSentenceEn ? (
                          <>
                            <strong className="text-slate-600 font-semibold not-italic">Example:</strong> "{livePreview.exampleSentenceEn}"
                          </>
                        ) : (
                          <span className="text-slate-400 not-italic">(No example in official API)</span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-emerald-700 border border-emerald-200 shrink-0 not-italic">
                        <Globe className="w-2.5 h-2.5" />
                        <span>Free Dict API</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* The Vocabulary Table: Word | Meaning | Example */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs text-[#000035] border-collapse">
                <thead>
                  <tr className="bg-[#000035] text-white uppercase text-[11px] font-black tracking-wider">
                    <th className="p-3 w-3/12 border-b border-[#062863]">Word</th>
                    <th className="p-3 w-4/12 border-b border-[#062863]">Meaning</th>
                    <th className="p-3 w-4/12 border-b border-[#062863]">Example</th>
                    <th className="p-3 text-right w-1/12 border-b border-[#062863]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {vocabList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 text-xs">
                        No words added yet. Type a word above and press <strong>Enter</strong> or <strong>Tab</strong> to populate this table instantly with official dictionary definitions.
                      </td>
                    </tr>
                  ) : (
                    vocabList.map((item, index) => {
                      const isEditing = editingVocabId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                          {/* Palavra / Word */}
                          <td className="p-3 align-top">
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-md bg-[#000035] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="space-y-1">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={item.word}
                                    onChange={(e) =>
                                      handleUpdateVocab(item.id, 'word', e.target.value)
                                    }
                                    className="font-black text-xs text-[#000035] bg-slate-100 rounded px-2 py-0.5 border border-slate-300 w-full"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-xs text-[#000035] tracking-tight">
                                      {item.word}
                                    </span>
                                    {item.phonetic && (
                                      <span className="text-[10px] font-mono text-slate-400 font-normal">
                                        {item.phonetic}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 flex-wrap">
                                  {item.partOfSpeech && (
                                    <span className="inline-block px-1.5 py-0.2 rounded bg-blue-50 text-[#1C4C96] text-[9px] font-bold border border-blue-200">
                                      {item.partOfSpeech}
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                      item.source === 'api'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : item.source === 'offline_dict'
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {item.source === 'api' ? (
                                      <>
                                        <Globe className="w-2.5 h-2.5" />
                                        <span>Free Dict API</span>
                                      </>
                                    ) : item.source === 'offline_dict' ? (
                                      <span>Curated Dict</span>
                                    ) : (
                                      <span>Class Vocab</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Significado / Meaning */}
                          <td className="p-3 align-top">
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={item.meaningOrTip || ''}
                                onChange={(e) =>
                                  handleUpdateVocab(item.id, 'meaningOrTip', e.target.value)
                                }
                                placeholder="Simplified English definition..."
                                className="w-full text-xs text-[#000035] bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#1C4C96]"
                              />
                            ) : (
                              <p className="text-xs text-[#1C4C96] font-medium leading-relaxed">
                                {item.meaningOrTip ? (
                                  item.meaningOrTip
                                ) : item.source === 'pending' ? (
                                  <span className="text-blue-500 italic animate-pulse flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 animate-spin" /> Buscando na Free Dictionary API...
                                  </span>
                                ) : item.source === 'not_found' ? (
                                  <span className="text-slate-400 italic">
                                    Não encontrada na Free Dictionary API (clique em editar para adicionar dica)
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Sem definição</span>
                                )}
                              </p>
                            )}
                          </td>

                          {/* Exemplo / Example */}
                          <td className="p-3 align-top">
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={item.exampleSentence || ''}
                                onChange={(e) =>
                                  handleUpdateVocab(item.id, 'exampleSentence', e.target.value)
                                }
                                placeholder="Example sentence in English..."
                                className="w-full text-xs text-[#000035] bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#1C4C96]"
                              />
                            ) : (
                              item.exampleSentence && (
                                <p className="text-xs text-slate-600 italic leading-relaxed">
                                  "{item.exampleSentence}"
                                </p>
                              )
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => speakEnglish(item.word)}
                                className="text-slate-400 hover:text-[#1C4C96] p-1.5 transition rounded-md hover:bg-blue-50 cursor-pointer"
                                title="Listen to pronunciation"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingVocabId(isEditing ? null : item.id)
                                }
                                className="text-slate-400 hover:text-[#1C4C96] p-1.5 transition rounded-md hover:bg-slate-100 cursor-pointer"
                                title={isEditing ? 'Done editing' : 'Edit definition/example'}
                              >
                                {isEditing ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Edit3 className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveVocab(item.id)}
                                className="text-slate-300 hover:text-rose-500 transition p-1.5 rounded-md hover:bg-rose-50 cursor-pointer"
                                title="Delete word"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teacher In-Session Notes & Recommendations Space */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-[#607EC9]/30 shadow-2xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black text-[#000035] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1C4C96]" />
                <span>Teacher In-Session Notes & Recommendations</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Shared with student in their dashboard</span>
            </div>
            <textarea
              rows={3}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Record live feedback, pronunciation notes, grammar tips, or practice recommendations for the student during the session..."
              className="w-full text-xs text-[#000035] bg-white border border-[#607EC9]/40 rounded-xl p-3 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]/30 leading-relaxed resize-y"
            />
          </div>

          {/* Action Bar (Save, Copy for Meet Chat, Send) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Vocabulary Saved!</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-end">
              {/* Primary Save Button (Only action button per user specification) */}
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md border border-[#9AB4FF]/40 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 text-[#9AB4FF]" />
                <span>Save Vocabulary</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History of Past Notes for this student */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#607EC9] font-semibold border-b border-slate-100 pb-2">
            <span>Past session records for {activeStudent?.name || selectedStudentEmail}</span>
            <span>{studentHistory.length} recorded session(s)</span>
          </div>

          {studentHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No previous notes found for this student. Take notes in the editor tab to create your first coaching record.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {studentHistory.map((hist) => (
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
                        {formatDateInTimeZone(hist.startDateTime, timeZone, 'en')} •{' '}
                        {formatTimeInTimeZone(hist.startDateTime, timeZone)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLessonId(hist.id);
                        setActiveTab('editor');
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#1C4C96] rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
                    >
                      Load into Editor
                    </button>
                  </div>

                  {hist.vocabularyNotes && hist.vocabularyNotes.length > 0 && (
                    <div className="text-xs">
                      <span className="font-bold text-[#000035]">Vocabulary: </span>
                      <span className="text-[#607EC9]">
                        {hist.vocabularyNotes.map((v) => v.word).join(', ')}
                      </span>
                    </div>
                  )}

                  {hist.pronunciationNotes && (
                    <div className="text-xs">
                      <span className="font-bold text-[#000035]">Pronunciation Tips: </span>
                      <p className="text-slate-600 mt-0.5 whitespace-pre-line text-[11px]">
                        {hist.pronunciationNotes}
                      </p>
                    </div>
                  )}

                  {hist.recommendations && (
                    <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs">
                      <span className="font-bold text-amber-900">Recommendations: </span>
                      <p className="text-amber-800 mt-0.5 whitespace-pre-line text-[11px]">
                        {hist.recommendations}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

