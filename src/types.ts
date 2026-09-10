export enum EnglishLevel {
  BEGINNER = 'iniciante',
  INTERMEDIATE = 'intermediario',
  ADVANCED = 'avancado',
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type DayType = 'weekdays' | 'weekends';

export type Language =
  | 'pt'
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'ru'
  | 'ar'
  | 'tr';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface NativeFriendTutor {
  id: string;
  name: string;
  email: string;
  avatar: string;
  country: string;
  countryCode: string;
  flag: string;
  accent: string;
  rating: number;
  reviewsCount: number;
  activeStudents: number;
  lessonsTaught: number;
  pricePerSessionUsd: number;
  pricePerSessionBrl: number;
  headline: string;
  bio: string;
  specialties: string[];
  videoIntroUrl: string;
  youtubeEmbedId?: string;
  availableDays: DayOfWeek[];
  availableHours: string[];
  isSuperTutor?: boolean;
  languagesSpoken: string[];
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  appliedAt?: string;
  meetUrl?: string;
  photoUrl?: string;
}

export interface AdminLandingContent {
  heroBadge: string;
  heroHeadlineStart: string;
  heroHeadlineHighlight: string;
  heroQuote: string;
  heroSubtext: string;
  heroFindFriendBtn: string;
  heroStartLivingBtn: string;
  philosophyBadge: string;
  philosophyHeading1: string;
  philosophyHeading2: string;
  philosophySubheading: string;
  philosophyPillar1Title: string;
  philosophyPillar1Desc: string;
  philosophyPillar1Tag: string;
  philosophyPillar2Title: string;
  philosophyPillar2Desc: string;
  philosophyPillar2Tag: string;
  philosophyPillar3Title: string;
  philosophyPillar3Desc: string;
  philosophyPillar3Tag: string;
  footerSlogan: string;
}

export interface StudentDictionaryEntry {
  id: string;
  word: string;
  definitionEn: string;
  partOfSpeech?: string;
  phonetic?: string;
  exampleSentenceEn?: string;
  translationPt?: string;
  sourceActivityName?: string;
  sourceDay?: DayOfWeek;
  source?: 'api' | 'offline_dict' | 'fallback' | 'custom' | 'not_found' | string;
  learnedAt?: string;
  customNotes?: string;
  notFound?: boolean;
}

export interface GoogleAccount {
  id?: string;
  uid?: string;
  email: string;
  name: string;
  role: UserRole;
  picture?: string;
  avatar?: string;
  teacherEmail?: string;
  teacherName?: string;
  level?: string;
  studentLevel?: string;
  studentName?: string;
  studentEmail?: string;
  registeredByAdmin?: boolean;
}

export interface TeacherAssignedVideo {
  id: string;
  url: string;
  videoId: string;
  title: string;
  duration?: string;
  instructions?: string;
  addedAt?: string;
}

export interface TeacherAssignedSpotify {
  id: string;
  url: string;
  title: string;
  type?: 'podcast' | 'music' | 'episode' | 'track' | 'playlist' | 'show';
  artistOrHost?: string;
  duration?: string;
  instructions?: string;
  addedAt?: string;
}

export interface RoutineItem {
  id: string;
  dayType?: DayType;
  dayOfWeek?: DayOfWeek;
  time: string;
  activityName: string;
  category?: string;
  isMandatory?: boolean;
  teacherVideos?: TeacherAssignedVideo[];
  teacherSpotify?: TeacherAssignedSpotify;
  teacherNotes?: string;
  learnedWords?: string[];
  completedToday?: boolean;
}

export interface DailyJournalEntry {
  id: string;
  date: string;
  sentence: string;
  wordsUsed: string[];
  createdAt: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  picture?: string;
  avatar?: string;
  level: EnglishLevel;
  teacherEmail?: string;
  teacherName?: string;
  routineVideoTime?: string;
  routineAudioTime?: string;
  dailyPhraseTime?: string;
  enrollmentStatus?: 'active' | 'not_enrolled' | 'cancelled';
  enrolledAt?: string;
  learningGoal?: string;
  timezone?: string;
  notificationLeadMinutes?: number;
  enableAudioChime?: boolean;
  enableBrowserNotifications?: boolean;
  onboardingCompleted?: boolean;
  streakDays?: number;
  streakCount?: number;
  points?: number;
  dailyGoalMinutes?: number;
  completedTodayMinutes?: number;
  targetAudienceCategory?: string;
  contractedLessons?: number;
  completedLessonsCount?: number;
  totalVideosWatched?: number;
  totalWordsLearned?: number;
  lastActiveDate?: string;
  languagePreference?: Language;
  dailyJournalEntries?: DailyJournalEntry[];
  dailyJournal?: Array<{ id: string; date: string; sentence: string; wordsUsed?: string[] }>;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  level: EnglishLevel;
  contractedLessons?: number;
  completedLessonsCount?: number;
  goal?: string;
  activeSince?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  timestamp?: string;
  read?: boolean;
}

export interface StudentEnrollment {
  id: string;
  studentEmail: string;
  studentName: string;
  studentLevel: EnglishLevel;
  learningGoal: string;
  teacherEmail: string;
  teacherName: string;
  status: 'active' | 'cancelled';
  enrolledAt: string;
  cancelledAt?: string;
  cancelledBy?: 'student' | 'teacher';
  cancellationReason?: string;
}

export interface TeacherMeetSettings {
  teacherEmail: string;
  meetLink: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  slotDurationMinutes?: number;
  availableDays?: DayOfWeek[];
  availableHours?: string[];
  availableHoursByDay?: Record<string, string[]>;
  timezone?: string;
}

export interface LiveLessonVocabNote {
  id: string;
  word: string;
  meaningOrTip?: string;
  exampleSentence?: string;
  partOfSpeech?: string;
  phonetic?: string;
  audioUrl?: string;
  source?: 'api' | 'offline_dict' | 'fallback' | 'custom' | string;
}

export interface LiveLessonNote {
  id: string;
  lessonId?: string;
  teacherEmail: string;
  teacherName?: string;
  studentEmail: string;
  studentName?: string;
  topic?: string;
  sessionDate: string;
  vocabulary: LiveLessonVocabNote[];
  pronunciationNotes?: string;
  grammarAndPhrasing?: string;
  generalNotes: string;
  recommendations: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LiveLesson {
  id: string;
  teacherEmail: string;
  teacherName: string;
  teacherUid?: string;
  tutorEmail?: string;
  tutorUid?: string;
  studentEmail: string;
  studentName: string;
  studentUid?: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  meetLink: string;
  calendarEventId?: string;
  calendarHtmlLink?: string;
  status: 'scheduled' | 'completed' | 'not_completed' | 'cancelled';
  completedAt?: string;
  notCompletedAt?: string;
  notCompletedResponsible?: 'student' | 'teacher';
  notCompletedReason?: string;
  deductedFromContract?: boolean;
  proposalStatus?:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'pending_student_schedule'
    | 'pending_teacher_schedule'
    | 'pending_student_reschedule'
    | 'pending_teacher_reschedule'
    | 'pending_student_cancellation'
    | 'pending_teacher_cancellation';
  proposedBy?: 'student' | 'teacher';
  proposedAt?: string;
  proposedReason?: string;
  proposedNewStartDateTime?: string;
  proposedNewEndDateTime?: string;
  rescheduleNotes?: string;
  rescheduledReason?: string;
  rescheduledBy?: 'student' | 'teacher';
  rescheduledAt?: string;
  rescheduledFrom?: {
    startDateTime: string;
    endDateTime: string;
  };
  createdAt?: string;

  // In-Session Notes & Recommendations
  liveNotes?: string;
  recommendations?: string;
  pronunciationNotes?: string;
  grammarAndPhrasing?: string;
  vocabularyNotes?: LiveLessonVocabNote[];
  notesLastSavedAt?: string;
}

export interface ChatMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  senderRole: UserRole | 'system';
  recipientEmail: string;
  recipientName: string;
  text: string;
  timestamp: string;
  lessonRefId?: string;
  isSystemNotice?: boolean;
  receiverId?: string;
  read?: boolean;
}

export interface HomeworkVocabItem {
  word: string;
  translationPt: string;
  definitionEn: string;
  exampleSentence: string;
  sourceActivityName?: string;
  sourceDay?: DayOfWeek;
}

export interface MatchingPair {
  id: string;
  word: string;
  definition: string;
  translation: string;
}

export interface FillInBlankItem {
  id: string;
  sentenceWithBlank: string;
  correctWord: string;
  options: string[];
  hintPt: string;
}

export interface SentenceWritingPrompt {
  word: string;
  hint: string;
}

export interface ReadingQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ReadingPassage {
  title: string;
  text: string;
  questions: ReadingQuestion[];
}

export interface WeeklyHomeworkData {
  id: string;
  weekLabel: string;
  studentEmail: string;
  studentName: string;
  createdAt: string;
  totalWordsCollected: number;
  vocabularyList: HomeworkVocabItem[];
  allRoutineWords?: HomeworkVocabItem[];
  matchingPairs: MatchingPair[];
  fillInBlanks: FillInBlankItem[];
  sentenceWritingPrompts: SentenceWritingPrompt[];
  readingPassage: ReadingPassage;
  isCompleted?: boolean;
  score?: number;
  submittedAt?: string;
  studentAnswers?: {
    matching?: Record<string, string>;
    fillInBlanks?: Record<string, string>;
    sentences?: Record<string, string>;
    quizAnswers?: Record<string, number>;
  };
}

export interface WordFeedback {
  original: string;
  hasError: boolean;
  corrected: string;
  explanationPt: string;
  explanationEn: string;
}

export interface SentenceFeedback {
  original: string;
  hasError: boolean;
  corrected: string;
  explanationPt: string;
  explanationEn: string;
}

export interface WritingEvaluationResult {
  hasAnyError: boolean;
  wordFeedbacks: WordFeedback[];
  sentenceFeedback?: SentenceFeedback;
  correctedSentence?: string;
  explanation?: string;
  overallSummaryPt?: string;
  overallSummaryEn?: string;
}
