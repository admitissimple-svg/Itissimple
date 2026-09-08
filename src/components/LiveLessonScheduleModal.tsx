import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Video,
  User,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Send,
  Sparkles,
  CheckCircle2,
  CalendarPlus,
  HelpCircle,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { GoogleAccount, TeacherMeetSettings, DayOfWeek, Language, UserProfile, LiveLesson } from '../types';
import { Translations } from '../utils/i18n';
import { generateGoogleCalendarWebLink } from '../utils/calendar';
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getTimezoneDisplayLabel,
  generate30MinTimeSlots,
  formatTimeSlot12h,
  findTeacherLessonConflict,
  DEFAULT_STUDENT_TIMEZONE,
  DEFAULT_TEACHER_TIMEZONE,
} from '../utils/timezone';

interface LiveLessonScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAccount | null;
  teachers: GoogleAccount[];
  students: GoogleAccount[];
  lessons?: LiveLesson[];
  initialTeacherEmail?: string;
  teacherMeetSettings: Record<string, TeacherMeetSettings>;
  onSchedule: (lessonData: {
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    studentEmail: string;
    studentName: string;
    teacherEmail: string;
    teacherName: string;
    meetLink: string;
  }) => Promise<void> | void;
  currentLanguage: Language;
  t: Translations;
  timeZone?: string;
  userProfile?: UserProfile | null;
}

