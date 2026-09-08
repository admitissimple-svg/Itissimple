import { StudentDictionaryEntry } from '../types';
import { COMMON_ROUTINE_DICTIONARY } from '../data/dictionaryDatabase';

export interface DictionaryLookupResult {
  word: string;
  partOfSpeech: string;
  definitionEn: string;
  exampleSentenceEn: string;
  phonetic?: string;
  audio?: string;
  translationPt?: string;
  source: 'api' | 'not_found' | 'pending' | 'offline_dict' | 'fallback';
  notFound?: boolean;
  errorMessage?: string;
}

interface FreeDictionaryDefinition {
  definition: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
}

interface FreeDictionaryMeaning {
  partOfSpeech: string;
  definitions: FreeDictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface FreeDictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface FreeDictionaryItem {
  word: string;
  phonetic?: string;
  phonetics?: FreeDictionaryPhonetic[];
  meanings: FreeDictionaryMeaning[];
  sourceUrls?: string[];
}

// In-memory cache for session performance
const memoryCache = new Map<string, DictionaryLookupResult>();

/**
 * Normalizes example sentence to clean whitespace and quotes.
 */
function formatExample(ex?: string): string {
  if (!ex) return '';
  let cleaned = ex.trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  return cleaned;
}

/**
 * Executes a real HTTP fetch to the official Free Dictionary API
 * Endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/[palavra]
 */
export async function fetchFromFreeDictionaryApi(rawWord: string): Promise<DictionaryLookupResult | null> {
  const cleanWord = rawWord.trim();
  if (!cleanWord) return null;

  const queryApi = async (term: string): Promise<FreeDictionaryItem[] | null> => {
    try {
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term.toLowerCase())}`;
      
      // 8-second timeout for reliable external API response
      let signal: AbortSignal | undefined;
      if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
        signal = AbortSignal.timeout(8000);
      }

      const res = await fetch(url, {
        method: 'GET',
        signal,
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as FreeDictionaryItem[];
      }
      return null;
    } catch {
      return null;
    }
  };

  // 1. Direct query with clean word
  let data = await queryApi(cleanWord);

  // 2. If not found and word contains punctuation, query stripped term
  if (!data && /[^a-zA-Z\s-]/.test(cleanWord)) {
    const stripped = cleanWord.replace(/[^a-zA-Z\s-]/g, '').trim();
    if (stripped && stripped.toLowerCase() !== cleanWord.toLowerCase()) {
      data = await queryApi(stripped);
    }
  }

  if (!data || data.length === 0) {
    return null;
  }

  const entry = data[0];
  const meanings = entry.meanings || [];
  if (meanings.length === 0) {
    return null;
  }

  // Extract official part of speech (meanings[0].partOfSpeech)
  const firstMeaning = meanings[0];
  const partOfSpeech = firstMeaning.partOfSpeech || '';

  // Extract official definition (meanings[0].definitions[0].definition)
  const firstDefObj = firstMeaning.definitions?.[0];
  const definitionEn = firstDefObj?.definition?.trim() || '';

  if (!definitionEn) {
    return null;
  }

  // Extract official example (example from meanings[0].definitions[0] or first available official example)
  let rawExample = firstDefObj?.example?.trim() || '';
  if (!rawExample) {
    for (const meaning of meanings) {
      for (const def of meaning.definitions || []) {
        if (def.example && def.example.trim()) {
          rawExample = def.example.trim();
          break;
        }
      }
      if (rawExample) break;
    }
  }
  const exampleSentenceEn = formatExample(rawExample);

  // Phonetic text & Audio pronunciation if provided by API
  const phoneticText =
    entry.phonetic ||
    entry.phonetics?.find((p) => p.text && p.text.trim())?.text ||
    '';

  const audioUrl =
    entry.phonetics?.find((p) => p.audio && p.audio.startsWith('http'))?.audio ||
    '';

  return {
    word: entry.word || cleanWord,
    partOfSpeech,
    definitionEn,
    exampleSentenceEn,
    phonetic: phoneticText || undefined,
    audio: audioUrl || undefined,
    source: 'api',
    notFound: false,
  };
}

/**
 * Fallback to backend dictionary endpoint (/api/dictionary/define)
 * Powered by curated offline dictionary and Gemini AI model
 */
async function fetchFromBackendApi(
  cleanWord: string,
  context?: string
): Promise<DictionaryLookupResult | null> {
  try {
    let signal: AbortSignal | undefined;
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
      signal = AbortSignal.timeout(6000);
    }

    const res = await fetch('/api/dictionary/define', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word: cleanWord, context }),
      signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data && (data.definitionEn || data.notFound)) {
      if (data.notFound) {
        return {
          word: cleanWord,
          partOfSpeech: '',
          definitionEn: 'Palavra não localizada no dicionário oficial.',
          exampleSentenceEn: '',
          source: 'not_found',
          notFound: true,
          errorMessage: 'Palavra não localizada no dicionário oficial.',
        };
      }

      return {
        word: data.word || cleanWord,
        partOfSpeech: data.partOfSpeech || 'noun',
        definitionEn: data.definitionEn,
        exampleSentenceEn: formatExample(data.exampleSentenceEn),
        translationPt: data.translationPt,
        phonetic: data.phonetic,
        audio: data.audio,
        source: 'api',
        notFound: false,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Main function to look up a word with Free Dictionary API and reliable fallback.
 * Uses session caching to avoid redundant HTTP requests for the same word.
 */
export async function lookupWord(
  rawWord: string,
  context?: string
): Promise<DictionaryLookupResult> {
  const cleanWord = rawWord.trim();
  if (!cleanWord) {
    return {
      word: '',
      partOfSpeech: '',
      definitionEn: '',
      exampleSentenceEn: '',
      source: 'not_found',
      notFound: true,
      errorMessage: 'Nenhuma palavra informada.',
    };
  }

  const cacheKey = cleanWord.toLowerCase();

  // 1. Check session memory cache first
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Query external Free Dictionary API directly (client-side)
  const apiResult = await fetchFromFreeDictionaryApi(cleanWord);
  if (apiResult && !apiResult.notFound && apiResult.definitionEn) {
    memoryCache.set(cacheKey, apiResult);
    return apiResult;
  }

  // 3. Query backend dictionary proxy endpoint (/api/dictionary/define)
  const backendResult = await fetchFromBackendApi(cleanWord, context);
  if (backendResult && !backendResult.notFound && backendResult.definitionEn) {
    memoryCache.set(cacheKey, backendResult);
    return backendResult;
  }

  // 4. If not found in Free Dictionary API, return clean notFound
  const notFoundResult: DictionaryLookupResult = {
    word: cleanWord,
    partOfSpeech: '',
    definitionEn: '',
    exampleSentenceEn: '',
    source: 'not_found',
    notFound: true,
    errorMessage: 'Palavra não localizada no dicionário oficial.',
  };
  memoryCache.set(cacheKey, notFoundResult);
  return notFoundResult;
}

/**
 * Returns instant synchronous cached result or pending placeholder
 */
export function getInstantOrCachedWord(
  rawWord: string,
  _context?: string
): DictionaryLookupResult {
  const cleanWord = rawWord.trim();
  const cacheKey = cleanWord.toLowerCase();

  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  return {
    word: cleanWord,
    partOfSpeech: '',
    definitionEn: '',
    exampleSentenceEn: '',
    source: 'pending',
    notFound: false,
  };
}
