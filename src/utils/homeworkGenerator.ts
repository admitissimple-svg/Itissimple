import {
  WeeklyHomeworkData,
  UserProfile,
  RoutineItem,
  DayOfWeek,
  HomeworkVocabItem,
  MatchingPair,
  FillInBlankItem,
  SentenceWritingPrompt,
  ReadingQuestion,
  ReadingPassage,
} from '../types';
import { getActivityDisplayName } from './i18n';

// Rich dictionary knowledge base for routine words
const ROUTINE_VOCAB_DICT: Record<
  string,
  { translationPt: string; definitionEn: string; exampleSentence: string }
> = {
  brew: {
    translationPt: 'Preparar / Fazer infusão (café ou chá)',
    definitionEn: 'To make a hot drink like tea or coffee by soaking ingredients in boiling water.',
    exampleSentence: 'I brew fresh coffee every morning to start my routine.',
  },
  pour: {
    translationPt: 'Despejar / Servir líquido',
    definitionEn: 'To cause a liquid to flow from a container into another vessel.',
    exampleSentence: 'She poured hot milk into her morning mug.',
  },
  mug: {
    translationPt: 'Caneca',
    definitionEn: 'A large cup with a handle, used typically for hot drinks.',
    exampleSentence: 'I drink warm green tea from my favorite ceramic mug.',
  },
  toast: {
    translationPt: 'Torrada / Pão torrado',
    definitionEn: 'Sliced bread made crisp and brown by heat.',
    exampleSentence: 'He spreads creamy butter over hot breakfast toast.',
  },
  'scrambled eggs': {
    translationPt: 'Ovos mexidos',
    definitionEn: 'Eggs beaten with milk or water and cooked gently until firm.',
    exampleSentence: 'Scrambled eggs are a nutritious breakfast staple.',
  },
  skillet: {
    translationPt: 'Frigideira',
    definitionEn: 'A small flat-bottomed pan with a long handle used for frying food.',
    exampleSentence: 'He heated butter in the skillet before adding eggs.',
  },
  sip: {
    translationPt: 'Dar um gole / Beber em pequenos goles',
    definitionEn: 'To drink something by taking small mouthfuls.',
    exampleSentence: 'I take a slow sip of hot coffee while checking the morning news.',
  },
  aroma: {
    translationPt: 'Aroma / Cheiro agradável',
    definitionEn: 'A pleasant, distinctive smell, especially of food or coffee.',
    exampleSentence: 'The rich aroma of roasted coffee filled the entire kitchen.',
  },
  commute: {
    translationPt: 'Deslocamento diário / Trajeto',
    definitionEn: 'Travel some distance regularly between home and place of work.',
    exampleSentence: 'My morning commute is a great time to listen to English podcasts.',
  },
  subway: {
    translationPt: 'Metrô',
    definitionEn: 'An underground electric railroad system in a city.',
    exampleSentence: 'I take the subway to downtown every weekday morning.',
  },
  transit: {
    translationPt: 'Transporte público / Trânsito',
    definitionEn: 'The carrying of people from one place to another on public conveyances.',
    exampleSentence: 'Public transit is fast and environmentally friendly.',
  },
  meeting: {
    translationPt: 'Reunião de trabalho',
    definitionEn: 'An assembly of people for discussion or all-hands collaboration.',
    exampleSentence: 'We held a productive 30-minute status meeting with the team.',
  },
  deadline: {
    translationPt: 'Prazo limite de entrega',
    definitionEn: 'The latest time or date by which something should be completed.',
    exampleSentence: 'Meeting our project deadline required strong team focus.',
  },
  schedule: {
    translationPt: 'Cronograma / Agenda diária',
    definitionEn: 'A plan that gives a list of events or tasks and the times they will happen.',
    exampleSentence: 'I review my daily schedule every morning over coffee.',
  },
  email: {
    translationPt: 'E-mail / Correio eletrônico',
    definitionEn: 'Messages distributed by electronic means from one computer user to others.',
    exampleSentence: 'I responded to priority client emails before lunch.',
  },
  lunch: {
    translationPt: 'Almoço',
    definitionEn: 'A meal eaten in the middle of the day.',
    exampleSentence: 'We had a healthy lunch with fresh salad and grilled chicken.',
  },
  workout: {
    translationPt: 'Treino / Exercício físico',
    definitionEn: 'A session of vigorous physical exercise or training.',
    exampleSentence: 'A 45-minute workout keeps both body and mind sharp.',
  },
  treadmill: {
    translationPt: 'Esteira ergométrica',
    definitionEn: 'An exercise machine on which one walks or runs while remaining in one place.',
    exampleSentence: 'She completed a brisk 20-minute run on the treadmill.',
  },
  stretch: {
    translationPt: 'Alongar-se / Alongamento',
    definitionEn: 'To straighten or extend one\'s body or limbs to improve flexibility.',
    exampleSentence: 'It feels great to stretch after a long day at the desk.',
  },
  relax: {
    translationPt: 'Relaxar / Descansar',
    definitionEn: 'To rest from work or engage in an enjoyable peaceful activity.',
    exampleSentence: 'In the evening, I relax by reading a book with soothing music.',
  },
  unwind: {
    translationPt: 'Descontrair / Desacelerar',
    definitionEn: 'To relax after a period of work or tension.',
    exampleSentence: 'Drinking chamomile tea helps me unwind before bed.',
  },
  journal: {
    translationPt: 'Diário de reflexão / Anotações',
    definitionEn: 'A daily record of personal experiences, thoughts, and reflections.',
    exampleSentence: 'Writing in my English journal locks in my daily vocabulary.',
  },
  progress: {
    translationPt: 'Progresso / Evolução contínua',
    definitionEn: 'Forward or onward movement toward a goal or higher proficiency.',
    exampleSentence: 'Every small daily routine action creates immense speaking progress.',
  },
  today: {
    translationPt: 'Hoje / No dia de hoje',
    definitionEn: 'The present day, or this current 24-hour period.',
    exampleSentence: 'We need to finish our priority client tasks today before leaving.',
  },
  tomorrow: {
    translationPt: 'Amanhã / No dia seguinte',
    definitionEn: 'The day that comes immediately after today.',
    exampleSentence: 'Let us reschedule our project review for tomorrow morning.',
  },
  project: {
    translationPt: 'Projeto / Trabalho estruturado',
    definitionEn: 'A collaborative effort or set of tasks planned to achieve a goal.',
    exampleSentence: 'Our team completed the software project ahead of the deadline.',
  },
  piece: {
    translationPt: 'Peça / Parte / Documento',
    definitionEn: 'A distinct portion, document, or element of a larger whole.',
    exampleSentence: 'Writing the executive summary is the final piece of the proposal.',
  },
  task: {
    translationPt: 'Tarefa / Atividade a cumprir',
    definitionEn: 'A specific piece of work to be done or undertaken.',
    exampleSentence: 'I focus on one challenging task at a time to stay productive.',
  },
  coffee: {
    translationPt: 'Café',
    definitionEn: 'A hot aromatic beverage brewed from roasted coffee beans.',
    exampleSentence: 'I enjoy a warm cup of coffee while reviewing my morning schedule.',
  },
};