export const LiveLessonScheduleModal: React.FC<LiveLessonScheduleModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  teachers,
  students,
  lessons = [],
  initialTeacherEmail,
  teacherMeetSettings,
  onSchedule,
  currentLanguage,
  t,
  timeZone,
  userProfile,
}) => {
  const isTeacher = currentAccount ? (currentAccount.role === 'teacher' || currentAccount.role === 'admin') : false;
  const isEn = currentLanguage === 'en' || isTeacher;
  const activeTz = timeZone || (isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE);

  // Check if student has an active linked teacher
  const studentHasActiveTeacher = !isTeacher && Boolean(
    userProfile?.teacherEmail &&
    userProfile.teacherEmail.trim() !== '' &&
    userProfile.enrollmentStatus !== 'cancelled' &&
    userProfile.enrollmentStatus !== 'not_enrolled'
  );

  const activeStudentTeacherEmail = studentHasActiveTeacher
    ? userProfile!.teacherEmail!.toLowerCase().trim()
    : (!isTeacher && initialTeacherEmail && initialTeacherEmail.trim() !== '')
      ? initialTeacherEmail.toLowerCase().trim()
      : null;

  // Available teachers list: for students, restrict strictly to the currently linked active teacher!
  const availableTeachers = useMemo(() => {
    if (isTeacher) {
      return teachers;
    }

    if (activeStudentTeacherEmail) {
      const matched = teachers.filter(
        (tc) => (tc.email || '').toLowerCase().trim() === activeStudentTeacherEmail
      );
      if (matched.length > 0) {
        return matched;
      }
      return [
        {
          id: `teacher-${activeStudentTeacherEmail}`,
          name: userProfile?.teacherName || activeStudentTeacherEmail.split('@')[0],
          email: activeStudentTeacherEmail,
          role: 'teacher' as const,
        },
      ];
    }

    return teachers;
  }, [isTeacher, activeStudentTeacherEmail, teachers, userProfile?.teacherName]);

  const defaultTeacherEmail = isTeacher && currentAccount
    ? currentAccount.email
    : activeStudentTeacherEmail || initialTeacherEmail || teachers[0]?.email || 'itissimple.school@gmail.com';

  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState<string>(defaultTeacherEmail);

  React.useEffect(() => {
    if (activeStudentTeacherEmail) {
      setSelectedTeacherEmail(activeStudentTeacherEmail);
    } else if (initialTeacherEmail) {
      setSelectedTeacherEmail(initialTeacherEmail);
    } else if (isTeacher && currentAccount?.email) {
      setSelectedTeacherEmail(currentAccount.email);
    } else if (availableTeachers.length > 0 && !availableTeachers.some((tc) => tc.email?.toLowerCase() === selectedTeacherEmail.toLowerCase())) {
      setSelectedTeacherEmail(availableTeachers[0].email);
    }
  }, [isOpen, activeStudentTeacherEmail, initialTeacherEmail, isTeacher, currentAccount?.email, availableTeachers]);

  const defaultStudent =
    (!isTeacher && currentAccount)
      ? currentAccount
      : students[0] || {
          email: '',
          name: '',
          role: 'student' as const,
        };

  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>(
    !isTeacher && currentAccount ? currentAccount.email : defaultStudent.email
  );

  // Synchronize student email whenever modal opens or account changes
  React.useEffect(() => {
    if (!isTeacher && currentAccount?.email) {
      setSelectedStudentEmail(currentAccount.email);
    } else if (isTeacher && students.length > 0) {
      if (!selectedStudentEmail || !students.some((s) => s.email === selectedStudentEmail)) {
        setSelectedStudentEmail(students[0].email);
      }
    }
  }, [isOpen, isTeacher, currentAccount?.email, students]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('09:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);

  const [customTitle, setCustomTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<boolean>(false);

  const cleanTeacherName = (name: string) => {
    return name.replace(/\s*\(Amigo Nativo\)/gi, '').replace(/\s*\(Amiga Nativa\)/gi, '').replace(/\s*\(Native Friend\)/gi, '').trim();
  };

  const activeTeacherSettings: TeacherMeetSettings = teacherMeetSettings[selectedTeacherEmail] || {
    teacherEmail: selectedTeacherEmail,
    meetLink: 'https://meet.google.com/gmt-kxnw-zpq',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    slotDurationMinutes: 30,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    timezone: 'America/Sao_Paulo',
  };

  const selectedTeacherObj = availableTeachers.find((t) => (t.email || '').toLowerCase() === selectedTeacherEmail.toLowerCase())
    || teachers.find((t) => (t.email || '').toLowerCase() === selectedTeacherEmail.toLowerCase())
    || {
      name: userProfile?.teacherName || 'It is Simple Teacher',
      email: selectedTeacherEmail,
    };

  const effectiveStudentEmail = (!isTeacher && currentAccount?.email)
    ? currentAccount.email.trim().toLowerCase()
    : (selectedStudentEmail || (currentAccount?.email ?? '')).trim().toLowerCase();

  const effectiveStudentName = (!isTeacher && currentAccount?.name)
    ? currentAccount.name.trim()
    : (students.find((s) => (s.email || '').toLowerCase() === effectiveStudentEmail)?.name || currentAccount?.name || 'Aluno').trim();

  const selectedStudentObj = {
    name: effectiveStudentName,
    email: effectiveStudentEmail,
  };

  // Check which day of week is selected
  const selectedDayKey = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayIndex = dateObj.getDay();
      const map: Record<number, DayOfWeek> = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
      };
      return map[dayIndex] || 'monday';
    } catch {
      return 'monday';
    }
  }, [selectedDate]);

  const isDayAvailable = useMemo(() => {
    if (!activeTeacherSettings.availableDays || activeTeacherSettings.availableDays.length === 0) return true;
    return activeTeacherSettings.availableDays.includes(selectedDayKey);
  }, [activeTeacherSettings.availableDays, selectedDayKey]);

  // Generate 30-minute time slots based on teacher settings
  const timeSlots = useMemo(() => {
    if (activeTeacherSettings.availableHours && activeTeacherSettings.availableHours.length > 0) {
      return [...activeTeacherSettings.availableHours].sort();
    }
    return generate30MinTimeSlots(
      activeTeacherSettings.workingHoursStart || '08:00',
      activeTeacherSettings.workingHoursEnd || '20:00'
    );
  }, [activeTeacherSettings.availableHours, activeTeacherSettings.workingHoursStart, activeTeacherSettings.workingHoursEnd]);

  // Adjust selectedStartTime if not in timeSlots
  React.useEffect(() => {
    if (timeSlots.length > 0 && !timeSlots.includes(selectedStartTime)) {
      setSelectedStartTime(timeSlots[0]);
    }
  }, [timeSlots]);

  // Calculate start and end ISO
  const calculateEndDateTime = () => {
    if (!selectedDate || !selectedStartTime) return '';
    const [hours, mins] = selectedStartTime.split(':').map(Number);
    const start = new Date(selectedDate + 'T00:00:00');
    start.setHours(hours, mins, 0, 0);

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return end.toISOString();
  };

  const calculateStartDateTime = () => {
    if (!selectedDate || !selectedStartTime) return '';
    const [hours, mins] = selectedStartTime.split(':').map(Number);
    const start = new Date(selectedDate + 'T00:00:00');
    start.setHours(hours, mins, 0, 0);
    return start.toISOString();
  };

  // Real-time teacher lessons to ensure 100% accurate slot availability
  const [teacherLessons, setTeacherLessons] = useState<LiveLesson[]>([]);

  React.useEffect(() => {
    if (!isOpen || !selectedTeacherObj.email) return;
    const cleanTeacherEmail = selectedTeacherObj.email.toLowerCase().trim();
    fetch(`/api/lessons?teacherEmail=${encodeURIComponent(cleanTeacherEmail)}&role=teacher`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setTeacherLessons(data);
        }
      })
      .catch(() => {});
  }, [isOpen, selectedTeacherObj.email]);

  // Combine parent lessons with freshly fetched teacher lessons (deduplicating by id)
  const combinedLessons = useMemo(() => {
    const map = new Map<string, LiveLesson>();
    (lessons || []).forEach((l) => {
      if (l && l.id) map.set(l.id, l);
    });
    teacherLessons.forEach((l) => {
      if (l && l.id) map.set(l.id, l);
    });
    return Array.from(map.values());
  }, [lessons, teacherLessons]);

  // 🌟 ANTI-DUPLICITY CONFLICT DETECTION
  const currentConflict = useMemo(() => {
    if (!selectedDate || !selectedStartTime || !selectedTeacherObj.email) return null;
    const startIso = calculateStartDateTime();
    const endIso = calculateEndDateTime();
    if (!startIso || !endIso) return null;
    return findTeacherLessonConflict(selectedTeacherObj.email, startIso, endIso, combinedLessons);
  }, [selectedDate, selectedStartTime, durationMinutes, selectedTeacherObj.email, combinedLessons]);

  // Slot conflict checker for dropdown options
  const checkSlotIsBooked = (slot: string) => {
    if (!selectedDate || !selectedTeacherObj.email) return false;
    const [hours, mins] = slot.split(':').map(Number);
    const start = new Date(selectedDate + 'T00:00:00');
    start.setHours(hours, mins, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const conflict = findTeacherLessonConflict(selectedTeacherObj.email, start.toISOString(), end.toISOString(), combinedLessons);
    if (conflict) return true;

    // For 50-minute lessons (2 blocks), ensure consecutive 30-min block is configured if teacher has specific availableHours
    if (durationMinutes === 50 && activeTeacherSettings.availableHours && activeTeacherSettings.availableHours.length > 0) {
      const nextMin = mins + 30;
      const nextH = hours + Math.floor(nextMin / 60);
      const nextM = nextMin % 60;
      const nextSlot = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
      if (!activeTeacherSettings.availableHours.includes(nextSlot)) {
        return true;
      }
    }
    return false;
  };

  const isConsecutiveSlotMissing = useMemo(() => {
    if (durationMinutes !== 50 || !selectedStartTime) return false;
    if (!activeTeacherSettings.availableHours || activeTeacherSettings.availableHours.length === 0) return false;
    const [hours, mins] = selectedStartTime.split(':').map(Number);
    const nextMin = mins + 30;
    const nextH = hours + Math.floor(nextMin / 60);
    const nextM = nextMin % 60;
    const nextSlot = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
    return !activeTeacherSettings.availableHours.includes(nextSlot);
  }, [durationMinutes, selectedStartTime, activeTeacherSettings.availableHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Absolute conflict blocking
    if (currentConflict) {
      alert(
        isEn
          ? `Conflict Blocked: The Native Friend ${cleanTeacherName(selectedTeacherObj.name)} already has a lesson scheduled at this time. Please choose another slot.`
          : `Bloqueio de Conflito: O Amigo Nativo ${cleanTeacherName(selectedTeacherObj.name)} já possui uma aula agendada neste horário. Por favor, selecione outro horário.`
      );
      return;
    }

    if (isConsecutiveSlotMissing) {
      alert(
        isEn
          ? `For a 50-minute lesson (2 blocks), both consecutive time slots must be available on the Native Friend's schedule.`
          : `Para uma aula de 50 minutos (2 blocos), ambos os horários consecutivos precisam estar disponíveis na grade do Amigo Nativo.`
      );
      return;
    }

    if (!isDayAvailable) {
      alert(
        isEn
          ? `The Native Friend is not available on ${selectedDayKey}. Please select an open day.`
          : `O Amigo Nativo não atende às ${selectedDayKey === 'sunday' ? 'domingos' : selectedDayKey === 'saturday' ? 'sábados' : 'segundas-feiras'}. Por favor, escolha um dia disponível.`
      );
      return;
    }

    if (!selectedStudentObj.email) {
      alert(
        isEn
          ? 'Error: Student email not identified. Please make sure you are signed in.'
          : 'Erro: Não foi possível identificar o e-mail do aluno. Verifique se está conectado à sua conta.'
      );
      return;
    }

    setIsSubmitting(true);

    const startIso = calculateStartDateTime();
    const endIso = calculateEndDateTime();

    try {
      await onSchedule({
        title: customTitle,
        description: notes,
        startDateTime: startIso,
        endDateTime: endIso,
        studentEmail: selectedStudentObj.email,
        studentName: selectedStudentObj.name,
        teacherEmail: selectedTeacherObj.email,
        teacherName: selectedTeacherObj.name,
        meetLink: activeTeacherSettings.meetLink || 'https://meet.google.com/gmt-kxnw-zpq',
      });

      setScheduleSuccess(true);
      setTimeout(() => {
        setScheduleSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Schedule error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleCalLink = generateGoogleCalendarWebLink({
    title: customTitle,
    description: notes,
    startDateTime: calculateStartDateTime(),
    endDateTime: calculateEndDateTime(),
    studentEmail: selectedStudentObj.email,
    studentName: selectedStudentObj.name,
    teacherEmail: selectedTeacherObj.email,
    teacherName: selectedTeacherObj.name,
    meetLink: activeTeacherSettings.meetLink || 'https://meet.google.com/gmt-kxnw-zpq',
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#607EC9]/30 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#000035] text-white flex items-center justify-between border-b border-[#1C4C96]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] flex items-center justify-center text-white shadow-xs border border-[#9AB4FF]/40">
              <CalendarPlus className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  {isEn ? 'Schedule Live 1-on-1 Lesson' : 'Agendar Aula Ao Vivo (Google Meet)'}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#9AB4FF] border border-[#9AB4FF]/30">
                  30-min Grid
                </span>
              </div>
              <p className="text-xs text-[#9AB4FF] font-medium">
                {isEn ? 'Fixed 30-min blocks • Anti-duplicity schedule lock' : 'Blocos de 30 min • Trava anti-duplicidade'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9AB4FF] hover:text-white hover:bg-[#1C4C96] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {scheduleSuccess && (
            <div className="p-4 bg-[#9AB4FF]/20 border border-[#607EC9] rounded-2xl text-xs font-bold text-[#062863] flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-[#1C4C96]" />
              <span>
                {isEn
                  ? 'Lesson scheduled successfully and added to your Google Calendar!'
                  : 'Aula agendada com sucesso e adicionada à sua agenda!'}
              </span>
            </div>
          )}

          {/* Teacher / Student Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Native Friend' : 'Amigo Nativo'}
              </label>
              {isTeacher && currentAccount ? (
                <div className="p-2.5 bg-[#9AB4FF]/10 rounded-xl border border-[#607EC9]/30 text-xs font-bold text-[#062863]">
                  {cleanTeacherName(currentAccount.name)} ({currentAccount.email})
                </div>
              ) : (
                <select
                  value={selectedTeacherEmail}
                  onChange={(e) => setSelectedTeacherEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
                >
                  {availableTeachers.map((tc) => (
                    <option key={tc.email} value={tc.email}>
                      {cleanTeacherName(tc.name)} ({tc.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Your Name' : 'Seu nome'}
              </label>
              {!isTeacher && currentAccount ? (
                <div className="p-2.5 bg-[#9AB4FF]/10 rounded-xl border border-[#607EC9]/30 text-xs font-bold text-[#062863]">
                  {currentAccount.name} ({currentAccount.email})
                </div>
              ) : (
                <select
                  value={selectedStudentEmail}
                  onChange={(e) => setSelectedStudentEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
                >
                  {students.map((st) => (
                    <option key={st.email} value={st.email}>
                      {st.name} ({st.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date and Time Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Date' : 'Data da Aula'}
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Start Time (30-min Block)' : 'Horário de Início (Blocos de 30 min)'}
              </label>
              <select
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
              >
                {timeSlots.map((slot) => {
                  const isOccupied = checkSlotIsBooked(slot);
                  return (
                    <option key={slot} value={slot}>
                      {formatTimeSlot12h(slot)} {isOccupied ? (isEn ? '• ❌ [BUSY / BOOKED]' : '• ❌ [OCUPADO / JÁ AGENDADO]') : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Warning if Day is Not in Teacher's Available Days */}
          {!isDayAvailable && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                {isEn
                  ? `Notice: The Native Friend is not normally scheduled for teaching on ${selectedDayKey}. Please choose an open day or coordinate with the teacher.`
                  : `Atenção: O Amigo Nativo não configurou atendimento neste dia da semana (${selectedDayKey}). Por favor, selecione outro dia da semana.`}
              </p>
            </div>
          )}

          {/* 🚨 CONFLICT ALERT BANNER (Rule 2) */}
          {currentConflict && (
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-950 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-black text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="text-sm">
                  {isEn ? 'Time Slot Already Booked (Schedule Conflict)' : 'Horário Já Ocupado (Conflito de Horário)'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-900 font-medium">
                {isEn
                  ? `The Native Friend ${cleanTeacherName(selectedTeacherObj.name)} already has another lesson scheduled on this exact slot (${formatTimeInTimeZone(currentConflict.startDateTime, activeTz)} - ${formatTimeInTimeZone(currentConflict.endDateTime, activeTz)}${currentConflict.studentName ? ` with ${currentConflict.studentName}` : ''}). Double bookings are strictly blocked by system rules.`
                  : `O Amigo Nativo ${cleanTeacherName(selectedTeacherObj.name)} já possui uma aula agendada exatamente neste mesmo horário (${formatTimeInTimeZone(currentConflict.startDateTime, activeTz)} - ${formatTimeInTimeZone(currentConflict.endDateTime, activeTz)}${currentConflict.studentName ? ` com ${currentConflict.studentName}` : ''}). O sistema bloqueia conflitos e não permite duas aulas no mesmo slot.`}
              </p>
              <p className="text-[11px] font-black text-rose-700">
                {isEn
                  ? '👉 Please select another date or available 30-minute time slot to proceed.'
                  : '👉 Por favor, selecione outro horário disponível na grade de 30 minutos.'}
              </p>
            </div>
          )}

          {/* Consecutive slot missing alert for 50-minute lessons */}
          {isConsecutiveSlotMissing && !currentConflict && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                {isEn
                  ? `Notice: A 50-minute lesson requires two consecutive 30-minute blocks. The consecutive block starting after ${selectedStartTime} is not open on the teacher's schedule. Please select an earlier or different slot.`
                  : `Atenção: Aulas de 50 minutos requerem dois blocos consecutivos de 30 minutos. O bloco seguinte a partir de ${selectedStartTime} não está disponível na grade do professor. Selecione outro horário com ambos os blocos livres.`}
              </p>
            </div>
          )}

          {/* Duration & Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Duration' : 'Duração da Aula'}
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
              >
                <option value={25}>25 {isEn ? 'minutes (1 slot)' : 'minutos (1 bloco)'}</option>
                <option value={50}>50 {isEn ? 'minutes (2 slots)' : 'minutos (2 blocos)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Timezone' : 'Fuso Horário'}
              </label>
              <div className="p-2.5 bg-[#9AB4FF]/10 rounded-xl border border-[#607EC9]/30 text-xs font-bold text-[#062863] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span>{activeTz}</span>
              </div>
            </div>
          </div>

          {/* Title & Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Lesson Topic / Title' : 'Tema / Título da Aula'}
              </label>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={isEn ? 'e.g. Daily English Conversation Practice' : 'Ex.: Prática de Conversação Diária'}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Notes / Goals' : 'Observações e Objetivos'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isEn ? 'Focus on vocabulary, listening, job interview...' : 'Foco em vocabulário, rotina de estudos...'}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
              />
            </div>
          </div>

          {/* Meet Link Preview */}
          <div className="p-3 bg-[#9AB4FF]/10 rounded-2xl border border-[#607EC9]/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#1C4C96]" />
              <span className="font-bold text-[#000035]">Google Meet:</span>
              <span className="font-mono text-[11px] text-[#062863] truncate max-w-xs">
                {activeTeacherSettings.meetLink || 'https://meet.google.com/gmt-kxnw-zpq'}
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <a
              href={googleCalLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-[#1C4C96] hover:text-[#062863] flex items-center gap-1 self-center"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{isEn ? 'Open in Google Calendar' : 'Abrir no Google Agenda'}</span>
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#000035] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Cancelar'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || Boolean(currentConflict)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md ${
                  currentConflict
                    ? 'bg-slate-300 text-slate-500 border border-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-[#1C4C96] hover:bg-[#062863] text-white cursor-pointer'
                }`}
              >
                <CalendarPlus className="w-4 h-4 text-[#9AB4FF]" />
                <span>
                  {isSubmitting
                    ? (isEn ? 'Scheduling...' : 'Agendando...')
                    : currentConflict
                    ? (isEn ? 'Slot Unavailable (Already Booked)' : 'Horário Indisponível (Já Ocupado)')
                    : isEn ? 'Confirm & Schedule' : 'Confirmar Agendamento'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

