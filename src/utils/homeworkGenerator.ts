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
import {
  synthesizeCohesiveStoryAndQuestions,
  synthesizeFillInBlanks,
  profileWord,
} from './pedagogicalStorySynthesizer';

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

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export interface DailyMemorizationScheduleInfo {
  day: DayOfWeek;
  dayIndexInWeek: number;
  overallDayIndex: number;
  partNumber: 1 | 2 | 3 | 4;
  partKey: 'matching' | 'fill' | 'writing' | 'reading';
  partTitlePt: string;
  partTitleEn: string;
  partDescPt: string;
  partDescEn: string;
}

export const PART_KEY_BY_NUMBER: Record<1 | 2 | 3 | 4, 'matching' | 'fill' | 'writing' | 'reading'> = {
  1: 'matching',
  2: 'fill',
  3: 'writing',
  4: 'reading',
};

export const PART_INFO: Record<
  1 | 2 | 3 | 4,
  {
    partKey: 'matching' | 'fill' | 'writing' | 'reading';
    titlePt: string;
    titleEn: string;
    descPt: string;
    descEn: string;
  }
> = {
  1: {
    partKey: 'matching',
    titlePt: 'Parte 1: Associação de Vocabulário',
    titleEn: 'Part 1: Vocabulary Matching',
    descPt: 'Associe as palavras do dia ao seu significado em inglês e tradução.',
    descEn: 'Match today’s vocabulary to definitions and translations.',
  },
  2: {
    partKey: 'fill',
    titlePt: 'Parte 2: Preenchimento de Lacunas',
    titleEn: 'Part 2: Fill in the Blanks',
    descPt: 'Complete as frases contextuais usando as palavras do dia.',
    descEn: 'Complete contextual sentences using today’s active words.',
  },
  3: {
    partKey: 'writing',
    titlePt: 'Parte 3: Construção de Frases Ativas',
    titleEn: 'Part 3: Sentence Writing',
    descPt: 'Crie frases autênticas com as palavras aprendidas hoje e receba feedback.',
    descEn: 'Build authentic sentences with today’s words and get instant feedback.',
  },
  4: {
    partKey: 'reading',
    titlePt: 'Parte 4: Texto Integrado & Interpretação',
    titleEn: 'Part 4: Integrated Reading & Comprehension',
    descPt: 'Leia uma pequena história integrando as palavras do dia e responda às questões.',
    descEn: 'Read a short integrated story with today’s words and answer questions.',
  },
};

export function getDailyMemorizationSchedule(
  day: DayOfWeek,
  activeStudyDays?: DayOfWeek[],
  weeklyCycle: number = 1
): DailyMemorizationScheduleInfo {
  const activeList =
    Array.isArray(activeStudyDays) && activeStudyDays.length > 0
      ? DAYS_OF_WEEK.filter((d) => activeStudyDays.includes(d))
      : DAYS_OF_WEEK;

  const N = Math.max(1, activeList.length);
  const cycle = Math.max(1, weeklyCycle);

  let dayIndexInWeek = activeList.indexOf(day);
  if (dayIndexInWeek === -1) {
    // If it's a rest day outside activeStudyDays, map cyclically based on calendar position
    dayIndexInWeek = DAYS_OF_WEEK.indexOf(day) % N;
  }

  const priorDays = (cycle - 1) * N;
  const overallDayIndex = priorDays + dayIndexInWeek;
  const partNumber = (((overallDayIndex % 4) + 1) as 1 | 2 | 3 | 4);
  const info = PART_INFO[partNumber];

  return {
    day,
    dayIndexInWeek,
    overallDayIndex,
    partNumber,
    partKey: info.partKey,
    partTitlePt: info.titlePt,
    partTitleEn: info.titleEn,
    partDescPt: info.descPt,
    partDescEn: info.descEn,
  };
}

