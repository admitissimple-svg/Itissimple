import { StudentDictionaryEntry } from '../types';

/**
 * Curated offline routine dictionary.
 * Cleared of test/mock words as requested by user to allow validation of first real word inputs.
 */
export const COMMON_ROUTINE_DICTIONARY: Record<string, Omit<StudentDictionaryEntry, 'id'>> = {};

/**
 * Returns dictionary definition for an English word.
 * If word is not in local dictionary, returns clean empty fields so the Free Dictionary API
 * can supply 100% authentic definitions and examples.
 */
export function getDictionaryDefinition(
  rawWord: string,
  _context?: string
): Omit<StudentDictionaryEntry, 'id'> {
  const cleanKey = rawWord.toLowerCase().trim();
  const normalizedKey = cleanKey.replace(/[_\-]+/g, ' ');

  if (COMMON_ROUTINE_DICTIONARY[cleanKey]) {
    return COMMON_ROUTINE_DICTIONARY[cleanKey];
  }
  if (COMMON_ROUTINE_DICTIONARY[normalizedKey]) {
    return COMMON_ROUTINE_DICTIONARY[normalizedKey];
  }

  const wordTrimmed = rawWord.trim();
  return {
    word: wordTrimmed,
    partOfSpeech: '',
    definitionEn: '',
    exampleSentenceEn: '',
    translationPt: '',
  };
}

/**
 * Returns instant simplified English definition & example sentence for live sessions
 */
export function getInstantVocabEntry(
  word: string,
  context?: string
): {
  word: string;
  definitionEn: string;
  exampleSentenceEn: string;
} {
  const entry = getDictionaryDefinition(word, context);
  return {
    word: entry.word,
    definitionEn: entry.definitionEn,
    exampleSentenceEn: entry.exampleSentenceEn,
  };
}
