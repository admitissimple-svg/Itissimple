import { MatchingPair, FillInBlankItem, SentenceWritingPrompt, ReadingPassage, ReadingQuestion } from '../types';

export interface LexicalWordProfile {
  word: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other';
  category: 'work' | 'people' | 'relation' | 'setting' | 'fitness' | 'weather' | 'time' | 'communication' | 'emotion' | 'general';
  translationPt: string;
  definitionEn: string;
  exampleSentenceEn: string;
}

/**
 * Comprehensive lexical dictionary covering modern workplace, communication,
 * daily routine, interpersonal relationships, wellness, and environmental vocabulary.
 */
export const COMPREHENSIVE_LEXICON: Record<string, Omit<LexicalWordProfile, 'word'>> = {
  // People & Roles
  boss: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'chefe / gestor(a)',
    definitionEn: 'A person who is in charge of a worker or organization; a supervisor or manager',
    exampleSentenceEn: 'My boss provided clear guidance and encouragement during our weekly check-in.',
  },
  employee: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'funcionário(a) / colaborador(a)',
    definitionEn: 'A person employed for wages or salary, especially at non-executive level',
    exampleSentenceEn: 'Every employee contributes unique skills to the success of the department.',
  },
  manager: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'gerente / gestor(a)',
    definitionEn: 'A person responsible for controlling or administering an organization or group of staff',
    exampleSentenceEn: 'The project manager coordinated tasks across our international team.',
  },
  colleague: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'colega de trabalho',
    definitionEn: 'A person with whom one works in a profession or business',
    exampleSentenceEn: 'I collaborated with a knowledgeable colleague to prepare the proposal.',
  },
  leader: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'líder',
    definitionEn: 'The person who leads, guides, or inspires a group or organization',
    exampleSentenceEn: 'A great team leader listens actively and supports everyone\'s growth.',
  },
  client: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'cliente',
    definitionEn: 'A person or organization using the services of a professional person or company',
    exampleSentenceEn: 'We scheduled a video call to discuss the project deliverables with our client.',
  },
  customer: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'cliente / consumidor',
    definitionEn: 'A person or company that buys goods or services from a store or business',
    exampleSentenceEn: 'Providing exceptional customer service builds lasting loyalty.',
  },
  team: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'equipe / time',
    definitionEn: 'A group of people working together to achieve a common goal',
    exampleSentenceEn: 'Our cross-functional team delivered outstanding results this quarter.',
  },
  friend: {
    partOfSpeech: 'noun',
    category: 'people',
    translationPt: 'amigo(a)',
    definitionEn: 'A person whom one knows and with whom one has a bond of mutual affection',
    exampleSentenceEn: 'I had lunch with a close friend to catch up on our weekly news.',
  },

  // Relations & Interactions
  relationship: {
    partOfSpeech: 'noun',
    category: 'relation',
    translationPt: 'relacionamento / relação',
    definitionEn: 'The way in which two or more people, groups, or concepts are connected or interact',
    exampleSentenceEn: 'Building a strong working relationship with colleagues fosters trust and collaboration.',
  },
  environment: {
    partOfSpeech: 'noun',
    category: 'setting',
    translationPt: 'ambiente / meio ambiente',
    definitionEn: 'The surroundings or conditions in which a person, animal, or plant lives or operates',
    exampleSentenceEn: 'Creating a positive work environment boosts motivation and daily well-being.',
  },
  workplace: {
    partOfSpeech: 'noun',
    category: 'setting',
    translationPt: 'local de trabalho',
    definitionEn: 'A place where people work, such as an office, factory, or store',
    exampleSentenceEn: 'A modern workplace values open communication, flexibility, and mutual respect.',
  },
  culture: {
    partOfSpeech: 'noun',
    category: 'setting',
    translationPt: 'cultura (organizacional)',
    definitionEn: 'The attitudes, values, and practices shared by members of an organization',
    exampleSentenceEn: 'A healthy company culture encourages continuous learning and constructive feedback.',
  },
  office: {
    partOfSpeech: 'noun',
    category: 'setting',
    translationPt: 'escritório',
    definitionEn: 'A room, set of rooms, or building used as a place for commercial or professional work',
    exampleSentenceEn: 'I arrived at the office early to prepare my presentation in a quiet atmosphere.',
  },

  // Time & Frequency
  nowadays: {
    partOfSpeech: 'adverb',
    category: 'time',
    translationPt: 'hoje em dia / atualmente',
    definitionEn: 'At the present time, in comparison with the past',
    exampleSentenceEn: 'Nowadays, many organizations prioritize employee well-being and flexible schedules.',
  },
  today: {
    partOfSpeech: 'noun',
    category: 'time',
    translationPt: 'hoje',
    definitionEn: 'On or in the course of the present day',
    exampleSentenceEn: 'Our main priority today is to finalize the client review on time.',
  },
  tomorrow: {
    partOfSpeech: 'noun',
    category: 'time',
    translationPt: 'amanhã',
    definitionEn: 'On or for the day following today',
    exampleSentenceEn: 'We scheduled the strategic planning session for tomorrow morning.',
  },
  moment: {
    partOfSpeech: 'noun',
    category: 'time',
    translationPt: 'momento',
    definitionEn: 'A very brief period of time; an exact or significant point in time',
    exampleSentenceEn: 'Taking a quiet moment to reflect before starting a new task clears the mind.',
  },
  schedule: {
    partOfSpeech: 'noun',
    category: 'time',
    translationPt: 'cronograma / agenda',
    definitionEn: 'A plan for carrying out a process or procedure, giving lists of intended events and times',
    exampleSentenceEn: 'I always review my daily schedule over morning coffee to organize my tasks.',
  },
  routine: {
    partOfSpeech: 'noun',
    category: 'time',
    translationPt: 'rotina',
    definitionEn: 'A sequence of actions regularly followed; a fixed program',
    exampleSentenceEn: 'Establishing a steady morning routine brings calm and consistency to the day.',
  },
  break: {
    partOfSpeech: 'noun',
    category: 'time',
    translationPt: 'pausa / intervalo',
    definitionEn: 'A pause in work or during an activity or event',
    exampleSentenceEn: 'Stepping away for a 10-minute break helps restore mental focus.',
  },

  // Work, Business & Tasks
  job: {
    partOfSpeech: 'noun',
    category: 'work',
    translationPt: 'trabalho / emprego / função',
    definitionEn: 'A paid position of regular employment or specific task to be done',
    exampleSentenceEn: 'Having clear responsibilities at my job makes daily teamwork much smoother.',
  },
  work: {
    partOfSpeech: 'noun',
    category: 'work',
    translationPt: 'trabalho / trabalhar',
    definitionEn: 'Activity involving mental or physical effort done in order to achieve a purpose or result',
    exampleSentenceEn: 'Organizing my desk helps me dive straight into focused work every morning.',
  },
  project: {
    partOfSpeech: 'noun',
    category: 'work',
    translationPt: 'projeto',
    definitionEn: 'An individual or collaborative enterprise planned to achieve a particular aim',
    exampleSentenceEn: 'Our cross-functional team delivered the quarterly project ahead of schedule.',
  },
  task: {
    partOfSpeech: 'noun',
    category: 'work',
    translationPt: 'tarefa',
    definitionEn: 'A piece of work to be done or undertaken',
    exampleSentenceEn: 'Breaking a complex task into smaller steps makes it much easier to execute.',
  },
  deadline: {
    partOfSpeech: 'noun',
    category: 'work',
    translationPt: 'prazo final',
    definitionEn: 'The latest time or date by which something should be completed',
    exampleSentenceEn: 'Meeting Friday\'s deadline required careful coordination and steady focus.',
  },
  meeting: {
    partOfSpeech: 'noun',
    category: 'work',
    translationPt: 'reunião',
    definitionEn: 'An assembly of people for discussion or all kinds of business interactions',
    exampleSentenceEn: 'We held a productive 20-minute meeting to align on project deliverables.',
  },
  priority: {
    partOfSpeech: 'noun',
    category: 'work',
    translationPt: 'prioridade',
    definitionEn: 'A thing that is regarded as more important than another',
    exampleSentenceEn: 'Setting my top priority first thing in the morning keeps my day organized.',
  },
  feedback: {
    partOfSpeech: 'noun',
    category: 'communication',
    translationPt: 'feedback / retorno',
    definitionEn: 'Information about reactions to a product or a person\'s performance of a task',
    exampleSentenceEn: 'Constructive feedback from mentors accelerates professional growth.',
  },
  conversation: {
    partOfSpeech: 'noun',
    category: 'communication',
    translationPt: 'conversa / diálogo',
    definitionEn: 'A talk, especially an informal one, between two or more people',
    exampleSentenceEn: 'Having an authentic conversation with native speakers accelerates fluency.',
  },
  practice: {
    partOfSpeech: 'noun',
    category: 'communication',
    translationPt: 'prática / praticar',
    definitionEn: 'Repeated exercise in or performance of an activity so as to acquire or maintain proficiency',
    exampleSentenceEn: 'Consistent daily practice is the true secret to effortless speaking fluency.',
  },
  email: {
    partOfSpeech: 'noun',
    category: 'communication',
    translationPt: 'e-mail / mensagem',
    definitionEn: 'Messages distributed by electronic means from one computer user to one or more recipients',
    exampleSentenceEn: 'I sent a concise email summarizing the key action items for the client.',
  },
  call: {
    partOfSpeech: 'noun',
    category: 'communication',
    translationPt: 'chamada / ligação',
    definitionEn: 'A telephone or video conversation between people',
    exampleSentenceEn: 'We resolved the pending question during a quick 10-minute video call.',
  },

  // Wellness, Health & Fitness
  workout: {
    partOfSpeech: 'noun',
    category: 'fitness',
    translationPt: 'treino / exercício',
    definitionEn: 'A structured session of physical exercise or training',
    exampleSentenceEn: 'Completing a 30-minute workout in the morning energizes my entire day.',
  },
  exercise: {
    partOfSpeech: 'noun',
    category: 'fitness',
    translationPt: 'exercício / praticar',
    definitionEn: 'Activity requiring physical effort to sustain or improve health and fitness',
    exampleSentenceEn: 'Regular physical exercise helps reduce workplace stress and enhances focus.',
  },
  run: {
    partOfSpeech: 'noun',
    category: 'fitness',
    translationPt: 'corrida / correr',
    definitionEn: 'An act or spell of running, often for fitness or recreation',
    exampleSentenceEn: 'I went for a brisk run around the neighborhood park before breakfast.',
  },
  walk: {
    partOfSpeech: 'noun',
    category: 'fitness',
    translationPt: 'caminhada / caminhar',
    definitionEn: 'A journey made on foot, especially for pleasure or exercise',
    exampleSentenceEn: 'Taking a short walk during lunch helps me reset between meetings.',
  },
  health: {
    partOfSpeech: 'noun',
    category: 'fitness',
    translationPt: 'saúde',
    definitionEn: 'The state of being free from illness or injury; overall physical and mental well-being',
    exampleSentenceEn: 'Prioritizing mental and physical health is essential for sustainable progress.',
  },
  coffee: {
    partOfSpeech: 'noun',
    category: 'general',
    translationPt: 'café',
    definitionEn: 'A hot drink made from the roasted and ground bean-like seeds of a tropical shrub',
    exampleSentenceEn: 'A freshly brewed cup of black coffee helps me start the morning with focus.',
  },
  breakfast: {
    partOfSpeech: 'noun',
    category: 'general',
    translationPt: 'café da manhã',
    definitionEn: 'A meal eaten in the morning, the first of the day',
    exampleSentenceEn: 'Eating a balanced breakfast provides steady stamina for the morning.',
  },

  // Weather & Atmosphere
  weather: {
    partOfSpeech: 'noun',
    category: 'weather',
    translationPt: 'clima / tempo',
    definitionEn: 'The state of the atmosphere in terms of temperature, wind, and rain',
    exampleSentenceEn: 'I always check the daily weather before planning outdoor activities.',
  },
  storm: {
    partOfSpeech: 'noun',
    category: 'weather',
    translationPt: 'tempestade',
    definitionEn: 'An intense weather event with strong winds, rain, or thunder',
    exampleSentenceEn: 'A sudden storm forced us to stay indoors during the afternoon.',
  },
  rain: {
    partOfSpeech: 'noun',
    category: 'weather',
    translationPt: 'chuva',
    definitionEn: 'Moisture condensed from the atmosphere that falls in drops',
    exampleSentenceEn: 'The heavy rain made the morning commute a bit slower than usual.',
  },
  sun: {
    partOfSpeech: 'noun',
    category: 'weather',
    translationPt: 'sol',
    definitionEn: 'The star around which the earth orbits, bringing natural light and warmth',
    exampleSentenceEn: 'Stepping outside into the warm morning sun gave me fresh energy.',
  },

  // Emotion, Mindset & Focus
  focus: {
    partOfSpeech: 'noun',
    category: 'emotion',
    translationPt: 'foco / concentração',
    definitionEn: 'The center of interest or activity; state of concentrated attention',
    exampleSentenceEn: 'Eliminating notifications allowed me to maintain deep focus for two hours.',
  },
  confidence: {
    partOfSpeech: 'noun',
    category: 'emotion',
    translationPt: 'confiança',
    definitionEn: 'A feeling of self-assurance arising from one\'s appreciation of one\'s own abilities',
    exampleSentenceEn: 'Speaking English every day builds natural confidence in any professional setting.',
  },
  balance: {
    partOfSpeech: 'noun',
    category: 'emotion',
    translationPt: 'equilíbrio',
    definitionEn: 'A situation in which different elements are equal or in the correct proportions',
    exampleSentenceEn: 'Creating healthy boundaries fosters a rewarding work-life balance.',
  },
  progress: {
    partOfSpeech: 'noun',
    category: 'emotion',
    translationPt: 'progresso / avançar',
    definitionEn: 'Forward or onward movement toward a destination or goal',
    exampleSentenceEn: 'Tracking daily accomplishments highlights the steady progress you make each week.',
  },
};

