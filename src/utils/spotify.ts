import { DayOfWeek, EnglishLevel } from '../types';

/**
 * Utility helpers for Spotify URLs, Embeds, and Automated Level-Based Daily Listening Playlists
 */

export type SpotifyContentType = 'podcast' | 'music' | 'episode' | 'track' | 'playlist' | 'show' | 'album';

export type NormalizedStudentLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SpotifyDailyTrack {
  dayOfWeek: DayOfWeek;
  dayLabelPt: string;
  dayLabelEn: string;
  trackId: string;
  title: string;
  artist: string;
  url: string;
  embedUrl: string;
  teacherTipPt: string;
  teacherTipEn: string;
}

export interface SpotifyLevelPlaylistConfig {
  level: NormalizedStudentLevel;
  levelLabelPt: string;
  levelLabelEn: string;
  playlistId: string;
  playlistTitle: string;
  playlistUrl: string;
  embedPlaylistUrl: string;
  descriptionPt: string;
  descriptionEn: string;
  tracks: Record<DayOfWeek, SpotifyDailyTrack>;
  pool?: SpotifyDailyTrack[];
}

export const DAYS_SEQUENCE: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Curated, verified Spotify playlists and sequential daily tracks from It's simple official account (Adm Itissimple).
 * - Beginner: https://open.spotify.com/playlist/01gS0x1KOwrDp7pJq2dPCM
 * - Intermediate: https://open.spotify.com/playlist/1PdOI8azTqiywT5FWfimQM
 * - Advanced: https://open.spotify.com/playlist/2bMnxz06NIK6dHeG9lwyUF
 */
export const SPOTIFY_IT_IS_SIMPLE_TOKEN = '';

