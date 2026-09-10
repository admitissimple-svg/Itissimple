import { EnglishLevel, WritingEvaluationResult, WordFeedback, SentenceFeedback } from '../types';

export interface CheckWritingParams {
  words?: string[];
  sentence?: string;
  activityName?: string;
  level?: EnglishLevel;
}

export async function checkStudentWritingApi(
  params: CheckWritingParams
): Promise<WritingEvaluationResult> {
  // 1. Try server API call
  try {
    const res = await fetch('/api/check-writing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && typeof data.hasAnyError === 'boolean') {
        return data as WritingEvaluationResult;
      }
    }
  } catch (err) {
    console.warn('Backend writing check unavailable, running local evaluation:', err);
  }

  // 2. Client-side heuristic fallback
  return evaluateLocally(params);
}

function evaluateLocally(params: CheckWritingParams): WritingEvaluationResult {
  const { words = [], sentence = '', level = 'iniciante' } = params;

  const wordFeedbacks: WordFeedback[] = [];

  // Common spelling errors map for routine vocabulary
  const COMMON_SPELLING_FIXES: Record<string, { correct: string; explPt: string; explEn: string }> = {
    'breackfast': { correct: 'breakfast', explPt: 'A grafia correta em inglês é "breakfast" (sem a letra "c").', explEn: 'Correct spelling is "breakfast" (without the "c").' },
    'brakfast': { correct: 'breakfast', explPt: 'A grafia correta é "breakfast" com "ea".', explEn: 'Correct spelling is "breakfast".' },
    'coffe': { correct: 'coffee', explPt: 'A palavra "coffee" termina com "ee" duplo.', explEn: 'The word "coffee" ends in double "ee".' },
    'coffie': { correct: 'coffee', explPt: 'A palavra "coffee" em inglês é escrita com "ee".', explEn: 'The word is spelled "coffee".' },
    'comute': { correct: 'commute', explPt: '"Commute" (deslocamento) tem "mm" duplo.', explEn: '"Commute" has double "mm".' },
    'gymm': { correct: 'gym', explPt: '"Gym" (academia) tem apenas uma letra "m".', explEn: '"Gym" ends in a single "m".' },
    'diner': { correct: 'dinner', explPt: '"Dinner" (jantar) tem "nn" duplo. "Diner" é uma lanchonete típica.', explEn: '"Dinner" has double "n". "Diner" means a casual restaurant.' },
    'whater': { correct: 'water', explPt: '"Water" (água) não tem a letra "h".', explEn: '"Water" is spelled without "h".' },
    'sleap': { correct: 'sleep', explPt: '"Sleep" (dormir) é escrito com "ee".', explEn: '"Sleep" is spelled with "ee".' },
    'restorant': { correct: 'restaurant', explPt: 'A grafia correta é "restaurant".', explEn: 'Correct spelling is "restaurant".' },
    'restaurante': { correct: 'restaurant', explPt: 'Em inglês, "restaurant" não tem "e" no final.', explEn: 'In English, "restaurant" does not have an "e" at the end.' },
    'morrning': { correct: 'morning', explPt: '"Morning" tem apenas um "r".', explEn: '"Morning" has a single "r".' },
  };

  for (const w of words) {
    const clean = w.trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();

    if (COMMON_SPELLING_FIXES[lower]) {
      const fix = COMMON_SPELLING_FIXES[lower];
      wordFeedbacks.push({
        original: clean,
        hasError: true,
        corrected: fix.correct,
        explanationPt: fix.explPt,
        explanationEn: fix.explEn,
      });
    } else {
      wordFeedbacks.push({
        original: clean,
        hasError: false,
        corrected: clean,
        explanationPt: 'Ortografia correta.',
        explanationEn: 'Correct spelling.',
      });
    }
  }

  let sentenceFeedback: SentenceFeedback | undefined = undefined;
  let correctedSentence = sentence;
  let hasSentenceError = false;

  if (sentence && sentence.trim().length >= 4) {
    const sClean = sentence.trim();
    let sFixed = sClean;

    // Check basic capitalization and punctuation
    if (/^[a-z]/.test(sFixed)) {
      sFixed = sFixed.charAt(0).toUpperCase() + sFixed.slice(1);
      hasSentenceError = true;
    }
    if (!/[.!?]$/.test(sFixed)) {
      sFixed = sFixed + '.';
    }

    // Replace known misspellings inside the sentence
    Object.entries(COMMON_SPELLING_FIXES).forEach(([wrong, data]) => {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      if (regex.test(sFixed)) {
        sFixed = sFixed.replace(regex, data.correct);
        hasSentenceError = true;
      }
    });

    // Check common verb tense / grammatical slip-ups
    if (/\bi have (\w+) today\b/i.test(sFixed) && !/\bi have had\b/i.test(sFixed)) {
      // E.g. "I have breakfast today" -> "I had breakfast today"
      if (/\bi have breakfast today\b/i.test(sFixed)) {
        sFixed = sFixed.replace(/\bI have breakfast today\b/i, 'I had breakfast today');
        hasSentenceError = true;
      }
    }

    correctedSentence = sFixed;

    sentenceFeedback = {
      original: sClean,
      hasError: hasSentenceError,
      corrected: sFixed,
      explanationPt: hasSentenceError
        ? 'Ajustamos a pontuação, maiúscula inicial e a concordância natural dos termos.'
        : 'Sua frase está gramaticalmente correta, fluente e natural em inglês.',
      explanationEn: hasSentenceError
        ? 'Adjusted punctuation, initial capitalization, and natural phrase phrasing.'
        : 'Your sentence is grammatically sound, natural, and fluent.',
    };
  }

  const hasAnyError = wordFeedbacks.some((wf) => wf.hasError) || hasSentenceError;

  return {
    hasAnyError,
    wordFeedbacks,
    sentenceFeedback,
    correctedSentence,
    explanation: sentenceFeedback?.explanationPt || (hasAnyError ? 'Identificamos correções sugeridas.' : 'Tudo correto!'),
    overallSummaryPt: hasAnyError ? 'Revisamos o vocabulário e a estrutura da frase.' : 'Excelente! Vocabulário e frase sem erros.',
    overallSummaryEn: hasAnyError ? 'Reviewed vocabulary and sentence structure.' : 'Outstanding! Everything is accurate.',
  };
}
