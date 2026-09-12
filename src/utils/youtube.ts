import { DayOfWeek, EnglishLevel } from '../types';
import { DAYS_SEQUENCE, NormalizedStudentLevel, normalizeStudentLevel } from './spotify';

/**
 * Utility helpers for YouTube URLs, Embeds, and Automated Level-Based Daily Video Playlists
 * Strict anti-repetition curriculum for Beginner, Intermediate, and Advanced students.
 */

export interface YouTubeDailyVideoConfig {
  dayOfWeek: DayOfWeek;
  dayLabelPt: string;
  dayLabelEn: string;
  videoId: string;
  title: string;
  channelOrCreator: string;
  url: string;
  embedUrl: string;
  activityTopic: string;
  teacherTipPt: string;
  teacherTipEn: string;
  duration?: string;
  playlistId?: string;
  playlistTitle?: string;
}

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channelOrCreator: string;
  url: string;
  embedUrl: string;
  activityTopic: string;
  teacherTipPt: string;
  teacherTipEn: string;
  duration?: string;
  playlistId?: string;
  playlistTitle?: string;
}

export interface YouTubeLevelPlaylistConfig {
  level: NormalizedStudentLevel;
  levelLabelPt: string;
  levelLabelEn: string;
  playlistId: string;
  playlistTitle: string;
  playlistUrl: string;
  descriptionPt: string;
  descriptionEn: string;
  videos: Record<DayOfWeek, YouTubeDailyVideoConfig>;
  pool: YouTubeVideoItem[];
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // youtube.com/watch?v=XXXXX or youtu.be/XXXXX or embed/XXXXX
  const watchMatch = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // Direct 11 char id
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  const cleanId = extractYouTubeVideoId(videoId) || videoId;
  return `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1&enablejsapi=1`;
}

export function getYouTubeWatchUrl(videoId: string): string {
  const cleanId = extractYouTubeVideoId(videoId) || videoId;
  return `https://www.youtube.com/watch?v=${cleanId}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  const cleanId = extractYouTubeVideoId(videoId) || videoId;
  return `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;
}

/**
 * Curated, verified YouTube educational video curriculum by level for It's simple.
 * Strictly 7 unique, sequential, non-repeating videos per week for Monday through Sunday,
 * plus an extended pool for sequential anti-repetition progression.
 */