export const SPOTIFY_LEVEL_PLAYLISTS: Record<NormalizedStudentLevel, SpotifyLevelPlaylistConfig> = {
  beginner: {
    level: 'beginner',
    levelLabelPt: 'Iniciante',
    levelLabelEn: 'Beginner',
    playlistId: '01gS0x1KOwrDp7pJq2dPCM',
    playlistTitle: "Beginner • It's simple",
    playlistUrl: 'https://open.spotify.com/playlist/01gS0x1KOwrDp7pJq2dPCM',
    embedPlaylistUrl: 'https://open.spotify.com/embed/playlist/01gS0x1KOwrDp7pJq2dPCM?utm_source=generator&theme=0',
    descriptionPt: "Playlist oficial da It's simple (Adm Itissimple) para Iniciantes: músicas com dicção clara, frases fundamentais e ritmo acolhedor.",
    descriptionEn: "Official It's simple playlist (Adm Itissimple) for Beginners: songs featuring clear diction, foundational phrasing, and accessible rhythm.",
    tracks: {
      monday: {
        dayOfWeek: 'monday',
        dayLabelPt: 'Segunda-feira',
        dayLabelEn: 'Monday',
        trackId: '3B5UbSndRz907IZhhmUfLi',
        title: 'Count on Me',
        artist: 'Bruno Mars',
        url: 'https://open.spotify.com/track/3B5UbSndRz907IZhhmUfLi',
        embedUrl: 'https://open.spotify.com/embed/track/3B5UbSndRz907IZhhmUfLi?utm_source=generator&theme=0',
        teacherTipPt: 'Canção alegre e com ritmo calmo. Preste atenção nas frases condicionais simples ("If you ever find yourself...") e na pronúncia clara de cada palavra.',
        teacherTipEn: 'Uplifting song with an easy pace. Notice simple conditionals ("If you ever find yourself...") and clear articulation of every word.',
      },
      tuesday: {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Terça-feira',
        dayLabelEn: 'Tuesday',
        trackId: '0tgVpDi06FyKpA1z0VMD4v',
        title: 'Perfect',
        artist: 'Ed Sheeran',
        url: 'https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v',
        embedUrl: 'https://open.spotify.com/embed/track/0tgVpDi06FyKpA1z0VMD4v?utm_source=generator&theme=0',
        teacherTipPt: 'Balada suave perfeita para treinar descrição de pessoas, sentimentos e pretéritos simples ("I found a love...").',
        teacherTipEn: 'A gentle ballad perfect for practicing personal descriptions, emotions, and simple past tense ("I found a love...").',
      },
      wednesday: {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Quarta-feira',
        dayLabelEn: 'Wednesday',
        trackId: '4qsVPnhbvEooD1bSNqvvh0',
        title: 'Let It Be',
        artist: 'The Beatles',
        url: 'https://open.spotify.com/track/4qsVPnhbvEooD1bSNqvvh0',
        embedUrl: 'https://open.spotify.com/embed/track/4qsVPnhbvEooD1bSNqvvh0?utm_source=generator&theme=0',
        teacherTipPt: 'Clássico mundial com dicção britânica exemplar e vocabulário acolhedor. Treine cantar o refrão em voz alta!',
        teacherTipEn: 'Global classic with timeless British diction and welcoming vocabulary. Try singing along to the chorus out loud!',
      },
      thursday: {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Quinta-feira',
        dayLabelEn: 'Thursday',
        trackId: '3AJwUDP919kvQ9QcozQPxg',
        title: 'Yellow',
        artist: 'Coldplay',
        url: 'https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg',
        embedUrl: 'https://open.spotify.com/embed/track/3AJwUDP919kvQ9QcozQPxg?utm_source=generator&theme=0',
        teacherTipPt: 'Música de melodia marcante. Foque nos adjetivos simples e nas expressões poéticas ("Look at the stars, look how they shine for you").',
        teacherTipEn: 'Iconic melodic track. Focus on basic descriptive adjectives and poetic phrases ("Look at the stars, look how they shine for you").',
      },
      friday: {
        dayOfWeek: 'friday',
        dayLabelPt: 'Sexta-feira',
        dayLabelEn: 'Friday',
        trackId: '62PaSfnXSMyLshYJrlTuL3',
        title: 'Hello',
        artist: 'Adele',
        url: 'https://open.spotify.com/track/62PaSfnXSMyLshYJrlTuL3',
        embedUrl: 'https://open.spotify.com/embed/track/62PaSfnXSMyLshYJrlTuL3?utm_source=generator&theme=0',
        teacherTipPt: 'Excelente para praticar entonação de cumprimentos e conversas ao telefone ("Hello, it\'s me... I was wondering if...").',
        teacherTipEn: 'Great for listening to telephone greeting intonation and polite conversational openings ("Hello, it\'s me... I was wondering if...").',
      },
      saturday: {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Sábado',
        dayLabelEn: 'Saturday',
        trackId: '7pKfPomDEeI4TPT6EOYjn9',
        title: 'Imagine',
        artist: 'John Lennon',
        url: 'https://open.spotify.com/track/7pKfPomDEeI4TPT6EOYjn9',
        embedUrl: 'https://open.spotify.com/embed/track/7pKfPomDEeI4TPT6EOYjn9?utm_source=generator&theme=0',
        teacherTipPt: 'Ritmo contemplativo com frases curtas e diretas no modo hipotético ("Imagine there\'s no heaven...").',
        teacherTipEn: 'Contemplative rhythm featuring short, direct hypothetical sentences ("Imagine there\'s no heaven...").',
      },
      sunday: {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Domingo',
        dayLabelEn: 'Sunday',
        trackId: '6OzAkuRDmEpd52RF1g1WvU',
        title: 'Stand By Me',
        artist: 'Ben E. King',
        url: 'https://open.spotify.com/track/6OzAkuRDmEpd52RF1g1WvU',
        embedUrl: 'https://open.spotify.com/embed/track/6OzAkuRDmEpd52RF1g1WvU?utm_source=generator&theme=0',
        teacherTipPt: 'Um dos maiores clássicos da música em inglês: ritmo marcado, phrasal verbs simples e excelente para cantar no domingo.',
        teacherTipEn: 'One of the greatest English classics: steady rhythm, straightforward phrasal verbs, and joyful to sing on Sunday.',
      },
    },
    pool: [
      {
        dayOfWeek: 'monday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '3B5UbSndRz907IZhhmUfLi',
        title: 'Count on Me',
        artist: 'Bruno Mars',
        url: 'https://open.spotify.com/track/3B5UbSndRz907IZhhmUfLi',
        embedUrl: 'https://open.spotify.com/embed/track/3B5UbSndRz907IZhhmUfLi?utm_source=generator&theme=0',
        teacherTipPt: 'Música acolhedora com números e promessas cotidianas em inglês.',
        teacherTipEn: 'Heartwarming track with simple numbers, conditionals, and conversational promises.',
      },
      {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '7BqBn9nXd0udsf07vfr5qT',
        title: 'Just the Way You Are',
        artist: 'Bruno Mars',
        url: 'https://open.spotify.com/track/7BqBn9nXd0udsf07vfr5qT',
        embedUrl: 'https://open.spotify.com/embed/track/7BqBn9nXd0udsf07vfr5qT?utm_source=generator&theme=0',
        teacherTipPt: 'Adjetivos descritivos simples e declarações diretas de apreço.',
        teacherTipEn: 'Gentle descriptive adjectives and clear romantic vocabulary.',
      },
      {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '0tgVpDi06FyKpA1z0VMD4v',
        title: 'Perfect',
        artist: 'Ed Sheeran',
        url: 'https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v',
        embedUrl: 'https://open.spotify.com/embed/track/0tgVpDi06FyKpA1z0VMD4v?utm_source=generator&theme=0',
        teacherTipPt: 'Balada romântica com vocabulário de infância, amor e futuro.',
        teacherTipEn: 'Acoustic ballad featuring narrative past tense and heartfelt diction.',
      },
      {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '7yq4QjY5Ag8pqpH8R1B5Tq',
        title: 'Riptide',
        artist: 'Vance Joy',
        url: 'https://open.spotify.com/track/7yq4QjY5Ag8pqpH8R1B5Tq',
        embedUrl: 'https://open.spotify.com/embed/track/7yq4QjY5Ag8pqpH8R1B5Tq?utm_source=generator&theme=0',
        teacherTipPt: 'Folk pop alegre com frases curtas e ritmo contagiante.',
        teacherTipEn: 'Upbeat folk pop with punchy, memorable lines and easy rhyming.',
      },
      {
        dayOfWeek: 'friday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '1EzrEOo4wgjRsJuxVvEBR8',
        title: "I'm Yours",
        artist: 'Jason Mraz',
        url: 'https://open.spotify.com/track/1EzrEOo4wgjRsJuxVvEBR8',
        embedUrl: 'https://open.spotify.com/embed/track/1EzrEOo4wgjRsJuxVvEBR8?utm_source=generator&theme=0',
        teacherTipPt: 'Jogo de palavras leve, phrasal verbs naturais e cadência descontraída.',
        teacherTipEn: 'Playful acoustic rhythm, common idioms, and relaxed connected speech.',
      },
      {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '1BxfuPKGuaTgP7aM0XbdMe',
        title: "Ain't No Sunshine",
        artist: 'Bill Withers',
        url: 'https://open.spotify.com/track/1BxfuPKGuaTgP7aM0XbdMe',
        embedUrl: 'https://open.spotify.com/embed/track/1BxfuPKGuaTgP7aM0XbdMe?utm_source=generator&theme=0',
        teacherTipPt: 'Soul atemporal com repetições fáceis para cantar junto.',
        teacherTipEn: 'Timeless soul classic with simple, repetitive, high-impact phrasing.',
      },
      {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '4u7EnebtmKWzUH433cf5Qv',
        title: 'Let It Be',
        artist: 'The Beatles',
        url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
        embedUrl: 'https://open.spotify.com/embed/track/4u7EnebtmKWzUH433cf5Qv?utm_source=generator&theme=0',
        teacherTipPt: 'Frases de sabedoria e acolhimento com pronúncia britânica cristalina.',
        teacherTipEn: 'Wise, comforting verses with crystal-clear British enunciation.',
      },
    ],
  },
  intermediate: {
    level: 'intermediate',
    levelLabelPt: 'Intermediário',
    levelLabelEn: 'Intermediate',
    playlistId: '1PdOI8azTqiywT5FWfimQM',
    playlistTitle: "Intermediate • It's simple",
    playlistUrl: 'https://open.spotify.com/playlist/1PdOI8azTqiywT5FWfimQM',
    embedPlaylistUrl: 'https://open.spotify.com/embed/playlist/1PdOI8azTqiywT5FWfimQM?utm_source=generator&theme=0',
    descriptionPt: "Playlist oficial da It's simple (Adm Itissimple) para Intermediários: sucessos contemporâneos com narrativa expressiva, idioms e cadência conversacional.",
    descriptionEn: "Official It's simple playlist (Adm Itissimple) for Intermediates: contemporary hits with storytelling, everyday idioms, and conversational cadence.",
    tracks: {
      monday: {
        dayOfWeek: 'monday',
        dayLabelPt: 'Segunda-feira',
        dayLabelEn: 'Monday',
        trackId: '7qiZfU4dY1lWllzX7mPBI3',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        url: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
        embedUrl: 'https://open.spotify.com/embed/track/7qiZfU4dY1lWllzX7mPBI3?utm_source=generator&theme=0',
        teacherTipPt: 'Ritmo pop dinâmico. Repare nas contrações rápidas, connected speech ("come on now, follow my lead") e vocabulário de convivência.',
        teacherTipEn: 'Upbeat pop cadence. Notice fast contractions, connected speech ("come on now, follow my lead"), and modern social vocabulary.',
      },
      tuesday: {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Terça-feira',
        dayLabelEn: 'Tuesday',
        trackId: '1zwMYTA5nlNjZxYrvBB2pV',
        title: 'Someone Like You',
        artist: 'Adele',
        url: 'https://open.spotify.com/track/1zwMYTA5nlNjZxYrvBB2pV',
        embedUrl: 'https://open.spotify.com/embed/track/1zwMYTA5nlNjZxYrvBB2pV?utm_source=generator&theme=0',
        teacherTipPt: 'Interpretação emocionante com uso de pretérito perfeito e contrações ("Never mind, I\'ll find someone like you").',
        teacherTipEn: 'Emotional delivery featuring conversational past expressions and idioms ("Never mind, I\'ll find someone like you").',
      },
      wednesday: {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Quarta-feira',
        dayLabelEn: 'Wednesday',
        trackId: '01rRRl55mMq5gMnFvg8WYu',
        title: 'Fix You',
        artist: 'Coldplay',
        url: 'https://open.spotify.com/track/01rRRl55mMq5gMnFvg8WYu',
        embedUrl: 'https://open.spotify.com/embed/track/01rRRl55mMq5gMnFvg8WYu?utm_source=generator&theme=0',
        teacherTipPt: 'Expressões idiomáticas de encorajamento e estruturas com "When you try your best, but you don\'t succeed".',
        teacherTipEn: 'Supportive idioms and conditional structures ("When you try your best, but you don\'t succeed").',
      },
      thursday: {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Quinta-feira',
        dayLabelEn: 'Thursday',
        trackId: '2VxeLyX666F8uXCJ0dZF8B',
        title: 'Shallow',
        artist: 'Lady Gaga & Bradley Cooper',
        url: 'https://open.spotify.com/track/2VxeLyX666F8uXCJ0dZF8B',
        embedUrl: 'https://open.spotify.com/embed/track/2VxeLyX666F8uXCJ0dZF8B?utm_source=generator&theme=0',
        teacherTipPt: 'Diálogo poderoso entre duas vozes. Ótimo para perceber a alternância de tom entre perguntas e respostas em inglês.',
        teacherTipEn: 'Powerful two-voice dialogue. Excellent for hearing pitch shifts between inquiry and response in conversational English.',
      },
      friday: {
        dayOfWeek: 'friday',
        dayLabelPt: 'Sexta-feira',
        dayLabelEn: 'Friday',
        trackId: '2tpWsVSb9UEmDRxAl1zhX1',
        title: 'Counting Stars',
        artist: 'OneRepublic',
        url: 'https://open.spotify.com/track/2tpWsVSb9UEmDRxAl1zhX1',
        embedUrl: 'https://open.spotify.com/embed/track/2tpWsVSb9UEmDRxAl1zhX1?utm_source=generator&theme=0',
        teacherTipPt: 'Ritmo acelerado que desafia o reflexo auditivo intermediário com metáforas do cotidiano e sonhos futuros.',
        teacherTipEn: 'Fast tempo that sharpens your intermediate listening reflexes with everyday financial metaphors and aspirations.',
      },
      saturday: {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Sábado',
        dayLabelEn: 'Saturday',
        trackId: '32OlwWuMpZ6b0aN2RZOeMS',
        title: 'Uptown Funk',
        artist: 'Mark Ronson ft. Bruno Mars',
        url: 'https://open.spotify.com/track/32OlwWuMpZ6b0aN2RZOeMS',
        embedUrl: 'https://open.spotify.com/embed/track/32OlwWuMpZ6b0aN2RZOeMS?utm_source=generator&theme=0',
        teacherTipPt: 'Groove animado com gírias urbanas e expressões de festa ("Too hot, hot damn"). Excelente para o fim de semana!',
        teacherTipEn: 'Energetic funk groove with urban slang and weekend party idioms ("Too hot, hot damn"). Have fun singing along!',
      },
      sunday: {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Domingo',
        dayLabelEn: 'Sunday',
        trackId: '7DSAEUvxU8FajXtRloy8M0',
        title: 'Flowers',
        artist: 'Miley Cyrus',
        url: 'https://open.spotify.com/track/7DSAEUvxU8FajXtRloy8M0',
        embedUrl: 'https://open.spotify.com/embed/track/7DSAEUvxU8FajXtRloy8M0?utm_source=generator&theme=0',
        teacherTipPt: 'Vocabulário de autonomia e rotina diária ("I can buy myself flowers, write my name in the sand").',
        teacherTipEn: 'Autonomy and self-care vocabulary with reflexive verbs ("I can buy myself flowers, write my name in the sand").',
      },
    },
    pool: [
      {
        dayOfWeek: 'monday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '5Nm9ERj0sgw2AjSZE5DHNW',
        title: 'Stay With Me',
        artist: 'Sam Smith',
        url: 'https://open.spotify.com/track/5Nm9ERj0sgw2AjSZE5DHNW',
        embedUrl: 'https://open.spotify.com/embed/track/5Nm9ERj0sgw2AjSZE5DHNW?utm_source=generator&theme=0',
        teacherTipPt: 'Voz expressiva com estruturas de diálogo sincero e connected speech.',
        teacherTipEn: 'Expressive vocals with authentic emotional phrases and connected speech.',
      },
      {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '1CkvWZme3rp429A79BQ69j',
        title: 'Rolling in the Deep',
        artist: 'Adele',
        url: 'https://open.spotify.com/track/1CkvWZme3rp429A79BQ69j',
        embedUrl: 'https://open.spotify.com/embed/track/1CkvWZme3rp429A79BQ69j?utm_source=generator&theme=0',
        teacherTipPt: 'Expressões idiomáticas de intensidade ("rolling in the deep", "reach a fever pitch").',
        teacherTipEn: 'Intense idiomatic phrasing and dynamic vocal contrast.',
      },
      {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '34gCuhDGsG4bRPIf9bb02f',
        title: 'Thinking Out Loud',
        artist: 'Ed Sheeran',
        url: 'https://open.spotify.com/track/34gCuhDGsG4bRPIf9bb02f',
        embedUrl: 'https://open.spotify.com/embed/track/34gCuhDGsG4bRPIf9bb02f?utm_source=generator&theme=0',
        teacherTipPt: 'Linguagem cotidiana sobre envelhecer e construir memórias.',
        teacherTipEn: 'Warm conversational vocabulary about aging, love, and life memories.',
      },
      {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '7LVHVU3tWfcxj5aiPsvWkQ',
        title: 'Fix You',
        artist: 'Coldplay',
        url: 'https://open.spotify.com/track/7LVHVU3tWfcxj5aiPsvWkQ',
        embedUrl: 'https://open.spotify.com/embed/track/7LVHVU3tWfcxj5aiPsvWkQ?utm_source=generator&theme=0',
        teacherTipPt: 'Construção poética com orações condicionais ("When you try your best...").',
        teacherTipEn: 'Poetic song structure with conditional clauses and heartfelt support.',
      },
      {
        dayOfWeek: 'friday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '0pqnGHJpmpxLKLy7a2WBxo',
        title: 'Believer',
        artist: 'Imagine Dragons',
        url: 'https://open.spotify.com/track/0pqnGHJpmpxLKLy7a2WBxo',
        embedUrl: 'https://open.spotify.com/embed/track/0pqnGHJpmpxLKLy7a2WBxo?utm_source=generator&theme=0',
        teacherTipPt: 'Ritmo enérgico com palavras fortes sobre resiliência e dor superada.',
        teacherTipEn: 'High-energy rhythmic delivery focusing on resilience and personal growth.',
      },
      {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '2fXw04iisqAO0IoZvdNuSd',
        title: 'Watermelon Sugar',
        artist: 'Harry Styles',
        url: 'https://open.spotify.com/track/2fXw04iisqAO0IoZvdNuSd',
        embedUrl: 'https://open.spotify.com/embed/track/2fXw04iisqAO0IoZvdNuSd?utm_source=generator&theme=0',
        teacherTipPt: 'Pop moderno com gírias e expressões sensoriais contemporâneas.',
        teacherTipEn: 'Contemporary sensory adjectives and modern summer pop idioms.',
      },
      {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '60nZcImufyMA1MKQY3dcCH',
        title: 'Happy',
        artist: 'Pharrell Williams',
        url: 'https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH',
        embedUrl: 'https://open.spotify.com/embed/track/60nZcImufyMA1MKQY3dcCH?utm_source=generator&theme=0',
        teacherTipPt: 'Vocabulário contagiante de alegria e auto-confiança para o domingo.',
        teacherTipEn: 'Joyful, uplifting chorus with cheerful everyday idioms.',
      },
    ],
  },
  advanced: {
    level: 'advanced',
    levelLabelPt: 'Avançado',
    levelLabelEn: 'Advanced',
    playlistId: '2bMnxz06NIK6dHeG9lwyUF',
    playlistTitle: "Advanced • It's simple",
    playlistUrl: 'https://open.spotify.com/playlist/2bMnxz06NIK6dHeG9lwyUF',
    embedPlaylistUrl: 'https://open.spotify.com/embed/playlist/2bMnxz06NIK6dHeG9lwyUF?utm_source=generator&theme=0',
    descriptionPt: "Playlist oficial da It's simple (Adm Itissimple) para Alunos Avançados: faixas complexas com vocabulário culto, velocidade de rap, connected speech e estruturas desafiadoras.",
    descriptionEn: "Official It's simple playlist (Adm Itissimple) for Advanced Students: complex masterpieces, rapid delivery, connected speech, and sophisticated narrative.",
    tracks: {
      monday: {
        dayOfWeek: 'monday',
        dayLabelPt: 'Segunda-feira',
        dayLabelEn: 'Monday',
        trackId: '2JiDi0qAXsPwhPqA2qaKGt',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        url: 'https://open.spotify.com/track/2JiDi0qAXsPwhPqA2qaKGt',
        embedUrl: 'https://open.spotify.com/embed/track/2JiDi0qAXsPwhPqA2qaKGt?utm_source=generator&theme=0',
        teacherTipPt: 'Obra-prima com variações dramáticas de tom, vocabulário operístico e narrativa complexa em língua inglesa.',
        teacherTipEn: 'Operatic rock masterpiece featuring theatrical mood shifts, advanced imagery, and dramatic speech rhythms.',
      },
      tuesday: {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Terça-feira',
        dayLabelEn: 'Tuesday',
        trackId: '40riOy7x9W7GXjyGp4pjAv',
        title: 'Hotel California',
        artist: 'Eagles',
        url: 'https://open.spotify.com/track/40riOy7x9W7GXjyGp4pjAv',
        embedUrl: 'https://open.spotify.com/embed/track/40riOy7x9W7GXjyGp4pjAv?utm_source=generator&theme=0',
        teacherTipPt: 'Metáforas profundas da cultura americana, adjetivos descritivos ricos e connected speech em ritmo clássico.',
        teacherTipEn: 'Rich American cultural allegories, vivid descriptive adjectives, and smooth connected speech.',
      },
      wednesday: {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Quarta-feira',
        dayLabelEn: 'Wednesday',
        trackId: '2M9ro2krNb7nr7HSprkEgo',
        title: 'Fast Car',
        artist: 'Tracy Chapman',
        url: 'https://open.spotify.com/track/2M9ro2krNb7nr7HSprkEgo',
        embedUrl: 'https://open.spotify.com/embed/track/2M9ro2krNb7nr7HSprkEgo?utm_source=generator&theme=0',
        teacherTipPt: 'História em versos contínuos, com transição de tempos verbais e dilemas sociais retratados com delicadeza lírica.',
        teacherTipEn: 'Subtle lyrical storytelling with fluid shifts between past, present aspirations, and real-life dilemmas.',
      },
      thursday: {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Quinta-feira',
        dayLabelEn: 'Thursday',
        trackId: '2vTPnVToPdKP4W1irOlhz5',
        title: 'Hallelujah (Live)',
        artist: 'Bon Jovi',
        url: 'https://open.spotify.com/track/2vTPnVToPdKP4W1irOlhz5',
        embedUrl: 'https://open.spotify.com/embed/track/2vTPnVToPdKP4W1irOlhz5?utm_source=generator&theme=0',
        teacherTipPt: 'Letra poética com referências literárias e metáforas ricas, exigindo percepção apurada de subtexto e entonação.',
        teacherTipEn: 'Poetic verses filled with literary metaphors requiring nuanced perception of subtext and emotional cadence.',
      },
      friday: {
        dayOfWeek: 'friday',
        dayLabelPt: 'Sexta-feira',
        dayLabelEn: 'Friday',
        trackId: '0VjIjW4GlUZAMYd2vXMi3b',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
        embedUrl: 'https://open.spotify.com/embed/track/0VjIjW4GlUZAMYd2vXMi3b?utm_source=generator&theme=0',
        teacherTipPt: 'Synthwave acelerado com cadência verbal contemporânea, phrasal verbs rápidos e linguagem urbana moderna.',
        teacherTipEn: 'High-speed modern synthwave featuring fast conversational reductions and urban pop expressions.',
      },
      saturday: {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Sábado',
        dayLabelEn: 'Saturday',
        trackId: '1mea3bSkSGXuIRvnydlB5b',
        title: 'Viva La Vida',
        artist: 'Coldplay',
        url: 'https://open.spotify.com/track/1mea3bSkSGXuIRvnydlB5b',
        embedUrl: 'https://open.spotify.com/embed/track/1mea3bSkSGXuIRvnydlB5b?utm_source=generator&theme=0',
        teacherTipPt: 'Narrativa em primeira pessoa com vocabulário erudito sobre história, poder e reflexão existencial.',
        teacherTipEn: 'First-person retrospective with sophisticated historical vocabulary, inverted phrases, and existential themes.',
      },
      sunday: {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Domingo',
        dayLabelEn: 'Sunday',
        trackId: '5Z01UMMf7V1o0MzF86s6WJ',
        title: 'Lose Yourself',
        artist: 'Eminem',
        url: 'https://open.spotify.com/track/5Z01UMMf7V1o0MzF86s6WJ',
        embedUrl: 'https://open.spotify.com/embed/track/5Z01UMMf7V1o0MzF86s6WJ?utm_source=generator&theme=0',
        teacherTipPt: 'O desafio definitivo de listening avançado: rimas multissilábicas, velocidade extrema e expressões coloquiais autênticas.',
        teacherTipEn: 'The ultimate advanced listening workout: rapid multisyllabic rhyming, connected slang, and raw conversational tempo.',
      },
    },
    pool: [
      {
        dayOfWeek: 'monday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '3H7Ez7rddHnO6f4a3v07vA',
        title: 'HUMBLE.',
        artist: 'Kendrick Lamar',
        url: 'https://open.spotify.com/track/3H7Ez7rddHnO6f4a3v07vA',
        embedUrl: 'https://open.spotify.com/embed/track/3H7Ez7rddHnO6f4a3v07vA?utm_source=generator&theme=0',
        teacherTipPt: 'Fluxo rápido com figuras de linguagem e comentário sociocultural afiado.',
        teacherTipEn: 'Complex rhythmic articulation, cultural references, and high-velocity speech.',
      },
      {
        dayOfWeek: 'tuesday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '4yugZvBYaoREkJKirIR8qq',
        title: 'Empire State of Mind',
        artist: 'JAY-Z, Alicia Keys',
        url: 'https://open.spotify.com/track/4yugZvBYaoREkJKirIR8qq',
        embedUrl: 'https://open.spotify.com/embed/track/4yugZvBYaoREkJKirIR8qq?utm_source=generator&theme=0',
        teacherTipPt: 'Sotaque nova-iorquino autêntico, gírias urbanas e contrastes líricos.',
        teacherTipEn: 'Authentic NYC vernacular, rapid rhymes, and celebratory anthemic cadence.',
      },
      {
        dayOfWeek: 'wednesday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '0U0x4q6NaL6081VvH8c4mY',
        title: 'Starboy',
        artist: 'The Weeknd, Daft Punk',
        url: 'https://open.spotify.com/track/0U0x4q6NaL6081VvH8c4mY',
        embedUrl: 'https://open.spotify.com/embed/track/0U0x4q6NaL6081VvH8c4mY?utm_source=generator&theme=0',
        teacherTipPt: 'Produção contemporânea com metáforas veladas e vocabulário de alta rotação.',
        teacherTipEn: 'Contemporary electronic pop with layered metaphors and fluent speed.',
      },
      {
        dayOfWeek: 'thursday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '2d8q3dZ14W170R0x5s01r9',
        title: 'Godzilla',
        artist: 'Eminem, Juice WRLD',
        url: 'https://open.spotify.com/track/2d8q3dZ14W170R0x5s01r9',
        embedUrl: 'https://open.spotify.com/embed/track/2d8q3dZ14W170R0x5s01r9?utm_source=generator&theme=0',
        teacherTipPt: 'Velocidade extrema de sílabas por segundo: o teste supremo de compreensão fonética.',
        teacherTipEn: 'Record-breaking syllable velocity: supreme test of phonetic pattern recognition.',
      },
      {
        dayOfWeek: 'friday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '1zB4vmk8tFRJfSAgQUE7dr',
        title: 'All of the Lights',
        artist: 'Kanye West, Rihanna',
        url: 'https://open.spotify.com/track/1zB4vmk8tFRJfSAgQUE7dr',
        embedUrl: 'https://open.spotify.com/embed/track/1zB4vmk8tFRJfSAgQUE7dr?utm_source=generator&theme=0',
        teacherTipPt: 'Múltiplas vozes intercaladas, elisões rápidas e narrativa cinematográfica.',
        teacherTipEn: 'Interleaved vocal tracks with fast phonetic elisions and cinematic storytelling.',
      },
      {
        dayOfWeek: 'saturday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '696DnlkuDOXcMbpE9MT1Gh',
        title: 'ROXANNE',
        artist: 'Arizona Zervas',
        url: 'https://open.spotify.com/track/696DnlkuDOXcMbpE9MT1Gh',
        embedUrl: 'https://open.spotify.com/embed/track/696DnlkuDOXcMbpE9MT1Gh?utm_source=generator&theme=0',
        teacherTipPt: 'Gírias das redes sociais, redução fonética e ritmo de conversação moderna.',
        teacherTipEn: 'Social media vernacular, connected reduction, and modern conversational tempo.',
      },
      {
        dayOfWeek: 'sunday',
        dayLabelPt: 'Faixa do Ciclo',
        dayLabelEn: 'Cycle Track',
        trackId: '7BKLCr3n6tQ2z1W5G4u7J9',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        url: 'https://open.spotify.com/track/7BKLCr3n6tQ2z1W5G4u7J9',
        embedUrl: 'https://open.spotify.com/embed/track/7BKLCr3n6tQ2z1W5G4u7J9?utm_source=generator&theme=0',
        teacherTipPt: 'Synthwave acelerado com expressões de urgência e estados emocionais intensos.',
        teacherTipEn: 'High-tempo synthwave featuring emotional urgency and natural vocal phrasing.',
      },
    ],
  },
};

