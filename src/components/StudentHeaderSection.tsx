import React, { useState } from 'react';
import {
  Award,
  Edit3,
  CheckCircle,
  Hourglass,
  CalendarClock,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import {
  LiveLesson,
  GoogleAccount,
  TeacherMeetSettings,
  Language,
  UserProfile,
} from '../types';
import { Translations } from '../utils/i18n';
import { LiveMeetLessonsPanel } from './LiveMeetLessonsPanel';

interface StudentHeaderSectionProps {
  lessons: LiveLesson[];
  currentAccount: GoogleAccount | null;
  userProfile?: UserProfile | null;
  teachers?: GoogleAccount[];
  teacherMeetSettings?: Record<string, TeacherMeetSettings>;
  contractedLessons?: Record<string, number>;
  onUpdateContractedLessons?: (studentEmail: string, totalContracted: number) => void;
  onOpenScheduleModal: () => void;
  onOpenManageSubscription?: () => void;
  onCancelLesson?: (
    lessonId: string,
    reason?: string,
    cancelledBy?: 'student' | 'teacher'
  ) => void;
  onAcceptReschedule?: (lessonId: string) => void;
  onDeclineReschedule?: (lessonId: string) => void;
  onCompleteLesson?: (lessonId: string) => void;
  onMarkNotCompleted?: (lesson: LiveLesson) => void;
  onRescheduleLesson?: (lesson: LiveLesson) => void;
  currentLanguage: Language;
  t: Translations;
  timeZone?: string;
}

export const StudentHeaderSection: React.FC<StudentHeaderSectionProps> = ({
  lessons,
  currentAccount,
  userProfile,
  teachers = [],
  teacherMeetSettings = {},
  contractedLessons = {},
  onUpdateContractedLessons,
  onOpenScheduleModal,
  onOpenManageSubscription,
  onCancelLesson,
  onAcceptReschedule,
  onDeclineReschedule,
  onCompleteLesson,
  onMarkNotCompleted,
  onRescheduleLesson,
  currentLanguage,
  t,
  timeZone = 'America/Sao_Paulo',
}) => {
  const isEn = currentLanguage === 'en';
  const studentEmail = currentAccount?.email || '';

  // Native Friend assigned to this student from userProfile
  const assignedTeacherEmail = (userProfile?.teacherEmail || '').toLowerCase().trim();
  const assignedTeacherName = userProfile?.teacherName || '';
  const assignedTeacher = assignedTeacherEmail
    ? (teachers.find((tc) => tc.email.toLowerCase() === assignedTeacherEmail) || {
        name: assignedTeacherName || assignedTeacherEmail.split('@')[0],
        email: assignedTeacherEmail,
        role: 'teacher' as const,
      })
    : null;

  // Contract calculation: default to 0 for new students without contracts
  const totalContractedCount =
    contractedLessons[studentEmail] !== undefined
      ? contractedLessons[studentEmail]
      : (userProfile?.contractedLessons ?? 0);

  const [isEditingContract, setIsEditingContract] = useState<boolean>(false);
  const [contractInputVal, setContractInputVal] = useState<number>(totalContractedCount);

  const studentLessons = [...lessons]
    .filter((l) => (l.studentEmail || '').toLowerCase() === studentEmail.toLowerCase())
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  // 2. Realizadas: Quando o aluno confirma a aula através do botão "Realizada" ou quando o aluno cancela a aula por motivo próprio
  const studentRealizadasCount = studentLessons.filter((l) => {
    if (l.status === 'completed') return true;
    if (l.status === 'cancelled' && (l.cancelledBy === 'student' || !l.cancelledBy)) return true;
    if (l.status === 'not_completed' && l.notCompletedResponsible === 'student') return true;
    return false;
  }).length;

  // 3. Saldo restante = Contratadas - realizadas
  const studentRemainingBalance = Math.max(0, totalContractedCount - studentRealizadasCount);

  // 4. Agendadas = aulas agendadas ativas
  const activeScheduledLessons = studentLessons.filter((l) => l.status === 'scheduled' && !l.cancelledAt);
  const studentScheduledCount = activeScheduledLessons.length;

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateContractedLessons) {
      onUpdateContractedLessons(studentEmail, Math.max(0, contractInputVal));
    }
    setIsEditingContract(false);
  };

  return (
    <div className="space-y-4" id="student-header-section">
      {/* Row 1: Contracted Lessons & Balance (Left) + Fixed Teacher Card (Right) - Compact 1.5cm Height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        {/* Left: Contracted Lessons & Balance Card */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-2.5 px-3.5 border border-[#607EC9]/30 shadow-2xs flex flex-col justify-between space-y-1.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[#9AB4FF]/25 pb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs">🏆</span>
              <h3 className="font-black text-[11px] uppercase tracking-wider text-[#000035] truncate">
                {isEn ? 'Contracted Lessons & Balance' : 'Aulas Contratadas & Saldo'}
              </h3>
              <span className="text-[9px] text-[#062863] font-semibold bg-[#9AB4FF]/15 px-2 py-0.2 rounded-full border border-[#9AB4FF]/40 truncate">
                {studentEmail}
              </span>
            </div>

            <div className="shrink-0">
              {!isEditingContract ? (
                <button
                  type="button"
                  onClick={() => {
                    setContractInputVal(totalContractedCount);
                    setIsEditingContract(true);
                  }}
                  className="px-2 py-0.5 bg-[#9AB4FF]/10 hover:bg-[#9AB4FF]/25 border border-[#607EC9]/30 rounded-lg text-[10px] font-bold text-[#062863] flex items-center gap-1 transition cursor-pointer"
                  title={isEn ? 'Edit contracted lessons total' : 'Alterar total de aulas contratadas'}
                >
                  <Edit3 className="w-2.5 h-2.5 text-[#1C4C96]" />
                  <span>{isEn ? 'Edit Total' : 'Editar Total'}</span>
                </button>
              ) : (
                <form onSubmit={handleSaveContract} className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={contractInputVal}
                    onChange={(e) => setContractInputVal(parseInt(e.target.value, 10) || 0)}
                    className="w-12 px-1 py-0.2 bg-white border border-[#1C4C96] rounded text-[10px] font-black text-center text-[#000035] focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    {isEn ? 'Save' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingContract(false)}
                    className="px-1.5 py-0.2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* 4 Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {/* Metric 1: Contracted */}
            <div className="py-1 px-2 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-center">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#607EC9] leading-none">
                {isEn ? 'Contracted' : 'Contratadas'}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm sm:text-base font-black text-[#000035] leading-none">
                  {totalContractedCount}
                </span>
                <span className="text-[9px] text-[#607EC9] font-medium leading-none">
                  {isEn ? 'lessons' : 'aulas'}
                </span>
              </div>
            </div>

            {/* Metric 2: Realizadas */}
            <div className="py-1 px-2 bg-[#9AB4FF]/10 rounded-xl border border-[#9AB4FF]/40 flex flex-col justify-center">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#062863] leading-none flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5 text-[#1C4C96] shrink-0" />
                <span className="truncate">{isEn ? 'Completed' : 'Realizadas'}</span>
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm sm:text-base font-black text-[#062863] leading-none">
                  {studentRealizadasCount}
                </span>
                <span className="text-[9px] text-[#062863] font-medium leading-none">
                  {isEn ? 'completed' : 'realizadas'}
                </span>
              </div>
            </div>

            {/* Metric 3: Remaining Balance (Dark blue block with bright text) */}
            <div className="py-1 px-2 bg-[#000035] text-white rounded-xl border border-[#1C4C96] shadow-2xs flex flex-col justify-center">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#9AB4FF] leading-none flex items-center gap-0.5">
                <Hourglass className="w-2.5 h-2.5 text-[#9AB4FF] shrink-0" />
                <span className="truncate">{isEn ? 'Balance' : 'Saldo Restante'}</span>
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm sm:text-base font-black text-white leading-none">
                  {studentRemainingBalance}
                </span>
                <span className="text-[9px] text-[#9AB4FF] font-bold leading-none">
                  {isEn ? 'avail.' : 'disponíveis'}
                </span>
              </div>
            </div>

            {/* Metric 4: Scheduled Active */}
            <div className="py-1 px-2 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-center">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#607EC9] leading-none flex items-center gap-0.5">
                <CalendarClock className="w-2.5 h-2.5 text-[#1C4C96] shrink-0" />
                <span className="truncate">{isEn ? 'Scheduled' : 'Agendadas (Ativas)'}</span>
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm sm:text-base font-black text-[#000035] leading-none">
                  {studentScheduledCount}
                </span>
                <span className="text-[9px] text-[#607EC9] font-medium leading-none">
                  {isEn ? 'booked' : 'agendadas'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Amigo Nativo Card with Gerenciar Inscrição Button */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-2.5 px-3.5 border border-[#607EC9]/30 shadow-2xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar Circle with Letter initial */}
            <div className="w-9 h-9 rounded-full bg-[#000035] text-white flex items-center justify-center font-black text-sm shadow-xs border-2 border-[#9AB4FF]/50 shrink-0">
              {assignedTeacher?.name
                ? assignedTeacher.name.charAt(0).toUpperCase()
                : (assignedTeacher?.email ? assignedTeacher.email.charAt(0).toUpperCase() : 'AN')}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-black text-xs text-[#000035] truncate">
                  {assignedTeacher ? assignedTeacher.name : (isEn ? 'No Native Friend' : 'Nenhum Amigo Nativo')}
                </h4>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-[#1C4C96]/15 text-[#1C4C96] text-[9px] font-extrabold border border-[#1C4C96]/30">
                  <ShieldCheck className="w-2.5 h-2.5 text-[#1C4C96]" />
                  <span>{isEn ? 'Native Friend' : 'Amigo Nativo'}</span>
                </span>
              </div>
              <p className="text-[10px] text-[#607EC9] truncate mt-0.5 font-medium">
                {assignedTeacher?.email || (isEn ? 'Select a native friend below' : 'Vincule seu amigo nativo')}
              </p>
            </div>
          </div>

          {/* Gerenciar Inscrição / Escolher Amigo Button */}
          {onOpenManageSubscription && (
            <button
              type="button"
              onClick={onOpenManageSubscription}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs active:scale-98 ${
                assignedTeacher
                  ? 'bg-[#1C4C96] hover:bg-[#062863] text-white border border-[#9AB4FF]/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/60 shadow-xs'
              }`}
              title={isEn ? 'Manage Native Friend subscription & packages' : 'Gerenciar Amigo Nativo e pacotes de aulas'}
            >
              <UserCheck className={`w-3 h-3 ${assignedTeacher ? 'text-[#9AB4FF]' : 'text-emerald-200'}`} />
              <span className="whitespace-nowrap">
                {assignedTeacher
                  ? (isEn ? 'Manage' : 'Gerenciar Inscrição')
                  : (isEn ? 'Choose Friend & Package' : 'Escolher Amigo & Aulas')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Live 1-on-1 Sessions with Your Native Friend */}
      <LiveMeetLessonsPanel
        lessons={studentLessons}
        currentAccount={currentAccount}
        isTeacher={false}
        onOpenScheduleModal={onOpenScheduleModal}
        onRescheduleLesson={onRescheduleLesson}
        onCancelLesson={onCancelLesson}
        onAcceptReschedule={onAcceptReschedule}
        onDeclineReschedule={onDeclineReschedule}
        onCompleteLesson={onCompleteLesson}
        onMarkNotCompleted={onMarkNotCompleted}
        currentLanguage={currentLanguage}
        t={t}
        timeZone={timeZone}
      />
    </div>
  );
};
