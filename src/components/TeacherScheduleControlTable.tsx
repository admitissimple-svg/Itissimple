import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle,
  AlertTriangle,
  Settings,
  CalendarPlus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  RotateCcw,
  MinusCircle,
  Sparkles,
  Globe,
} from 'lucide-react';
import { LiveLesson, GoogleAccount, TeacherMeetSettings, DayOfWeek, Language } from '../types';
import { Translations } from '../utils/i18n';
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getTimezoneDisplayLabel,
  generate30MinTimeSlots,
  DEFAULT_TEACHER_TIMEZONE,
} from '../utils/timezone';

interface TeacherScheduleControlTableProps {
  lessons: LiveLesson[];
  teachers: GoogleAccount[];
  students: GoogleAccount[];
  teacherMeetSettings: Record<string, TeacherMeetSettings>;
  currentAccount: GoogleAccount | null;
  onOpenScheduleModal: () => void;
  onOpenTeacherMeetConfig: (teacherEmail: string) => void;
  onOpenEditProfile?: () => void;
  onCompleteLesson: (lessonId: string) => void;
  onMarkNotCompleted: (lesson: LiveLesson) => void;
  onRescheduleLesson: (lesson: LiveLesson) => void;
  currentLanguage: Language;
  t: Translations;
  timeZone?: string;
}

