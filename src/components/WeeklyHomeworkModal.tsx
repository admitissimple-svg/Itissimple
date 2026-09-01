import React, { useState } from 'react';
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
} from 'lucide-react';
import { WeeklyHomeworkData, Language } from '../types';
import { speakText } from '../utils/audio';
import { checkStudentWritingApi } from '../utils/writingChecker';

interface WeeklyHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  homework: WeeklyHomeworkData;
  onSaveProgress: (updatedHomework: WeeklyHomeworkData) => void;
  onSubmitToTeacher: (homework: WeeklyHomeworkData) => void;
  currentLanguage: Language;
  t?: any;
}

export const WeeklyHomeworkModal: React.FC<WeeklyHomeworkModalProps> = ({
  isOpen,
  onClose,
  homework,
  onSaveProgress,
  onSubmitToTeacher,
  currentLanguage,
}) => {
  if (!isOpen) return null;

  const isEn = currentLanguage === 'en';

  const [activeTab, setActiveTab] = useState<'overview' | 'matching' | 'fill' | 'writing' | 'reading' | 'results'>(
    homework.isCompleted ? 'results' : 'overview'
  );

  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>(
    homework.studentAnswers?.matching || {}
  );
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>(
    homework.studentAnswers?.fillInBlanks || {}
  );
  const [sentenceAnswers, setSentenceAnswers] = useState<Record<string, string>>(
    homework.studentAnswers?.sentences || {}
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>(
    homework.studentAnswers?.quizAnswers || {}
  );

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
      });
      setSentenceFeedbacks((prev) => ({ ...prev, [word]: result }));
    } catch {
      // fallback handled in API
    } finally {
      setIsCheckingSentence((prev) => ({ ...prev, [word]: false }));
    }
  };

  const handleCalculateScore = () => {
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
      if (s && s.trim().length >= 10) {
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

    const finalScore = Math.min(100, Math.round((earnedPoints / totalPoints) * 100));

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
    };

    onSaveProgress(updated);
    setActiveTab('results');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = () => {
    onSubmitToTeacher(homework);
    setSubmittedFeedbackToast(
      isEn
        ? 'Weekly homework submitted to your teacher successfully!'
        : 'Homework semanal enviada para o seu professor com sucesso!'
    );
    setTimeout(() => setSubmittedFeedbackToast(null), 4000);
  };

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
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-xl text-white print:text-black tracking-tight">
                  {isEn ? 'Weekly Memorization Activity' : 'Atividade de Memorização da Rotina'}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#1C4C96] text-[#9AB4FF] border border-[#607EC9]/50">
                  {homework.totalWordsCollected} {isEn ? 'Words' : 'Palavras'}
                </span>
                {homework.isCompleted && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#607EC9] text-white">
                    {homework.score}% Score
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9AB4FF]/80 print:text-gray-600 mt-0.5">
                {homework.weekLabel} • {homework.studentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-[#1E3A8A] text-[#BFDBFE] hover:text-white hover:bg-[#2563EB] transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title={isEn ? 'Print / Export Worksheet' : 'Imprimir / Salvar em PDF'}
            >
              <Printer className="w-4 h-4 text-[#93C5FD]" />
              <span className="hidden sm:inline">{isEn ? 'Print' : 'Imprimir'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#BFDBFE] hover:text-white hover:bg-[#1E3A8A] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-1.5 overflow-x-auto print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#475569] hover:bg-[#EFF6FF]'
            }`}
          >
            📚 {isEn ? 'Word Bank' : 'Banco de Palavras'} ({homework.vocabularyList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matching')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'matching'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#475569] hover:bg-[#EFF6FF]'
            }`}
          >
            🔗 {isEn ? 'Part 1: Matching' : 'Parte 1: Associação'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fill')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'fill'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#475569] hover:bg-[#EFF6FF]'
            }`}
          >
            ✏️ {isEn ? 'Part 2: Fill in Blanks' : 'Parte 2: Lacunas'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('writing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'writing'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#475569] hover:bg-[#EFF6FF]'
            }`}
          >
            ✍️ {isEn ? 'Part 3: Sentences' : 'Parte 3: Frases'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reading')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'reading'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#475569] hover:bg-[#EFF6FF]'
            }`}
          >
            📖 {isEn ? 'Part 4: Mini-Story' : 'Parte 4: Texto'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              activeTab === 'results'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#475569] hover:bg-[#EFF6FF]'
            }`}
          >
            🏆 {isEn ? 'Evaluation & Key' : 'Avaliação & Gabarito'}
          </button>
        </div>

        {/* Toast */}
        {submittedFeedbackToast && (
          <div className="mx-6 mt-3 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl text-xs font-bold text-[#1E40AF] flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-[#2563EB]" />
            <span>{submittedFeedbackToast}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#EFF6FF]/80 rounded-2xl border border-[#BFDBFE]">
                <h4 className="font-extrabold text-sm text-[#0F172A] flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <span>
                    {isEn
                      ? 'Vocabulary Mastered in Your Daily Routine This Week'
                      : 'Vocabulário Consolidado na Sua Rotina Esta Semana'}
                  </span>
                </h4>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {isEn
                    ? 'All exercises in this weekly homework are crafted directly from the 5-word entries you typed for your routine activities (Monday through Sunday).'
                    : 'Todos os exercícios desta tarefa foram elaborados com base nas palavras e frases que você registrou nas suas atividades diárias.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {homework.vocabularyList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-[#2563EB]/50 transition-all shadow-xs hover:shadow-md space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-[#0F172A] tracking-tight capitalize">
                            {item.word}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakText(item.word)}
                            className="p-1.5 text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition cursor-pointer"
                            title="Listen pronunciation"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] shrink-0">
                          {item.sourceActivityName || 'Routine'}
                        </span>
                      </div>

                      <div className="pt-0.5">
                        <span className="text-xs font-bold text-[#2563EB] block">
                          {item.translationPt}
                        </span>
                        <p className="text-[12px] text-slate-600 mt-1 leading-snug">
                          {item.definitionEn}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-[#0F172A] bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-[#2563EB] mr-1">Exemplo:</span>
                      <span className="italic text-slate-800">"{item.exampleSentence}"</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('matching')}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition"
                >
                  <span>{isEn ? 'Start Exercises (Part 1)' : 'Iniciar Exercícios (Parte 1)'}</span>
                  <ArrowRight className="w-4 h-4 text-[#93C5FD]" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MATCHING */}
          {activeTab === 'matching' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                <h4 className="font-extrabold text-sm text-[#0F172A] mb-1">
                  {isEn ? 'Part 1: Match Words to Their Meaning' : 'Parte 1: Associe as Palavras ao Significado'}
                </h4>
                <p className="text-xs text-[#475569]">
                  {isEn
                    ? 'Select a word from the bank below and assign it to the matching English definition or Portuguese translation.'
                    : 'Clique ou selecione a palavra correspondente a cada definição e tradução.'}
                </p>
              </div>

              <div className="p-3 bg-[#EFF6FF]/60 rounded-2xl border border-[#BFDBFE] flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-[#1E40AF] mr-2">
                  {isEn ? 'Available Words:' : 'Palavras Disponíveis:'}
                </span>
                {homework.matchingPairs.map((p) => {
                  const isUsed = Object.values(matchingAnswers).includes(p.word);
                  return (
                    <span
                      key={p.id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition uppercase tracking-wide ${
                        isUsed
                          ? 'bg-[#CBD5E1] text-[#64748B] line-through opacity-70'
                          : 'bg-white text-[#0F172A] border border-[#CBD5E1] shadow-2xs'
                      }`}
                    >
                      {p.word}
                    </span>
                  );
                })}
              </div>

              <div className="space-y-3">
                {homework.matchingPairs.map((item, idx) => {
                  const selectedVal = matchingAnswers[item.id] || '';
                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-[#2563EB] uppercase">
                            Item {idx + 1}
                          </span>
                          <p className="text-xs font-bold text-[#0F172A]">{item.definition}</p>
                          <p className="text-[11px] text-[#475569] italic">({item.translation})</p>
                        </div>

                        <div className="shrink-0">
                          <select
                            value={selectedVal}
                            onChange={(e) =>
                              setMatchingAnswers((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                          >
                            <option value="">{isEn ? '-- Select Word --' : '-- Escolha a Palavra --'}</option>
                            {homework.matchingPairs.map((opt) => (
                              <option key={opt.id} value={opt.word}>
                                {opt.word}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] rounded-xl text-xs font-bold"
                >
                  {isEn ? 'Back' : 'Voltar'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fill')}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>{isEn ? 'Next: Part 2' : 'Avançar: Parte 2'}</span>
                  <ArrowRight className="w-4 h-4 text-[#93C5FD]" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: FILL IN BLANKS */}
          {activeTab === 'fill' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                <h4 className="font-extrabold text-sm text-[#0F172A] mb-1">
                  {isEn ? 'Part 2: Fill in the Routine Blanks' : 'Parte 2: Complete as Frases da Rotina'}
                </h4>
                <p className="text-xs text-[#475569]">
                  {isEn
                    ? 'Choose the appropriate word from your weekly vocabulary that best completes each routine sentence.'
                    : 'Escolha a palavra correta do seu vocabulário semanal que melhor completa cada situação de rotina.'}
                </p>
              </div>

              <div className="space-y-3">
                {homework.fillInBlanks.map((item, idx) => {
                  const selectedOption = fillAnswers[item.id];
                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#1E40AF] font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-[#0F172A] leading-relaxed">
                          {item.sentenceWithBlank}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pl-8">
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
                              className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-xs'
                                  : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A] hover:bg-[#EFF6FF]'
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

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('matching')}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] rounded-xl text-xs font-bold"
                >
                  {isEn ? 'Back' : 'Voltar'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('writing')}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>{isEn ? 'Next: Part 3' : 'Avançar: Parte 3'}</span>
                  <ArrowRight className="w-4 h-4 text-[#93C5FD]" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SENTENCES */}
          {activeTab === 'writing' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                <h4 className="font-extrabold text-sm text-[#0F172A] mb-1">
                  {isEn ? 'Part 3: Sentence Writing Challenge' : 'Parte 3: Construção de Frases com Feedback'}
                </h4>
                <p className="text-xs text-[#475569]">
                  {isEn
                    ? 'Write complete sentences in English applying the target words in realistic daily situations.'
                    : 'Escreva frases completas em inglês aplicando as palavras em situações reais da sua rotina.'}
                </p>
              </div>

              <div className="space-y-4">
                {homework.sentenceWritingPrompts.map((prompt, idx) => {
                  const val = sentenceAnswers[prompt.word] || '';
                  const feedback = sentenceFeedbacks[prompt.word];
                  const isChecking = isCheckingSentence[prompt.word];

                  return (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] text-xs font-black uppercase">
                            {prompt.word}
                          </span>
                          <span className="text-xs text-[#475569] hidden sm:inline">
                            {prompt.hint}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCheckSentence(prompt.word)}
                          disabled={isChecking || !val.trim()}
                          className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                            val.trim()
                              ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                              : 'bg-[#E2E8F0] text-[#64748B] cursor-not-allowed'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#93C5FD]" />
                          <span>{isChecking ? (isEn ? 'Checking...' : 'Avaliando...') : isEn ? 'Check with AI' : 'Verificar com IA'}</span>
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
                        placeholder={`Write your sentence in English using "${prompt.word}"...`}
                        className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-medium text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />

                      {feedback && (
                        <div
                          className={`p-3 rounded-xl border text-xs font-medium space-y-1 ${
                            feedback.hasAnyError
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {feedback.hasAnyError ? (
                              <>
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span>{isEn ? 'Grammar / Vocabulary Suggestion:' : 'Sugestão Pedagógica:'}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 text-[#2563EB]" />
                                <span>{isEn ? 'Great sentence!' : 'Frase excelente e natural!'}</span>
                              </>
                            )}
                          </div>
                          <p>{isEn ? feedback.overallSummaryEn : feedback.overallSummaryPt}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('fill')}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] rounded-xl text-xs font-bold"
                >
                  {isEn ? 'Back' : 'Voltar'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reading')}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>{isEn ? 'Next: Part 4' : 'Avançar: Parte 4'}</span>
                  <ArrowRight className="w-4 h-4 text-[#93C5FD]" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: READING */}
          {activeTab === 'reading' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                <h4 className="font-extrabold text-sm text-[#0F172A] mb-1">
                  {isEn ? 'Part 4: Weekly Routine Reading' : 'Parte 4: Texto & Interpretação da Semana'}
                </h4>
                <p className="text-xs text-[#475569]">
                  {isEn
                    ? 'Read the cohesive routine text integrating your weekly vocabulary, then answer the comprehension questions below.'
                    : 'Leia o texto conectando o vocabulário da sua semana e responda às perguntas de compreensão.'}
                </p>
              </div>

              <div className="p-5 bg-[#EFF6FF] rounded-2xl border border-[#BFDBFE] space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-sm text-[#1E40AF]">
                    {homework.readingPassage.title}
                  </h5>
                  <button
                    type="button"
                    onClick={() => speakText(homework.readingPassage.text)}
                    className="p-1.5 bg-white text-[#2563EB] hover:bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isEn ? 'Listen Passage' : 'Ouvir Texto'}</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#0F172A] leading-relaxed whitespace-pre-wrap">
                  {homework.readingPassage.text}
                </p>
              </div>

              <div className="space-y-4">
                {homework.readingPassage.questions.map((q, qIdx) => {
                  const selectedChoice = quizAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-4 bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#EFF6FF] text-[#1E40AF] text-xs font-bold flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <p className="text-xs font-bold text-[#0F172A]">{q.question}</p>
                      </div>

                      <div className="space-y-1.5 pl-7">
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
                              className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-xs font-bold'
                                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:bg-[#EFF6FF]'
                              }`}
                            >
                              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0">
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

              <div className="pt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('writing')}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] rounded-xl text-xs font-bold"
                >
                  {isEn ? 'Back' : 'Voltar'}
                </button>
                <button
                  type="button"
                  onClick={handleCalculateScore}
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer transition"
                >
                  <Award className="w-4 h-4 text-[#93C5FD]" />
                  <span>{isEn ? 'Submit & Grade Homework' : 'Concluir & Corrigir Tarefa'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-5">
              <div className="p-6 bg-gradient-to-br from-[#000035] via-[#062863] to-[#1C4C96] text-white rounded-3xl text-center space-y-3 shadow-md border border-[#607EC9]/40">
                <div className="w-16 h-16 bg-[#1C4C96] text-[#9AB4FF] rounded-full mx-auto flex items-center justify-center border-2 border-[#607EC9] shadow-xs">
                  <Award className="w-9 h-9" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#9AB4FF]">
                    {isEn ? 'Weekly Memorization Score' : 'Nota da Atividade de Memorização'}
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-black text-white mt-1">
                    {homework.score || 100}%
                  </h3>
                </div>
                <p className="text-xs text-[#9AB4FF]/90 max-w-md mx-auto">
                  {isEn
                    ? 'Congratulations! You consolidated all the vocabulary from your week into lasting English fluency habits.'
                    : 'Parabéns pela dedicação! Você memorizou e consolidou todo o vocabulário praticado na sua rotina diária.'}
                </p>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-[#607EC9] hover:bg-[#1C4C96] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer border border-[#9AB4FF]/50"
                  >
                    <Send className="w-3.5 h-3.5 text-[#9AB4FF]" />
                    <span>{isEn ? 'Send to Your Native Friend' : 'Enviar ao Seu Amigo Nativo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 bg-[#000035] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#607EC9]/50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#9AB4FF]" />
                    <span>{isEn ? 'Print Worksheet' : 'Imprimir Folha'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-[#0F172A] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2563EB]" />
                  <span>{isEn ? 'Answer Key & Explanations' : 'Gabarito e Explicações Detalhadas'}</span>
                </h4>

                <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#CBD5E1] space-y-2 text-xs">
                  <span className="font-bold text-[#2563EB] uppercase block">
                    {isEn ? 'Part 1 & 2 Vocabulary Key:' : 'Gabarito das Partes 1 e 2:'}
                  </span>
                  {homework.matchingPairs.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
                      <span className="font-bold text-[#0F172A] capitalize">{item.word}</span>
                      <span className="text-[#475569] italic">{item.definition} ({item.translation})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#0F253E] text-white font-extrabold text-xs rounded-xl hover:bg-[#1E3A8A] transition cursor-pointer"
                >
                  {isEn ? 'Done / Close' : 'Concluir e Fechar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