export function generateWeeklyHomework(
  routinesByDay: Record<DayOfWeek, RoutineItem[]>,
  userProfile?: UserProfile,
  studentEmail?: string,
  studentName?: string,
  customWords?: Array<{ word: string; translationPt?: string; definitionEn?: string; exampleSentence?: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>,
  studentLevel?: string
): WeeklyHomeworkData {
  const email = studentEmail || userProfile?.email || '';
  const name = studentName || userProfile?.name || (email ? email.split('@')[0] : 'Student');
  const rawLvl = (studentLevel || userProfile?.level || 'iniciante').toLowerCase();

  const isAdv = rawLvl.includes('avanc') || rawLvl.includes('advan') || rawLvl.includes('c1') || rawLvl.includes('c2');
  const isInter = !isAdv && (rawLvl.includes('intermed') || rawLvl.includes('b1') || rawLvl.includes('b2'));
  const levelLabel = isAdv ? 'Advanced' : isInter ? 'Intermediate' : 'Beginner';

  // 1. Gather all words typed across the entire week and words saved by native friends
  const rawWords: HomeworkVocabItem[] = [];
  const seenWords = new Set<string>();

  // Prioritize words saved in personal dictionary by native friends or student
  if (Array.isArray(customWords)) {
    customWords.forEach((cw) => {
      const trimmed = (cw?.word || '').trim();
      if (trimmed && !seenWords.has(trimmed.toLowerCase())) {
        seenWords.add(trimmed.toLowerCase());
        rawWords.push({
          word: trimmed,
          sourceActivityName: cw.sourceActivityName || 'Live Session',
          sourceDay: cw.sourceDay || 'monday',
          definitionEn: cw.definitionEn || `Active vocabulary practiced during your native friend conversation.`,
          translationPt: cw.translationPt || '',
          exampleSentence: cw.exampleSentence || `I use "${trimmed}" naturally in my daily conversations.`,
        });
      }
    });
  }

  const days: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  for (const d of days) {
    const items = routinesByDay[d] || [];
    for (const item of items) {
      if (item.learnedWords && Array.isArray(item.learnedWords)) {
        for (const w of item.learnedWords) {
          const trimmed = (w || '').trim();
          if (trimmed && !seenWords.has(trimmed.toLowerCase())) {
            seenWords.add(trimmed.toLowerCase());
            const lower = trimmed.toLowerCase();
            const dictMatch = ROUTINE_VOCAB_DICT[lower];

            const translationPt = dictMatch
              ? dictMatch.translationPt
              : '';

            const definitionEn = dictMatch
              ? dictMatch.definitionEn
              : `Core active vocabulary applied during your daily ${getActivityDisplayName(item.activityName, 'en')} routine.`;

            const exampleSentence = dictMatch
              ? dictMatch.exampleSentence
              : `I practice using "${trimmed}" naturally in my daily routine conversation.`;

            rawWords.push({
              word: trimmed,
              sourceActivityName: item.activityName,
              sourceDay: d,
              definitionEn,
              translationPt,
              exampleSentence,
            });
          }
        }
      }
    }
  }

  // REGRA DE OURO ANTI-GENÉRICO: Se não houver palavras cadastradas, retorna aviso estruturado
  if (rawWords.length === 0) {
    return {
      id: `hw-week-${Date.now()}`,
      weekLabel: `Semana de ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`,
      studentEmail: email,
      studentName: name,
      studentLevel: levelLabel,
      createdAt: new Date().toISOString(),
      totalWordsCollected: 0,
      vocabularyList: [],
      allRoutineWords: [],
      matchingPairs: [],
      fillInBlanks: [],
      sentenceWritingPrompts: [],
      readingPassage: {
        title: 'Aguardando Vocabulário da Semana',
        text: '',
        questions: [],
      },
      isEmpty: true,
      emptyWarning:
        'Nenhum vocabulário cadastrado nesta semana ainda. Para gerar sua Atividade de Memorização inteligente, adicione palavras nas suas rotinas diárias ou participe de uma aula ao vivo com seu Amigo Nativo para que ele anote novos termos no seu vocabulário.',
      emptyWarningEn:
        'No vocabulary registered for this week yet. To generate your AI Memorization Activity, add words in your daily routines or attend a live lesson with your Native Friend so they can note new terms in your vocabulary.',
      isCompleted: false,
      score: 0,
    };
  }

  // 2. Build Matching Pairs (Part 1 - Associação): Embaralha apenas a ordem para criar o desafio
  const matchingPairs: MatchingPair[] = [...rawWords]
    .sort(() => 0.5 - Math.random())
    .map((item, idx) => ({
      id: `match-${idx}-${item.word}`,
      word: item.word,
      definition: item.definitionEn,
      translation: item.translationPt,
    }));

  // 3. Build Fill-in-the-Blanks (Part 2 - Lacunas): Calibrado por nível
  const fillInBlanks: FillInBlankItem[] = rawWords.slice(0, 6).map((item, idx) => {
    const wordRegex = new RegExp(`\\b${item.word}\\b`, 'i');
    let sentenceWithBlank = '';

    const fallbackTemplates = [
      `During our morning team check-in, we made sure to prioritize the ______ to keep work on track.`,
      `I dedicated thirty minutes this morning to focus entirely on our new ______.`,
      `Please send me a quick update regarding the ______ as soon as you have a moment.`,
      `Having a clear perspective on each ______ makes daily communication much smoother.`,
      `She shared helpful insights about the ______ during our afternoon discussion.`,
      `We agreed to review the key details of the ______ before finalizing the decision.`,
    ];

    if (item.exampleSentence && wordRegex.test(item.exampleSentence)) {
      sentenceWithBlank = item.exampleSentence.replace(wordRegex, '______');
    } else {
      sentenceWithBlank = fallbackTemplates[idx % fallbackTemplates.length];
    }

    const otherWords = rawWords
      .filter((rw) => rw.word.toLowerCase() !== item.word.toLowerCase())
      .map((rw) => rw.word);

    const distractors = otherWords.slice(0, 3);
    const backupTerms = ['schedule', 'routine', 'practice', 'session'];
    let bIdx = 0;
    while (distractors.length < 3) {
      const candidate = backupTerms[bIdx++ % backupTerms.length];
      if (!distractors.includes(candidate) && candidate !== item.word.toLowerCase()) {
        distractors.push(candidate);
      }
    }

    const options = [item.word, ...distractors].sort(() => 0.5 - Math.random());

    return {
      id: `fill-${idx}-${item.word}`,
      sentenceWithBlank,
      correctWord: item.word,
      options,
      hintPt: `Dica: Refere-se a "${item.translationPt}".`,
      hintEn: `Hint: Focus on the sentence context to identify "${item.word}".`,
      explanationPt: `A palavra "${item.word}" (${item.translationPt}) é a única que se encaixa gramatical e contextualmente nesta oração.`,
      explanationEn: `"${item.word}" is the only option that accurately completes the meaning and grammar of this sentence.`,
    };
  });

  // 4. Build Sentence Writing Prompts (Part 3 - Construção de Frases Ativas): Calibrado por nível
  const sentenceWritingPrompts: SentenceWritingPrompt[] = rawWords.slice(0, 5).map((item) => {
    if (isAdv) {
      return {
        word: item.word,
        hint: `Craft an advanced English sentence with "${item.word}" demonstrating complex sentence structure in your professional or personal life.`,
        hintEn: `Craft an advanced English sentence with "${item.word}" demonstrating complex sentence structure in your professional or personal life.`,
        hintPt: `Crie uma frase em inglês avançado usando "${item.word}" (${item.translationPt}) com estrutura elaborada e vocabulário refinado.`,
        levelInstruction: 'Use complex clauses, conditionals, or executive phrasing.',
      };
    }
    if (isInter) {
      return {
        word: item.word,
        hint: `Write a compound sentence using "${item.word}" connecting two actions or reasons in your routine.`,
        hintEn: `Write a compound sentence using "${item.word}" connecting two actions or reasons in your routine.`,
        hintPt: `Escreva uma frase intermediária usando "${item.word}" (${item.translationPt}) conectando duas ações com conectivos como "because" ou "although".`,
        levelInstruction: 'Connect two ideas using a transition word.',
      };
    }
    return {
      word: item.word,
      hint: `Write a simple, clear English sentence using "${item.word}" in your daily routine.`,
      hintEn: `Write a simple, clear English sentence using "${item.word}" in your daily routine.`,
      hintPt: `Escreva uma frase simples e direta em inglês usando "${item.word}" (${item.translationPt}) sobre a sua rotina.`,
      levelInstruction: 'Use a clear Subject + Verb + Object structure.',
    };
  });

  // 5. Build Reading Passage & Comprehension (Part 4 - Texto Integrado): Calibrado por nível
  const highlightedWordsStr = rawWords.slice(0, 5).map((w) => `**${w.word}**`).join(', ');
  const passageTitle = `Living Your Routine in English (${levelLabel})`;
  const passageText = isAdv
    ? `Mastering English naturally requires intertwining communication directly with your daily responsibilities. This week, our practical linguistic targets included ${highlightedWordsStr}.\n\nBy consistently operationalizing terms such as ${rawWords
        .slice(0, 3)
        .map((w) => `**${w.word}**`)
        .join(' and ')} across multifaceted situations, fluid speech transitions from a conscious exertion into an automatic reflex. Relentless everyday application transforms routine moments into sustainable communicative excellence.`
    : isInter
    ? `Building authentic English fluency happens when you connect language directly to your real life. This week, we focused on key concepts including ${highlightedWordsStr}.\n\nBy practicing terms like ${rawWords
        .slice(0, 3)
        .map((w) => `**${w.word}**`)
        .join(' and ')} in everyday situations, speaking becomes a natural daily habit instead of memorizing abstract lists. Daily consistency and real-world application turn simple routine steps into permanent language progress.`
    : `Learning English every day makes speaking natural and easy. This week, we focused on words like ${highlightedWordsStr}.\n\nWhen we use **${rawWords[0]?.word || 'practice'}** in our morning and daily routine, we remember it easily. Keep practicing a little bit every day to speak with confidence!`;

  const w0 = rawWords[0] || { word: 'practice', translationPt: 'prática', definitionEn: 'regular activity' };
  const w1 = rawWords[1] || rawWords[0] || { word: 'routine', translationPt: 'rotina', definitionEn: 'daily schedule' };
  const w2 = rawWords[2] || rawWords[0] || { word: 'confidence', translationPt: 'confiança', definitionEn: 'feeling of assurance' };

  const readingQuestions: ReadingQuestion[] = [
    {
      id: 'q-1',
      question: `In the passage, how is the vocabulary word "${w0.word}" (${w0.translationPt}) applied in the daily routine?`,
      options: [
        `It is integrated into daily actions to make English practice an authentic and consistent habit.`,
        `It is strictly memorized in isolation without any connection to real life.`,
        `It is completely avoided because it takes too much time in the morning.`,
        `It replaces the need to practice speaking with native tutors.`,
      ],
      correctAnswer: 0,
      explanation: `In the text, "${w0.word}" (${w0.translationPt}) is actively practiced within daily moments, turning language into an authentic habit.`,
    },
    {
      id: 'q-2',
      question: `According to the story, what does practicing "${w1.word}" (${w1.translationPt}) help the learner achieve?`,
      options: [
        `Sustainable progress and confidence through consistency with real-world vocabulary.`,
        `Memorizing entire dictionary pages without understanding their meaning.`,
        `Stopping all practice until weekend study marathons.`,
        `Eliminating the need to listen to audio or converse in English.`,
      ],
      correctAnswer: 0,
      explanation: `Using "${w1.word}" (${w1.translationPt}) in real scenarios turns routine actions into lasting English confidence and automatic fluency.`,
    },
  ];

  if (rawWords.length >= 3) {
    readingQuestions.push({
      id: 'q-3',
      question: `How does applying "${w2.word}" (${w2.translationPt}) alongside "${w0.word}" reinforce language retention in the text?`,
      options: [
        `It turns conscious vocabulary recall into an automatic communication reflex.`,
        `It forces the student to study grammar books for five continuous hours.`,
        `It shows that vocabulary should only be reviewed once every few months.`,
        `It creates unnecessary stress in the student's daily schedule.`,
      ],
      correctAnswer: 0,
      explanation: `Connecting target words like "${w2.word}" and "${w0.word}" directly in daily contexts solidifies long-term memorization and natural reflex.`,
    });
  }

  return {
    id: `hw-week-${Date.now()}`,
    weekLabel: `Semana de ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`,
    studentEmail: email,
    studentName: name,
    studentLevel: levelLabel,
    createdAt: new Date().toISOString(),
    totalWordsCollected: rawWords.length,
    vocabularyList: rawWords,
    allRoutineWords: rawWords,
    matchingPairs,
    fillInBlanks,
    sentenceWritingPrompts,
    readingPassage: {
      title: passageTitle,
      text: passageText,
      questions: readingQuestions,
    },
    isEmpty: false,
    isCompleted: false,
    score: 0,
  };
}

export function generateWeeklyHomeworkFromRoutines(params: {
  routinesByDay: Record<DayOfWeek, RoutineItem[]>;
  studentName?: string;
  studentLevel?: string;
  customWords?: Array<{ word: string; translationPt?: string; definitionEn?: string; exampleSentence?: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>;
}): WeeklyHomeworkData {
  return generateWeeklyHomework(
    params.routinesByDay,
    undefined,
    undefined,
    params.studentName,
    params.customWords,
    params.studentLevel
  );
}

/**
 * Async generator that triggers the server-side Gemini AI engine
 * to generate the 4 stages using real weekly vocabulary.
 */
export async function generateWeeklyHomeworkWithAi(params: {
  routinesByDay: Record<DayOfWeek, RoutineItem[]>;
  studentName?: string;
  studentLevel?: string;
  studentEmail?: string;
  customWords?: Array<{
    word: string;
    translationPt?: string;
    definitionEn?: string;
    exampleSentence?: string;
    sourceActivityName?: string;
    sourceDay?: DayOfWeek;
  }>;
}): Promise<WeeklyHomeworkData> {
  const localBaseline = generateWeeklyHomeworkFromRoutines(params);

  // If there are no words, return the empty structured notice immediately without calling AI
  if (localBaseline.isEmpty || localBaseline.totalWordsCollected === 0) {
    return localBaseline;
  }

  try {
    // Simple direct payload: array of words and student level
    const cleanWordList = Array.from(
      new Set(
        localBaseline.vocabularyList
          .map((item) => item.word.trim())
          .filter((w) => Boolean(w))
      )
    );

    const response = await fetch('/api/homework/generate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        words: cleanWordList,
        studentLevel: params.studentLevel || 'Intermediate',
        studentName: params.studentName || 'Student',
        studentEmail: params.studentEmail || '',
        weekLabel: localBaseline.weekLabel,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.homework && Array.isArray(data.homework.matchingPairs) && data.homework.matchingPairs.length > 0) {
        return {
          ...data.homework,
          studentLevel: data.homework.studentLevel || localBaseline.studentLevel,
        };
      }
      if (data.isEmpty) {
        return {
          ...localBaseline,
          isEmpty: true,
          emptyWarning: data.emptyWarning || localBaseline.emptyWarning,
        };
      }
    }
  } catch {
    // Non-blocking fallback to high-fidelity structured pedagogical generator
  }

  return localBaseline;
}

