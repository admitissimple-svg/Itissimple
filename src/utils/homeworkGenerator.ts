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
};

export function generateWeeklyHomework(
  routinesByDay: Record<DayOfWeek, RoutineItem[]>,
  userProfile?: UserProfile,
  studentEmail?: string,
  studentName?: string,
  customWords?: Array<{ word: string; translationPt?: string; definitionEn?: string; exampleSentence?: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>
): WeeklyHomeworkData {
  const email = studentEmail || userProfile?.email || '';
  const name = studentName || userProfile?.name || (email ? email.split('@')[0] : 'Student');

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
          translationPt: cw.translationPt || `Vocabulário anotado pelo Amigo Nativo (${trimmed})`,
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
              : `Expressão / Palavra chave (${getActivityDisplayName(item.activityName, 'pt')})`;

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

  // If no words typed yet, supply rich baseline words based on standard routine
  if (rawWords.length === 0) {
    const defaultBaseline: Array<{ w: string; tr: string; def: string; ex: string; act: string }> = [
      { w: 'breakfast', tr: 'Café da manhã', def: 'The first meal of the day, typically eaten in the morning.', ex: 'I enjoy a healthy breakfast every morning.', act: 'Café da manhã' },
      { w: 'coffee', tr: 'Café quente', def: 'A hot brewed drink made from roasted coffee beans.', ex: 'Brewing fresh coffee gives me great morning energy.', act: 'Café da manhã' },
      { w: 'commute', tr: 'Deslocamento / Trajeto diário', def: 'Travel some distance regularly between home and place of work.', ex: 'My daily morning commute takes twenty minutes.', act: 'Deslocamento' },
      { w: 'routine', tr: 'Rotina diária', def: 'A sequence of actions regularly followed.', ex: 'Sticking to a positive routine builds fluency and confidence.', act: 'Rotina' },
      { w: 'focus', tr: 'Foco / Concentração', def: 'The center of interest, attention, or deep activity.', ex: 'I keep deep focus on my daily English goals.', act: 'Trabalho' },
      { w: 'schedule', tr: 'Cronograma / Agenda', def: 'A plan that gives a list of tasks and expected times.', ex: 'Checking my schedule keeps my week organized.', act: 'Planejamento' },
      { w: 'conversation', tr: 'Conversação real', def: 'An informal talk between people in natural English.', ex: 'Live conversation practice improves everyday fluency.', act: 'Live Lesson' },
      { w: 'progress', tr: 'Progresso / Evolução', def: 'Forward or onward movement toward your goals.', ex: 'Every small routine step brings noticeable progress.', act: 'Estudos' },
    ];

    defaultBaseline.forEach((item, idx) => {
      rawWords.push({
        word: item.w,
        translationPt: item.tr,
        definitionEn: item.def,
        exampleSentence: item.ex,
        sourceActivityName: item.act,
        sourceDay: days[idx % days.length],
      });
    });
  }

  // 2. Build Matching Pairs (Part 1)
  const matchingPairs: MatchingPair[] = rawWords.slice(0, 6).map((item, idx) => ({
    id: `match-${idx}-${item.word}`,
    word: item.word,
    definition: item.definitionEn,
    translation: item.translationPt,
  }));

  // 3. Build Fill-in-the-Blanks (Part 2)
  const fillInBlanks: FillInBlankItem[] = rawWords.slice(0, 5).map((item, idx) => {
    const distractors = rawWords
      .filter((rw) => rw.word.toLowerCase() !== item.word.toLowerCase())
      .map((rw) => rw.word)
      .slice(0, 3);

    while (distractors.length < 3) {
      distractors.push(['morning', 'water', 'practice', 'reading'][distractors.length]);
    }

    const options = [item.word, ...distractors].sort(() => 0.5 - Math.random());

    return {
      id: `fill-${idx}-${item.word}`,
      sentenceWithBlank: `During my daily routine, I always make time for my ____________ because it helps my English fluency.`,
      correctWord: item.word,
      options,
      hintPt: `Dica: Refere-se a "${item.translationPt}".`,
    };
  });

  // 4. Build Sentence Writing Prompts (Part 3)
  const sentenceWritingPrompts: SentenceWritingPrompt[] = rawWords.slice(0, 4).map((item) => ({
    word: item.word,
    hint: `Write a natural sentence in English connecting "${item.word}" with your everyday habits.`,
  }));

  // 5. Build Reading Passage & Comprehension (Part 4)
  const sampleWordsStr = rawWords.slice(0, 4).map((w) => w.word).join(', ');
  const passageTitle = "Living Your Routine in English";
  const passageText = `Every morning starts with a fresh mindset. When you wake up, having your breakfast and practicing key words like ${sampleWordsStr} creates a natural bridge to fluency.\n\nBy immersing your actual schedule in English, learning becomes an effortless part of your life rather than a chore. Consistency every single day turns simple actions into permanent progress.`;

  const readingQuestions: ReadingQuestion[] = [
    {
      id: 'q-1',
      question: 'What is the main advantage of connecting English learning to your daily routine?',
      options: [
        'It makes English practice a natural and consistent habit in your life.',
        'It requires studying grammar books for 5 hours without sleeping.',
        'It eliminates the need to speak with native teachers.',
        'It only works if you travel abroad immediately.',
      ],
      correctAnswer: 0,
      explanation: 'Learning through your daily routine turns practice into a seamless, natural daily habit.',
    },
    {
      id: 'q-2',
      question: 'According to the passage, what leads to permanent progress in English?',
      options: [
        'Daily consistency with simple actions and vocabulary.',
        'Memorizing a dictionary in one night.',
        'Skipping daily practice until the weekend.',
        'Only watching movies without subtitles.',
      ],
      correctAnswer: 0,
      explanation: 'Consistency every day turns simple actions into solid, lasting progress.',
    },
  ];

  return {
    id: `hw-week-${Date.now()}`,
    weekLabel: `Semana de ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`,
    studentEmail: email,
    studentName: name,
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
    params.customWords
  );
}

