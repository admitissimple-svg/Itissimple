import { RoutineItem, DayOfWeek } from '../types';

export const defaultRoutinesByDay: Record<DayOfWeek, RoutineItem[]> = {
  monday: [
    {
      id: 'm1',
      dayOfWeek: 'monday',
      dayType: 'weekdays',
      time: '09:00',
      activityName: 'Rotina Matinal e Café da Manhã (Vídeo)',
      category: 'morning',
      isMandatory: true,
      teacherVideos: [],
      teacherNotes: '',
      learnedWords: [],
      completedToday: false,
    },
  ],
  tuesday: [
    {
      id: 't1',
      dayOfWeek: 'tuesday',
      dayType: 'weekdays',
      time: '09:00',
      activityName: 'Rotina Matinal e Café da Manhã (Vídeo)',
      category: 'morning',
      isMandatory: true,
      teacherVideos: [],
      teacherNotes: '',
      learnedWords: [],
      completedToday: false,
    },
  ],
  wednesday: [
    {
      id: 'w1',
      dayOfWeek: 'wednesday',
      dayType: 'weekdays',
      time: '09:00',
      activityName: 'Alongamento Matinal e Hábitos Diários (Vídeo)',
      category: 'morning',
      isMandatory: true,
      teacherVideos: [],
      teacherNotes: '',
      learnedWords: [],
      completedToday: false,
    },
  ],
  thursday: [
    {
      id: 'th1',
      dayOfWeek: 'thursday',
      dayType: 'weekdays',
      time: '09:00',
      activityName: 'Planejamento do Dia e Clima (Vídeo)',
      category: 'morning',
      isMandatory: true,
      teacherVideos: [],
      teacherNotes: '',
      learnedWords: [],
      completedToday: false,
    },
  ],
  friday: [
    {
      id: 'f1',
      dayOfWeek: 'friday',
      dayType: 'weekdays',
      time: '09:00',
      activityName: 'Planos do Fim de Semana (Vídeo)',
      category: 'morning',
      isMandatory: true,
      teacherVideos: [],
      teacherNotes: '',
      learnedWords: [],
      completedToday: false,
    },
  ],
  saturday: [
    {
      id: 'sa1',
      dayOfWeek: 'saturday',
      dayType: 'weekends',
      time: '09:00',
      activityName: 'Brunch e Atividades de Lazer (Vídeo)',
      category: 'morning',
      isMandatory: true,
      teacherVideos: [],
      teacherNotes: '',
      learnedWords: [],
      completedToday: false,
    },
  ],
  sunday: [
    {
      id: 'su1',
      dayOfWeek: 'sunday',
      dayType: 'weekends',
      time: '09:00',
      activityName: 'Café da Manhã e Momento em Família (Vídeo)',
      category: 'morning',
      isMandatory: true,
      teacherVideos: [],
      teacherNotes: '',
      learnedWords: [],
      completedToday: false,
    },
  ],
};

/**
 * Creates clean, isolated initial routines for a newly registered student
 * with all days defaulted to empty/placeholder values (Choose Video) and their configured video time.
 */
export const createCleanStudentRoutines = (videoTime?: string): Record<DayOfWeek, RoutineItem[]> => {
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const res: Record<DayOfWeek, RoutineItem[]> = {} as any;
  days.forEach((day) => {
    const defaultDayList = defaultRoutinesByDay[day] || [];
    res[day] = defaultDayList.map((item) => {
      const isVideo =
        item.id.endsWith('1') ||
        (item.activityName || '').toLowerCase().includes('vídeo') ||
        (item.activityName || '').toLowerCase().includes('video');
      return {
        ...item,
        time: isVideo && videoTime ? videoTime : item.time || '09:00',
        teacherVideos: [],
        playlistId: '',
        playlistTitle: '',
        teacherNotes: '',
        learnedWords: [],
        completed: false,
        completedToday: false,
        isRepeatVideo: false,
        repeatVideo: false,
      };
    });
  });
  return res;
};