export const TeacherScheduleControlTable: React.FC<TeacherScheduleControlTableProps> = ({
  lessons,
  teachers,
  students,
  teacherMeetSettings,
  currentAccount,
  onOpenScheduleModal,
  onOpenTeacherMeetConfig,
  onOpenEditProfile,
  onCompleteLesson,
  onMarkNotCompleted,
  onRescheduleLesson,
  currentLanguage,
  t,
  timeZone = DEFAULT_TEACHER_TIMEZONE,
}) => {
  const isEn = currentLanguage === 'en';
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const filteredLessons = lessons.filter((lesson) => {
    if (selectedStudentFilter !== 'all' && lesson.studentEmail !== selectedStudentFilter) {
      return false;
    }
    if (selectedStatusFilter !== 'all' && lesson.status !== selectedStatusFilter) {
      return false;
    }
    return true;
  });

  const teacherEmailKey = currentAccount?.email || 'charles.lambert1939@gmail.com';
  const activeTeacherSettings = teacherMeetSettings[teacherEmailKey] || {
    teacherEmail: teacherEmailKey,
    meetLink: 'https://meet.google.com/gmt-kxnw-zpq',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    slotDurationMinutes: 30,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    timezone: 'America/Sao_Paulo',
  };

  return (
    <div className="bg-white rounded-3xl border border-[#607EC9]/30 shadow-sm p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#9AB4FF]/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#062863] text-white flex items-center justify-center border border-[#1C4C96] shadow-xs">
            <Calendar className="w-6 h-6 text-[#9AB4FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg sm:text-xl text-[#000035] tracking-tight">
                {isEn ? 'Native Friend Master Schedule & Control' : 'Painel Geral de Aulas e Horários do Amigo Nativo'}
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#9AB4FF]/25 text-[#062863] border border-[#9AB4FF]">
                30-min Grid
              </span>
            </div>
            <p className="text-xs text-[#607EC9] font-medium mt-0.5">
              {isEn
                ? 'Manage all 1-on-1 scheduled sessions, student attendance, and availability'
                : 'Controle de agendamentos individuais, presenças e disponibilidade por aluno'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenEditProfile && (
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="px-3.5 py-2 bg-[#F4CA54] hover:bg-[#F4CA54]/90 text-[#000035] rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-400"
            >
              <span>✏️</span>
              <span>{isEn ? 'Edit My Presentation Profile' : 'Editar Meu Perfil de Apresentação'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenTeacherMeetConfig(currentAccount?.email || 'charles.lambert1939@gmail.com')}
            className="px-3.5 py-2 bg-white hover:bg-[#9AB4FF]/15 border border-[#607EC9]/40 rounded-xl text-xs font-bold text-[#062863] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Settings className="w-4 h-4 text-[#1C4C96]" />
            <span>{isEn ? 'Meet & Time Slots Config' : 'Configurar Horários e Fuso'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="px-4 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CalendarPlus className="w-4 h-4 text-[#9AB4FF]" />
            <span>{isEn ? 'New Lesson Booking' : 'Novo Agendamento'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#9AB4FF]/10 rounded-2xl border border-[#607EC9]/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-[#1C4C96]" />
          <span className="text-xs font-bold text-[#000035]">
            {isEn ? 'Filter by Student:' : 'Filtrar por Aluno:'}
          </span>
          <select
            value={selectedStudentFilter}
            onChange={(e) => setSelectedStudentFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:outline-none focus:ring-2 focus:ring-[#1C4C96]"
          >
            <option value="all">{isEn ? 'All Students' : 'Todos os Alunos'}</option>
            {students.map((st) => (
              <option key={st.email} value={st.email}>
                {st.name} ({st.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#000035]">
            {isEn ? 'Status:' : 'Status:'}
          </span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:outline-none focus:ring-2 focus:ring-[#1C4C96]"
          >
            <option value="all">{isEn ? 'All Statuses' : 'Todos os Status'}</option>
            <option value="scheduled">{isEn ? 'Scheduled / Active' : 'Agendadas'}</option>
            <option value="completed">{isEn ? 'Completed' : 'Concluídas'}</option>
            <option value="not_completed">{isEn ? 'Not Completed' : 'Não Realizadas'}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#607EC9]/30">
        <table className="w-full text-left text-xs text-[#000035]">
          <thead className="bg-[#000035] text-white uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="p-3.5">{isEn ? 'Date & Time' : 'Data & Horário'}</th>
              <th className="p-3.5">{isEn ? 'Student' : 'Aluno'}</th>
              <th className="p-3.5">{isEn ? 'Lesson Title' : 'Tema da Aula'}</th>
              <th className="p-3.5">{isEn ? 'Status' : 'Status'}</th>
              <th className="p-3.5 text-right">{isEn ? 'Actions' : 'Ações'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#9AB4FF]/20 bg-white">
            {filteredLessons.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[#607EC9] font-medium">
                  {isEn ? 'No lessons matching selected filters.' : 'Nenhuma aula encontrada para os filtros selecionados.'}
                </td>
              </tr>
            ) : (
              filteredLessons.map((lesson) => {
                const isScheduled = lesson.status === 'scheduled';
                const isCompleted = lesson.status === 'completed';
                const isNotCompleted = lesson.status === 'not_completed';

                return (
                  <tr key={lesson.id} className="hover:bg-[#9AB4FF]/10 transition">
                    <td className="p-3.5 whitespace-nowrap font-bold text-[#062863]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#1C4C96]" />
                        <span>
                          {formatDateInTimeZone(lesson.startDateTime, timeZone, isEn ? 'en' : 'pt')} •{' '}
                          {formatTimeInTimeZone(lesson.startDateTime, timeZone)} -{' '}
                          {formatTimeInTimeZone(lesson.endDateTime, timeZone)}
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-[#000035]">{lesson.studentName}</div>
                      <div className="text-[11px] text-[#607EC9]">{lesson.studentEmail}</div>
                    </td>

                    <td className="p-3.5 font-medium text-[#000035] max-w-xs truncate">
                      {lesson.title}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {isScheduled && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#9AB4FF]/25 text-[#062863] border border-[#9AB4FF]">
                          {isEn ? 'Scheduled' : 'Agendada'}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#062863] text-white">
                          {isEn ? '✓ Completed' : '✓ Concluída'}
                        </span>
                      )}
                      {isNotCompleted && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          {isEn ? 'Not Completed' : 'Não Realizada'}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={lesson.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-lg transition"
                          title="Open Google Meet"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </a>

                        {isScheduled && (
                          <>
                            <button
                              type="button"
                              onClick={() => onCompleteLesson(lesson.id)}
                              className="px-2.5 py-1 bg-[#062863] hover:bg-[#000035] text-white font-bold rounded-lg text-[11px] transition cursor-pointer"
                              title="Mark Completed"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => onMarkNotCompleted(lesson)}
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px] border border-amber-300 transition cursor-pointer"
                              title="Mark Not Completed"
                            >
                              ✗
                            </button>
                            <button
                              type="button"
                              onClick={() => onRescheduleLesson(lesson)}
                              className="px-2 py-1 bg-white hover:bg-[#9AB4FF]/20 text-[#062863] font-bold rounded-lg text-[11px] border border-[#607EC9]/40 transition cursor-pointer"
                              title="Reschedule"
                            >
                              🔄
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
