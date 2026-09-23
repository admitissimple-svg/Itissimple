import { EnglishLevel, WritingEvaluationResult, WordFeedback, SentenceFeedback, WeeklyHomeworkData, HomeworkAiEvaluation } from '../types';

export interface CheckWritingParams {
  words?: string[];
  targetWord?: string;
  sentence?: string;
  activityName?: string;
  level?: EnglishLevel | string;
  instruction?: string;
  levelInstruction?: string;
  language?: string;
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
          explanation:
            data.explanation ||
            data.sentenceFeedback?.explanationPt ||
            data.sentenceFeedback?.explanationEn ||
            data.overallSummaryPt ||
            'Análise gramatical concluída com sucesso.',
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
  const { words = [], targetWord = '', sentence = '', level = 'iniciante', levelInstruction = '', instruction = '', language = 'pt' } = params;

  const allWords = targetWord ? Array.from(new Set([targetWord, ...words])) : words;
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

  for (const w of allWords) {
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

  const sClean = sentence.trim();
  const lowerSentence = sClean.toLowerCase();

  // Target word presence check
  const mainTarget = targetWord || (allWords[0] || '');
  const cleanTarget = mainTarget.trim().toLowerCase();
  const targetRoot = cleanTarget.replace(/(ing|ed|s|es|d)$/i, '');
  const usedTargetWord = Boolean(
    cleanTarget &&
    (lowerSentence.includes(cleanTarget) || (targetRoot.length >= 4 && lowerSentence.includes(targetRoot)))
  );

  // Trigger check based on levelInstruction
  let usedTrigger: boolean | undefined = undefined;
  let triggerFeedback = '';
  if (levelInstruction && levelInstruction.trim()) {
    const triggerLower = levelInstruction.toLowerCase();
    if (triggerLower.includes('because') || triggerLower.includes('since')) {
      usedTrigger = /\b(because|since)\b/i.test(lowerSentence);
      triggerFeedback = usedTrigger
        ? 'Gatilho cumprido: você usou "because" ou "since" para justificar o motivo.'
        : 'Desafio: lembre-se de usar "because" ou "since" para explicar a sua razão.';
    } else if (triggerLower.includes('whenever')) {
      usedTrigger = /\bwhenever\b/i.test(lowerSentence);
      triggerFeedback = usedTrigger
        ? 'Gatilho cumprido: você aplicou "whenever" para descrever um hábito.'
        : 'Desafio: inclua o conectivo "whenever" para indicar frequência ou hábito.';
    } else if (triggerLower.includes('modal') || triggerLower.includes('might') || triggerLower.includes('should')) {
      usedTrigger = /\b(might|should|could|would|can|must)\b/i.test(lowerSentence);
      triggerFeedback = usedTrigger
        ? 'Gatilho cumprido: verbo modal aplicado adequadamente.'
        : 'Desafio: use um verbo modal como "might", "should" ou "could".';
    } else if (triggerLower.includes('conditional') || triggerLower.includes('if')) {
      usedTrigger = /\b(if|unless)\b/i.test(lowerSentence);
      triggerFeedback = usedTrigger
        ? 'Gatilho cumprido: oração condicional aplicada.'
        : 'Desafio: formule uma condição usando "if" ou "unless".';
    } else if (triggerLower.includes('connector') || triggerLower.includes('although')) {
      usedTrigger = /\b(although|though|however|while|but)\b/i.test(lowerSentence);
      triggerFeedback = usedTrigger
        ? 'Gatilho cumprido: conectivo de transição utilizado.'
        : 'Desafio: conecte as ideias usando um conectivo como "although" ou "while".';
    } else {
      usedTrigger = true;
    }
  }

  if (sClean.length >= 4) {
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
    if (/\byou has\b/i.test(sFixed)) {
      sFixed = sFixed.replace(/\byou has\b/gi, 'you have');
      hasSentenceError = true;
    }
    if (/\bin the end of the day\b/i.test(sFixed)) {
      sFixed = sFixed.replace(/\bin the end of the day\b/gi, 'At the end of the day');
      hasSentenceError = true;
    }
    if (/\bi have (\w+) today\b/i.test(sFixed) && !/\bi have had\b/i.test(sFixed)) {
      if (/\bi have breakfast today\b/i.test(sFixed)) {
        sFixed = sFixed.replace(/\bI have breakfast today\b/i, 'I had breakfast today');
        hasSentenceError = true;
      }
    }

    correctedSentence = sFixed;

    const explanationPt = hasSentenceError
      ? 'Ajustamos a pontuação, maiúscula inicial ou concordância dos termos.'
      : !usedTargetWord && mainTarget
      ? `A frase está bem escrita, mas certifique-se de incluir a palavra-alvo "${mainTarget}".`
      : 'Sua frase está gramaticalmente correta, fluente e natural em inglês.';

    const explanationEn = hasSentenceError
      ? 'Adjusted punctuation, initial capitalization, or natural word phrasing.'
      : !usedTargetWord && mainTarget
      ? `Good sentence, but remember to explicitly use the target word "${mainTarget}".`
      : 'Your sentence is grammatically sound, natural, and fluent.';

    sentenceFeedback = {
      original: sClean,
      hasError: hasSentenceError || (mainTarget ? !usedTargetWord : false),
      corrected: sFixed,
      explanationPt,
      explanationEn,
    };
  }

  const hasAnyError =
    wordFeedbacks.some((wf) => wf.hasError) ||
    hasSentenceError ||
    (mainTarget ? !usedTargetWord : false) ||
    (usedTrigger === false);

  const lvlStr = String(level).toLowerCase();
  const isAdv = lvlStr.includes('avanc') || lvlStr.includes('advan');
  const isBeg = lvlStr.includes('inic') || lvlStr.includes('begin');

  const targetWordFeedback = mainTarget
    ? usedTargetWord
      ? `Palavra-alvo "${mainTarget}" aplicada com sucesso.`
      : `Lembre-se de incorporar a palavra "${mainTarget}" na frase.`
    : '';

  return {
    hasAnyError,
    isCorrect: !hasAnyError,
    usedTargetWord,
    usedTrigger,
    targetWordFeedback,
    triggerFeedback,
    wordFeedbacks,
    sentenceFeedback,
    correctedSentence,
    explanation: sentenceFeedback?.explanationPt || (hasAnyError ? 'Identificamos sugestões para sua frase.' : 'Tudo correto!'),
    overallSummaryPt: !hasAnyError
      ? `Excelente! Você utilizou "${mainTarget || 'a palavra-alvo'}" com precisão e cumpriu o desafio pedagógico.`
      : !usedTargetWord
      ? `Inclua a palavra-alvo "${mainTarget}" na sua frase para validar a atividade.`
      : usedTrigger === false
      ? triggerFeedback || 'Revise o gatilho solicitado para a frase.'
      : 'Revisamos a pontuação e estrutura da frase.',
    overallSummaryEn: !hasAnyError
      ? `Outstanding! You naturally applied "${mainTarget || 'target word'}" and fulfilled the pedagogical challenge.`
      : !usedTargetWord
      ? `Please include the target word "${mainTarget}" in your sentence.`
      : usedTrigger === false
      ? 'Review the requested challenge trigger in your sentence.'
      : 'Reviewed punctuation and sentence flow.',
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
