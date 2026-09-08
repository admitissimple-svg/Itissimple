import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BookOpen,
  Search,
  Volume2,
  Sparkles,
  Tag,
  Plus,
  Check,
  Calendar,
  Globe,
  Clock,
  BookMarked,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { StudentDictionaryEntry, Language, DayOfWeek } from '../types';
import { speakText } from '../utils/audio';
import { getDictionaryDefinition, COMMON_ROUTINE_DICTIONARY } from '../data/dictionaryDatabase';
import { lookupWord, getInstantOrCachedWord } from '../utils/dictionaryService';

interface PersonalDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: Language;
  wordsFromRoutines: Array<{ word: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPartOfSpeech, setNewPartOfSpeech] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [isLookingUpApi, setIsLookingUpApi] = useState(false);
  const [lookupSource, setLookupSource] = useState<'api' | 'offline_dict' | 'fallback' | 'not_found' | null>(null);
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

    // Concurrently fetch definitions for routine words
    wordsToFetch.slice(0, 10).forEach(async (w) => {
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
        // preserve local
      }
    });
  }, [isOpen, wordsFromRoutines]);

  // Merge routine words and dictionary definitions
  const allDictionaryEntries: StudentDictionaryEntry[] = useMemo(() => {
    const map = new Map<string, StudentDictionaryEntry>();

    // 1. First add all predefined common words
    Object.entries(COMMON_ROUTINE_DICTIONARY).forEach(([key, val]) => {
      const lower = key.toLowerCase();
      const enriched = apiEnrichedEntries[lower];
      map.set(lower, {
        id: `dict-${key}`,
        word: val.word,
        definitionEn: enriched?.definitionEn || val.definitionEn,
        partOfSpeech: enriched?.partOfSpeech || val.partOfSpeech,
        exampleSentenceEn: enriched?.exampleSentenceEn || val.exampleSentenceEn,
        translationPt: val.translationPt,
        sourceActivityName: 'Routine Vocabulary',
        phonetic: enriched?.phonetic,
        source: (enriched?.source as any) || 'offline_dict',
      });
    });

    // 2. Add all words typed by the student in their routines
    (wordsFromRoutines || []).forEach((item) => {
      const cleanWord = (item.word || '').trim();
      if (!cleanWord) return;
      const lower = cleanWord.toLowerCase();
      const existing = map.get(lower);
      const enriched = apiEnrichedEntries[lower];

      if (existing) {
        map.set(lower, {
          ...existing,
          definitionEn: enriched?.definitionEn || existing.definitionEn,
          exampleSentenceEn: enriched?.exampleSentenceEn || existing.exampleSentenceEn,
          partOfSpeech: enriched?.partOfSpeech || existing.partOfSpeech,
          sourceActivityName: item.sourceActivityName || existing.sourceActivityName,
          sourceDay: item.sourceDay || existing.sourceDay,
          source: (enriched?.source as any) || existing.source,
          notFound: enriched?.notFound || existing.notFound || false,
        });
      } else {
        const cached = getInstantOrCachedWord(cleanWord, item.sourceActivityName);
        map.set(lower, {
          id: `routine-${lower}`,
          word: cleanWord,
          definitionEn: enriched?.definitionEn || cached.definitionEn,
          partOfSpeech: enriched?.partOfSpeech || cached.partOfSpeech,
          exampleSentenceEn: enriched?.exampleSentenceEn || cached.exampleSentenceEn,
          translationPt: cached.translationPt,
          sourceActivityName: item.sourceActivityName || 'Daily Routine',
          sourceDay: item.sourceDay,
          phonetic: enriched?.phonetic,
          source: (enriched?.source as any) || (cached.source as any) || 'api',
          notFound: enriched?.notFound || cached.notFound || false,
        });
      }
    });

    // 3. Add custom saved entries
    (customSavedEntries || []).forEach((entry) => {
      map.set(entry.word.toLowerCase(), entry);
    });

    return Array.from(map.values()).sort((a, b) => a.word.localeCompare(b.word));
  }, [wordsFromRoutines, customSavedEntries, apiEnrichedEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allDictionaryEntries.filter((item) => {
      const matchesSearch =
        item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definitionEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.translationPt && item.translationPt.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sourceActivityName && item.sourceActivityName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'routine' && item.sourceActivityName) return true;
      if (selectedCategory === 'verbs' && item.partOfSpeech?.includes('verb')) return true;
      if (selectedCategory === 'nouns' && item.partOfSpeech?.includes('noun')) return true;

      return true;
    });
  }, [allDictionaryEntries, searchTerm, selectedCategory]);

  const handleLookupWordFromDictionary = async () => {
    if (!newWord.trim()) return;
    setIsLookingUpApi(true);
    setLookupSource(null);
    setLookupError(null);
    try {
      const res = await lookupWord(newWord.trim());
      if (res.notFound) {
        setLookupError(
          isEn
            ? `The word "${newWord.trim()}" was not found in the official dictionary.`
            : `A palavra "${newWord.trim()}" não foi localizada no dicionário oficial.`
        );
        setNewDefinition('');
        setNewExample('');
        setNewPartOfSpeech('');
        setLookupSource('not_found');
      } else {
        setNewDefinition(res.definitionEn || '');
        setNewExample(res.exampleSentenceEn || '');
        setNewPartOfSpeech(res.partOfSpeech || '');
        if (res.translationPt) setNewTranslation(res.translationPt);
        setLookupSource('api');
        setLookupError(null);
      }
    } catch (e) {
      setLookupError(
        isEn
          ? `The word "${newWord.trim()}" was not found in the official dictionary.`
          : `A palavra "${newWord.trim()}" não foi localizada no dicionário oficial.`
      );
      setLookupSource('not_found');
    } finally {
      setIsLookingUpApi(false);
    }
  };

  const handleAddWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    const entry: StudentDictionaryEntry = {
      id: `custom-${Date.now()}`,
      word: newWord.trim(),
      partOfSpeech: newPartOfSpeech.trim() || undefined,
      definitionEn: newDefinition.trim() || `Vocabulary practiced in everyday English.`,
      exampleSentenceEn: newExample.trim() || `I use "${newWord.trim()}" in daily conversation.`,
      translationPt: newTranslation.trim() || 'Vocabulário praticado',
      sourceActivityName: 'Personal Note',
      source: lookupSource || 'api',
      learnedAt: new Date().toISOString(),
    };

    if (onSaveCustomEntry) {
      onSaveCustomEntry(entry);
    }

    setNewWord('');
    setNewPartOfSpeech('');
    setNewDefinition('');
    setNewExample('');
    setNewTranslation('');
    setLookupSource(null);
    setIsAddingCustom(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" id="personal-dictionary-modal">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-[#607EC9]/40 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in duration-200">
        {/* Modal Top Header */}
        <div className="p-6 bg-gradient-to-r from-[#000035] via-[#062863] to-[#1C4C96] text-white flex items-center justify-between border-b border-[#607EC9]/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1C4C96] flex items-center justify-center text-[#F4CA54] shadow-md border border-[#9AB4FF]/50">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {isEn ? 'My English Dictionary' : 'Meu Dicionário de Inglês'}
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#F4CA54] text-[#000035] uppercase">
                  {allDictionaryEntries.length} {isEn ? 'words' : 'palavras'}
                </span>
              </div>
              <p className="text-xs text-[#9AB4FF] mt-0.5">
                {isEn
                  ? 'All words and expressions learned in your daily routine, with English definitions.'
                  : 'Todas as palavras da sua rotina diária com definições pedagógicas 100% em inglês.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#9AB4FF] hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Toolbar: Search & Categories */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEn ? 'Search word, meaning, or context...' : 'Buscar palavra, significado ou contexto...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96] focus:border-transparent transition placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: isEn ? 'All' : 'Todas' },
                { id: 'routine', label: isEn ? 'Routine' : 'Rotina' },
                { id: 'verbs', label: isEn ? 'Verbs' : 'Verbos' },
                { id: 'nouns', label: isEn ? 'Nouns' : 'Substantivos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedCategory === tab.id
                      ? 'bg-[#000035] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="px-3 py-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Add Word' : 'Nova Palavra'}</span>
            </button>
          </div>
        </div>

        {/* Add Word Form Accordion */}
        {isAddingCustom && (
          <form
            onSubmit={handleAddWordSubmit}
            className="p-5 bg-blue-50/70 border-b border-blue-100 space-y-3.5 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#000035] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#1C4C96]" />
                <span>{isEn ? 'Add Word via Free Dictionary API' : 'Buscar Palavra na Free Dictionary API'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustom(false);
                  setLookupError(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    placeholder="e.g. coffee, streamline"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                  />
                  <button
                    type="button"
                    onClick={handleLookupWordFromDictionary}
                    disabled={isLookingUpApi || !newWord.trim()}
                    className="px-2.5 py-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-[10px] font-bold disabled:opacity-50 transition cursor-pointer shrink-0 flex items-center gap-1"
                    title={isEn ? 'Look up official definition in Free Dictionary API' : 'Consultar Free Dictionary API'}
                  >
                    {isLookingUpApi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">API</span>
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
                  {isEn ? 'English Definition' : 'Definição Oficial (em Inglês)'} *
                </label>
                <input
                  type="text"
                  required
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  placeholder="Official definition in English..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                />
              </div>

              <div className="sm:col-span-8">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Authentic Example Sentence' : 'Frase de Exemplo Real'}
                </label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="e.g. He ordered a hot coffee with milk."
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                />
              </div>

              <div className="sm:col-span-4 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#000035] hover:bg-[#1C4C96] text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-[#F4CA54]" />
                  <span>{isEn ? 'Save to Dictionary' : 'Salvar no Dicionário'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Dictionary Entries List (Scrollable) */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-600">
                {isEn ? 'No dictionary entries found.' : 'Nenhuma palavra encontrada no dicionário.'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isEn
                  ? 'Words typed during your daily routines will automatically appear here with their English definitions.'
                  : 'As palavras digitadas na sua rotina diária aparecerão automaticamente aqui com suas definições em inglês.'}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#607EC9]/70 hover:shadow-md transition group space-y-2.5"
              >
                {/* Word Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-[#000035] tracking-tight">
                      {entry.word}
                    </h3>
                    {(entry as any).phonetic && (
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {(entry as any).phonetic}
                      </span>
                    )}
                    {entry.partOfSpeech && (
                      <span className="text-[11px] font-semibold text-[#1C4C96] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {entry.partOfSpeech}
                      </span>
                    )}
                    {entry.sourceActivityName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#9AB4FF]/20 text-[#062863] border border-[#607EC9]/30">
                        {entry.sourceActivityName}
                      </span>
                    )}
                    {((entry as any).source === 'api' || entry.source === 'api') && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        <span>Free Dict API</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => speakText(entry.word)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-[#1C4C96] text-slate-600 hover:text-white transition cursor-pointer shrink-0 shadow-2xs"
                    title={isEn ? 'Listen pronunciation' : 'Ouvir pronúncia'}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* English Definition Box */}
                <div className={`p-3 rounded-xl border ${entry.notFound ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  {entry.notFound ? (
                    <p className="text-xs sm:text-sm text-amber-700 italic font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{isEn ? 'Word not found in the official dictionary.' : 'Palavra não localizada no dicionário oficial.'}</span>
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                      <span className="font-bold text-[#1C4C96] mr-1.5">Definition:</span>
                      {entry.definitionEn}
                    </p>
                  )}
                </div>

                {/* Example Sentence */}
                {!entry.notFound && entry.exampleSentenceEn && (
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-400 shrink-0">Ex:</span>
                    <p className="italic text-slate-700">“{entry.exampleSentenceEn}”</p>
                  </div>
                )}

                {/* Translation hint footer */}
                {entry.translationPt && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>
                      {isEn ? 'Portuguese meaning:' : 'Significado:'}{' '}
                      <span className="text-slate-600 font-medium">{entry.translationPt}</span>
                    </span>
                    {entry.sourceDay && (
                      <span className="capitalize text-[10px] text-slate-400">
                        {entry.sourceDay}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {isEn ? 'Definitions are curated in natural English.' : 'Definições formuladas em inglês natural e pedagógico.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#000035] hover:bg-[#1C4C96] text-white rounded-xl font-bold transition cursor-pointer"
          >
            {isEn ? 'Close Dictionary' : 'Fechar Dicionário'}
          </button>
        </div>
      </div>
    </div>
  );
};
