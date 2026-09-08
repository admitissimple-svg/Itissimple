import React, { useState } from 'react';
import {
  Video,
  Plus,
  Calendar,
  ExternalLink,
  Clock,
  User,
  Check,
  X,
  RotateCcw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { LiveLesson, GoogleAccount, Language } from '../types';
import { Translations } from '../utils/i18n';
import { formatDateInTimeZone, formatTimeInTimeZone } from '../utils/timezone';
import { CancelLessonModal } from './CancelLessonModal';
import { generateGoogleCalendarWebLink } from '../utils/calendar';

interface LiveMeetLessonsPanelProps {
  lessons: LiveLesson[];
  currentAccount: GoogleAccount | null;
  isTeacher?: boolean;
  selectedStudentFilter?: string;
  onOpenScheduleModal: () => void;
  onRescheduleLesson?: (lesson: LiveLesson) => void;
  onCancelLesson?: (lessonId: string, reason?: string) => void;
  onAcceptReschedule?: (lessonId: string) => void;
  onDeclineReschedule?: (lessonId: string) => void;
  onCompleteLesson?: (lessonId: string) => void;
  onMarkNotCompleted?: (lesson: LiveLesson) => void;
  currentLanguage: Language;
  t: Translations;
  timeZone?: string;
}

export const LiveMeetLessonsPanel: React.FC<LiveMeetLessonsPanelProps> = ({
  lessons,
  currentAccount,
  isTeacher = false,
  selectedStudentFilter,
  onOpenScheduleModal,
  onRescheduleLesson,
  onCancelLesson,
  onAcceptReschedule,
  onDeclineReschedule,
  onCompleteLesson,
  onMarkNotCompleted,
  currentLanguage,
  t,
  timeZone = 'America/Sao_Paulo',
}) => {
  const isEn = currentLanguage === 'en';
  const [lessonToCancel, setLessonToCancel] = useState<LiveLesson | null>(null);
  const [confirmingCompleteLessonId, setConfirmingCompleteLessonId] = useState<string | null>(null);

  const handleCancelClick = (lesson: LiveLesson) => {
    setLessonToCancel(lesson);
  };

  // Filter active scheduled lessons
  const activeScheduledLessons = lessons.filter((l) => {
    if (l.status !== 'scheduled' || l.cancelledAt) return false;
    if (isTeacher) {
      // In teacher view, show scheduled lessons for this teacher
      if (currentAccount?.email) {
        const matchesTeacher =
          (l.teacherEmail || '').toLowerCase() === currentAccount.email.toLowerCase() ||
          !l.teacherEmail;
        if (!matchesTeacher) return false;
      }
      // If student filter is active
      if (selectedStudentFilter && selectedStudentFilter !== 'all') {
        return (l.studentEmail || '').toLowerCase() === selectedStudentFilter.toLowerCase();
      }
      return true;
    } else {
      // In student view, show scheduled lessons for this student
      if (currentAccount?.email) {
        return (l.studentEmail || '').toLowerCase() === currentAccount.email.toLowerCase();
      }
      return true;
    }
  });

  return (
    <div
      className="bg-white rounded-3xl p-5 border border-[#607EC9]/30 shadow-xs space-y-4"
      id="live-meet-lessons-panel"
    >
      {/* Header with Title & Schedule Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#9AB4FF]/30 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#000035] text-white flex items-center justify-center shrink-0 border border-[#9AB4FF]/40 shadow-xs">
            <Video className="w-5 h-5 text-[#9AB4FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm sm:text-base text-[#000035] tracking-tight">
                {isEn
                  ? 'Live 1-on-1 Sessions with Your Native Friend'
                  : 'Aulas Ao Vivo 1-a-1 com Seu Amigo Nativo'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#062863] text-[10px] font-extrabold border border-[#9AB4FF]/50">
                Google Meet & Calendar
              </span>
            </div>
            <p className="text-xs text-[#607EC9] mt-0.5">
              {isEn
                ? 'Schedule custom 25 or 50-minute practice sessions via Google Meet'
                : 'Agende sessões personalizadas de 25 ou 50 minutos de conversa via Google Meet'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenScheduleModal}
          className="px-4 py-2.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 border border-[#9AB4FF]/40 active:scale-98"
        >
          <Plus className="w-4 h-4 text-[#9AB4FF]" />
          <span>{isEn ? '+ Schedule Session with Native Friend' : '+ Agendar Sessão com Amigo Nativo'}</span>
        </button>
      </div>

      {/* Section Label: ACTIVE SCHEDULED LESSONS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#062863]">
            {isEn
              ? `ACTIVE SCHEDULED LESSONS (${activeScheduledLessons.length})`
              : `AULAS AGENDADAS ATIVAS (${activeScheduledLessons.length})`}
          </span>
        </div>

        {/* Lessons List or Empty State */}
        {activeScheduledLessons.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-[#9AB4FF]/40 bg-[#9AB4FF]/5 flex flex-col items-center justify-center text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#9AB4FF]/20 text-[#1C4C96] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-[#000035]">
              {isEn ? 'No live lessons scheduled right now' : 'Nenhuma aula ao vivo agendada no momento'}
            </p>
            <p className="text-[11px] text-[#607EC9]">
              {isEn
                ? 'Click "+ Schedule Session with Native Friend" above to pick your preferred day and time.'
                : 'Clique em "+ Agendar Sessão com Amigo Nativo" acima para escolher seu dia e horário.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeScheduledLessons.map((lesson) => {
              const hasPendingProposal = !!lesson.proposalStatus;
              const isProposalForMe =
                (isTeacher && lesson.proposalStatus === 'pending_teacher_reschedule') ||
                (!isTeacher && lesson.proposalStatus === 'pending_student_reschedule');
              const isMyPendingProposal =
                (isTeacher && lesson.proposalStatus === 'pending_student_reschedule') ||
                (!isTeacher && lesson.proposalStatus === 'pending_teacher_reschedule');

              const calendarUrl = (() => {
                if (lesson.calendarHtmlLink) return lesson.calendarHtmlLink;
                try {
                  const endDateTime =
                    lesson.endDateTime ||
                    new Date(new Date(lesson.startDateTime).getTime() + 25 * 60 * 1000).toISOString();
                  return generateGoogleCalendarWebLink({
                    title: lesson.title || (isEn ? 'Live 1-on-1 English Session' : 'Aula Ao Vivo de Inglês 1-a-1'),
                    description:
                      lesson.description ||
                      (isEn
                        ? 'Live 1-on-1 English practice session with your Native Friend via Google Meet.'
                        : 'Sessão prática de inglês 1-a-1 ao vivo com seu Amigo Nativo via Google Meet.'),
                    startDateTime: lesson.startDateTime,
                    endDateTime,
                    studentEmail: lesson.studentEmail,
                    studentName: lesson.studentName,
                    teacherEmail: lesson.teacherEmail,
                    teacherName: lesson.teacherName,
                    meetLink: lesson.meetLink || 'https://meet.google.com/gmt-kxnw-zpq',
                  });
                } catch {
                  return 'https://calendar.google.com/calendar/r';
                }
              })();

              return (
                <div
                  key={lesson.id}
                  className={`p-3.5 rounded-2xl border shadow-2xs transition flex flex-col justify-between gap-3 ${
                    hasPendingProposal
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-slate-50/90 border-[#607EC9]/30 hover:border-[#607EC9]'
                  }`}
                >
                    <div className="space-y-2.5">
                      {/* Top Row: Lesson info on the left, Meet, Calendar, Remarcar e Cancelar on the right */}
                      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#000035] text-[#9AB4FF] flex items-center justify-center shrink-0 border border-[#9AB4FF]/30">
                            <Video className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-[#000035] truncate">
                                {isTeacher
                                  ? lesson.studentName || lesson.studentEmail || (isEn ? 'Student' : 'Aluno')
                                  : lesson.title || (isEn ? 'Conversation Practice' : 'Prática de Conversação')}
                              </span>
                            </div>
                            {isTeacher && lesson.title && (
                              <p className="text-[11px] text-[#000035] font-semibold truncate mt-0.5">
                                {lesson.title}
                              </p>
                            )}
                            <p className="text-[11px] text-[#607EC9] mt-0.5 flex items-center gap-1 whitespace-nowrap">
                              <Clock className="w-3 h-3 text-[#1C4C96] shrink-0" />
                              <span>
                                {formatDateInTimeZone(lesson.startDateTime, timeZone, isEn ? 'en' : 'pt')} • {formatTimeInTimeZone(lesson.startDateTime, timeZone)}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Botões na Linha de Cima: Meet, Google Calendar, Remarcar e Cancelar */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0 flex-wrap">
                          {/* Meet Room Link */}
                          {lesson.meetLink && (
                            <a
                              href={lesson.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title={isEn ? 'Join Google Meet' : 'Acessar sala do Google Meet'}
                            >
                              <span>Meet</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {/* Sincronização / Link do Google Calendar */}
                          <a
                            href={calendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-white hover:bg-[#9AB4FF]/15 border border-[#607EC9]/40 text-[#062863] rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer shrink-0"
                            title={isEn ? 'Sync with Google Calendar' : 'Sincronizar com o Google Calendar'}
                          >
                            <Calendar className="w-3 h-3 text-[#1C4C96]" />
                            <span className="hidden sm:inline">Google Calendar</span>
                            <span className="sm:hidden">Calendar</span>
                            <ExternalLink className="w-2.5 h-2.5 text-[#607EC9]" />
                          </a>

                          {/* Remarcar */}
                          {onRescheduleLesson && (
                            <button
                              type="button"
                              onClick={() => onRescheduleLesson(lesson)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-[#062863] rounded-xl text-[11px] font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                              title={isEn ? 'Reschedule lesson' : 'Remarcar data/horário'}
                            >
                              <RotateCcw className="w-3 h-3 text-[#1C4C96]" />
                              <span>{isEn ? 'Reschedule' : 'Remarcar'}</span>
                            </button>
                          )}

                          {/* Cancelar */}
                          {onCancelLesson && (
                            <button
                              type="button"
                              onClick={() => handleCancelClick(lesson)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                              title={isEn ? 'Cancel lesson (no deduction)' : 'Cancelar aula (não desconta saldo)'}
                            >
                              <span>{isEn ? 'Cancel' : 'Cancelar'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Confirmação de Aula Realizada e Não Realizada */}
                      {(onCompleteLesson || onMarkNotCompleted) && (
                        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end gap-2 flex-wrap">
                          {/* Confirmação de Aula Realizada */}
                          {confirmingCompleteLessonId === lesson.id ? (
                            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 px-2 py-1 rounded-xl text-[11px] animate-in fade-in shadow-2xs">
                              <span className="font-bold text-emerald-950 text-[10px] whitespace-nowrap">
                                {isEn ? 'Confirm completed?' : 'Confirmar realizada?'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onCompleteLesson) onCompleteLesson(lesson.id);
                                  setConfirmingCompleteLessonId(null);
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition cursor-pointer"
                              >
                                {isEn ? 'Yes' : 'Sim'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingCompleteLessonId(null)}
                                className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            onCompleteLesson && (
                              <button
                                type="button"
                                onClick={() => setConfirmingCompleteLessonId(lesson.id)}
                                className="px-3 py-1.5 bg-[#062863] hover:bg-[#000035] text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs border border-[#1C4C96]"
                                title={isEn ? 'Confirm lesson was completed' : 'Confirmar se a aula foi realizada'}
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-[#9AB4FF]" />
                                <span>{isEn ? 'Completed' : 'Realizada'}</span>
                              </button>
                            )
                          )}

                          {/* Confirmação de Aula Não Realizada */}
                          {onMarkNotCompleted && (
                            <button
                              type="button"
                              onClick={() => onMarkNotCompleted(lesson)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                              title={isEn ? 'Mark as not held / not completed' : 'Informar que a aula não foi realizada'}
                            >
                              <XCircle className="w-3.5 h-3.5 text-amber-700" />
                              <span>{isEn ? 'Not Done' : 'Não Realizada'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reschedule Proposal Details & Action Buttons */}
                    {isProposalForMe && lesson.proposedNewStartDateTime && (
                      <div className="p-2.5 bg-amber-100/80 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-amber-900 block">
                            {isEn ? '📅 Reschedule Requested by the other participant:' : '📅 Reagendamento Solicitado:'}
                          </span>
                          <span className="font-bold text-[#000035]">
                            {formatDateInTimeZone(lesson.proposedNewStartDateTime, timeZone, isEn ? 'en' : 'pt')} • {formatTimeInTimeZone(lesson.proposedNewStartDateTime, timeZone)}
                          </span>
                          {lesson.rescheduleNotes && (
                            <p className="text-[11px] text-amber-800 italic">
                              "{lesson.rescheduleNotes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onAcceptReschedule && (
                            <button
                              type="button"
                              onClick={() => onAcceptReschedule(lesson.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Accept' : 'Aceitar'}</span>
                            </button>
                          )}
                          {onDeclineReschedule && (
                            <button
                              type="button"
                              onClick={() => onDeclineReschedule(lesson.id)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Decline' : 'Recusar'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {isMyPendingProposal && lesson.proposedNewStartDateTime && (
                      <div className="p-2 bg-amber-100/50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                        <span>
                          ⏳ {isEn ? 'Waiting for confirmation to move to:' : 'Aguardando confirmação para:'}{' '}
                          <strong>
                            {formatDateInTimeZone(lesson.proposedNewStartDateTime, timeZone, isEn ? 'en' : 'pt')} às {formatTimeInTimeZone(lesson.proposedNewStartDateTime, timeZone)}
                          </strong>
                        </span>
                        {onDeclineReschedule && (
                          <button
                            type="button"
                            onClick={() => onDeclineReschedule(lesson.id)}
                            className="text-[10px] text-amber-800 underline hover:text-amber-950 font-bold cursor-pointer"
                          >
                            {isEn ? 'Withdraw request' : 'Cancelar pedido'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Cancel Lesson Confirmation Modal */}
      <CancelLessonModal
        isOpen={!!lessonToCancel}
        onClose={() => setLessonToCancel(null)}
        lesson={lessonToCancel}
        onConfirmCancel={(lessonId, reason) => {
          if (onCancelLesson) {
            onCancelLesson(lessonId, reason);
          }
          setLessonToCancel(null);
        }}
        currentLanguage={currentLanguage}
        timeZone={timeZone}
      />
    </div>
  );
};