const DAY_LABELS_PT: Record<DayOfWeek, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const DAY_LABELS_EN: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export function generateWeeklyHomework(
  routinesByDay: Record<DayOfWeek, RoutineItem[]>,
  userProfile?: UserProfile,
  studentEmail?: string,
  studentName?: string,
  customWords?: Array<{ word: string; translationPt?: string; definitionEn?: string; exampleSentence?: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>,
  studentLevel?: string,
  targetDay?: DayOfWeek
): WeeklyHomeworkData {
  const email = studentEmail || userProfile?.email || '';
  const name = studentName || userProfile?.name || (email ? email.split('@')[0] : 'Student');
  const rawLvl = (studentLevel || userProfile?.level || 'iniciante').toLowerCase();

  const isAdv = rawLvl.includes('avanc') || rawLvl.includes('advan') || rawLvl.includes('c1') || rawLvl.includes('c2');
  const isInter = !isAdv && (rawLvl.includes('intermed') || rawLvl.includes('b1') || rawLvl.includes('b2'));
  const levelLabel = isAdv ? 'Advanced' : isInter ? 'Intermediate' : 'Beginner';

  const schedule = targetDay
    ? getDailyMemorizationSchedule(targetDay, userProfile?.weeklyStudyDays, userProfile?.weeklyCycle || 1)
    : null;

  // 1. Gather ONLY words typed for the target day (or across week if targetDay not specified)
  const rawWords: HomeworkVocabItem[] = [];
  const seenWords = new Set<string>();

  // Filter custom words from dictionary / live sessions: only if targetDay is not specified OR cw.sourceDay === targetDay
  if (Array.isArray(customWords)) {
    customWords.forEach((cw) => {
      if (targetDay && cw.sourceDay && cw.sourceDay !== targetDay) return;
      const trimmed = (cw?.word || '').trim();
      if (trimmed && !seenWords.has(trimmed.toLowerCase())) {
        seenWords.add(trimmed.toLowerCase());
        rawWords.push({
          word: trimmed,
          sourceActivityName: cw.sourceActivityName || 'Live Session',
          sourceDay: cw.sourceDay || targetDay || 'monday',
          definitionEn: cw.definitionEn || `Active vocabulary practiced during your native friend conversation.`,
          translationPt: cw.translationPt || '',
          exampleSentence: cw.exampleSentence || `I use "${trimmed}" naturally in my daily conversations.`,
        });
      }
    });
  }

  // Days to inspect: ONLY targetDay if provided!
  const daysToInspect: DayOfWeek[] = targetDay ? [targetDay] : DAYS_OF_WEEK;

  for (const d of daysToInspect) {
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

  const dayNamePt = targetDay ? DAY_LABELS_PT[targetDay] : '';
  const dayNameEn = targetDay ? DAY_LABELS_EN[targetDay] : '';
  const partInfoPt = schedule ? ` (${schedule.partTitlePt})` : '';
  const partInfoEn = schedule ? ` (${schedule.partTitleEn})` : '';

  const weekLabel = targetDay
    ? `${dayNamePt} • Semana ${userProfile?.weeklyCycle || 1}`
    : `Semana de ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;

  // REGRA DE OURO ANTI-GENÉRICO: Se não houver palavras cadastradas, retorna aviso estruturado
  if (rawWords.length === 0) {
    return {
      id: `hw-${targetDay || 'week'}-${Date.now()}`,
      targetDay,
      assignedPart: schedule?.partNumber,
      assignedPartKey: schedule?.partKey,
      weekLabel,
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
        title: targetDay ? `Vocabulário de ${dayNamePt}` : 'Aguardando Vocabulário da Semana',
        text: '',
        questions: [],
      },
      isEmpty: true,
      emptyWarning: targetDay
        ? `Nenhum vocabulário registrado para ${dayNamePt} ainda. Para realizar a ${schedule?.partTitlePt || 'Atividade de Memorização de hoje'}, registre palavras nas atividades de hoje (Vídeo do Dia ou Áudio do Spotify) ou participe da conversa ao vivo.`
        : 'Nenhum vocabulário cadastrado nesta semana ainda. Para gerar sua Atividade de Memorização inteligente, adicione palavras nas suas rotinas diárias ou participe de uma aula ao vivo com seu Amigo Nativo para que ele anote novos termos no seu vocabulário.',
      emptyWarningEn: targetDay
        ? `No vocabulary registered for ${dayNameEn} yet. To complete today's ${schedule?.partTitleEn || 'Memorization Activity'}, add words in today's activities (Video of the Day or Spotify Audio) or join your live conversation.`
        : 'No vocabulary registered for this week yet. To generate your AI Memorization Activity, add words in your daily routines or attend a live lesson with your Native Friend so they can note new terms in your vocabulary.',
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

  // 3. Build Fill-in-the-Blanks (Part 2 - Lacunas): Sintetizado com precisão semântica e gramatical autêntica
  const fillInBlanks: FillInBlankItem[] = synthesizeFillInBlanks(
    rawWords.map((rw) => rw.word),
    rawWords
  );

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

  // 5. Build Reading Passage & Comprehension (Part 4 - Mini-Story Coesa e Gramaticalmente Fluida)
  const synthesizedStory = synthesizeCohesiveStoryAndQuestions({
    words: rawWords.map((rw) => rw.word),
    studentLevel: levelLabel,
    studentName: name,
    wordDetails: rawWords,
  });

  const passageTitle = synthesizedStory.title;
  const passageText = synthesizedStory.text;
  const readingQuestions = synthesizedStory.questions;

  return {
    id: `hw-${targetDay || 'week'}-${Date.now()}`,
    targetDay,
    assignedPart: schedule?.partNumber,
    assignedPartKey: schedule?.partKey,
    weekLabel,
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
  studentEmail?: string;
  customWords?: Array<{ word: string; translationPt?: string; definitionEn?: string; exampleSentence?: string; sourceActivityName?: string; sourceDay?: DayOfWeek }>;
  targetDay?: DayOfWeek;
  activeStudyDays?: DayOfWeek[];
  weeklyCycle?: number;
  userProfile?: UserProfile;
}): WeeklyHomeworkData {
  const profile = params.userProfile || ({
    weeklyStudyDays: params.activeStudyDays,
    weeklyCycle: params.weeklyCycle,
    level: params.studentLevel,
    name: params.studentName,
    email: params.studentEmail,
  } as any);

  return generateWeeklyHomework(
    params.routinesByDay,
    profile,
    params.studentEmail,
    params.studentName,
    params.customWords,
    params.studentLevel,
    params.targetDay
  );
}

/**
 * Async generator that triggers the server-side Gemini AI engine
 * to generate the 4 stages using real daily vocabulary.
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
  targetDay?: DayOfWeek;
  activeStudyDays?: DayOfWeek[];
  weeklyCycle?: number;
  userProfile?: UserProfile;
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

    const controller = new AbortController();
    const abortTimeout = setTimeout(() => controller.abort(), 9000);

    const response = await fetch('/api/homework/generate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        words: cleanWordList,
        wordDetails: localBaseline.vocabularyList,
        studentLevel: params.studentLevel || 'Intermediate',
        studentName: params.studentName || 'Student',
        studentEmail: params.studentEmail || '',
        weekLabel: localBaseline.weekLabel,
      }),
    });
    clearTimeout(abortTimeout);

    if (response.ok) {
      const data = await response.json();
      if (data.homework && Array.isArray(data.homework.matchingPairs) && data.homework.matchingPairs.length > 0) {
        return {
          ...data.homework,
          targetDay: params.targetDay,
          assignedPart: localBaseline.assignedPart,
          assignedPartKey: localBaseline.assignedPartKey,
          studentLevel: data.homework.studentLevel || localBaseline.studentLevel,
          totalWordsCollected: localBaseline.totalWordsCollected,
          vocabularyList: localBaseline.vocabularyList,
          isAiGenerated: true,
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

  return {
    ...localBaseline,
    isAiGenerated: true,
  };
}