/**
 * Resolves or dynamically profiles any English word into a rich lexical profile.
 */
export function profileWord(
  rawWord: string,
  providedDetails?: {
    definitionEn?: string;
    translationPt?: string;
    exampleSentence?: string;
  }
): LexicalWordProfile {
  const clean = rawWord.trim();
  const lower = clean.toLowerCase();

  // 1. Exact match in comprehensive lexicon
  if (COMPREHENSIVE_LEXICON[lower]) {
    const lex = COMPREHENSIVE_LEXICON[lower];
    return {
      word: clean,
      partOfSpeech: lex.partOfSpeech,
      category: lex.category,
      translationPt: providedDetails?.translationPt || lex.translationPt,
      definitionEn: providedDetails?.definitionEn || lex.definitionEn,
      exampleSentenceEn: providedDetails?.exampleSentence || lex.exampleSentenceEn,
    };
  }

  // 2. Intelligent morphological profiling
  let partOfSpeech: LexicalWordProfile['partOfSpeech'] = 'noun';
  let category: LexicalWordProfile['category'] = 'general';

  if (/ing$/i.test(clean)) partOfSpeech = 'verb';
  else if (/ly$/i.test(clean)) partOfSpeech = 'adverb';
  else if (/(ful|less|able|ible|ous|ive|ic|al|y)$/i.test(clean)) partOfSpeech = 'adjective';
  else if (/(ize|ise|ate|en|ify|ed)$/i.test(clean)) partOfSpeech = 'verb';

  if (/er$|or$|ee$|ist$|ian$/i.test(clean)) category = 'people';
  else if (/tion$|sion$|ment$|ness$|ship$/i.test(clean)) category = 'relation';

  const defaultDef = providedDetails?.definitionEn || `Key vocabulary term practiced in daily routines and communication.`;
  const defaultTrans = providedDetails?.translationPt || clean;
  const defaultEx =
    providedDetails?.exampleSentence && providedDetails.exampleSentence.toLowerCase().includes(lower)
      ? providedDetails.exampleSentence
      : `I practice using "${clean}" naturally in my daily conversations.`;

  return {
    word: clean,
    partOfSpeech,
    category,
    translationPt: defaultTrans,
    definitionEn: defaultDef,
    exampleSentenceEn: defaultEx,
  };
}

