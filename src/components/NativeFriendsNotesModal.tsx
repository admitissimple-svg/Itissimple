import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Volume2,
  Clock,
  ChevronDown,
  RefreshCw,
  Copy,
  Check,
  Printer,
  Compass,
  Layers,
  GraduationCap,
  ArrowRight,
  Filter,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { GoogleAccount, LiveLesson, StudentProfile, UserProfile, EnglishLevel } from '../types';
import { formatDateInTimeZone } from '../utils/timezone';
import { speakEnglish } from '../utils/audio';
import {
  PedagogicalLessonTransformation,
  fetchPedagogicalTransformation,
  resolveCefrLevel,
} from '../utils/pedagogicalTransformer';
import { getDb } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface NativeFriendsNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentUid?: string;
  studentEmail?: string;
  currentAccount?: GoogleAccount | null;
  userProfile?: UserProfile | StudentProfile | null;
  lessons?: LiveLesson[];
  timeZone?: string;
  currentLanguage?: string;
}

interface SessionOption {
  key: string;
  lessonId?: string;
  dateStr: string;
  topic: string;
  teacherName: string;
  rawContent: string;
  timestamp: number;
}

export const NativeFriendsNotesModal: React.FC<NativeFriendsNotesModalProps> = ({
  isOpen,
  onClose,
  studentUid,
  studentEmail,
  currentAccount,
  userProfile,
  lessons = [],
  timeZone = 'America/Sao_Paulo',
  currentLanguage = 'pt',
}) => {
  const isEn = currentLanguage === 'en';

  // Resolved identity for strict UID-level isolation
  const resolvedUid = useMemo(() => {
    return (
      studentUid ||
      userProfile?.uid ||
      userProfile?.id ||
      currentAccount?.id ||
      (currentAccount as any)?.uid ||
      ''
    );
  }, [studentUid, userProfile?.uid, userProfile?.id, currentAccount?.id, (currentAccount as any)?.uid]);

  const resolvedEmail = useMemo(() => {
    return (
      studentEmail ||
      userProfile?.email ||
      currentAccount?.email ||
      ''
    ).toLowerCase().trim();
  }, [studentEmail, userProfile?.email, currentAccount?.email]);

  const studentLevel = useMemo(() => {
    return (
      userProfile?.level ||
      (userProfile as any)?.userLevel ||
      (userProfile as any)?.englishLevel ||
      EnglishLevel.INTERMEDIATE
    );
  }, [userProfile]);

  const cefrMeta = useMemo(() => resolveCefrLevel(studentLevel), [studentLevel]);

  // Sessions and selection state
  const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('');
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);

  // Transformation data state
  const [transformation, setTransformation] = useState<PedagogicalLessonTransformation | null>(null);
  const [isLoadingTransformation, setIsLoadingTransformation] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mistakes' | 'grammar' | 'vocab' | 'level' | 'summary'>('all');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Load and consolidate sessions for this isolated student (sorted strictly descending: newest first)
  const fetchStudentSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const sessionsMap = new Map<string, SessionOption>();

    try {
      // 1. In-memory / passed lessons matching student UID or Email
      if (Array.isArray(lessons)) {
        lessons.forEach((l) => {
          if (!l) return;
          const lStudentUid = l.studentUid || (l as any)?.studentId || '';
          const lStudentEmail = (l.studentEmail || '').toLowerCase().trim();

          const matchesUid = resolvedUid && lStudentUid && lStudentUid === resolvedUid;
          const matchesEmail = resolvedEmail && lStudentEmail && lStudentEmail === resolvedEmail;

          if (matchesUid || matchesEmail || (!resolvedUid && !resolvedEmail)) {
            const raw =
              l.sessionNotesDocument ||
              l.liveNotes ||
              l.recommendations ||
              (l.vocabularyNotes && l.vocabularyNotes.length > 0
                ? l.vocabularyNotes.map((v) => `• ${v.word}: ${v.notes || ''}`).join('\n')
                : '');

            if (raw && raw.trim()) {
              const datePart =
                l.sessionDate ||
                (l.startDateTime && typeof l.startDateTime === 'string'
                  ? l.startDateTime.split('T')[0]
                  : '');
              const timestamp = l.startDateTime ? new Date(l.startDateTime).getTime() : 0;
              const key = l.id || `lesson_${datePart}`;

              sessionsMap.set(key, {
                key,
                lessonId: l.id,
                dateStr: datePart || 'Recent Session',
                topic: l.title || 'Conversation & Fluency',
                teacherName: l.teacherName || (l as any)?.tutorName || 'Native Friend',
                rawContent: raw,
                timestamp,
              });
            }
          }
        });
      }

      // 2. Query Firestore /users/{studentUid}/session_notes
      try {
        const firestore = getDb();
        if (firestore && resolvedUid) {
          const userNotesCol = collection(firestore, 'users', resolvedUid, 'session_notes');
          const snap = await getDocs(userNotesCol);
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.content && data.content.trim()) {
              const dateStr = data.sessionDate || docSnap.id.replace('session_', '').slice(0, 10);
              const timestamp = new Date(dateStr || data.updatedAt || 0).getTime();
              const key = docSnap.id;
              if (!sessionsMap.has(key)) {
                sessionsMap.set(key, {
                  key,
                  lessonId: data.lessonId,
                  dateStr,
                  topic: data.topic || 'In-Session Coaching',
                  teacherName: data.teacherName || 'Native Friend',
                  rawContent: data.content,
                  timestamp,
                });
              }
            }
          });
        }
      } catch (fsErr) {
        console.warn('NativeFriendsNotes: Firestore /users query notice:', fsErr);
      }

      // 3. Query Server API: /api/session-notes
      try {
        const queryParams = new URLSearchParams();
        if (resolvedUid) queryParams.set('studentUid', resolvedUid);
        if (resolvedEmail) queryParams.set('studentEmail', resolvedEmail);

        const res = await fetch(`/api/session-notes?${queryParams.toString()}`);
        if (res.ok) {
          const serverNotes = await res.json();
          if (Array.isArray(serverNotes)) {
            serverNotes.forEach((n: any) => {
              if (n && n.content && n.content.trim()) {
                const key = n.id || `session_${n.sessionDate}`;
                const timestamp = new Date(n.sessionDate || n.updatedAt || 0).getTime();
                if (!sessionsMap.has(key)) {
                  sessionsMap.set(key, {
                    key,
                    lessonId: n.lessonId,
                    dateStr: n.sessionDate || 'Session',
                    topic: n.topic || 'In-Session Notes',
                    teacherName: n.teacherName || 'Native Friend',
                    rawContent: n.content,
                    timestamp,
                  });
                }
              }
            });
          }
        }
      } catch (apiErr) {
        console.warn('NativeFriendsNotes: Server notes query notice:', apiErr);
      }

      // 4. Convert to array and sort STRICTLY DESCENDING (newest / most recent first)
      const list = Array.from(sessionsMap.values()).sort((a, b) => {
        const timeA = a.timestamp || (a.dateStr ? new Date(a.dateStr).getTime() : 0);
        const timeB = b.timestamp || (b.dateStr ? new Date(b.dateStr).getTime() : 0);
        return timeB - timeA; // Descending: newest first
      });

      setSessionOptions(list);

      // Auto-select the most recent session if not selected yet
      if (list.length > 0) {
        setSelectedSessionKey((prev) => {
          if (prev && list.some((item) => item.key === prev)) return prev;
          return list[0].key;
        });
      } else {
        setSelectedSessionKey('');
      }
    } catch (err) {
      console.warn('NativeFriendsNotes: Error fetching student sessions', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [resolvedUid, resolvedEmail, lessons]);

  // Load sessions whenever modal opens or student identity changes
  useEffect(() => {
    if (isOpen) {
      fetchStudentSessions();
    }
  }, [isOpen, fetchStudentSessions]);

  // Active session object
  const activeSession = useMemo(() => {
    return sessionOptions.find((s) => s.key === selectedSessionKey) || sessionOptions[0] || null;
  }, [sessionOptions, selectedSessionKey]);

  // Load and transform pedagogical notes whenever active session changes
  const loadPedagogicalNotes = useCallback(
    async (forceRegenerate: boolean = false) => {
      if (!activeSession) {
        setTransformation(null);
        return;
      }

      setIsLoadingTransformation(true);
      try {
        const result = await fetchPedagogicalTransformation({
          rawNotes: activeSession.rawContent,
          topic: activeSession.topic,
          sessionDate: activeSession.dateStr,
          teacherName: activeSession.teacherName,
          studentLevel,
          studentUid: resolvedUid,
          studentEmail: resolvedEmail,
          lessonId: activeSession.lessonId,
          sessionKey: activeSession.key,
          forceRegenerate,
        });

        setTransformation(result);
      } catch (err) {
        console.warn('Failed to load pedagogical notes:', err);
      } finally {
        setIsLoadingTransformation(false);
      }
    },
    [activeSession, studentLevel, resolvedUid, resolvedEmail]
  );

  useEffect(() => {
    if (isOpen && activeSession) {
      loadPedagogicalNotes(false);
    }
  }, [isOpen, activeSession, loadPedagogicalNotes]);

  // Copy 5-10 minute review summary to clipboard
  const handleCopySummary = () => {
    if (!transformation) return;
    const summary = transformation.reviewSummary;
    const text = [
      `📚 NATIVE FRIENDS NOTES — 5–10 MINUTE REVIEW SUMMARY`,
      `📅 Date: ${transformation.sessionDate} | Topic: ${transformation.topic}`,
      `🎓 Level: ${transformation.cefrLevel} (${transformation.levelAdaptation.levelLabel})`,
      `\n⚡ KEY GRAMMAR RULES:`,
      ...summary.keyRules.map((r, i) => `${i + 1}. ${r}`),
      `\n💬 ESSENTIAL CORRECTIONS:`,
      ...summary.essentialCorrections.map((c) => `✗ ${c.original}  ➜  ✓ ${c.corrected}`),
      `\n✨ MUST-KNOW VOCABULARY:`,
      ...summary.mustKnowVocabulary.map((v) => `• ${v}`),
      `\n🎯 REMEMBER THIS:`,
      summary.rememberThis,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      id="native-friends-notes-modal-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#9AB4FF]/50 relative"
        id="native-friends-notes-modal"
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#000035] via-[#062863] to-[#1C4C96] text-white px-5 sm:px-7 py-4.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-[#9AB4FF] shadow-inner">
              <BookOpen className="w-6 h-6 text-[#9AB4FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Native Friends Notes
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black border border-emerald-400/40">
                  {cefrMeta.cefr} • {cefrMeta.labelEn}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#9AB4FF] text-[10px] font-bold border border-[#9AB4FF]/30">
                  Isolated by Student UID
                </span>
              </div>
              <p className="text-xs text-[#9AB4FF] mt-0.5">
                {isEn
                  ? 'Pedagogical transformation calibrated to your CEFR level and speaking goals'
                  : 'Transformação pedagógica calibrada ao seu nível CEFR e objetivos de conversação'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-white/10"
              title={isEn ? 'Print or save as PDF' : 'Imprimir ou salvar PDF'}
            >
              <Printer className="w-4 h-4 text-[#9AB4FF]" />
              <span className="hidden sm:inline">{isEn ? 'Print' : 'Imprimir'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer border border-white/15"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Lesson History Selector Bar (STRICTLY DESCENDING: NEWEST FIRST) */}
        <div className="bg-[#f8faff] border-b border-[#9AB4FF]/30 px-5 sm:px-7 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-[#1C4C96] shrink-0" />
            <label htmlFor="session-date-selector" className="text-xs font-black uppercase tracking-wider text-[#062863] shrink-0">
              {isEn ? 'Lesson Date (Newest first):' : 'Data da Aula (Mais recente primeiro):'}
            </label>

            {sessionOptions.length > 0 ? (
              <div className="relative flex-1 max-w-md">
                <select
                  id="session-date-selector"
                  value={selectedSessionKey}
                  onChange={(e) => setSelectedSessionKey(e.target.value)}
                  className="w-full bg-white border border-[#607EC9]/40 rounded-xl px-3 py-1.5 text-xs font-bold text-[#000035] pr-8 focus:outline-none focus:ring-2 focus:ring-[#1C4C96] cursor-pointer shadow-2xs"
                >
                  {sessionOptions.map((opt, idx) => (
                    <option key={opt.key} value={opt.key}>
                      {idx === 0 ? '⭐ [Latest] ' : ''}
                      {opt.dateStr ? formatDateInTimeZone(opt.dateStr, timeZone, isEn ? 'en' : 'pt') : 'Session'}
                      {' — '}
                      {opt.topic} ({opt.teacherName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#607EC9] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">
                {isLoadingSessions
                  ? (isEn ? 'Searching past lessons...' : 'Buscando aulas anteriores...')
                  : (isEn ? 'No notes recorded yet' : 'Nenhuma anotação gravada ainda')}
              </span>
            )}
          </div>

          {/* Quick stats and refresh */}
          {activeSession && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadPedagogicalNotes(true)}
                disabled={isLoadingTransformation}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-[#607EC9]/40 text-[#1C4C96] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                title={isEn ? 'Regenerate pedagogical report' : 'Regerar transformação pedagógica'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTransformation ? 'animate-spin' : ''}`} />
                <span>{isEn ? 'Refresh Analysis' : 'Atualizar Análise'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 rounded-xl bg-[#062863] hover:bg-[#000035] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEn ? 'Copied!' : 'Copiado!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#9AB4FF]" />
                    <span>{isEn ? 'Copy 5-Min Summary' : 'Copiar Resumo 5-Min'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Section Navigation Tabs (5 Pedagogical Sections) */}
        <div className="bg-white border-b border-[#9AB4FF]/25 px-5 sm:px-7 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-[#000035] text-white shadow-2xs'
                : 'bg-slate-100 text-[#062863] hover:bg-slate-200'
            }`}
          >
            {isEn ? 'Complete Report (All 5)' : 'Relatório Completo (Todos)'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mistakes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'mistakes'
                ? 'bg-[#b91c1c] text-white shadow-2xs'
                : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
            }`}
          >
            <span>1. {isEn ? 'Analyze Mistakes' : 'Análise de Erros'}</span>
            {transformation?.mistakesAnalysis && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">
                {transformation.mistakesAnalysis.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grammar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'grammar'
                ? 'bg-[#1C4C96] text-white shadow-2xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <span>2. {isEn ? 'Grammar Points' : 'Pontos Gramaticais'}</span>
            {transformation?.grammarPoints && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">
                {transformation.grammarPoints.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vocab')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'vocab'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <span>3. {isEn ? 'Vocabulary & Expressions' : 'Vocabulário & Expressões'}</span>
            {transformation?.vocabularyAndExpressions && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">
                {transformation.vocabularyAndExpressions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('level')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'level'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>4. {isEn ? 'CEFR Level Adaptation' : 'Adaptação de Nível CEFR'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'summary'
                ? 'bg-[#15803d] text-white shadow-md ring-2 ring-emerald-300'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>5. {isEn ? '5–10 Min Quick Review' : 'Revisão Rápida 5–10 Min'}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/50">
          {isLoadingSessions || isLoadingTransformation ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-[#000035] text-[#9AB4FF] flex items-center justify-center animate-bounce shadow-lg">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#000035]">
                  {isEn
                    ? 'Transforming Raw Teacher Notes into Masterclass Pedagogical Report...'
                    : 'Transformando Anotações Brutas em Guia Pedagógico Masterclass...'}
                </h3>
                <p className="text-xs text-[#607EC9] mt-1 max-w-md">
                  {isEn
                    ? `Parsing Ctrl+Alt+C and Ctrl+Alt+E stamps and calibrating rules to CEFR ${cefrMeta.cefr}.`
                    : `Processando marcações de acertos (Ctrl+Alt+C) e erros (Ctrl+Alt+E) e calibrando regras para CEFR ${cefrMeta.cefr}.`}
                </p>
              </div>
            </div>
          ) : !activeSession || !transformation ? (
            <div className="py-16 px-6 rounded-3xl border-2 border-dashed border-[#9AB4FF]/50 bg-white flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#9AB4FF]/20 text-[#1C4C96] flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-[#000035]">
                {isEn ? 'No In-Session Notes Available' : 'Nenhuma anotação de aula disponível'}
              </h3>
              <p className="text-xs text-[#607EC9] max-w-md">
                {isEn
                  ? 'Your Native Friend will record notes and stamp corrections during your 1-on-1 sessions. They will be transformed into this pedagogical report automatically!'
                  : 'Seu Amigo Nativo gravará anotações e marcará correções durante suas sessões 1-a-1. Elas serão transformadas neste guia pedagógico automaticamente!'}
              </p>
            </div>
          ) : (
            <>
              {/* Session Overview Card */}
              <div className="p-4.5 rounded-2xl bg-gradient-to-r from-blue-900/5 via-[#9AB4FF]/10 to-indigo-900/5 border border-[#9AB4FF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-[#062863] tracking-wider">
                      {isEn ? 'Session Focus:' : 'Foco da Sessão:'}
                    </span>
                    <h3 className="font-black text-sm text-[#000035]">{transformation.topic}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-white text-[11px] font-bold text-slate-700 border border-slate-200">
                      📅 {formatDateInTimeZone(transformation.sessionDate, timeZone, isEn ? 'en' : 'pt')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {isEn ? 'Guided with Native Friend' : 'Conduzida com o Amigo Nativo'}:{' '}
                    <strong>{transformation.teacherName || 'Native Friend'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-[#9AB4FF]/40 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Ctrl+Alt+C ✓</div>
                    <div className="text-xs font-black text-emerald-800">
                      {transformation.correctStampsCount} {isEn ? 'Mastered' : 'Acertos'}
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-[#9AB4FF]/40 text-center shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-red-700">Ctrl+Alt+E ✗</div>
                    <div className="text-xs font-black text-red-800">
                      {transformation.incorrectStampsCount} {isEn ? 'Mistakes' : 'Ajustes'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  SECTION 1: ANALYZE THE STUDENT'S MISTAKES
                  ======================================================== */}
              {(activeTab === 'all' || activeTab === 'mistakes') && (
                <section className="space-y-3" id="section-analyze-mistakes">
                  <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-xs">
                        1
                      </div>
                      <h3 className="font-black text-sm text-[#000035] tracking-tight">
                        {isEn ? 'Analyze the Student’s Mistakes' : 'Análise dos Erros do Aluno'}
                      </h3>
                      <span className="text-xs text-slate-500">
                        ({transformation.mistakesAnalysis.length} {isEn ? 'points analyzed' : 'pontos analisados'})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Original ✗ vs Corrected ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {transformation.mistakesAnalysis.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-4.5 rounded-2xl bg-white border border-slate-200 hover:border-[#9AB4FF] shadow-xs space-y-3 transition-all"
                      >
                        {/* Header: Category Badge & Audio */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            Category: {item.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakEnglish(item.corrected)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-bold cursor-pointer transition"
                            title="Listen to native pronunciation"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#1C4C96]" />
                            <span className="text-[11px]">{isEn ? 'Listen' : 'Ouvir'}</span>
                          </button>
                        </div>

                        {/* Side by side: Original vs Corrected */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-red-50/70 border border-red-200/80 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-red-800">
                              <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                ✗
                              </span>
                              <span>{isEn ? 'Original Utterance' : 'Forma Original Falada'}</span>
                            </div>
                            <p className="text-xs text-red-950 font-semibold italic pl-5.5">
                              "{item.original}"
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                ✓
                              </span>
                              <span>{isEn ? 'Natural Native Correction' : 'Forma Corrigida e Natural'}</span>
                            </div>
                            <p className="text-xs text-emerald-950 font-black pl-5.5">
                              "{item.corrected}"
                            </p>
                          </div>
                        </div>

                        {/* Grammatical Explanation */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                          <div className="font-bold text-[#000035] flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{isEn ? 'Grammatical Rule & Pedagogical Breakdown:' : 'Explicação da Regra Gramatical:'}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed pl-5">
                            {item.explanation}
                          </p>
                        </div>

                        {/* 2 Natural Examples */}
                        {Array.isArray(item.twoExamples) && item.twoExamples.length > 0 && (
                          <div className="space-y-1 text-xs pl-2">
                            <span className="font-bold text-[#062863]">
                              {isEn ? '2 Natural Usage Examples:' : '2 Exemplos Naturais:'}
                            </span>
                            <ul className="space-y-1 pl-4 list-disc text-slate-700">
                              {item.twoExamples.map((ex, exIdx) => (
                                <li key={exIdx} className="leading-snug">
                                  <span>{ex}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Common Pitfalls */}
                        {item.commonPitfalls && (
                          <div className="text-[11px] p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>{isEn ? 'Common Pitfall' : 'Erro Comum'}:</strong> {item.commonPitfalls}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================================
                  SECTION 2: TEACH THE GRAMMAR POINTS
                  ======================================================== */}
              {(activeTab === 'all' || activeTab === 'grammar') && (
                <section className="space-y-3" id="section-teach-grammar">
                  <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                        2
                      </div>
                      <h3 className="font-black text-sm text-[#000035] tracking-tight">
                        {isEn ? 'Teach the Grammar Points' : 'Ensinar os Pontos Gramaticais'}
                      </h3>
                      <span className="text-xs text-slate-500">
                        ({transformation.grammarPoints.length} {isEn ? 'topics' : 'tópicos'})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Rule • Form • Usage • Comparisons
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {transformation.grammarPoints.map((gp, idx) => (
                      <div
                        key={gp.id || idx}
                        className="p-5 rounded-2xl bg-white border border-[#607EC9]/30 shadow-xs space-y-3.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-black text-sm text-[#000035] flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-[#1C4C96]" />
                            <span>{gp.topic}</span>
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                            Grammar Focus
                          </span>
                        </div>

                        {/* Rule & Form */}
                        <div className="space-y-2 text-xs">
                          <p className="text-slate-700 leading-relaxed">
                            <strong>{isEn ? 'Rule:' : 'Regra:'}</strong> {gp.rule}
                          </p>

                          {gp.form && (
                            <div className="p-2.5 rounded-xl bg-slate-100 font-mono text-[11px] text-[#000035] border border-slate-200">
                              <span className="text-[#1C4C96] font-bold mr-1">FORM:</span>
                              {gp.form}
                            </div>
                          )}

                          {gp.usage && (
                            <p className="text-slate-700">
                              <strong>{isEn ? 'Communicative Usage:' : 'Uso Prático:'}</strong> {gp.usage}
                            </p>
                          )}
                        </div>

                        {/* Real Examples */}
                        {Array.isArray(gp.examples) && gp.examples.length > 0 && (
                          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1 text-xs">
                            <span className="font-black text-[#1C4C96]">
                              {isEn ? 'Illustrative Natural Examples:' : 'Exemplos Ilustrativos:'}
                            </span>
                            <ul className="space-y-1 pl-4 list-disc text-slate-800">
                              {gp.examples.map((ex, exI) => (
                                <li key={exI} className="leading-snug">{ex}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Comparison / Contrast */}
                        {gp.comparisons && (
                          <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 space-y-0.5">
                            <span className="font-bold flex items-center gap-1 text-purple-950">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Comparison & Contrast:' : 'Comparação & Contraste:'}</span>
                            </span>
                            <p className="pl-4.5">{gp.comparisons}</p>
                          </div>
                        )}

                        {/* Common Mistakes */}
                        {gp.commonMistakes && (
                          <div className="text-[11px] p-2 rounded-lg bg-red-50 text-red-900 border border-red-200">
                            <strong>{isEn ? 'Common Mistakes to Avoid:' : 'Erros Comuns a Evitar:'}</strong> {gp.commonMistakes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================================
                  SECTION 3: TEACH THE VOCABULARY AND EXPRESSIONS
                  ======================================================== */}
              {(activeTab === 'all' || activeTab === 'vocab') && (
                <section className="space-y-3" id="section-teach-vocabulary">
                  <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                        3
                      </div>
                      <h3 className="font-black text-sm text-[#000035] tracking-tight">
                        {isEn ? 'Teach the Vocabulary and Expressions' : 'Vocabulário, Expressões e Phrasal Verbs'}
                      </h3>
                      <span className="text-xs text-slate-500">
                        ({transformation.vocabularyAndExpressions.length} {isEn ? 'items' : 'itens'})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Category • Collocations • Examples
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transformation.vocabularyAndExpressions.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        className="p-4.5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-xs space-y-3 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black uppercase">
                              {v.category || 'Vocabulary'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 capitalize">
                              {v.register} register
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-base text-[#000035] tracking-tight">{v.term}</h4>
                              <button
                                type="button"
                                onClick={() => speakEnglish(v.term)}
                                className="w-6 h-6 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center cursor-pointer transition"
                                title="Listen to pronunciation"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500 italic">
                              {v.partOfSpeech}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed">
                            {v.simpleDefinition}
                          </p>

                          {/* Collocations */}
                          {Array.isArray(v.collocations) && v.collocations.length > 0 && (
                            <div className="space-y-1 text-xs">
                              <span className="font-bold text-[#062863] text-[11px] uppercase tracking-wide">
                                {isEn ? 'Natural Collocations:' : 'Colocações Naturais:'}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {v.collocations.map((col, cI) => (
                                  <span
                                    key={cI}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200"
                                  >
                                    {col}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Real-life Examples */}
                          {Array.isArray(v.realExamples) && v.realExamples.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                              <span className="font-bold text-[#1C4C96] text-[11px]">
                                {isEn ? 'In real conversations:' : 'Em conversas reais:'}
                              </span>
                              <ul className="space-y-1 pl-4 list-disc text-slate-700 text-[11px]">
                                {v.realExamples.map((ex, eI) => (
                                  <li key={eI} className="italic">"{ex}"</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Synonyms */}
                        {Array.isArray(v.synonyms) && v.synonyms.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold">{isEn ? 'Synonyms' : 'Sinônimos'}:</span>
                            {v.synonyms.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================================
                  SECTION 4: ADAPT EVERYTHING TO THE STUDENT'S LEVEL
                  ======================================================== */}
              {(activeTab === 'all' || activeTab === 'level') && (
                <section className="space-y-3" id="section-adapt-level">
                  <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">
                        4
                      </div>
                      <h3 className="font-black text-sm text-[#000035] tracking-tight">
                        {isEn ? 'Adapt Everything to the Student’s Level' : 'Adaptação ao Nível do Aluno (CEFR)'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                        CEFR {transformation.levelAdaptation.cefrLevel}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      L1 Portuguese Interference Analysis
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-4">
                    {/* Visual Level Track */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>CEFR Progression</span>
                        <span className="text-amber-700 font-black">
                          {transformation.levelAdaptation.cefrLevel} • {transformation.levelAdaptation.levelLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => {
                          const isActive = lvl === transformation.levelAdaptation.cefrLevel;
                          return (
                            <div
                              key={lvl}
                              className={`py-1.5 rounded-lg text-center text-xs font-black transition ${
                                isActive
                                  ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {lvl}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Portuguese L1 Interference Warnings */}
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1 text-xs text-amber-950">
                      <div className="font-black flex items-center gap-1.5 text-amber-900">
                        <Compass className="w-4 h-4 text-amber-600" />
                        <span>
                          {isEn
                            ? 'Native Language (Portuguese) Interference Guard:'
                            : 'Análise de Interferência do Português (L1):'}
                        </span>
                      </div>
                      <p className="pl-5 leading-relaxed">
                        {transformation.levelAdaptation.nativeInterferenceNotes}
                      </p>
                    </div>

                    {/* Complexity Adjustment Advice */}
                    {transformation.levelAdaptation.complexityAdjustmentAdvice && (
                      <div className="text-xs space-y-1 text-slate-700">
                        <strong>{isEn ? 'How to practice at your level:' : 'Como praticar no seu nível atual:'}</strong>
                        <p className="leading-relaxed">
                          {transformation.levelAdaptation.complexityAdjustmentAdvice}
                        </p>
                      </div>
                    )}

                    {/* Targeted Practice Prompt */}
                    {transformation.levelAdaptation.targetedPracticePrompt && (
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-[#000035] space-y-1.5">
                        <div className="font-black text-[#1C4C96] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#1C4C96]" />
                          <span>{isEn ? 'Targeted Speaking Challenge for Next Class:' : 'Desafio de Fala para a Próxima Aula:'}</span>
                        </div>
                        <p className="italic pl-5 leading-relaxed">
                          "{transformation.levelAdaptation.targetedPracticePrompt}"
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ========================================================
                  SECTION 5: CREATE A 5–10 MINUTE REVIEW SUMMARY
                  ======================================================== */}
              {(activeTab === 'all' || activeTab === 'summary') && (
                <section className="space-y-3" id="section-review-summary">
                  <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                        5
                      </div>
                      <h3 className="font-black text-sm text-[#000035] tracking-tight">
                        {isEn ? '5–10 Minute Pre-Class Review Summary' : 'Resumo Executivo para Revisão em 5–10 Minutos'}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-black flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-700" />
                      <span>{transformation.reviewSummary.estimatedMinutes || '5–10 minutes'}</span>
                    </span>
                  </div>

                  <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900/5 via-white to-teal-900/5 border-2 border-emerald-500/30 shadow-md space-y-5">
                    {/* Golden Remember This Callout */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md space-y-1">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-100">
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>REMEMBER THIS!</span>
                      </div>
                      <p className="text-sm font-black leading-snug text-white">
                        {transformation.reviewSummary.rememberThis}
                      </p>
                    </div>

                    {/* Side by Side: Essential Corrections & Rules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Essential Corrections */}
                      <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs space-y-2.5">
                        <h4 className="font-black text-xs uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{isEn ? 'Essential Corrections Table' : 'Tabela de Correções Essenciais'}</span>
                        </h4>
                        <div className="space-y-1.5 text-xs">
                          {transformation.reviewSummary.essentialCorrections.map((c, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                            >
                              <span className="text-red-700 line-through font-medium">✗ {c.original}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-emerald-700 font-bold">✓ {c.corrected}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Rules at a Glance */}
                      <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs space-y-2.5">
                        <h4 className="font-black text-xs uppercase tracking-wide text-blue-900 flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span>{isEn ? 'Key Grammar Rules at a Glance' : 'Regras Principais em Resumo'}</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
                          {transformation.reviewSummary.keyRules.map((r, i) => (
                            <li key={i} className="leading-snug">{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Must-Know Vocabulary Checklist */}
                    {Array.isArray(transformation.reviewSummary.mustKnowVocabulary) &&
                      transformation.reviewSummary.mustKnowVocabulary.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                          <h4 className="font-black text-xs uppercase tracking-wide text-[#000035]">
                            {isEn ? 'High-Frequency Vocabulary Checklist:' : 'Vocabulário de Alta Frequência:'}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {transformation.reviewSummary.mustKnowVocabulary.map((v, i) => (
                              <div
                                key={i}
                                className="p-2 rounded-xl bg-purple-50/50 border border-purple-200/70 text-purple-950 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                                <span className="font-medium text-[11px] leading-tight">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-[#9AB4FF]/30 px-5 sm:px-7 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isEn
                ? 'Individualized by Student UID • Preserves all live schedule balance & teachers'
                : 'Individualizado por UID do Aluno • Preserva agendamentos, créditos e professores'}
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#000035] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#1C4C96]" />}
              <span>{copiedSummary ? (isEn ? 'Copied' : 'Copiado') : (isEn ? 'Copy 5-Min Summary' : 'Copiar Resumo')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#000035] hover:bg-[#062863] text-white text-xs font-bold transition cursor-pointer shadow-md"
            >
              {isEn ? 'Close Guide' : 'Fechar Guia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