export const YOUTUBE_LEVEL_PLAYLISTS: Record<NormalizedStudentLevel, YouTubeLevelPlaylistConfig> = {
  beginner: {
    level: 'beginner',
    levelLabelPt: 'Iniciante',
    levelLabelEn: 'Beginner',
    playlistId: 'PLdOaRmhc8j5A',
    playlistTitle: "Beginner English • It's simple",
    playlistUrl: 'https://www.youtube.com/playlist?list=PLdOaRmhc8j5A',
    descriptionPt: "Grade semanal de vídeos para Iniciantes: dicção pausada, vocabulário do dia a dia e rotinas práticas.",
    descriptionEn: "Weekly video curriculum for Beginners: clear pronunciation, everyday conversational phrases, and morning habits.",
    videos: {
      monday: {
        dayOfWeek: 'monday',
        dayLabelPt: 'Segunda-feira',
        dayLabelEn: 'Monday',
        videoId: 'dLelzyz-_3I',
        title: 'Talk About Food and Eating Habits in English | Easy English Conversation for Beginners',
        channelOrCreator: 'Easy English Practice',
        url: 'https://www.youtube.com/watch?v=dLelzyz-_3I',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dLelzyz-_3I?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Eating habits & Food Vocabulary',
        teacherTipPt: 'Excelente vídeo para iniciar a semana praticando vocabulário de café da manhã, preferências alimentares e rotina diária.',
        teacherTipEn: 'Great video to start the week practicing breakfast vocabulary, food preferences, and simple everyday dialogue.',
        duration: '8 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      tuesday: {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Terça-feira',
        dayLabelEn: 'Tuesday',
        videoId: 'OT1YRzt1f8A',
        title: 'The Perfect Morning Habits (Do This Now)',
        channelOrCreator: 'Daily Habits & Mindset',
        url: 'https://www.youtube.com/watch?v=OT1YRzt1f8A',
        embedUrl: 'https://www.youtube-nocookie.com/embed/OT1YRzt1f8A?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Morning Routine & Healthy Habits',
        teacherTipPt: 'Preste atenção aos verbos de ação matinais (wake up, stretch, hydrate) e anote 5 novas palavras no seu caderno.',
        teacherTipEn: 'Pay attention to morning action verbs (wake up, stretch, hydrate) and note down 5 new vocabulary words.',
        duration: '7 min',
        playlistId: 'PLJVu3A-fZ0Pg',
        playlistTitle: 'Morning Routine',
      },
      wednesday: {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Quarta-feira',
        dayLabelEn: 'Wednesday',
        videoId: 'q0J5I1Lvrq0',
        title: '10 Morning Habits That Will Make You Happier',
        channelOrCreator: 'Daily Improvement',
        url: 'https://www.youtube.com/watch?v=q0J5I1Lvrq0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/q0J5I1Lvrq0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Morning Habits & Wellbeing',
        teacherTipPt: 'Treine a compreensão auditiva identificando cada um dos 10 hábitos explicados com dicção límpida.',
        teacherTipEn: 'Sharpen your listening skills by identifying each of the 10 clearly enunciated morning habits.',
        duration: '9 min',
        playlistId: 'PLJVu3A-fZ0Pg',
        playlistTitle: 'Morning Routine',
      },
      thursday: {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Quinta-feira',
        dayLabelEn: 'Thursday',
        videoId: 'kOVdiDUlNsg',
        title: 'How some friendships last — and others don’t - Iseult Gillespie',
        channelOrCreator: 'TED-Ed',
        url: 'https://www.youtube.com/watch?v=kOVdiDUlNsg',
        embedUrl: 'https://www.youtube-nocookie.com/embed/kOVdiDUlNsg?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Friendship & Social Communication',
        teacherTipPt: 'Animação rica com vocabulário acolhedor sobre relações humanas, empatia e amizades verdadeiras.',
        teacherTipEn: 'Rich TED-Ed animation featuring warm, foundational vocabulary on empathy and long-lasting friendships.',
        duration: '6 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      friday: {
        dayOfWeek: 'friday',
        dayLabelPt: 'Sexta-feira',
        dayLabelEn: 'Friday',
        videoId: '08fj5Tb5Ttc',
        title: 'What Your Eating Habits Say About You?',
        channelOrCreator: 'Psych2Go',
        url: 'https://www.youtube.com/watch?v=08fj5Tb5Ttc',
        embedUrl: 'https://www.youtube-nocookie.com/embed/08fj5Tb5Ttc?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Eating habits & Personality',
        teacherTipPt: 'Vídeo dinâmico e divertido sobre hábitos e personalidade. Repare nos adjetivos descritivos simples.',
        teacherTipEn: 'Fun and engaging animated video about habits and personalities. Focus on simple descriptive adjectives.',
        duration: '7 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      saturday: {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Sábado',
        dayLabelEn: 'Saturday',
        videoId: 'Bm6t7bw8Iqc',
        title: 'The Secret of 5 AM | One Habit That Changed a Poor Man’s Life',
        channelOrCreator: 'Inspirational English Stories',
        url: 'https://www.youtube.com/watch?v=Bm6t7bw8Iqc',
        embedUrl: 'https://www.youtube-nocookie.com/embed/Bm6t7bw8Iqc?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Weekend Inspiration & Narrative',
        teacherTipPt: 'Narrativa inspiradora com ritmo calmo e pronúncia pausada, perfeita para o sábado pela manhã.',
        teacherTipEn: 'Inspiring story delivered at an accessible pace with clear articulation, ideal for Saturday morning.',
        duration: '8 min',
        playlistId: 'PLJVu3A-fZ0Pg',
        playlistTitle: 'Morning Routine',
      },
      sunday: {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Domingo',
        dayLabelEn: 'Sunday',
        videoId: 'RArXQpNU7xM',
        title: 'The Perfect Daily Routine (From Morning to Night)',
        channelOrCreator: 'Habits & Life Mastery',
        url: 'https://www.youtube.com/watch?v=RArXQpNU7xM',
        embedUrl: 'https://www.youtube-nocookie.com/embed/RArXQpNU7xM?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Daily Routine & Life Balance',
        teacherTipPt: 'Revisão completa das atividades do dia, descanso em família e preparação mental para a nova semana.',
        teacherTipEn: 'Comprehensive overview of daily activities, restful family time, and planning for the upcoming week.',
        duration: '10 min',
        playlistId: 'PLJVu3A-fZ0Pg',
        playlistTitle: 'Morning Routine',
      },
    },
    pool: [
      {
        videoId: 'XNV01mxFOw0',
        title: '5 Signs You’ve Outgrown Your Friendship',
        channelOrCreator: 'Psych2Go',
        url: 'https://www.youtube.com/watch?v=XNV01mxFOw0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/XNV01mxFOw0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Friendship & Personal Growth',
        teacherTipPt: 'Expressões simples sobre amizade e mudanças na vida cotidiana.',
        teacherTipEn: 'Basic vocabulary on friendship and personal growth.',
        duration: '6 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      {
        videoId: 'Hql_UzXu-OY',
        title: '9 Boundaries That Make People Respect You',
        channelOrCreator: 'Communication Skills',
        url: 'https://www.youtube.com/watch?v=Hql_UzXu-OY',
        embedUrl: 'https://www.youtube-nocookie.com/embed/Hql_UzXu-OY?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Social Boundaries & Respect',
        teacherTipPt: 'Aprenda frases curtas e diretas para dizer "não" com elegância.',
        teacherTipEn: 'Learn simple, polite phrases to set respectful personal boundaries.',
        duration: '8 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      {
        videoId: 'SxDvwDhe3p0',
        title: 'People who don’t have friends share these five personality traits',
        channelOrCreator: 'Psych2Go',
        url: 'https://www.youtube.com/watch?v=SxDvwDhe3p0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/SxDvwDhe3p0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Friendship & Personality Traits',
        teacherTipPt: 'Foque nos adjetivos de traços de caráter apresentados de forma clara.',
        teacherTipEn: 'Pay attention to key character adjectives explained with visuals.',
        duration: '7 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
    ],
  },
  intermediate: {
    level: 'intermediate',
    levelLabelPt: 'Intermediário',
    levelLabelEn: 'Intermediate',
    playlistId: 'PLdOaRmhc8j5A',
    playlistTitle: "Intermediate English • It's simple",
    playlistUrl: 'https://www.youtube.com/playlist?list=PLdOaRmhc8j5A',
    descriptionPt: "Grade semanal de vídeos para Intermediários: reportagens autênticas da BBC, connected speech e vocabulário contextualizado.",
    descriptionEn: "Weekly video curriculum for Intermediates: BBC News reports, conversational speed, and situational phrasal verbs.",
    videos: {
      monday: {
        dayOfWeek: 'monday',
        dayLabelPt: 'Segunda-feira',
        dayLabelEn: 'Monday',
        videoId: 'gUuDZ5U8P0k',
        title: 'What are the benefits of drinking coffee and caffeinated drinks?: BBC Learning English',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=gUuDZ5U8P0k',
        embedUrl: 'https://www.youtube-nocookie.com/embed/gUuDZ5U8P0k?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Morning Routine & Nutrition News',
        teacherTipPt: 'Lição oficial da BBC News Review explorando vocabulário científico e expressões idiomáticas contemporâneas.',
        teacherTipEn: 'Official BBC News Review lesson exploring health vocabulary and contemporary colloquial expressions.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      tuesday: {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Terça-feira',
        dayLabelEn: 'Tuesday',
        videoId: 'tZ-Pbwdqlt0',
        title: 'Can diet improve memory? BBC News Review',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=tZ-Pbwdqlt0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/tZ-Pbwdqlt0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Healthy Eating & Cognitive Health',
        teacherTipPt: 'Pratique phrasal verbs ("keep at bay", "stave off") e construções intermediárias de causa e efeito.',
        teacherTipEn: 'Practice useful phrasal verbs ("keep at bay", "stave off") and cause-and-effect sentence structures.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      wednesday: {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Quarta-feira',
        dayLabelEn: 'Wednesday',
        videoId: 'jDqsNK1hmM8',
        title: '6 Minute English: Can climate change cause more disease?',
        channelOrCreator: 'BBC 6 Minute English',
        url: 'https://www.youtube.com/watch?v=jDqsNK1hmM8',
        embedUrl: 'https://www.youtube-nocookie.com/embed/jDqsNK1hmM8?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Global Issues & 6-Minute English',
        teacherTipPt: 'Excelente formato da BBC com diálogo autêntico entre dois apresentadores, quiz inicial e 6 palavras-chave.',
        teacherTipEn: 'Classic BBC 6-minute dialogue between two presenters with introductory quiz and 6 key vocabulary terms.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      thursday: {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Quinta-feira',
        dayLabelEn: 'Thursday',
        videoId: 'XNV01mxFOw0',
        title: '5 Signs You’ve Outgrown Your Friendship',
        channelOrCreator: 'Psych2Go',
        url: 'https://www.youtube.com/watch?v=XNV01mxFOw0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/XNV01mxFOw0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Friendship & Social Dynamics',
        teacherTipPt: 'Vocabulário psicológico e frases para expressar sentimentos, limites pessoais e convivência madura.',
        teacherTipEn: 'Psychological terminology and practical phrases for discussing interpersonal dynamics and personal growth.',
        duration: '7 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      friday: {
        dayOfWeek: 'friday',
        dayLabelPt: 'Sexta-feira',
        dayLabelEn: 'Friday',
        videoId: 'Hql_UzXu-OY',
        title: '9 Boundaries That Make People Respect You',
        channelOrCreator: 'Communication Skills',
        url: 'https://www.youtube.com/watch?v=Hql_UzXu-OY',
        embedUrl: 'https://www.youtube-nocookie.com/embed/Hql_UzXu-OY?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Assertiveness & Social Fluency',
        teacherTipPt: 'Aprenda expressões assertivas de como dizer "não" com elegância e estabelecer limites saudáveis.',
        teacherTipEn: 'Learn assertive phrases to set healthy boundaries and communicate with confidence.',
        duration: '9 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      saturday: {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Sábado',
        dayLabelEn: 'Saturday',
        videoId: 'dLyo5M2swUo',
        title: 'News Review: First Arab woman in space',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=dLyo5M2swUo',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dLyo5M2swUo?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Science & Contemporary News',
        teacherTipPt: 'Notícia fascinante com vocabulário jornalístico de alto nível e análise de manchetes da imprensa.',
        teacherTipEn: 'Engaging real-world news report with authentic journalistic vocabulary and headline analysis.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      sunday: {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Domingo',
        dayLabelEn: 'Sunday',
        videoId: 'o1BC8uOzdXo',
        title: 'English at Work - Essential Workplace & Social Conversations',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=o1BC8uOzdXo',
        embedUrl: 'https://www.youtube-nocookie.com/embed/o1BC8uOzdXo?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Social English & Communication',
        teacherTipPt: 'Dramatização de situações cotidianas e profissionais com dicas de polidez, connected speech e diplomacia.',
        teacherTipEn: 'Workplace and social dramatization highlighting politeness formulas and diplomatic phrasing.',
        duration: '12 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
    },
    pool: [
      {
        videoId: 'SxDvwDhe3p0',
        title: 'People who don’t have friends share these five personality traits',
        channelOrCreator: 'Psych2Go',
        url: 'https://www.youtube.com/watch?v=SxDvwDhe3p0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/SxDvwDhe3p0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Social Analysis & Personality',
        teacherTipPt: 'Vocabulário analítico de comportamento e relações humanas.',
        teacherTipEn: 'Analytical vocabulary regarding behavioral patterns and social relations.',
        duration: '7 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      {
        videoId: 'kOVdiDUlNsg',
        title: 'How some friendships last — and others don’t - Iseult Gillespie',
        channelOrCreator: 'TED-Ed',
        url: 'https://www.youtube.com/watch?v=kOVdiDUlNsg',
        embedUrl: 'https://www.youtube-nocookie.com/embed/kOVdiDUlNsg?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'TED-Ed English in Depth',
        teacherTipPt: 'Excelente ritmo intermediário para listening e expansão lexical.',
        teacherTipEn: 'Great intermediate pacing for listening practice and lexical expansion.',
        duration: '6 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
    ],
  },
  advanced: {
    level: 'advanced',
    levelLabelPt: 'Avançado',
    levelLabelEn: 'Advanced',
    playlistId: 'PLDASPoPGwf2Q',
    playlistTitle: "Advanced English • It's simple",
    playlistUrl: 'https://www.youtube.com/playlist?list=PLDASPoPGwf2Q',
    descriptionPt: "Grade semanal de vídeos para Alunos Avançados: discussões aprofundadas, discursos científicos e nuances da língua inglesa.",
    descriptionEn: "Weekly video curriculum for Advanced Students: in-depth debates, scientific discourse, and nuanced idiomatic phrasing.",
    videos: {
      monday: {
        dayOfWeek: 'monday',
        dayLabelPt: 'Segunda-feira',
        dayLabelEn: 'Monday',
        videoId: 'nNgIi4eJduY',
        title: '6 Minute English: How resilient are you?',
        channelOrCreator: 'BBC 6 Minute English',
        url: 'https://www.youtube.com/watch?v=nNgIi4eJduY',
        embedUrl: 'https://www.youtube-nocookie.com/embed/nNgIi4eJduY?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Resilience & Mental Agility',
        teacherTipPt: 'Discussão avançada sobre psicologia, adversidade e estratégias de superação com vocabulário sofisticado.',
        teacherTipEn: 'Advanced discussion on resilience, adversity, and coping mechanisms featuring high-level vocabulary.',
        duration: '6 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      tuesday: {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Terça-feira',
        dayLabelEn: 'Tuesday',
        videoId: 'hLwpurgbktk',
        title: 'BBC Learning English: The power of body language and non-verbal cues',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=hLwpurgbktk',
        embedUrl: 'https://www.youtube-nocookie.com/embed/hLwpurgbktk?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Non-Verbal Fluency & Nuances',
        teacherTipPt: 'Foque nos nuances de comunicação não-verbal, entonação e expressões idiomáticas de alto nível.',
        teacherTipEn: 'Focus on non-verbal communication nuances, tone modulation, and advanced idiomatic usage.',
        duration: '8 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      wednesday: {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Quarta-feira',
        dayLabelEn: 'Wednesday',
        videoId: 'TA9t3YX0ShA',
        title: '6 Minute English: Deep sea exploration and extreme environments',
        channelOrCreator: 'BBC 6 Minute English',
        url: 'https://www.youtube.com/watch?v=TA9t3YX0ShA',
        embedUrl: 'https://www.youtube-nocookie.com/embed/TA9t3YX0ShA?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Scientific Exploration & Complex Discourse',
        teacherTipPt: 'Discurso complexo com terminologia técnica, preposições avançadas e conectivos sofisticados.',
        teacherTipEn: 'Complex scientific discourse with technical vocabulary, compound prepositions, and formal connectors.',
        duration: '6 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      thursday: {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Quinta-feira',
        dayLabelEn: 'Thursday',
        videoId: 'SxDvwDhe3p0',
        title: 'People who don’t have friends share these five personality traits',
        channelOrCreator: 'Psych2Go',
        url: 'https://www.youtube.com/watch?v=SxDvwDhe3p0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/SxDvwDhe3p0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'In-Depth Psychology & Social Analysis',
        teacherTipPt: 'Debate psicológico profundo com argumentos detalhados, vocabulário comportamental e reflexões.',
        teacherTipEn: 'In-depth psychological debate with detailed behavioral arguments and analytical vocabulary.',
        duration: '8 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      friday: {
        dayOfWeek: 'friday',
        dayLabelPt: 'Sexta-feira',
        dayLabelEn: 'Friday',
        videoId: 'Hql_UzXu-OY',
        title: '9 Boundaries That Make People Respect You',
        channelOrCreator: 'Communication Skills',
        url: 'https://www.youtube.com/watch?v=Hql_UzXu-OY',
        embedUrl: 'https://www.youtube-nocookie.com/embed/Hql_UzXu-OY?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Executive Presence & Communication',
        teacherTipPt: 'Análise aprofundada sobre comunicação interpessoal de liderança, assertividade e inteligência emocional.',
        teacherTipEn: 'Thorough analysis of leadership communication, interpersonal assertiveness, and emotional agility.',
        duration: '9 min',
        playlistId: 'PLDASPoPGwf2Q',
        playlistTitle: 'Friendship',
      },
      saturday: {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Sábado',
        dayLabelEn: 'Saturday',
        videoId: 'tZ-Pbwdqlt0',
        title: 'Can diet improve memory? BBC News Review',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=tZ-Pbwdqlt0',
        embedUrl: 'https://www.youtube-nocookie.com/embed/tZ-Pbwdqlt0?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Neuroscience & Journalistic Analysis',
        teacherTipPt: 'Análise estilística de manchetes em inglês e estruturas formais de imprensa científica.',
        teacherTipEn: 'Stylistic review of English headlines and formal science journalism phrasing.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      sunday: {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Domingo',
        dayLabelEn: 'Sunday',
        videoId: 'gUuDZ5U8P0k',
        title: 'What are the benefits of drinking coffee and caffeinated drinks?: BBC Learning English',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=gUuDZ5U8P0k',
        embedUrl: 'https://www.youtube-nocookie.com/embed/gUuDZ5U8P0k?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Comparative Analysis & Advanced Grammar',
        teacherTipPt: 'Construções gramaticais de contraste, inversões enfáticas e vocabulário analítico para fluência refinada.',
        teacherTipEn: 'Contrasting grammatical constructions, emphatic sentence patterns, and analytical vocabulary for refined fluency.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
    },
    pool: [
      {
        videoId: 'dLyo5M2swUo',
        title: 'News Review: First Arab woman in space',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=dLyo5M2swUo',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dLyo5M2swUo?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Science & Aerospace Vocabulary',
        teacherTipPt: 'Vocabulário técnico aeroespacial e expressões formais da BBC.',
        teacherTipEn: 'Technical aerospace vocabulary and formal BBC news phrasing.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      {
        videoId: 'o1BC8uOzdXo',
        title: 'English at Work - Professional Negotiations and Strategy',
        channelOrCreator: 'BBC Learning English',
        url: 'https://www.youtube.com/watch?v=o1BC8uOzdXo',
        embedUrl: 'https://www.youtube-nocookie.com/embed/o1BC8uOzdXo?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Professional Fluency & Negotiation',
        teacherTipPt: 'Nuances de negociação e polidez diplomática em inglês de negócios.',
        teacherTipEn: 'Negotiation nuances and diplomatic politeness in business English.',
        duration: '12 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
      {
        videoId: 'jDqsNK1hmM8',
        title: '6 Minute English: Can climate change cause more disease?',
        channelOrCreator: 'BBC 6 Minute English',
        url: 'https://www.youtube.com/watch?v=jDqsNK1hmM8',
        embedUrl: 'https://www.youtube-nocookie.com/embed/jDqsNK1hmM8?rel=0&modestbranding=1&enablejsapi=1',
        activityTopic: 'Environmental Science & Debate',
        teacherTipPt: 'Vocabulário ecológico e científico avançado.',
        teacherTipEn: 'Advanced ecological and scientific debate terminology.',
        duration: '6 min',
        playlistId: 'PLdOaRmhc8j5A',
        playlistTitle: 'Eating habits',
      },
    ],
  },
};

/**
 * Retrieves the YouTube playlist configuration mapped to the student's level
 */
export function getYouTubePlaylistForLevel(rawLevel?: string | EnglishLevel | null): YouTubeLevelPlaylistConfig {
  const norm = normalizeStudentLevel(rawLevel);
  return YOUTUBE_LEVEL_PLAYLISTS[norm] || YOUTUBE_LEVEL_PLAYLISTS.beginner;
}

/**
 * Retrieves the weekly YouTube video array for the given level
 */
export function getWeeklyYouTubeVideosForLevel(rawLevel?: string | EnglishLevel | null): YouTubeDailyVideoConfig[] {
  const playlist = getYouTubePlaylistForLevel(rawLevel);
  return DAYS_SEQUENCE.map((day) => playlist.videos[day]);
}

/**
 * Retrieves the daily YouTube video sequentially mapped from the level's playlist for the selected day
 */
export function getDailyYouTubeVideoForStudent(
  rawLevel?: string | EnglishLevel | null,
  dayOfWeek: DayOfWeek = 'monday'
): YouTubeDailyVideoConfig {
  const playlist = getYouTubePlaylistForLevel(rawLevel);
  return playlist.videos[dayOfWeek] || playlist.videos.monday;
}