/**
 * Spotify Web API integration helper using Spotify Authorization Bearer Token
 * As provided in the It's simple developer integration specification.
 */
export async function fetchSpotifyWebApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  token: string = SPOTIFY_IT_IS_SIMPLE_TOKEN
): Promise<any> {
  try {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.warn(`Spotify API call failed [${res.status}]:`, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('Error fetching Spotify Web API:', err);
    return null;
  }
}

/**
 * Normalizes any variation of student level into 'beginner' | 'intermediate' | 'advanced'
 */
export function normalizeStudentLevel(rawLevel?: string | EnglishLevel | null): NormalizedStudentLevel {
  if (!rawLevel) return 'beginner';
  const l = String(rawLevel).toLowerCase().trim();
  if (l.includes('inter')) return 'intermediate';
  if (l.includes('avan') || l.includes('adv')) return 'advanced';
  return 'beginner';
}

/**
 * Retrieves the Spotify playlist configuration mapped to the student's level
 */
export function getSpotifyPlaylistForLevel(rawLevel?: string | EnglishLevel | null): SpotifyLevelPlaylistConfig {
  const norm = normalizeStudentLevel(rawLevel);
  return SPOTIFY_LEVEL_PLAYLISTS[norm] || SPOTIFY_LEVEL_PLAYLISTS.beginner;
}

/**
 * Retrieves the daily track sequentially mapped from the level's playlist for the selected day
 */
export function getDailySpotifyTrackForStudent(
  rawLevel: string | EnglishLevel | null | undefined,
  dayOfWeek: DayOfWeek
): SpotifyDailyTrack {
  const playlist = getSpotifyPlaylistForLevel(rawLevel);
  const track = playlist.tracks[dayOfWeek];
  if (track) return track;
  // Fallback to monday track of that level
  return playlist.tracks.monday;
}

/**
 * Known corrupt, deleted, or dummy Spotify IDs that fail, return 404, or produce "Couldn't find that podcast"
 */
export const CORRUPT_SPOTIFY_IDS = [
  '5VzKk7uV4C8Oa2sH3eWz9Y', // legacy dummy placeholder that returns 404
  '2qO2kUvhq8XwXhL3oG5F9y', // fake episode placeholder that returns 404
  '3G7aZ1pL9yQw6Vx8J2nMbT', // fake episode placeholder that returns 404
  '07eP4C54x26sOaVn9z1mJy', // fake show placeholder that returns 500
  '07eP4C54x26sQaVn9z1mJy', // fake show placeholder that returns 500
  '0nvd89U6p8s95aGphBvR5J', // fake show placeholder that returns 500
  '4bHsxqRFFGmgTyKeUmF9ox', // old broken track ID
];

export interface SpotifyUrlValidationResult {
  isValid: boolean;
  type: 'track' | 'episode' | 'show' | 'playlist' | 'album' | null;
  id: string | null;
  canonicalUrl: string | null;
  embedUrl: string | null;
  directUrl: string;
  contentType: SpotifyContentType;
  errorMessage?: string;
}

/**
 * Strict parser and sanitizer for Spotify URLs and URIs.
 * Validates /track/, /episode/, /show/, /playlist/, and /album/ URLs.
 * Handles internationalized prefixes (e.g. /intl-pt/) and strips query parameters.
 */
export function parseSpotifyUrl(url: string | null | undefined): SpotifyUrlValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      type: null,
      id: null,
      canonicalUrl: null,
      embedUrl: null,
      directUrl: 'https://open.spotify.com',
      contentType: 'podcast',
      errorMessage: 'URL do Spotify não fornecida.',
    };
  }

  const clean = url.trim();

  // Check for known corrupted or broken IDs
  for (const badId of CORRUPT_SPOTIFY_IDS) {
    if (clean.includes(badId)) {
      return {
        isValid: false,
        type: 'episode',
        id: badId,
        canonicalUrl: null,
        embedUrl: null,
        directUrl: 'https://open.spotify.com',
        contentType: 'podcast',
        errorMessage: 'Link corrompido do Spotify detectado: este conteúdo não existe no catálogo ("Couldn\'t find that podcast").',
      };
    }
  }

  // 1. Matches standard web URL or internationalized URL (e.g., /intl-pt/track/...)
  // or embed URL (e.g., /embed/track/...)
  const webRegex = /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*spotify\.com(?::\d+)?\/(?:intl-[a-z]{2,3}(?:-[a-z]{2,4})?\/)?(?:embed\/)?(track|episode|show|playlist|album)\/([a-zA-Z0-9]{15,35})(?:[?#].*)?$/i;
  const webMatch = clean.match(webRegex);

  if (webMatch) {
    const type = webMatch[1].toLowerCase() as 'track' | 'episode' | 'show' | 'playlist' | 'album';
    const id = webMatch[2];

    const canonicalUrl = `https://open.spotify.com/${type}/${id}`;
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    const contentType: SpotifyContentType = (type === 'episode' || type === 'show') ? 'podcast' : type === 'playlist' ? 'playlist' : 'music';

    return {
      isValid: true,
      type,
      id,
      canonicalUrl,
      embedUrl,
      directUrl: canonicalUrl,
      contentType,
    };
  }

  // 2. Matches Spotify URI (spotify:track:ID, spotify:episode:ID, etc.)
  const uriRegex = /^spotify:(track|episode|show|playlist|album):([a-zA-Z0-9]{15,35})$/i;
  const uriMatch = clean.match(uriRegex);

  if (uriMatch) {
    const type = uriMatch[1].toLowerCase() as 'track' | 'episode' | 'show' | 'playlist' | 'album';
    const id = uriMatch[2];

    const canonicalUrl = `https://open.spotify.com/${type}/${id}`;
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    const contentType: SpotifyContentType = (type === 'episode' || type === 'show') ? 'podcast' : type === 'playlist' ? 'playlist' : 'music';

    return {
      isValid: true,
      type,
      id,
      canonicalUrl,
      embedUrl,
      directUrl: canonicalUrl,
      contentType,
    };
  }

  // If it didn't match the strict patterns, generate a helpful diagnostic error
  if (!clean.includes('spotify.com') && !clean.startsWith('spotify:')) {
    return {
      isValid: false,
      type: null,
      id: null,
      canonicalUrl: null,
      embedUrl: null,
      directUrl: 'https://open.spotify.com',
      contentType: 'podcast',
      errorMessage: 'O link fornecido não pertence ao Spotify. Cole uma URL do open.spotify.com.',
    };
  }

  if (clean.includes('/episode/') || clean.includes('/track/') || clean.includes('/show/')) {
    return {
      isValid: false,
      type: null,
      id: null,
      canonicalUrl: null,
      embedUrl: null,
      directUrl: 'https://open.spotify.com',
      contentType: 'podcast',
      errorMessage: 'O ID do Spotify parece incompleto ou truncado. Copie o link completo através do botão "Compartilhar" no Spotify.',
    };
  }

  return {
    isValid: false,
    type: null,
    id: null,
    canonicalUrl: null,
    embedUrl: null,
    directUrl: 'https://open.spotify.com',
    contentType: 'podcast',
    errorMessage: 'Formato de link não suportado. Use links de episódios (/episode/), músicas (/track/) ou podcasts (/show/).',
  };
}

/**
 * Extracts a clean 22-character Spotify track or episode ID from any URL, URI, or ID string
 */
export function extractSpotifyTrackId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const clean = urlOrId.trim();
  if (/^[a-zA-Z0-9]{15,35}$/.test(clean)) return clean;
  const parsed = parseSpotifyUrl(clean);
  return parsed.isValid ? parsed.id : null;
}

