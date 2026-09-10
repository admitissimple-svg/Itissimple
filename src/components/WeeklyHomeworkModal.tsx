import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Printer,
  Send,
  Sparkles,
  Volume2,
  Award,
  Clock,
  User,
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle,
  FileText,
  MessageSquare,
  Compass,
  CheckSquare,
  ChevronRight,
} from 'lucide-react';
import { WeeklyHomeworkData, Language, HomeworkAiEvaluation } from '../types';
import { speakText } from '../utils/audio';
import { checkStudentWritingApi, evaluateWeeklyHomeworkApi } from '../utils/writingChecker';
import { getMemorizationTranslations } from '../utils/i18n/memorizationActivity';

interface WeeklyHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  homework: WeeklyHomeworkData;
  onSaveProgress: (updatedHomework: WeeklyHomeworkData) => void;
  onSubmitToTeacher: (homework: WeeklyHomeworkData) => void;
  currentLanguage: Language;
  onRegenerateWithAi?: () => Promise<void> | void;
  isGeneratingAi?: boolean;
  t?: any;
}

export const WeeklyHomeworkModal: React.FC<WeeklyHomeworkModalProps> = ({
  isOpen,
  onClose,
  homework,
  onSaveProgress,
  onSubmitToTeacher,
  currentLanguage,
  onRegenerateWithAi,
  isGeneratingAi = false,
}) => {
  const isEn = currentLanguage === 'en';
  const memT = useMemo(() => getMemorizationTranslations(currentLanguage), [currentLanguage]);

  const studentLevelDisplay = useMemo(() => {
    const raw = (homework?.studentLevel || 'Beginner').toLowerCase();
    if (raw.includes('avan') || raw.includes('advan')) {
      return isEn ? 'Advanced Level' : 'Nível Avançado';
    }
    if (raw.includes('inter')) {
      return isEn ? 'Intermediate Level' : 'Nível Intermediário';
    }
    return isEn ? 'Beginner Level' : 'Nível Iniciante';
  }, [homework?.studentLevel, isEn]);

  const formattedWeekLabel = useMemo(() => {
    if (!homework?.weekLabel) return '';
    if (currentLanguage === 'en' && homework.weekLabel.startsWith('Semana de ')) {
      return homework.weekLabel.replace('Semana de ', 'Week of ');
    }
    if (currentLanguage !== 'en' && homework.weekLabel.startsWith('Week of ')) {
      return homework.weekLabel.replace('Week of ', 'Semana de ');
    }
    return homework.weekLabel;
  }, [homework?.weekLabel, currentLanguage]);

  const renderHighlightedPassage = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const clean = part.slice(2, -2);
        return (
          <span
            key={i}
            className="font-extrabold text-[#000035] bg-[#9AB4FF]/25 px-1 py-0.5 rounded border border-[#9AB4FF]/40 inline-block"
          >
            {clean}
          </span>
        );
      }
      return part;
    });
  };

  const [activeTab, setActiveTab] = useState<'matching' | 'fill' | 'writing' | 'reading' | 'results'>(
    homework?.isCompleted ? 'results' : 'matching'
  );

  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>(
    homework?.studentAnswers?.matching || {}
  );
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>(
    homework?.studentAnswers?.fillInBlanks || {}
  );
  const [sentenceAnswers, setSentenceAnswers] = useState<Record<string, string>>(
    homework?.studentAnswers?.sentences || {}
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>(
    homework?.studentAnswers?.quizAnswers || {}
  );

  const [aiEvaluation, setAiEvaluation] = useState<HomeworkAiEvaluation | undefined>(
    homework?.aiEvaluation
  );
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);

  const [sentenceFeedbacks, setSentenceFeedbacks] = useState<Record<string, any>>({});
  const [isCheckingSentence, setIsCheckingSentence] = useState<Record<string, boolean>>({});
  const [submittedFeedbackToast, setSubmittedFeedbackToast] = useState<string | null>(null);

  const handleCheckSentence = async (word: string) => {
    const text = sentenceAnswers[word];
    if (!text || !text.trim()) return;

    setIsCheckingSentence((prev) => ({ ...prev, [word]: true }));
    try {
      const result = await checkStudentWritingApi({
        sentence: text.trim(),
        words: [word],
        activityName: 'Weekly Homework',
        level: homework?.studentLevel || 'Beginner',
      });
      setSentenceFeedbacks((prev) => ({ ...prev, [word]: result }));
    } catch {
      // fallback handled in API
    } finally {
      setIsCheckingSentence((prev) => ({ ...prev, [word]: false }));
    }
  };

  const handleCalculateScore = async () => {
    setIsEvaluatingAll(true);

    // Immediate baseline score
    let totalPoints = 0;
    let earnedPoints = 0;

    const matchingWeight = 25;
    totalPoints += matchingWeight;
    let correctMatches = 0;
    for (const pair of homework.matchingPairs) {
      if (matchingAnswers[pair.id]?.toLowerCase() === pair.word.toLowerCase()) {
        correctMatches++;
      }
    }
    const matchScore = homework.matchingPairs.length > 0
      ? (correctMatches / homework.matchingPairs.length) * matchingWeight
      : matchingWeight;
    earnedPoints += matchScore;

    const fillWeight = 30;
    totalPoints += fillWeight;
    let correctFills = 0;
    for (const item of homework.fillInBlanks) {
      if (fillAnswers[item.id]?.toLowerCase() === item.correctWord.toLowerCase()) {
        correctFills++;
      }
    }
    const fillScore = homework.fillInBlanks.length > 0
      ? (correctFills / homework.fillInBlanks.length) * fillWeight
      : fillWeight;
    earnedPoints += fillScore;

    const writingWeight = 25;
    totalPoints += writingWeight;
    let writtenCount = 0;
    for (const prompt of homework.sentenceWritingPrompts) {
      const s = sentenceAnswers[prompt.word];
      if (s && s.trim().length >= 8) {
        writtenCount++;
      }
    }
    const writingScore = homework.sentenceWritingPrompts.length > 0
      ? (writtenCount / homework.sentenceWritingPrompts.length) * writingWeight
      : writingWeight;
    earnedPoints += writingScore;

    const quizWeight = 20;
    totalPoints += quizWeight;
    let correctQuiz = 0;
    for (const q of homework.readingPassage.questions) {
      if (quizAnswers[q.id] === q.correctAnswer) {
        correctQuiz++;
      }
    }
    const quizScore = homework.readingPassage.questions.length > 0
      ? (correctQuiz / homework.readingPassage.questions.length) * quizWeight
      : quizWeight;
    earnedPoints += quizScore;

    let finalScore = Math.min(100, Math.round((earnedPoints / totalPoints) * 100));

    // Request intelligent AI evaluation from server endpoint
    let evalResult: HomeworkAiEvaluation | undefined = undefined;
    try {
      evalResult = await evaluateWeeklyHomeworkApi({
        homework,
        studentAnswers: {
          matching: matchingAnswers,
          fillInBlanks: fillAnswers,
          sentences: sentenceAnswers,
          quizAnswers: quizAnswers,
        },
        studentLevel: homework.studentLevel || 'Beginner',
        studentName: homework.studentName || 'Student',
        currentLanguage,
      });

      if (evalResult && typeof evalResult.overallScore === 'number') {
        finalScore = evalResult.overallScore;
        setAiEvaluation(evalResult);
      }
    } catch (err) {
      console.warn('AI evaluation error, proceeding with baseline score:', err);
    } finally {
      setIsEvaluatingAll(false);
    }

    const updated: WeeklyHomeworkData = {
      ...homework,
      isCompleted: true,
      score: finalScore,
      submittedAt: new Date().toISOString(),
      studentAnswers: {
        matching: matchingAnswers,
        fillInBlanks: fillAnswers,
        sentences: sentenceAnswers,
        quizAnswers: quizAnswers,
      },
      aiEvaluation: evalResult || aiEvaluation,
    };

    onSaveProgress(updated);
    setActiveTab('results');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = () => {
    onSubmitToTeacher(homework);
    setSubmittedFeedbackToast(memT.toastSubmitted);
    setTimeout(() => setSubmittedFeedbackToast(null), 4000);
  };

  if (!isOpen || !homework) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-[#CBD5E1] overflow-hidden my-auto max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="px-6 py-4 bg-[#000035] text-white flex items-center justify-between border-b border-[#1C4C96] print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#062863] flex items-center justify-center text-white shadow-xs border border-[#607EC9] print:hidden">
              <BookOpen className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-base sm:text-xl text-white print:text-black tracking-tight">
                  {memT.modalTitle}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#1C4C96] text-[#9AB4FF] border border-[#607EC9]/50">
                  {memT.wordsCount(homework.totalWordsCollected)}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#062863] text-emerald-300 border border-emerald-500/40">
                  {studentLevelDisplay}
                </span>
                {homework.isCompleted && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#607EC9] text-white">
                    {memT.scoreBadge(homework.score || 0)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9AB4FF]/80 print:text-gray-600 mt-0.5">
                {formattedWeekLabel} • {homework.studentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {onRegenerateWithAi && (
              <button
                type="button"
                onClick={onRegenerateWithAi}
                disabled={isGeneratingAi}
                className="px-2.5 py-1.5 rounded-xl bg-[#1C4C96] text-[#BFDBFE] hover:text-white hover:bg-[#2563EB] transition flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
                title={memT.aiGenerateBtn}
              >
                <Sparkles className={`w-3.5 h-3.5 text-[#9AB4FF] ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isGeneratingAi ? memT.generatingAi : memT.aiGenerateBtn}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-[#1E3A8A] text-[#BFDBFE] hover:text-white hover:bg-[#2563EB] transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={memT.printBtn}
            >
              <Printer className="w-4 h-4 text-[#93C5FD]" />
              <span className="hidden sm:inline">{memT.printBtn}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#BFDBFE] hover:text-white hover:bg-[#1E3A8A] transition cursor-pointer"
              title={memT.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Empty State Warning if no weekly vocabulary is registered (Anti-Generic Rule) */}
        {homework.isEmpty || homework.totalWordsCollected === 0 ? (
          <div className="p-6 sm:p-10 flex flex-col items-center text-center max-w-xl mx-auto space-y-5 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#9AB4FF]/20 text-[#000035] flex items-center justify-center border border-[#9AB4FF]/40">
              <AlertCircle className="w-8 h-8 text-[#1C4C96]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#000035]">
                {memT.emptyState.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {currentLanguage === 'pt' && homework.emptyWarning
                  ? homework.emptyWarning
                  : currentLanguage === 'en' && homework.emptyWarningEn
                  ? homework.emptyWarningEn
                  : memT.emptyState.description}
              </p>
            </div>

            <div className="w-full bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 text-left space-y-3">
              <h5 className="font-bold text-xs text-[#000035] uppercase tracking-wider">
                {memT.emptyState.howToTitle}
              </h5>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#1C4C96] shrink-0">1.</span>
                  <span>{memT.emptyState.step1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#1C4C96] shrink-0">2.</span>
                  <span>{memT.emptyState.step2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#1C4C96] shrink-0">3.</span>
                  <span>{memT.emptyState.step3}</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#000035] hover:bg-[#062863] text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                {memT.emptyState.backBtn}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="px-4 sm:px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden print:hidden">
              <button
                type="button"
                onClick={() => setActiveTab('matching')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'matching'
                    ? 'bg-[#000035] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#000035] hover:bg-slate-200/60'
                }`}
              >
                {memT.tabs.matching}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fill')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'fill'
                    ? 'bg-[#000035] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#000035] hover:bg-slate-200/60'
                }`}
              >
                {memT.tabs.fill}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('writing')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'writing'
                    ? 'bg-[#000035] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#000035] hover:bg-slate-200/60'
                }`}
              >
                {memT.tabs.sentences}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reading')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'reading'
                    ? 'bg-[#000035] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#000035] hover:bg-slate-200/60'
                }`}
              >
                {memT.tabs.reading}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'results'
                    ? 'bg-[#000035] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#000035] hover:bg-slate-200/60'
                }`}
              >
                {memT.tabs.results}
              </button>
            </div>

            {/* Toast */}
            {submittedFeedbackToast && (
              <div className="mx-6 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-900 flex items-center gap-2 shadow-2xs">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{submittedFeedbackToast}</span>
              </div>
            )}

            {/* Tab Contents */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {/* TAB 1: MATCHING */}
              {activeTab === 'matching' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-sm text-[#000035]">
                        {memT.part1.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {memT.part1.instruction}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#1C4C96] bg-[#9AB4FF]/20 px-2.5 py-1 rounded-full border border-[#9AB4FF]/40 self-start sm:self-auto">
                      {memT.part1.answeredCount(
                        Object.values(matchingAnswers).filter(Boolean).length,
                        homework.matchingPairs.length
                      )}
                    </span>
                  </div>

                  {/* Available Words minimal chip row */}
                  <div className="py-2.5 px-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 mr-1 uppercase tracking-wide">
                      {memT.part1.wordsBankLabel}
                    </span>
                    {homework.matchingPairs.map((p) => {
                      const isUsed = Object.values(matchingAnswers).includes(p.word);
                      return (
                        <span
                          key={p.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isUsed
                              ? 'bg-slate-200/80 text-slate-400 line-through'
                              : 'bg-white text-[#000035] border border-slate-300 shadow-2xs'
                          }`}
                        >
                          {p.word}
                        </span>
                      );
                    })}
                  </div>

                  {/* Matching list */}
                  <div className="space-y-2">
                    {homework.matchingPairs.map((item, idx) => {
                      const selectedVal = matchingAnswers[item.id] || '';
                      const isAnswered = Boolean(selectedVal);
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isAnswered
                              ? 'bg-slate-50/70 border-slate-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-[#000035] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-slate-900 leading-snug">{item.definition}</p>
                              {currentLanguage !== 'en' && item.translation && (
                                <p className="text-[11px] text-[#1C4C96] font-medium">
                                  {memT.part1.pedagogicalSupportLabel} {item.translation}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 self-end sm:self-center">
                            <select
                              value={selectedVal}
                              onChange={(e) =>
                                setMatchingAnswers((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-[#000035] focus:outline-none focus:ring-1 focus:ring-[#1C4C96] focus:border-[#1C4C96] cursor-pointer"
                            >
                              <option value="">{memT.part1.selectPlaceholder}</option>
                              {homework.matchingPairs.map((opt) => (
                                <option key={opt.id} value={opt.word}>
                                  {opt.word}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 flex justify-end border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('fill')}
                      className="px-5 py-2 bg-[#000035] hover:bg-[#062863] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition"
                    >
                      <span>{memT.part1.nextBtn}</span>
                      <ArrowRight className="w-4 h-4 text-[#9AB4FF]" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: FILL IN BLANKS */}
              {activeTab === 'fill' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#000035]">
                          {memT.part2.title}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#9AB4FF]/20 text-[#1C4C96] rounded-md border border-[#9AB4FF]/40">
                          {studentLevelDisplay}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {memT.part2.instruction}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#1C4C96] bg-[#9AB4FF]/20 px-2.5 py-1 rounded-full border border-[#9AB4FF]/40 self-start sm:self-auto">
                      {memT.part2.completedCount(
                        Object.values(fillAnswers).filter(Boolean).length,
                        homework.fillInBlanks.length
                      )}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {homework.fillInBlanks.map((item, idx) => {
                      const selectedOption = fillAnswers[item.id];
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-[#000035] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                                {item.sentenceWithBlank}
                              </p>
                              <p className="text-[11px] text-slate-500 italic">
                                {memT.part2.getPedagogicalHint(item.correctWord, item.hintPt, item.hintEn)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pl-7">
                            {item.options.map((opt, optIdx) => {
                              const isSelected = selectedOption === opt;
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() =>
                                    setFillAnswers((prev) => ({
                                      ...prev,
                                      [item.id]: opt,
                                    }))
                                  }
                                  className={`py-1 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#000035] border-[#000035] text-white shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 flex justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('matching')}
                      className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {memT.part2.backBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('writing')}
                      className="px-5 py-2 bg-[#000035] hover:bg-[#062863] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition"
                    >
                      <span>{memT.part2.nextBtn}</span>
                      <ArrowRight className="w-4 h-4 text-[#9AB4FF]" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SENTENCES */}
              {activeTab === 'writing' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#000035]">
                          {memT.part3.title}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#9AB4FF]/20 text-[#1C4C96] rounded-md border border-[#9AB4FF]/40">
                          {studentLevelDisplay}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {memT.part3.instruction}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {homework.sentenceWritingPrompts.map((prompt, idx) => {
                      const val = sentenceAnswers[prompt.word] || '';
                      const feedback = sentenceFeedbacks[prompt.word];
                      const isChecking = isCheckingSentence[prompt.word];

                      return (
                        <div
                          key={idx}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-md bg-[#9AB4FF]/20 text-[#000035] text-xs font-black uppercase tracking-wide border border-[#9AB4FF]/30">
                                {prompt.word}
                              </span>
                              <span className="text-[11px] text-slate-600">
                                {currentLanguage === 'pt' && prompt.hintPt
                                  ? prompt.hintPt
                                  : currentLanguage === 'en' && prompt.hintEn
                                  ? prompt.hintEn
                                  : memT.part3.getPedagogicalPrompt(prompt.word, prompt.hint)}
                              </span>
                              {prompt.levelInstruction && (
                                <span className="text-[10px] font-bold text-[#1C4C96] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  🎯 {prompt.levelInstruction}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCheckSentence(prompt.word)}
                              disabled={isChecking || !val.trim()}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                val.trim()
                                  ? 'bg-[#000035] text-white hover:bg-[#062863] shadow-2xs'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <Sparkles className={`w-3 h-3 text-[#9AB4FF] ${isChecking ? 'animate-spin' : ''}`} />
                              <span>{isChecking ? memT.part3.checking : memT.part3.checkWithAi}</span>
                            </button>
                          </div>

                          <textarea
                            rows={2}
                            value={val}
                            onChange={(e) =>
                              setSentenceAnswers((prev) => ({
                                ...prev,
                                [prompt.word]: e.target.value,
                              }))
                            }
                            placeholder={memT.part3.placeholder(prompt.word)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1C4C96] focus:border-[#1C4C96]"
                          />

                          {feedback && (
                            <div
                              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                feedback.hasAnyError
                                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                {feedback.hasAnyError ? (
                                  <>
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>{memT.part3.suggestionLabel}</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{memT.part3.greatSentence}</span>
                                  </>
                                )}
                              </div>

                              {feedback.correctedSentence && feedback.correctedSentence !== val && (
                                <p className="text-[11px] font-semibold text-slate-900 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                                  <span className="text-slate-500 mr-1 font-normal">
                                    {isEn ? 'Enhanced sentence:' : 'Frase sugerida:'}
                                  </span>
                                  "{feedback.correctedSentence}"
                                </p>
                              )}

                              <p className="text-[11px] leading-relaxed">
                                {currentLanguage === 'en'
                                  ? (feedback.overallSummaryEn || feedback.overallSummaryPt)
                                  : (feedback.overallSummaryPt || feedback.overallSummaryEn)}
                              </p>

                              {(feedback.levelTipsPt || feedback.levelTipsEn) && (
                                <p className="text-[11px] text-[#1C4C96] font-medium pt-0.5 border-t border-amber-200/50 flex items-center gap-1">
                                  <Compass className="w-3 h-3 text-[#1C4C96] shrink-0" />
                                  <span>{isEn ? feedback.levelTipsEn : feedback.levelTipsPt}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 flex justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('fill')}
                      className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {memT.part3.backBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reading')}
                      className="px-5 py-2 bg-[#000035] hover:bg-[#062863] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition"
                    >
                      <span>{memT.part3.nextBtn}</span>
                      <ArrowRight className="w-4 h-4 text-[#9AB4FF]" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: READING */}
              {activeTab === 'reading' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#000035]">
                          {memT.part4.title}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#9AB4FF]/20 text-[#1C4C96] rounded-md border border-[#9AB4FF]/40">
                          {studentLevelDisplay}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {memT.part4.instruction}
                      </p>
                    </div>
                  </div>

                  {/* Reading passage */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs sm:text-sm text-[#000035]">
                        {homework.readingPassage.title}
                      </h5>
                      <button
                        type="button"
                        onClick={() => speakText(homework.readingPassage.text)}
                        className="px-2.5 py-1 bg-white text-[#000035] hover:bg-slate-100 rounded-lg border border-slate-200 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#1C4C96]" />
                        <span>{memT.part4.listenBtn}</span>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
                      {renderHighlightedPassage(homework.readingPassage.text)}
                    </p>
                  </div>

                  {/* Questions */}
                  <div className="space-y-3">
                    {homework.readingPassage.questions.map((q, qIdx) => {
                      const selectedChoice = quizAnswers[q.id];
                      return (
                        <div
                          key={q.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5"
                        >
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-md bg-[#000035] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {qIdx + 1}
                            </span>
                            <p className="text-xs font-semibold text-slate-900">{q.question}</p>
                          </div>

                          <div className="space-y-1 pl-7">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = selectedChoice === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  onClick={() =>
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: optIdx,
                                    }))
                                  }
                                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                                    isSelected
                                      ? 'bg-[#000035] border-[#000035] text-white shadow-2xs font-semibold'
                                      : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px] shrink-0 font-bold">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 flex justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('writing')}
                      className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {memT.part4.backBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleCalculateScore}
                      disabled={isEvaluatingAll}
                      className="px-5 py-2 bg-[#000035] hover:bg-[#062863] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition disabled:opacity-50"
                    >
                      {isEvaluatingAll ? (
                        <>
                          <Sparkles className="w-4 h-4 text-[#9AB4FF] animate-spin" />
                          <span>{isEn ? 'Grading with AI...' : 'Corrigindo com IA...'}</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4 text-[#9AB4FF]" />
                          <span>{memT.part4.submitBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: RESULTS & DETAILED FEEDBACK */}
              {activeTab === 'results' && (
                <div className="space-y-5">
                  {/* Top Score & Level Banner */}
                  <div className="p-6 bg-[#000035] text-white rounded-2xl text-center space-y-3 shadow-sm border border-[#1C4C96]">
                    <div className="w-12 h-12 bg-[#062863] text-[#9AB4FF] rounded-xl mx-auto flex items-center justify-center border border-[#607EC9]/40">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9AB4FF]">
                          {memT.results.scoreTitle}
                        </span>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                          {studentLevelDisplay}
                        </span>
                      </div>
                      <h3 className="text-4xl font-black text-white mt-1">
                        {homework.score || 100}%
                      </h3>
                    </div>
                    <p className="text-xs text-[#9AB4FF]/80 max-w-md mx-auto">
                      {memT.results.congrats}
                    </p>

                    <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-[#1C4C96] hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer border border-[#9AB4FF]/40 transition"
                      >
                        <Send className="w-3.5 h-3.5 text-[#9AB4FF]" />
                        <span>{memT.results.sendTutorBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="px-3.5 py-2 bg-[#062863] hover:bg-[#1C4C96] text-[#9AB4FF] hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#607EC9]/40 cursor-pointer transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{memT.results.printBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Tutor Pedagogical Feedback Summary */}
                  {aiEvaluation && (
                    <div className="p-4 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 rounded-2xl border border-indigo-100 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#000035]">
                        <MessageSquare className="w-4 h-4 text-[#1C4C96]" />
                        <span>
                          {isEn
                            ? `Native Friend AI Tutor Feedback (${aiEvaluation.studentLevel || homework.studentLevel || 'Calibrated'})`
                            : `Feedback do Amigo Nativo IA (${aiEvaluation.studentLevel || homework.studentLevel || 'Calibrado'})`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {isEn
                          ? (aiEvaluation.tutorFeedbackSummaryEn || aiEvaluation.tutorFeedbackSummaryPt)
                          : (aiEvaluation.tutorFeedbackSummaryPt || aiEvaluation.tutorFeedbackSummaryEn)}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {Boolean(aiEvaluation.levelStrengthsPt || aiEvaluation.levelStrengthsEn) && (
                          <div className="p-3 bg-white/90 rounded-xl border border-emerald-100 space-y-1">
                            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              {isEn ? 'Demonstrated Strengths' : 'Pontos Fortes'}
                            </span>
                            <p className="text-[11px] text-slate-600 leading-normal">
                              {isEn
                                ? (aiEvaluation.levelStrengthsEn || aiEvaluation.levelStrengthsPt)
                                : (aiEvaluation.levelStrengthsPt || aiEvaluation.levelStrengthsEn)}
                            </p>
                          </div>
                        )}

                        {Boolean(aiEvaluation.levelNextStepsPt || aiEvaluation.levelNextStepsEn) && (
                          <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1">
                            <span className="text-[11px] font-bold text-[#1C4C96] flex items-center gap-1">
                              <Compass className="w-3.5 h-3.5 text-[#1C4C96]" />
                              {isEn ? 'Next Step Focus' : 'Próximos Passos'}
                            </span>
                            <p className="text-[11px] text-slate-600 leading-normal">
                              {isEn
                                ? (aiEvaluation.levelNextStepsEn || aiEvaluation.levelNextStepsPt)
                                : (aiEvaluation.levelNextStepsPt || aiEvaluation.levelNextStepsEn)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stage-by-Stage Detailed Corrections */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-[#1C4C96]" />
                      <span>{isEn ? 'Stage-by-Stage Pedagogical Corrections' : 'Correção Pedagógica Passo a Passo'}</span>
                    </h4>

                    {/* Part 1 Corrections */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#000035]">
                          {isEn ? 'Part 1: Meaning Association' : 'Parte 1: Associação de Palavras'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {homework.matchingPairs.length} {isEn ? 'items' : 'itens'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {homework.matchingPairs.map((pair) => {
                          const userAns = matchingAnswers[pair.id] || '';
                          const isMatchCorrect = userAns.toLowerCase() === pair.word.toLowerCase();
                          return (
                            <div
                              key={pair.id}
                              className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                isMatchCorrect
                                  ? 'bg-emerald-50/50 border-emerald-200'
                                  : 'bg-amber-50/50 border-amber-200'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-900 capitalize">{pair.word}</p>
                                <p className="text-[11px] text-slate-600">{pair.definition}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-[11px] font-bold ${isMatchCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {isMatchCorrect
                                    ? `✓ ${isEn ? 'Matched' : 'Associado'}: ${userAns}`
                                    : `✗ ${isEn ? 'Chosen' : 'Escolhido'}: ${userAns || '(vazio)'} → ${isEn ? 'Correct' : 'Correto'}: ${pair.word}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Part 2 Corrections */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#000035]">
                          {isEn ? 'Part 2: Fill in the Blanks' : 'Parte 2: Lacunas da Rotina'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {homework.fillInBlanks.length} {isEn ? 'items' : 'itens'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {homework.fillInBlanks.map((fill) => {
                          const userAns = fillAnswers[fill.id] || '';
                          const isFillCorrect = userAns.toLowerCase() === fill.correctWord.toLowerCase();
                          return (
                            <div
                              key={fill.id}
                              className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                                isFillCorrect
                                  ? 'bg-emerald-50/50 border-emerald-200'
                                  : 'bg-amber-50/50 border-amber-200'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className="font-semibold text-slate-900">{fill.sentenceWithBlank}</span>
                                <span className={`text-[11px] font-bold ${isFillCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {isFillCorrect
                                    ? `✓ ${userAns}`
                                    : `✗ ${userAns || '(vazio)'} → ${isEn ? 'Target' : 'Correto'}: ${fill.correctWord}`}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                {isEn
                                  ? (fill.explanationEn || fill.hintEn || `Correct word is "${fill.correctWord}".`)
                                  : (fill.explanationPt || fill.hintPt || `A palavra correta é "${fill.correctWord}".`)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Part 3 Corrections */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#000035]">
                          {isEn ? 'Part 3: Sentence Writing' : 'Parte 3: Construção de Frases Ativas'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {homework.sentenceWritingPrompts.length} {isEn ? 'sentences' : 'frases'}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {homework.sentenceWritingPrompts.map((prompt) => {
                          const userSentence = (sentenceAnswers[prompt.word] || '').trim();
                          const feedback = sentenceFeedbacks[prompt.word];
                          const evalItem = aiEvaluation?.sentenceFeedback?.find((s) => s.word.toLowerCase() === prompt.word.toLowerCase());

                          const isSentenceOk = evalItem?.isCorrect ?? (userSentence.length >= 8 && (!feedback || !feedback.hasAnyError));
                          const corrected = evalItem?.correctedSentence || feedback?.correctedSentence;
                          const explanation = isEn
                            ? (evalItem?.explanationEn || feedback?.overallSummaryEn)
                            : (evalItem?.explanationPt || feedback?.overallSummaryPt);

                          return (
                            <div
                              key={prompt.word}
                              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                isSentenceOk
                                  ? 'bg-emerald-50/50 border-emerald-200'
                                  : 'bg-amber-50/50 border-amber-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#000035] uppercase tracking-wide bg-[#9AB4FF]/20 px-2 py-0.5 rounded text-[10px]">
                                  {prompt.word}
                                </span>
                                <span className={`text-[11px] font-bold ${isSentenceOk ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {isSentenceOk ? (isEn ? '✓ Well Structured' : '✓ Bem Estruturada') : (isEn ? '⚠ Needs Review' : '⚠ Revisão Recomendada')}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-800 italic">
                                <span className="text-slate-500 font-normal mr-1">{isEn ? 'Your sentence:' : 'Sua frase:'}</span>
                                "{userSentence || '(nenhuma frase enviada)'}"
                              </p>

                              {corrected && corrected !== userSentence && (
                                <p className="text-[11px] text-[#000035] bg-white/80 p-2 rounded-md border border-slate-200 font-medium">
                                  <span className="text-slate-500 mr-1 font-normal">{isEn ? 'Recommended form:' : 'Forma recomendada:'}</span>
                                  "{corrected}"
                                </p>
                              )}

                              {explanation && (
                                <p className="text-[11px] text-slate-600">
                                  {explanation}
                                </p>
                              )}

                              {evalItem && (evalItem.levelAdvicePt || evalItem.levelAdviceEn) && (
                                <p className="text-[10px] text-[#1C4C96] font-medium flex items-center gap-1">
                                  <Compass className="w-3 h-3 shrink-0" />
                                  <span>{isEn ? evalItem.levelAdviceEn : evalItem.levelAdvicePt}</span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Part 4 Corrections */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#000035]">
                          {isEn ? 'Part 4: Mini-Story Reading' : 'Parte 4: Interpretação de Texto'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {homework.readingPassage.questions.length} {isEn ? 'questions' : 'perguntas'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {homework.readingPassage.questions.map((q, idx) => {
                          const chosenIdx = quizAnswers[q.id];
                          const isQuizCorrect = chosenIdx === q.correctAnswer;
                          return (
                            <div
                              key={q.id}
                              className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                                isQuizCorrect
                                  ? 'bg-emerald-50/50 border-emerald-200'
                                  : 'bg-amber-50/50 border-amber-200'
                              }`}
                            >
                              <p className="font-semibold text-slate-900">
                                {idx + 1}. {q.question}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                                <span className={isQuizCorrect ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                  {isQuizCorrect
                                    ? `✓ ${isEn ? 'Correct Answer' : 'Resposta Correta'}: ${q.options[chosenIdx]}`
                                    : `✗ ${isEn ? 'Your choice' : 'Sua escolha'}: ${q.options[chosenIdx] || '(vazio)'} → ${isEn ? 'Correct' : 'Correta'}: ${q.options[q.correctAnswer]}`}
                                </span>
                              </div>
                              {q.explanation && (
                                <p className="text-[11px] text-slate-600 italic">
                                  {q.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Vocabulary Key */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-[#000035] uppercase text-[11px] block">
                      {memT.results.vocabKeyLabel}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {homework.matchingPairs.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-slate-200 pb-1 text-xs">
                          <span className="font-bold text-slate-800 capitalize">{item.word}</span>
                          <span className="text-slate-500 italic text-[11px]">
                            {currentLanguage === 'en'
                              ? item.definition
                              : item.translation
                                ? `${item.translation} (${item.definition})`
                                : item.definition}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 flex justify-end border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 bg-[#000035] text-white font-bold text-xs rounded-xl hover:bg-[#062863] transition cursor-pointer shadow-2xs"
                    >
                      {memT.results.doneBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

