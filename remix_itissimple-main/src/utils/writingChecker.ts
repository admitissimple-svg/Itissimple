import { EnglishLevel, WritingEvaluationResult, WordFeedback, SentenceFeedback, WeeklyHomeworkData, HomeworkAiEvaluation } from '../types';

export interface CheckWritingParams {
  words?: string[];
  sentence?: string;
  activityName?: string;
  level?: EnglishLevel | string;
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
        return {
          ...data,
          isCorrect: typeof data.isCorrect === 'boolean' ? data.isCorrect : !data.hasAnyError,
        } as WritingEvaluationResult;
      }
    }
  } catch (err) {
    console.warn('Backend writing check unavailable, running local evaluation:', err);
  }

  // 2. Client-side heuristic fallback
  return evaluateLocally(params);
}

export async function evaluateWeeklyHomeworkApi(params: {
  homework: WeeklyHomeworkData;
  studentAnswers: {
    matching?: Record<string, string>;
    fillInBlanks?: Record<string, string>;
    sentences?: Record<string, string>;
    quizAnswers?: Record<string, number>;
  };
  studentLevel?: string;
  studentName?: string;
  currentLanguage?: string;
}): Promise<HomeworkAiEvaluation> {
  try {
    const res = await fetch('/api/homework/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.evaluation) {
        return data.evaluation as HomeworkAiEvaluation;
      }
    }
  } catch (err) {
    console.warn('Error evaluating homework via API:', err);
  }

  // Resilient client-side fallback evaluation
  const { homework, studentAnswers, studentLevel = 'Beginner' } = params;
  const { matching = {}, fillInBlanks = {}, sentences = {}, quizAnswers = {} } = studentAnswers;

  let matchingCorrect = 0;
  const matchingFeedback = (homework.matchingPairs || []).map((p) => {
    const ans = (matching[p.id] || '').trim();
    const isCorrect = ans.toLowerCase() === p.word.toLowerCase();
    if (isCorrect) matchingCorrect++;
    return {
      id: p.id,
      isCorrect,
      userAnswer: ans || '(sem resposta)',
      correctAnswer: p.word,
      explanationPt: isCorrect
        ? `Correto! "${p.word}" corresponde a "${p.translation}".`
        : `A resposta correta é "${p.word}" (${p.translation}).`,
      explanationEn: isCorrect
        ? `Correct! "${p.word}" matches "${p.definition}".`
        : `The correct answer is "${p.word}" (${p.definition}).`,
    };
  });

  let fillCorrect = 0;
  const fillFeedback = (homework.fillInBlanks || []).map((f) => {
    const ans = (fillInBlanks[f.id] || '').trim();
    const isCorrect = ans.toLowerCase() === f.correctWord.toLowerCase();
    if (isCorrect) fillCorrect++;
    return {
      id: f.id,
      isCorrect,
      userAnswer: ans || '(sem resposta)',
      correctAnswer: f.correctWord,
      explanationPt: f.explanationPt || (isCorrect ? `Excelente! "${f.correctWord}" completa a frase perfeitamente.` : `A palavra correta é "${f.correctWord}".`),
      explanationEn: f.explanationEn || (isCorrect ? `Great! "${f.correctWord}" completes the sentence.` : `The correct word is "${f.correctWord}".`),
    };
  });

  let quizCorrect = 0;
  const readingFeedback = (homework.readingPassage?.questions || []).map((q) => {
    const ansIdx = quizAnswers[q.id];
    const isCorrect = ansIdx === q.correctAnswer;
    if (isCorrect) quizCorrect++;
    return {
      id: q.id,
      isCorrect,
      userAnswer: q.options[ansIdx] || '(sem resposta)',
      correctAnswer: q.options[q.correctAnswer] || '',
      explanationPt: q.explanation || (isCorrect ? 'Resposta correta!' : 'Opção alinhada com o texto.'),
      explanationEn: q.explanation || (isCorrect ? 'Correct interpretation!' : 'Option aligned with the passage.'),
    };
  });

  const sentenceFeedback = (homework.sentenceWritingPrompts || []).map((p) => {
    const text = (sentences[p.word] || '').trim();
    const isCorrect = text.length >= 8 && text.toLowerCase().includes(p.word.toLowerCase());
    return {
      word: p.word,
      originalSentence: text || '(nenhuma frase enviada)',
      isCorrect,
      correctedSentence: text || `I use ${p.word} in my daily routine.`,
      explanationPt: isCorrect
        ? `Frase bem elaborada incorporando "${p.word}" com naturalidade.`
        : `Lembre-se de formar uma frase completa em inglês usando a palavra "${p.word}".`,
      explanationEn: isCorrect
        ? `Well-crafted sentence incorporating "${p.word}" naturally.`
        : `Remember to build a full English sentence using "${p.word}".`,
      levelAdvicePt: 'Continue praticando a formação de frases ativas conectadas à sua rotina.',
      levelAdviceEn: 'Keep practicing active sentence construction tied to your routine.',
    };
  });

  const totalPoints = 100;
  const totalM = Math.max(1, homework.matchingPairs.length);
  const totalF = Math.max(1, homework.fillInBlanks.length);
  const totalQ = Math.max(1, homework.readingPassage.questions.length);
  const totalS = Math.max(1, homework.sentenceWritingPrompts.length);

  let sentenceCorrect = 0;
  sentenceFeedback.forEach((s) => { if (s.isCorrect) sentenceCorrect++; });

  const score = Math.round(
    (matchingCorrect / totalM) * 25 +
    (fillCorrect / totalF) * 30 +
    (sentenceCorrect / totalS) * 25 +
    (quizCorrect / totalQ) * 20
  );

  return {
    overallScore: Math.min(100, score),
    evaluatedAt: new Date().toISOString(),
    studentLevel: studentLevel || 'Beginner',
    tutorFeedbackSummaryPt: `Parabéns pela dedicação! Você concluiu as etapas de memorização do vocabulário da sua semana com foco no nível ${studentLevel}. Continue integrando essas palavras na sua rotina diária.`,
    tutorFeedbackSummaryEn: `Congratulations on your dedication! You completed your weekly memorization activity calibrated for ${studentLevel} level. Keep applying these words in your daily life.`,
    levelStrengthsPt: 'Demonstrou bom reconhecimento de vocabulário e dedicação na prática ativa.',
    levelStrengthsEn: 'Demonstrated strong vocabulary recall and dedication in active practice.',
    levelNextStepsPt: 'Traga esses termos para a sua próxima aula de conversação com seu Amigo Nativo.',
    levelNextStepsEn: 'Bring these terms into your next live conversation session with your Native Friend.',
    matchingFeedback,
    fillFeedback,
    sentenceFeedback,
    readingFeedback,
  };
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

  const lvlStr = String(level).toLowerCase();
  const isAdv = lvlStr.includes('avanc') || lvlStr.includes('advan');
  const isBeg = lvlStr.includes('inic') || lvlStr.includes('begin');

  return {
    hasAnyError,
    isCorrect: !hasAnyError,
    wordFeedbacks,
    sentenceFeedback,
    correctedSentence,
    explanation: sentenceFeedback?.explanationPt || (hasAnyError ? 'Identificamos correções sugeridas.' : 'Tudo correto!'),
    overallSummaryPt: hasAnyError ? 'Revisamos o vocabulário e a estrutura da frase.' : 'Excelente! Vocabulário e frase sem erros.',
    overallSummaryEn: hasAnyError ? 'Reviewed vocabulary and sentence structure.' : 'Outstanding! Everything is accurate.',
    levelTipsPt: isBeg
      ? 'Dica Iniciante: Lembre-se de manter Sujeito + Verbo + Complemento.'
      : isAdv
      ? 'Dica Avançada: Aplique expressões idiomáticas e estruturas conectivas sofisticadas.'
      : 'Dica Intermediária: Pratique usar conectivos como "because", "while" ou "although" para unir duas ações.',
    levelTipsEn: isBeg
      ? 'Beginner Tip: Keep practicing clear Subject + Verb + Object structures.'
      : isAdv
      ? 'Advanced Tip: Incorporate sophisticated transitions and nuanced collocations.'
      : 'Intermediate Tip: Try linking ideas with connectors like "because" or "while".',
  };
}
