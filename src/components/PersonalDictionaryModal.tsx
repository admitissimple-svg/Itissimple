import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BookOpen,
  Search,
  Volume2,
  Plus,
  Check,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { StudentDictionaryEntry, Language, DayOfWeek } from '../types';
import { speakText } from '../utils/audio';
import { lookupWord, getInstantOrCachedWord } from '../utils/dictionaryService';

interface PersonalDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: Language;
  wordsFromRoutines?: Array<{ word: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>;
  customSavedEntries?: StudentDictionaryEntry[];
  onSaveCustomEntry?: (entry: StudentDictionaryEntry) => void;
}

export const PersonalDictionaryModal: React.FC<PersonalDictionaryModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  wordsFromRoutines = [],
  customSavedEntries = [],
  onSaveCustomEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPartOfSpeech, setNewPartOfSpeech] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [isLookingUpApi, setIsLookingUpApi] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [apiEnrichedEntries, setApiEnrichedEntries] = useState<Record<string, Partial<StudentDictionaryEntry>>>({});

  const isEn = currentLanguage === 'en';

  // Automatically enrich words from routines via Free Dictionary API in background
  useEffect(() => {
    if (!isOpen || wordsFromRoutines.length === 0) return;

    const wordsToFetch = wordsFromRoutines
      .map((r) => (r.word || '').trim().toLowerCase())
      .filter((w) => w && !apiEnrichedEntries[w]);

    if (wordsToFetch.length === 0) return;

    // Fetch definitions for words entered in routine
    wordsToFetch.slice(0, 15).forEach(async (w) => {
      try {
        const res = await lookupWord(w);
        if (res && res.definitionEn) {
          setApiEnrichedEntries((prev) => ({
            ...prev,
            [w]: {
              definitionEn: res.definitionEn,
              exampleSentenceEn: res.exampleSentenceEn,
              partOfSpeech: res.partOfSpeech,
              phonetic: res.phonetic,
              source: res.source,
              notFound: res.notFound,
            },
          }));
        }
      } catch (err) {
        console.warn('Routine word background lookup error:', err);
      }
    });
  }, [isOpen, wordsFromRoutines]);

  // Merge student's saved dictionary entries and routine words (without test words)
  const allDictionaryEntries: StudentDictionaryEntry[] = useMemo(() => {
    const map = new Map<string, StudentDictionaryEntry>();

    // 1. Add custom saved entries (from live lessons or student inputs)
    (customSavedEntries || []).forEach((entry) => {
      const clean = (entry.word || '').trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      map.set(lower, entry);
    });

    // 2. Add words actively typed by the student in daily routines
    (wordsFromRoutines || []).forEach((item) => {
      const cleanWord = (item.word || '').trim();
      if (!cleanWord) return;
      const lower = cleanWord.toLowerCase();
      const existing = map.get(lower);
      const enriched = apiEnrichedEntries[lower];

      if (existing) {
        map.set(lower, {
          ...existing,
          definitionEn: existing.definitionEn || enriched?.definitionEn || '',
          exampleSentenceEn: existing.exampleSentenceEn || enriched?.exampleSentenceEn || '',
          partOfSpeech: existing.partOfSpeech || enriched?.partOfSpeech || '',
          sourceActivityName: existing.sourceActivityName || item.sourceActivityName,
          sourceDay: existing.sourceDay || item.sourceDay,
          source: existing.source || (enriched?.source as any) || 'api',
          notFound: existing.notFound ?? enriched?.notFound ?? false,
        });
      } else {
        const cached = getInstantOrCachedWord(cleanWord, item.sourceActivityName);
        map.set(lower, {
          id: `routine_${lower}_${Date.now()}`,
          word: cleanWord,
          definitionEn: enriched?.definitionEn || cached.definitionEn || '',
          partOfSpeech: enriched?.partOfSpeech || cached.partOfSpeech || '',
          exampleSentenceEn: enriched?.exampleSentenceEn || cached.exampleSentenceEn || '',
          translationPt: cached.translationPt || '',
          sourceActivityName: item.sourceActivityName || 'Daily Routine',
          sourceDay: item.sourceDay,
          phonetic: enriched?.phonetic,
          source: (enriched?.source as any) || 'api',
          notFound: enriched?.notFound || false,
        });
      }
    });

    // Strictly sort in ascending alphabetical order
    return Array.from(map.values()).sort((a, b) =>
      (a.word || '').toLowerCase().localeCompare((b.word || '').toLowerCase())
    );
  }, [wordsFromRoutines, customSavedEntries, apiEnrichedEntries]);

  // Filter entries by search term
  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allDictionaryEntries;

    return allDictionaryEntries.filter((item) => {
      const w = (item.word || '').toLowerCase();
      const d = (item.definitionEn || '').toLowerCase();
      const e = (item.exampleSentenceEn || '').toLowerCase();
      const t = (item.translationPt || '').toLowerCase();
      return w.includes(term) || d.includes(term) || e.includes(term) || t.includes(term);
    });
  }, [allDictionaryEntries, searchTerm]);

  // Lookup word via external Free Dictionary API
  const handleLookupWordFromDictionary = async () => {
    const term = newWord.trim();
    if (!term) return;

    setIsLookingUpApi(true);
    setLookupError(null);

    try {
      const res = await lookupWord(term);
      if (res.notFound || !res.definitionEn) {
        setLookupError(
          isEn
            ? `The word "${term}" was not found in the official Free Dictionary API.`
            : `A palavra "${term}" não foi encontrada na Free Dictionary API.`
        );
        setNewDefinition('');
        setNewExample('');
        setNewPartOfSpeech('');
      } else {
        setNewDefinition(res.definitionEn || '');
        setNewExample(res.exampleSentenceEn || '');
        setNewPartOfSpeech(res.partOfSpeech || '');
        if (res.translationPt) setNewTranslation(res.translationPt);
        setLookupError(null);
      }
    } catch {
      setLookupError(
        isEn
          ? 'Error contacting the Free Dictionary API. Please try again.'
          : 'Erro ao consultar a Free Dictionary API. Tente novamente.'
      );
    } finally {
      setIsLookingUpApi(false);
    }
  };

  // Submit manual word to dictionary
  const handleAddWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newDefinition.trim()) return;

    const newEntry: StudentDictionaryEntry = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      word: newWord.trim(),
      partOfSpeech: newPartOfSpeech.trim() || undefined,
      definitionEn: newDefinition.trim(),
      exampleSentenceEn: newExample.trim(),
      translationPt: newTranslation.trim() || undefined,
      learnedAt: new Date().toISOString(),
      source: 'api',
      sourceActivityName: isEn ? 'Personal Addition' : 'Adição Manual',
    };

    if (onSaveCustomEntry) {
      onSaveCustomEntry(newEntry);
    }

    setNewWord('');
    setNewPartOfSpeech('');
    setNewDefinition('');
    setNewExample('');
    setNewTranslation('');
    setIsAddingCustom(false);
    setLookupError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#000035]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#607EC9]/30 w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#000035] to-[#1C4C96] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9AB4FF]/20 border border-[#9AB4FF]/30 flex items-center justify-center text-[#9AB4FF]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                {isEn ? 'My Dictionary' : 'Meu Dicionário'}
              </h2>
              <p className="text-xs text-[#9AB4FF]">
                {isEn
                  ? 'Vocabulary learned in live sessions and daily routines'
                  : 'Vocabulário aprendido nas aulas ao vivo e na sua rotina diária'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15">
              {allDictionaryEntries.length} {allDictionaryEntries.length === 1 ? 'palavra' : 'palavras'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={isEn ? 'Close' : 'Fechar'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Counter & Add Button */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEn ? 'Search word, meaning, example...' : 'Buscar palavra, significado, exemplo...'}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] focus:border-transparent transition shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="px-3.5 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Add Word' : 'Nova Palavra'}</span>
            </button>
          </div>
        </div>

        {/* Add Word Form (Free Dictionary API powered) */}
        {isAddingCustom && (
          <form
            onSubmit={handleAddWordSubmit}
            className="p-5 bg-blue-50/80 border-b border-blue-200 space-y-3.5 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#000035] flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#1C4C96]" />
                <span>{isEn ? 'Look up Word in Free Dictionary API' : 'Buscar Palavra na Free Dictionary API'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustom(false);
                  setLookupError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>
            </div>

            {lookupError && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Word in English' : 'Palavra em Inglês'} *
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !newDefinition) {
                        e.preventDefault();
                        handleLookupWordFromDictionary();
                      }
                    }}
                    placeholder="e.g. coffee, schedule"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                  />
                  <button
                    type="button"
                    onClick={handleLookupWordFromDictionary}
                    disabled={isLookingUpApi || !newWord.trim()}
                    className="px-3 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold disabled:opacity-50 transition cursor-pointer shrink-0 flex items-center gap-1"
                    title="Buscar na Free Dictionary API"
                  >
                    {isLookingUpApi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>API</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Part of Speech' : 'Classe Gramatical'}
                </label>
                <input
                  type="text"
                  value={newPartOfSpeech}
                  onChange={(e) => setNewPartOfSpeech(e.target.value)}
                  placeholder="e.g. noun, verb"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'English Definition' : 'Significado (em Inglês)'} *
                </label>
                <input
                  type="text"
                  required
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  placeholder="Meaning from Free Dictionary API..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                />
              </div>

              <div className="sm:col-span-9">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Example in a Sentence' : 'Exemplo em uma Frase'}
                </label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Example sentence from Free Dictionary API..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#000035] hover:bg-[#1C4C96] text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-[#F4CA54]" />
                  <span>{isEn ? 'Save Word' : 'Salvar Palavra'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Dictionary Table View (Organized by Ascending Order) */}
        <div className="flex-1 overflow-auto">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {searchTerm
                  ? (isEn ? 'No words matching your search.' : 'Nenhuma palavra corresponde à busca.')
                  : (isEn ? 'Your dictionary is ready for your first words!' : 'Seu dicionário está pronto para receber suas primeiras palavras!')}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {searchTerm
                  ? (isEn ? 'Try adjusting your search keywords.' : 'Tente pesquisar por outro termo.')
                  : (isEn
                      ? 'Vocabulary saved by your Native Friend in live coaching sessions or practiced in daily routines will automatically appear here in alphabetical order.'
                      : 'O vocabulário salvo pelo seu Amigo Nativo nas aulas ao vivo ou praticado na sua rotina diária aparecerá automaticamente aqui em formato tabela por ordem alfabética.')}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-[#000035] sticky top-0 z-10 backdrop-blur-xs">
                  <th className="py-3 px-4 sm:px-6 w-1/4">
                    {isEn ? 'Word' : 'Palavra'}
                  </th>
                  <th className="py-3 px-4 sm:px-6 w-2/5">
                    {isEn ? 'Meaning' : 'Significado'}
                  </th>
                  <th className="py-3 px-4 sm:px-6 w-1/3">
                    {isEn ? 'Example' : 'Exemplo'}
                  </th>
                  <th className="py-3 px-3 text-right w-16">
                    {isEn ? 'Audio' : 'Áudio'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEntries.map((entry, index) => (
                  <tr
                    key={entry.id || `${entry.word}_${index}`}
                    className="hover:bg-blue-50/50 transition-colors group"
                  >
                    {/* 1. Palavra / Word */}
                    <td className="py-3.5 px-4 sm:px-6 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-bold text-[#000035] tracking-tight group-hover:text-[#1C4C96] transition-colors">
                          {entry.word}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {entry.partOfSpeech && (
                            <span className="text-[10px] font-semibold text-[#1C4C96] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {entry.partOfSpeech}
                            </span>
                          )}
                          {(entry as any).phonetic && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {(entry as any).phonetic}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Significado / Meaning */}
                    <td className="py-3.5 px-4 sm:px-6 align-top">
                      {entry.notFound ? (
                        <span className="text-xs text-amber-700 italic">
                          {isEn ? 'Word not found in dictionary.' : 'Palavra não encontrada no dicionário.'}
                        </span>
                      ) : entry.definitionEn ? (
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {entry.definitionEn}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {isEn ? 'Definition pending' : 'Definição pendente'}
                        </span>
                      )}
                    </td>

                    {/* 3. Exemplo / Example */}
                    <td className="py-3.5 px-4 sm:px-6 align-top">
                      {entry.exampleSentenceEn ? (
                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          “{entry.exampleSentenceEn}”
                        </p>
                      ) : (
                        <span className="text-xs text-slate-300 italic">—</span>
                      )}
                    </td>

                    {/* 4. Audio Pronunciation Button */}
                    <td className="py-3.5 px-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => speakText(entry.word)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1C4C96] hover:bg-blue-50 transition cursor-pointer"
                        title={isEn ? 'Listen to pronunciation' : 'Ouvir pronúncia'}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Globe className="w-3.5 h-3.5 text-[#1C4C96]" />
            <span>
              {isEn
                ? 'Definitions sourced directly from Free Dictionary API'
                : 'Definições extraídas 100% da Free Dictionary API oficial'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#000035] hover:bg-[#1C4C96] text-white rounded-xl font-bold transition cursor-pointer"
          >
            {isEn ? 'Close' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
};
