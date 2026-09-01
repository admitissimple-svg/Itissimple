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
import { GoogleAccount, TeacherMeetSettings, DayOfWeek, Language } from '../types';
import { Translations } from '../utils/i18n';
import { generateGoogleCalendarWebLink } from '../utils/calendar';
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getTimezoneDisplayLabel,
  generate30MinTimeSlots,
  DEFAULT_STUDENT_TIMEZONE,
  DEFAULT_TEACHER_TIMEZONE,
} from '../utils/timezone';

interface LiveLessonScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAccount | null;
  teachers: GoogleAccount[];
  students: GoogleAccount[];
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
}

export const LiveLessonScheduleModal: React.FC<LiveLessonScheduleModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  teachers,
  students,
  teacherMeetSettings,
  onSchedule,
  currentLanguage,
  t,
  timeZone,
}) => {
  if (!isOpen) return null;

  const isEn = currentLanguage === 'en';
  const isTeacher = currentAccount ? (currentAccount.role === 'teacher' || currentAccount.role === 'admin') : false;
  const activeTz = timeZone || (isTeacher ? DEFAULT_TEACHER_TIMEZONE : DEFAULT_STUDENT_TIMEZONE);

  const defaultTeacherEmail = teachers[0]?.email || 'itissimple.school@gmail.com';
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState<string>(
    isTeacher && currentAccount ? currentAccount.email : defaultTeacherEmail
  );

  const defaultStudent =
    students.find((s) => s.email.toLowerCase() === 'reginahelena1980@gmail.com') ||
    students[0] || {
      email: 'reginahelena1980@gmail.com',
      name: 'Regina Helena',
      role: 'student',
    };

  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>(
    !isTeacher && currentAccount ? currentAccount.email : defaultStudent.email
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('09:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [customTitle, setCustomTitle] = useState<string>('Aula de Conversação e Rotina (Google Meet)');
  const [notes, setNotes] = useState<string>('Prática ao vivo e revisão dos vocabulários da rotina.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<boolean>(false);

  const activeTeacherSettings: TeacherMeetSettings = teacherMeetSettings[selectedTeacherEmail] || {
    teacherEmail: selectedTeacherEmail,
    meetLink: 'https://meet.google.com/gmt-kxnw-zpq',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    slotDurationMinutes: 30,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    timezone: 'America/Sao_Paulo',
  };

  const selectedTeacherObj = teachers.find((t) => t.email === selectedTeacherEmail) || {
    name: 'It is Simple Teacher',
    email: selectedTeacherEmail,
  };

  const selectedStudentObj = students.find((s) => s.email === selectedStudentEmail) || {
    name: !isTeacher && currentAccount ? currentAccount.name : defaultStudent.name,
    email: selectedStudentEmail,
  };

  const timeSlots = useMemo(() => {
    return generate30MinTimeSlots(
      activeTeacherSettings.workingHoursStart || '08:00',
      activeTeacherSettings.workingHoursEnd || '20:00'
    );
  }, [activeTeacherSettings.workingHoursStart, activeTeacherSettings.workingHoursEnd]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
              <h3 className="font-black text-base sm:text-lg text-white">
                {isEn ? 'Schedule Live 1-on-1 Lesson' : 'Agendar Aula Ao Vivo (Google Meet)'}
              </h3>
              <p className="text-xs text-[#9AB4FF] font-medium">
                {isEn ? 'Real-time synchronization with Google Calendar' : 'Sincronização com Google Calendar e Meet'}
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
                {isEn ? 'Teacher' : 'Professor(a)'}
              </label>
              {isTeacher && currentAccount ? (
                <div className="p-2.5 bg-[#9AB4FF]/10 rounded-xl border border-[#607EC9]/30 text-xs font-bold text-[#062863]">
                  {currentAccount.name} ({currentAccount.email})
                </div>
              ) : (
                <select
                  value={selectedTeacherEmail}
                  onChange={(e) => setSelectedTeacherEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
                >
                  {teachers.map((tc) => (
                    <option key={tc.email} value={tc.email}>
                      {tc.name} ({tc.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'Student' : 'Aluno(a)'}
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
                {isEn ? 'Start Time (30-min intervals)' : 'Horário de Início (Intervalos de 30 min)'}
              </label>
              <select
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                <option value={30}>30 {isEn ? 'minutes' : 'minutos'}</option>
                <option value={50}>50 {isEn ? 'minutes' : 'minutos'}</option>
                <option value={60}>60 {isEn ? 'minutes (1 hour)' : 'minutos (1 hora)'}</option>
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
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035] focus:ring-2 focus:ring-[#1C4C96] resize-none font-medium"
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
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <CalendarPlus className="w-4 h-4 text-[#9AB4FF]" />
                <span>{isSubmitting ? (isEn ? 'Scheduling...' : 'Agendando...') : isEn ? 'Confirm & Schedule' : 'Confirmar Agendamento'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