/**
 * Returns the ordered array of 7 tracks for a student's level (Monday through Sunday)
 */
export function getWeeklySpotifyTracksForLevel(level: NormalizedStudentLevel = 'beginner'): SpotifyDailyTrack[] {
  const playlist = SPOTIFY_LEVEL_PLAYLISTS[level] || SPOTIFY_LEVEL_PLAYLISTS.beginner;
  return DAYS_SEQUENCE.map((day) => playlist.tracks[day]);
}

/**
 * Validates if the string is a valid Spotify URL or URI
 */
export function isValidSpotifyUrl(url: string): boolean {
  return parseSpotifyUrl(url).isValid;
}

/**
 * Extracts the embed URL for an iframe from any standard Spotify link
 * E.g.: https://open.spotify.com/episode/xyz -> https://open.spotify.com/embed/episode/xyz?utm_source=generator&theme=0
 * E.g.: https://open.spotify.com/track/xyz -> https://open.spotify.com/embed/track/xyz?utm_source=generator&theme=0
 */
export function getSpotifyEmbedUrl(url: string): string | null {
  const result = parseSpotifyUrl(url);
  return result.isValid ? result.embedUrl : null;
}

/**
 * Returns a standardized canonical web link to open in Spotify app/browser
 */
export function getSpotifyDirectUrl(url: string): string {
  const result = parseSpotifyUrl(url);
  if (result.isValid && result.canonicalUrl) {
    return result.canonicalUrl;
  }
  if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url.trim();
  }
  return 'https://open.spotify.com';
}

/**
 * Determines content type (podcast vs music) from Spotify URL
 */
export function getSpotifyContentType(url: string): SpotifyContentType {
  const result = parseSpotifyUrl(url);
  if (result.isValid) {
    return result.contentType;
  }
  if (!url) return 'podcast';
  const lower = url.toLowerCase();
  if (lower.includes('/episode/') || lower.includes(':episode:') || lower.includes('/show/') || lower.includes(':show:')) {
    return 'podcast';
  }
  if (lower.includes('/track/') || lower.includes(':track:') || lower.includes('/album/') || lower.includes(':album:')) {
    return 'music';
  }
  if (lower.includes('/playlist/') || lower.includes(':playlist:')) {
    return 'playlist';
  }
  return 'podcast';
}

