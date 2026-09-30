import React from 'react';
import {
  BookOpen,
  Volume2,
  CheckCircle2,
  Save,
  Check,
} from 'lucide-react';
import { getInstantOrCachedWord, DictionaryLookupResult } from '../utils/dictionaryService';

interface StudentKeyWordsCardProps {
  isEn: boolean;
  words: string[];
  wordDefinitions: Record<number, DictionaryLookupResult | null>;
  wordsSaveFeedback: boolean;
  handleWordChange: (idx: number, val: string) => void;
  handleSaveWords: (e?: React.FormEvent) => void;
  speakText: (text: string) => void;
}

export const StudentKeyWordsCard: React.FC<StudentKeyWordsCardProps> = ({
  isEn,
  words,
  wordDefinitions,
  wordsSaveFeedback,
  handleWordChange,
  handleSaveWords,
  speakText,
}) => {
  return (
    <div className="bg-white rounded-3xl p-5 border border-[#607EC9]/30 shadow-xs space-y-4 flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#9AB4FF]/30 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#000035] text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-[#9AB4FF]" />
            </div>
            <h3 className="font-black text-xs text-[#000035] tracking-tight">
              {isEn ? '5 Key Words for this Moment' : '5 Palavras-Chave para este Momento'}
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#062863] border border-[#9AB4FF]/40">
            {words.filter((w) => w.trim().length > 0).length}/5 {isEn ? 'recorded' : 'anotadas'}
          </span>
        </div>

        <p className="text-xs text-[#607EC9] mt-2 leading-relaxed">
          {isEn
            ? 'Record 5 English words or phrases you heard in the video or will use during this everyday moment.'
            : 'Anote 5 palavras ou expressões em inglês que você ouviu no vídeo ou usará durante este momento diário.'}
        </p>

        {/* 5 Input Fields */}
        <form onSubmit={handleSaveWords} className="space-y-2 mt-3">
          {words.map((w, idx) => {
            const cleanWord = w.trim();
            const def = cleanWord
              ? wordDefinitions[idx] || getInstantOrCachedWord(cleanWord)
              : null;

            return (
              <div
                key={idx}
                className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-[#1C4C96] focus-within:ring-1 focus-within:ring-[#1C4C96] transition"
              >
                <span className="w-6 h-6 rounded-lg bg-[#000035] text-[#9AB4FF] text-[10px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                {/* Word Input */}
                <input
                  type="text"
                  value={w}
                  onChange={(e) => handleWordChange(idx, e.target.value)}
                  placeholder={
                    isEn
                      ? `Word ${idx + 1}`
                      : `Palavra ${idx + 1}`
                  }
                  className="w-24 sm:w-28 md:w-32 shrink-0 text-xs font-bold text-[#000035] bg-transparent focus:outline-none placeholder:text-slate-400"
                />

                {/* Divider */}
                <div className="w-px h-4 bg-slate-300/80 shrink-0" />

                {/* English Description from the Free Dictionary API */}
                {cleanWord && def ? (
                  <div
                    className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden"
                    title={
                      def.notFound
                        ? (isEn ? 'Word not found in the official dictionary.' : 'Palavra não localizada no dicionário oficial.')
                        : def.definitionEn
                        ? `${def.partOfSpeech ? `[${def.partOfSpeech}] ` : ''}${def.definitionEn}${
                            def.exampleSentenceEn ? ` — e.g. "${def.exampleSentenceEn}"` : ''
                          }`
                        : undefined
                    }
                  >
                    {def.notFound ? (
                      <span className="text-xs text-amber-600 font-medium italic truncate flex items-center gap-1">
                        <span className="text-xs">⚠️</span>
                        <span>{isEn ? 'Word not found in official dictionary.' : 'Palavra não localizada no dicionário oficial.'}</span>
                      </span>
                    ) : def.definitionEn ? (
                      <>
                        {def.partOfSpeech && (
                          <span className="text-[9px] font-bold text-[#1C4C96] bg-[#9AB4FF]/20 border border-[#9AB4FF]/40 px-1 py-0.2 rounded uppercase tracking-wider shrink-0 select-none">
                            {def.partOfSpeech.split('/')[0].trim()}
                          </span>
                        )}
                        <span className="text-xs text-slate-700 truncate font-normal leading-tight">
                          {def.definitionEn}
                        </span>
                        {def.exampleSentenceEn && (
                          <span className="text-[11px] text-slate-500 italic truncate font-normal hidden md:inline">
                            — "{def.exampleSentenceEn}"
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic truncate select-none">
                        {isEn ? 'Consulting official dictionary...' : 'Consultando dicionário oficial...'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 flex items-center overflow-hidden">
                    <span className="text-[11px] text-slate-400 italic truncate select-none">
                      {isEn ? 'English definition from official dictionary...' : 'Definição oficial em inglês...'}
                    </span>
                  </div>
                )}

                {/* Audio pronunciation & completion mark */}
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  {cleanWord.length > 0 && (
                    <button
                      type="button"
                      onClick={() => speakText(cleanWord)}
                      className="p-1 text-[#1C4C96] hover:bg-[#9AB4FF]/20 rounded-lg transition cursor-pointer shrink-0"
                      title={isEn ? 'Listen to pronunciation' : 'Ouvir pronúncia'}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {cleanWord.length > 0 && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mr-1" />
                  )}
                </div>
              </div>
            );
          })}
        </form>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#9AB4FF]/30">
        <div>
          {wordsSaveFeedback && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {isEn ? '5 Words saved successfully!' : '5 Palavras salvas com sucesso!'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveWords}
            className="px-4 py-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs border border-[#9AB4FF]/40"
          >
            <Save className="w-3 h-3" />
            <span>{isEn ? 'Save 5 Words' : 'Salvar 5 Palavras'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
