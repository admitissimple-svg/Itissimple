import React, { useState } from 'react';
import {
  PenTool,
  Sparkles,
  Volume2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Clock,
  Send,
  History,
} from 'lucide-react';
import { RoutineItem, UserProfile, WritingEvaluationResult, Language } from '../types';
import { Translations } from '../utils/i18n';
import { checkStudentWritingApi } from '../utils/writingChecker';
import { speakText } from '../utils/audio';
import { getLastActivityOfTheDay, getEndOfDayReminderTime } from '../utils/notifications';

interface DailySentenceSectionProps {
  todayRoutines: RoutineItem[];
  userProfile: UserProfile;
  currentLanguage: Language;
  t: Translations;
  onSaveDailySentence: (sentence: string, wordsUsed: string[]) => void;
  onTest30MinReminder?: () => void;
}

export const DailySentenceSection: React.FC<DailySentenceSectionProps> = ({
  todayRoutines,
  userProfile,
  currentLanguage,
  t,
  onSaveDailySentence,
  onTest30MinReminder,
}) => {
  const [sentenceInput, setSentenceInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [sentenceEvaluation, setSentenceEvaluation] = useState<WritingEvaluationResult | null>(null);
  const [isCheckingSentence, setIsCheckingSentence] = useState<boolean>(false);

  const lastActivity = getLastActivityOfTheDay(todayRoutines);
  const reminderTime = lastActivity ? getEndOfDayReminderTime(lastActivity.time) : '21:30';

  // Gather all unique words learned today across all routine items
  const allLearnedWordsToday: string[] = [];
  (todayRoutines || []).forEach((item) => {
    if (item?.learnedWords && Array.isArray(item.learnedWords)) {
      item.learnedWords.forEach((w) => {
        if (w && typeof w === 'string') {
          const trimmed = w.trim();
          if (trimmed && !allLearnedWordsToday.includes(trimmed)) {
            allLearnedWordsToday.push(trimmed);
          }
        }
      });
    }
  });

  // Calculate which of today's learned words are present in the user's sentence
  const matchedWords = allLearnedWordsToday.filter((w) =>
    Boolean(w && (sentenceInput || '').toLowerCase().includes(w.toLowerCase()))
  );

  const handleSentenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSentenceInput(e.target.value);
    if (sentenceEvaluation) {
      setSentenceEvaluation(null);
    }
  };

  const handleManualCheck = async () => {
    if (!sentenceInput.trim() || sentenceInput.trim().length < 4) return;
    setIsCheckingSentence(true);
    try {
      const evaluation = await checkStudentWritingApi({
        sentence: sentenceInput.trim(),
        words: matchedWords,
        level: userProfile.level,
      });
      setSentenceEvaluation(evaluation);
    } catch (err) {
      console.warn('Error checking sentence:', err);
    } finally {
      setIsCheckingSentence(false);
    }
  };

  const handleSaveConfirmed = (textToSave: string) => {
    const finalMatched = allLearnedWordsToday.filter((w) =>
      Boolean(w && textToSave.toLowerCase().includes(w.toLowerCase()))
    );
    onSaveDailySentence(textToSave, finalMatched);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setSentenceInput('');
      setSentenceEvaluation(null);
    }, 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = sentenceInput.trim();
    if (!cleanText || cleanText.length < 5) return;

    setIsCheckingSentence(true);
    try {
      const evaluation = await checkStudentWritingApi({
        sentence: cleanText,
        words: matchedWords,
        level: userProfile.level,
      });
      setSentenceEvaluation(evaluation);

      if (!evaluation.hasAnyError) {
        handleSaveConfirmed(cleanText);
      }
    } catch (err) {
      console.warn('Error during writing check:', err);
      handleSaveConfirmed(cleanText);
    } finally {
      setIsCheckingSentence(false);
    }
  };

  const handleApplySentenceCorrection = () => {
    if (sentenceEvaluation && sentenceEvaluation.correctedSentence) {
      setSentenceInput(sentenceEvaluation.correctedSentence);
      handleSaveConfirmed(sentenceEvaluation.correctedSentence);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#607EC9]/25 shadow-xs space-y-5" id="daily-sentence-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#9AB4FF]/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#9AB4FF]/20 text-[#062863] flex items-center justify-center shrink-0 border border-[#9AB4FF]/40">
            <PenTool className="w-5 h-5 text-[#1C4C96]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#000035] tracking-tight">
                {currentLanguage === 'en' ? 'Sentence of the Day' : 'Frase do Dia'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#062863] border border-[#9AB4FF]/50">
                {currentLanguage === 'en' ? 'Daily Wrap-up' : 'Encerramento do Dia'}
              </span>
            </div>
            <p className="text-xs text-[#062863]/80 mt-0.5">
              {currentLanguage === 'en'
                ? 'Create a meaningful English sentence connecting your routine moments and the words you recorded today.'
                : 'Crie uma frase em inglês conectando os momentos da sua rotina e as palavras que você registrou hoje.'}
            </p>
          </div>
        </div>

        {onTest30MinReminder && (
          <button
            type="button"
            onClick={onTest30MinReminder}
            className="px-3 py-1.5 bg-[#9AB4FF]/10 hover:bg-[#9AB4FF]/20 text-[#062863] border border-[#607EC9]/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
            title={`Simular lembrete das ${reminderTime} (30 min antes da última atividade)`}
          >
            <Clock className="w-3.5 h-3.5 text-[#1C4C96]" />
            <span>
              {currentLanguage === 'en' ? `Test 30-min Reminder (${reminderTime})` : `Testar Lembrete (${reminderTime})`}
            </span>
          </button>
        )}
      </div>

      {/* Words Learned Today Bank */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#000035] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#607EC9]" />
          <span>{currentLanguage === 'en' ? "Today's Routine Words to include:" : "Palavras da rotina de hoje para incluir:"}</span>
          <span className="text-[11px] font-mono text-[#607EC9] font-normal">
            ({matchedWords.length}/{allLearnedWordsToday.length} {currentLanguage === 'en' ? 'used' : 'usadas'})
          </span>
        </span>

        {allLearnedWordsToday.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allLearnedWordsToday.map((word, idx) => {
              const isUsed = matchedWords.some((mw) => mw.toLowerCase() === word.toLowerCase());
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSentenceInput((prev) => {
                      const trimmed = prev.trim();
                      return trimmed ? `${trimmed} ${word}` : word;
                    });
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                    isUsed
                      ? 'bg-[#9AB4FF]/20 text-[#062863] border-[#607EC9] shadow-2xs font-extrabold'
                      : 'bg-[#9AB4FF]/5 text-[#062863] border-[#9AB4FF]/40 hover:border-[#1C4C96] hover:text-[#000035]'
                  }`}
                  title={currentLanguage === 'en' ? 'Click to insert into sentence' : 'Clique para inserir na frase'}
                >
                  {isUsed && <Check className="w-3 h-3 text-[#1C4C96]" />}
                  <span>{word}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#607EC9] italic bg-[#9AB4FF]/5 p-3 rounded-xl border border-dashed border-[#9AB4FF]/50">
            {currentLanguage === 'en'
              ? 'Type 5 words in your routine activities above to see them highlighted here.'
              : 'Digite palavras nas atividades da sua rotina acima para que apareçam aqui.'}
          </p>
        )}
      </div>

      {/* Sentence Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#062863] flex items-center justify-between">
            <span>{currentLanguage === 'en' ? 'Your Daily English Sentence:' : 'Sua Frase do Dia em Inglês:'}</span>
            {sentenceInput.trim() && (
              <button
                type="button"
                onClick={() => speakText(sentenceInput)}
                className="text-[#1C4C96] hover:text-[#062863] text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{currentLanguage === 'en' ? 'Listen' : 'Ouvir'}</span>
              </button>
            )}
          </label>

          <textarea
            value={sentenceInput}
            onChange={handleSentenceChange}
            placeholder={
              currentLanguage === 'en'
                ? "E.g., Today I had my morning coffee at 7:30, caught the bus, and worked on my English goals..."
                : "Ex.: Today I had my morning coffee at 7:30, caught the bus, and practiced English..."
            }
            rows={3}
            className="w-full p-3.5 bg-white border border-[#607EC9]/40 rounded-2xl text-xs sm:text-sm text-[#000035] focus:outline-none focus:ring-2 focus:ring-[#1C4C96] focus:bg-white transition resize-none leading-relaxed font-medium"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#607EC9]">
              {sentenceInput.trim().split(/\s+/).filter(Boolean).length} {currentLanguage === 'en' ? 'words' : 'palavras'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={sentenceInput.trim().length < 4 || isCheckingSentence}
              className="px-4 py-2.5 bg-white hover:bg-[#9AB4FF]/15 text-[#062863] border border-[#607EC9]/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Wand2 className={`w-3.5 h-3.5 text-[#1C4C96] ${isCheckingSentence ? 'animate-spin' : ''}`} />
              <span>
                {isCheckingSentence
                  ? (currentLanguage === 'en' ? 'Checking...' : 'Analisando...')
                  : (currentLanguage === 'en' ? 'Check Grammar' : 'Verificar Gramática')}
              </span>
            </button>

            <button
              type="submit"
              disabled={sentenceInput.trim().length < 4 || isCheckingSentence}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                savedSuccess
                  ? 'bg-[#1C4C96] text-white'
                  : 'bg-[#062863] hover:bg-[#000035] text-white disabled:opacity-50'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#9AB4FF]" />
                  <span>{currentLanguage === 'en' ? 'Saved to Journal!' : 'Salvo no Diário!'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#9AB4FF]" />
                  <span>{currentLanguage === 'en' ? 'Save Sentence of the Day' : 'Salvar Frase do Dia'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* AI Grammar Feedback Alert */}
      {sentenceEvaluation && sentenceEvaluation.hasAnyError && (
        <div className="p-4.5 bg-[#FFF8F6] rounded-2xl border-2 border-[#FCA5A5] shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-[#991B1B]">
                  {currentLanguage === 'en' ? '⚠️ Sentence Grammar Feedback' : '⚠️ Correção Pedagógica da Frase'}
                </h4>
                <p className="text-[11px] text-[#7F1D1D]">
                  {currentLanguage === 'en'
                    ? 'Review suggested corrections to make your sentence natural and grammatically accurate:'
                    : 'Veja as correções sugeridas para tornar sua frase gramaticalmente precisa:'}
                </p>
              </div>
            </div>

            {sentenceEvaluation.correctedSentence && (
              <button
                type="button"
                onClick={handleApplySentenceCorrection}
                className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-bold rounded-xl transition flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
              >
                <Wand2 className="w-3 h-3 text-[#FDE047]" />
                <span>{currentLanguage === 'en' ? 'Apply & Save' : 'Aplicar e Salvar'}</span>
              </button>
            )}
          </div>

          {sentenceEvaluation.correctedSentence && (
            <div className="p-3 bg-white rounded-xl border border-[#FECACA] space-y-1.5">
              <span className="text-[10px] font-bold text-[#991B1B] uppercase tracking-wider block">
                {currentLanguage === 'en' ? 'Suggested Natural Version:' : 'Versão Natural Sugerida:'}
              </span>
              <p className="text-xs sm:text-sm font-bold text-[#0F172A] leading-relaxed">
                "{sentenceEvaluation.correctedSentence}"
              </p>
            </div>
          )}

          {sentenceEvaluation.explanation && (
            <p className="text-[11px] text-[#7F1D1D] bg-[#FEE2E2]/60 p-2.5 rounded-xl leading-relaxed">
              💡 {sentenceEvaluation.explanation}
            </p>
          )}
        </div>
      )}

      {/* Success Alert */}
      {sentenceEvaluation && !sentenceEvaluation.hasAnyError && (
        <div className="p-3.5 bg-[#9AB4FF]/20 rounded-2xl border border-[#607EC9] text-[#062863] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1C4C96] shrink-0" />
            <span className="font-bold">
              {currentLanguage === 'en'
                ? '✨ Outstanding! Your sentence is grammatically correct and natural.'
                : '✨ Excelente! Sua frase está gramaticalmente correta e natural.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSentenceEvaluation(null)}
            className="text-[#607EC9] hover:text-[#000035] text-[10px] font-bold"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};