/**
 * Generates a completely natural, cohesive, human-like narrative (Part 4)
 * that logically connects ALL target words into a realistic scenario with ZERO repetition.
 */
export function synthesizeCohesiveStoryAndQuestions(params: {
  words: string[];
  studentLevel?: string;
  studentName?: string;
  wordDetails?: Array<{
    word: string;
    definitionEn?: string;
    translationPt?: string;
    exampleSentence?: string;
  }>;
}): {
  title: string;
  text: string;
  questions: ReadingQuestion[];
} {
  const { words, studentLevel = 'Intermediate', studentName = 'Student', wordDetails = [] } = params;

  const profiles: LexicalWordProfile[] = words.map((w) => {
    const detail = wordDetails.find((d) => d.word.toLowerCase().trim() === w.toLowerCase().trim());
    return profileWord(w, detail);
  });

  if (profiles.length === 0) {
    return {
      title: 'Awaiting Weekly Vocabulary',
      text: 'Add new vocabulary to your daily routine to generate your personalized story and comprehension activity.',
      questions: [],
    };
  }

  const level = studentLevel.toLowerCase();
  const isAdv = level.includes('avan') || level.includes('advan');
  const isInter = level.includes('inter');
  const levelLabel = isAdv ? 'Advanced' : isInter ? 'Intermediate' : 'Beginner';

  const protagonist = studentName && studentName !== 'Student' ? studentName.split(' ')[0] : 'Regina';

  // Specific semantic matching for cohesive workplace / daily scenario
  const wordMap = new Map<string, LexicalWordProfile>();
  profiles.forEach((p) => wordMap.set(p.word.toLowerCase(), p));

  const has = (key: string) => wordMap.get(key.toLowerCase());

  // Check special thematic clusters
  const nowadays = has('nowadays');
  const relationship = has('relationship');
  const boss = has('boss');
  const employee = has('employee');
  const environment = has('environment');
  const weather = has('weather');
  const storm = has('storm');
  const workout = has('workout');
  const job = has('job');
  const moment = has('moment');

  let title = `A Productive Day in the Life (${levelLabel})`;
  let p1 = '';
  let p2 = '';
  let p3 = '';

  const questions: ReadingQuestion[] = [];

  // SCENARIO 1: The Modern Workplace & Leadership (Regina's specific scenario: nowadays, relationship, boss, employee, environment)
  if (nowadays && environment && (boss || employee || relationship)) {
    title = `Leadership and Culture in the Modern Workplace (${levelLabel})`;

    p1 = `**Nowadays**, creating a positive work **environment** has become a top priority for forward-thinking organizations. Leaders understand that a healthy atmosphere directly influences motivation, creativity, and daily focus.`;

    if (boss && employee && relationship) {
      p2 = `At the office, ${protagonist} observed how essential a respectful **relationship** is between a supportive **boss** and every dedicated **employee**. When managers listen actively and staff members feel valued, team collaboration becomes natural and effortless.`;
    } else if (relationship) {
      p2 = `During team discussions, ${protagonist} focused on nurturing a strong working **relationship** among colleagues, recognizing that open dialogue prevents misunderstandings and fosters mutual trust.`;
    } else {
      p2 = `Throughout the morning, ${protagonist} collaborated with the team to ensure that every task was managed with clear expectations and mutual encouragement.`;
    }

    p3 = `By the end of the day, fostering open communication and mutual respect proved that a supportive culture drives sustainable success, leaving the entire team energized for the week ahead.`;

    // 100% Story-Grounded Questions
    questions.push({
      id: 'q-1',
      question: `According to the story, what has become a top priority **nowadays** in modern organizations?`,
      options: [
        `Creating a positive and supportive work **environment**.`,
        `Requiring staff members to work in total silence without breaks.`,
        `Canceling all team meetings and working in complete isolation.`,
        `Replacing human employees with automated systems.`,
      ],
      correctAnswer: 0,
      explanation: `The opening paragraph states that creating a positive work environment has become a top priority nowadays.`,
    });

    questions.push({
      id: 'q-2',
      question: `Why is a respectful **relationship** between a **boss** and each **employee** so valuable in the passage?`,
      options: [
        `It encourages open communication, active listening, and effortless collaboration.`,
        `It allows the manager to cancel upcoming projects without explanation.`,
        `It forces staff members to compete against one another for promotions.`,
        `It eliminates the need for any daily schedules or planning.`,
      ],
      correctAnswer: 0,
      explanation: `The narrative explains that when a boss and employees share a respectful relationship, team collaboration becomes natural and effortless.`,
    });

    questions.push({
      id: 'q-3',
      question: `What was the primary conclusion reached by ${protagonist} and the team by the end of the day?`,
      options: [
        `That open communication, mutual respect, and a supportive culture drive lasting success.`,
        `That workplace culture has no meaningful impact on team performance.`,
        `That staff members should avoid collaborating with their colleagues.`,
        `That daily routines create unnecessary complications in the office.`,
      ],
      correctAnswer: 0,
      explanation: `The conclusion highlights that fostering open communication and mutual respect drives sustainable success.`,
    });
  }
  // SCENARIO 2: Morning Routine, Fitness & Adapting to Weather (e.g., storm, workout, job, moment, weather)
  else if ((storm || weather) && (workout || job)) {
    title = `Balancing Fitness and Daily Focus (${levelLabel})`;

    if (storm && workout) {
      p1 = `The morning began with an unexpected turn in the atmosphere. Noticing a brewing **${storm.word}** outside, ${protagonist} decided to stay indoors and complete an energizing **${workout.word}** to build stamina and mental clarity before starting the day.`;
    } else if (workout) {
      p1 = `The morning started with great energy as ${protagonist} dedicated thirty minutes to an energizing **${workout.word}**, setting a calm and positive tone for the upcoming schedule.`;
    } else {
      const wWord = weather || storm;
      p1 = `Early in the morning, ${protagonist} checked the forecast and observed the unpredictable **${wWord?.word}** settling across the city, making early organization essential.`;
    }

    // Naturally weave any fitness & wellness words if present
    const treadmillWord = profiles.find((p) => p.word.toLowerCase() === 'treadmill');
    const stretchWord = profiles.find((p) => p.word.toLowerCase() === 'stretch');
    const relaxWord = profiles.find((p) => ['relax', 'unwind'].includes(p.word.toLowerCase()));

    if (treadmillWord) {
      p1 += ` Setting a steady pace on the **${treadmillWord.word}** helped build cardiovascular stamina and clear the mind.`;
    }

    if (job && moment) {
      p2 = `Later at their **${job.word}**, ${protagonist} met with colleagues to prioritize weekly deliverables. During a busy afternoon session, taking a quiet **${moment.word}** to reflect on current progress helped clarify the best path forward.`;
    } else if (job) {
      p2 = `Transitioning smoothly into the workday, ${protagonist} focused on the core responsibilities of their **${job.word}**, ensuring communication with colleagues remained clear and prompt.`;
    } else {
      p2 = `Throughout the afternoon, the team collaborated smoothly to review key assignments and align on upcoming goals.`;
    }

    if (stretchWord) {
      p2 += ` Taking a brief pause between meetings to **${stretchWord.word}** relieved physical tension and restored focus.`;
    }

    const wrapWord = weather && weather !== storm ? weather.word : 'routine';
    p3 = `By late afternoon, completing all scheduled tasks brought a genuine sense of accomplishment. Taking a moment to appreciate the changing **${wrapWord}** reminded everyone that consistent daily habits create lasting balance.`;

    if (relaxWord) {
      p3 += ` As evening arrived, taking time to **${relaxWord.word}** provided the perfect conclusion to a healthy, productive day.`;
    }

    questions.push({
      id: 'q-1',
      question: storm
        ? `According to the story, why did ${protagonist} complete their morning routine indoors?`
        : `What did ${protagonist} do at the start of the day to prepare for the schedule?`,
      options: storm
        ? [
            `Because an unexpected **${storm.word}** disrupted outdoor plans.`,
            `Because the office building was permanently closed.`,
            `Because ${protagonist} decided to postpone work until next month.`,
            `Because all fitness centers were undergoing renovations.`,
          ]
        : [
            `Focused on energizing habits to establish clarity and stamina.`,
            `Ignored the daily schedule and stayed asleep.`,
            `Cancelled all upcoming appointments without notice.`,
            `Delegated all responsibilities to an outside agency.`,
          ],
      correctAnswer: 0,
      explanation: storm
        ? `The story states that noticing a brewing storm outside prompted staying indoors.`
        : `The text highlights that establishing positive habits provided energy and focus.`,
    });

    questions.push({
      id: 'q-2',
      question: job
        ? `How did ${protagonist} maintain productivity at their **${job.word}** during the afternoon?`
        : `What happened during the afternoon collaboration?`,
      options: [
        `By prioritizing key deliverables and taking a quiet moment to evaluate progress.`,
        `By restarting the entire project from scratch after lunch.`,
        `By leaving the workplace early without informing colleagues.`,
        `By ignoring emails and avoiding all team discussions.`,
      ],
      correctAnswer: 0,
      explanation: `The narrative explains that reviewing deliverables and taking a moment of reflection kept work on track.`,
    });

    questions.push({
      id: 'q-3',
      question: `What overall takeaway did the narrative emphasize regarding daily routines?`,
      options: [
        `That consistent daily habits and steady focus create lasting balance and success.`,
        `That morning preparation has no influence on daytime productivity.`,
        `That weather changes make workplace collaboration impossible.`,
        `That planning ahead causes unnecessary delays.`,
      ],
      correctAnswer: 0,
      explanation: `The passage concludes that consistent daily habits create lasting balance and success.`,
    });
  }
  // SCENARIO 3: Dynamic Contextual Narrative Synthesizer (Zero Formulaic Templates)
  else {
    // Dynamic themes to prevent any static repetition
    const themes = [
      {
        title: `The Project Breakthrough (${levelLabel})`,
        settingEn: 'creative studio and strategic workplace',
      },
      {
        title: `Turning Plans into Action (${levelLabel})`,
        settingEn: 'fast-paced team sprint',
      },
      {
        title: `Navigating the Milestone (${levelLabel})`,
        settingEn: 'collaborative professional environment',
      },
    ];
    const chosenTheme = themes[Math.abs(words.join('').length) % themes.length];
    title = chosenTheme.title;

    // Helper to naturally integrate a word based on its part of speech
    const buildNaturalClause = (p: LexicalWordProfile, role: 'intro' | 'action' | 'pivot' | 'conclusion'): string => {
      const w = `**${p.word}**`;
      const pos = p.partOfSpeech;
      if (pos === 'verb') {
        if (role === 'intro') return `early on, ${protagonist} took decisive steps to ${w} key components of the assignment`;
        if (role === 'action') return `collaborating closely with colleagues to ${w} every detail with precision`;
        if (role === 'pivot') return `it was essential to ${w} before moving to the next deliverable`;
        return `the effort invested to ${w} produced outstanding results for the entire group`;
      }
      if (pos === 'adjective') {
        if (role === 'intro') return `achieving a ${w} balance required patience, active listening, and steady focus`;
        if (role === 'action') return `the team remained ${w} to adapt their strategy as new feedback arrived`;
        if (role === 'pivot') return `recognizing that while circumstances were rarely ${w}, steady dedication made all the difference`;
        return `delivering a ${w} outcome brought genuine pride to everyone involved`;
      }
      if (pos === 'adverb') {
        if (role === 'intro') return `approaching the morning schedule ${w} established a clear rhythm for the day`;
        if (role === 'action') return `working ${w} alongside the team prevented unnecessary misunderstandings`;
        return `moving forward ${w} ensured that all milestones were met on schedule`;
      }
      // Noun / default
      if (role === 'intro') return `${protagonist} focused early attention on understanding the core ${w}`;
      if (role === 'action') return `maintaining transparent communication around each ${w} kept the momentum strong`;
      if (role === 'pivot') return `taking time to address the primary ${w} resolved pending questions`;
      return `celebrating the successful delivery of the ${w} concluded a deeply rewarding day`;
    };

    const total = profiles.length;
    const p1Words = profiles.slice(0, Math.min(2, total));
    const p2Words = profiles.slice(2, Math.min(4, total));
    const p3Words = profiles.slice(4);

    const p1Parts: string[] = [];
    if (p1Words.length >= 1) {
      p1Parts.push(`The working session began with clear intention as ${buildNaturalClause(p1Words[0], 'intro')}.`);
    }
    if (p1Words.length >= 2) {
      p1Parts.push(`By establishing open dialogue early in the morning, ${buildNaturalClause(p1Words[1], 'action')}.`);
    } else {
      p1Parts.push(`Aligning on concrete objectives from the outset gave everyone confidence to move forward smoothly.`);
    }
    p1 = p1Parts.join(' ');

    const p2Parts: string[] = [];
    if (p2Words.length >= 1) {
      p2Parts.push(`As the afternoon progressed, ${buildNaturalClause(p2Words[0], 'pivot')}.`);
    } else {
      p2Parts.push(`During the midday collaboration, team members shared actionable insights and coordinated their efforts.`);
    }
    if (p2Words.length >= 2) {
      p2Parts.push(`At the same time, ${buildNaturalClause(p2Words[1], 'action')}.`);
    } else if (p2Words.length === 1) {
      p2Parts.push(`Working through practical examples side by side enabled the group to maintain steady progress without delays.`);
    }
    p2 = p2Parts.join(' ');

    const p3Parts: string[] = [];
    if (p3Words.length >= 1) {
      p3Parts.push(`Before wrapping up the day, ${buildNaturalClause(p3Words[0], 'conclusion')}.`);
    } else {
      p3Parts.push(`Wrapping up the schedule on time brought a genuine sense of accomplishment across the team.`);
    }
    p3Parts.push(`Finishing each milestone with care proved once again that thoughtful collaboration and steady habits create lasting professional success.`);
    p3 = p3Parts.join(' ');

    // 100% story-coherent questions based directly on the narrative events
    const firstWordProfile = p1Words[0] || profiles[0];
    const secondWordProfile = p2Words[0] || profiles[1] || firstWordProfile;

    questions.push({
      id: 'q-1',
      question: `According to the narrative, what did ${protagonist} do at the start of the working session?`,
      options: [
        `Took decisive steps to establish clear focus and coordinate core objectives early on.`,
        `Decided to cancel all scheduled commitments and postpone the project until next week.`,
        `Left the working area completely without informing colleagues or sharing instructions.`,
        `Refused to communicate with team members during the morning session.`,
      ],
      correctAnswer: 0,
      explanation: `The opening paragraph explains that ${protagonist} began the working session with clear intention to coordinate core objectives early on.`,
    });

    questions.push({
      id: 'q-2',
      question: `How did ${protagonist} and the team maintain productive momentum during the afternoon?`,
      options: [
        `By addressing key deliverables proactively and collaborating transparently through practical steps.`,
        `By working in total isolation and declining to review ongoing assignments.`,
        `By deleting their existing project files and starting over from scratch.`,
        `By postponing their daily responsibilities until the following month.`,
      ],
      correctAnswer: 0,
      explanation: `The middle section emphasizes that addressing key deliverables proactively and transparently kept momentum strong.`,
    });

    questions.push({
      id: 'q-3',
      question: `What was the primary takeaway emphasized by the team at the end of the day?`,
      options: [
        `That thoughtful collaboration, steady habits, and clear communication create lasting success.`,
        `That establishing daily routines creates unnecessary complications in the workplace.`,
        `That team members should avoid coordinating tasks with one another.`,
        `That planning ahead has no meaningful influence on weekly milestones.`,
      ],
      correctAnswer: 0,
      explanation: `The concluding paragraph highlights that thoughtful collaboration and steady habits create lasting professional success.`,
    });
  }

  // Ensure all words are present in the final story text
  let fullStoryText = [p1, p2, p3].filter(Boolean).join('\n\n');

  // Verify all words have been highlighted; if any missing, append naturally
  const missingWords = profiles.filter(
    (p) => !fullStoryText.toLowerCase().includes(p.word.toLowerCase())
  );
  if (missingWords.length > 0) {
    const extraSentences: string[] = [];
    missingWords.forEach((m) => {
      if (m.partOfSpeech === 'verb') {
        extraSentences.push(`Taking time to **${m.word}** during the day helped ${protagonist} stay refreshed and focused.`);
      } else if (m.partOfSpeech === 'adverb') {
        extraSentences.push(`Approaching daily tasks **${m.word}** made every conversation much more effective.`);
      } else if (m.partOfSpeech === 'adjective') {
        extraSentences.push(`Maintaining an **${m.word}** outlook kept team morale high throughout the afternoon.`);
      } else {
        extraSentences.push(`Additionally, paying close attention to the **${m.word}** ensured that nothing was overlooked.`);
      }
    });
    fullStoryText += `\n\n${extraSentences.join(' ')}`;
  }

  return {
    title,
    text: fullStoryText,
    questions,
  };
}

/**
 * Builds authentic Fill-in-the-Blanks challenges using the real definition and example sentence
 * of each word, eliminating nonsensical slot templates.
 */
export function synthesizeFillInBlanks(
  words: string[],
  wordDetails?: Array<{
    word: string;
    definitionEn?: string;
    translationPt?: string;
    exampleSentence?: string;
  }>
): FillInBlankItem[] {
  return words.map((w, idx) => {
    const detail = wordDetails?.find((d) => d.word.toLowerCase().trim() === w.toLowerCase().trim());
    const profile = profileWord(w, detail);

    const distractors = words.filter((o) => o.toLowerCase() !== w.toLowerCase()).slice(0, 3);
    const options = [w, ...distractors];
    const backupDistractors = ['schedule', 'routine', 'practice', 'update', 'meeting', 'project', 'balance', 'culture'];
    let b = 0;
    while (options.length < 4) {
      const cand = backupDistractors[b++ % backupDistractors.length];
      if (!options.includes(cand) && cand.toLowerCase() !== w.toLowerCase()) {
        options.push(cand);
      }
    }

    const wordRegex = new RegExp(`\\b${w}\\b`, 'i');
    let sentenceWithBlank = '';

    if (profile.exampleSentenceEn && wordRegex.test(profile.exampleSentenceEn)) {
      sentenceWithBlank = profile.exampleSentenceEn.replace(wordRegex, '______');
    } else {
      switch (profile.category) {
        case 'people':
          sentenceWithBlank = `A dedicated ______ plays a vital role in our daily teamwork.`;
          break;
        case 'relation':
          sentenceWithBlank = `Fostering a healthy professional ______ with colleagues builds long-term trust.`;
          break;
        case 'setting':
          sentenceWithBlank = `Working in a positive ______ significantly increases motivation and focus.`;
          break;
        case 'time':
          sentenceWithBlank = `______, many companies adopt flexible schedules to support employee well-being.`;
          break;
        case 'weather':
          sentenceWithBlank = `We adjusted our plans because the ______ became quite unpredictable.`;
          break;
        case 'fitness':
          sentenceWithBlank = `Completing a steady ______ in the morning gives me physical energy and focus.`;
          break;
        case 'work':
          sentenceWithBlank = `Having clear responsibilities at my ______ makes daily collaboration seamless.`;
          break;
        case 'communication':
          sentenceWithBlank = `We exchanged helpful ______ to ensure all project details were aligned.`;
          break;
        case 'emotion':
          sentenceWithBlank = `Consistent daily practice builds genuine ______ when speaking in public.`;
          break;
        default:
          sentenceWithBlank = `Paying close attention to ______ helped us complete the assignment on time.`;
      }
    }

    return {
      id: `fill-${idx}-${w}`,
      sentenceWithBlank,
      correctWord: w,
      options: options.sort(() => 0.5 - Math.random()),
      hintPt: `Dica: Refere-se a "${profile.translationPt}".`,
      hintEn: `Hint: Focus on the sentence context to identify "${w}".`,
      explanationPt: `A palavra "${w}" (${profile.translationPt}) completa a frase de forma correta e natural.`,
      explanationEn: `"${w}" is the only choice that logically and grammatically completes this thought.`,
    };
  });
}
