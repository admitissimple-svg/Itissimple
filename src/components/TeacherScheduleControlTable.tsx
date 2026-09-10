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
  Edit3,
  Trash2,
} from 'lucide-react';
import { LiveLesson, GoogleAccount, TeacherMeetSettings, DayOfWeek, Language, NativeFriendTutor } from '../types';
import { Translations } from '../utils/i18n';
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  getTimezoneDisplayLabel,
  generate30MinTimeSlots,
  DEFAULT_TEACHER_TIMEZONE,
} from '../utils/timezone';
import { CancelLessonModal } from './CancelLessonModal';
import { generateGoogleCalendarWebLink } from '../utils/calendar';

interface TeacherScheduleControlTableProps {
  lessons: LiveLesson[];
  teachers: GoogleAccount[];
  students: GoogleAccount[];
  teacherMeetSettings: Record<string, TeacherMeetSettings>;
  currentAccount: GoogleAccount | null;
  tutorProfile?: NativeFriendTutor;
  selectedStudentFilter?: string;
  onSelectStudentFilter?: (studentEmail: string) => void;
  onOpenScheduleModal?: () => void;
  onOpenTeacherMeetConfig: (teacherEmail: string) => void;
  onOpenEditProfile?: () => void;
  onCompleteLesson: (lessonId: string) => void;
  onMarkNotCompleted: (lesson: LiveLesson) => void;
  onRescheduleLesson: (lesson: LiveLesson) => void;
  onCancelLesson?: (
    lessonId: string,
    reason?: string,
    cancelledBy?: 'student' | 'teacher'
  ) => void;
  onAcceptReschedule?: (lessonId: string) => void;
  onDeclineReschedule?: (lessonId: string) => void;
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
  tutorProfile,
  selectedStudentFilter: controlledStudentFilter,
  onSelectStudentFilter,
  onOpenScheduleModal,
  onOpenTeacherMeetConfig,
  onOpenEditProfile,
  onCompleteLesson,
  onMarkNotCompleted,
  onRescheduleLesson,
  onCancelLesson,
  onAcceptReschedule,
  onDeclineReschedule,
  currentLanguage,
  t,
  timeZone = DEFAULT_TEACHER_TIMEZONE,
}) => {
  const isEn = currentLanguage === 'en';
  const [lessonToCancel, setLessonToCancel] = useState<LiveLesson | null>(null);

  const handleCancelClick = (lesson: LiveLesson) => {
    setLessonToCancel(lesson);
  };
  const [internalStudentFilter, setInternalStudentFilter] = useState<string>('all');
  const selectedStudentFilter = controlledStudentFilter !== undefined ? controlledStudentFilter : internalStudentFilter;

  const handleStudentFilterChange = (val: string) => {
    if (onSelectStudentFilter) {
      onSelectStudentFilter(val);
    } else {
      setInternalStudentFilter(val);
    }
  };

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const availableStudentsForFilter = React.useMemo(() => {
    const map = new Map<string, { email: string; name: string }>();
    const teacherEmailClean = (currentAccount?.email || '').toLowerCase().trim();
    const currentTeacherUid = (currentAccount?.id || (currentAccount as any)?.uid || '').trim();
    const isTeacher = currentAccount?.role === 'teacher';

    (students || []).forEach((st) => {
      const email = (st.email || (st as any).studentEmail || '').toLowerCase().trim();
      const name = st.name || (st as any).studentName || email.split('@')[0];
      const stTeacher = ((st as any).teacherEmail || '').toLowerCase().trim();
      const stTeacherUid = ((st as any).teacherUid || '').trim();
      const stStatus = (st as any).status || (st as any).enrollmentStatus;

      if (!email) return;

      // Filter out cancelled or unenrolled students
      if (stStatus === 'cancelled' || stStatus === 'not_enrolled') return;

      // If viewing as teacher, must match teacher's UID or email
      if (isTeacher) {
        const matchesTeacher =
          (currentTeacherUid && stTeacherUid && (currentTeacherUid === stTeacherUid || currentTeacherUid.includes(stTeacher) || stTeacherUid.includes(teacherEmailClean))) ||
          (teacherEmailClean && stTeacher && teacherEmailClean === stTeacher);
        if (!matchesTeacher) return;
      }

      map.set(email, { email, name });
    });

    // Also include students with active scheduled lessons for this teacher
    (lessons || []).forEach((l) => {
      const email = (l.studentEmail || '').toLowerCase().trim();
      const name = l.studentName || email.split('@')[0];
      const lTeacherEmail = (l.teacherEmail || (l as any).tutorEmail || '').toLowerCase().trim();
      const lTeacherUid = (l.teacherUid || (l as any).tutorUid || '').trim();

      if (isTeacher) {
        const isMyLesson =
          (currentTeacherUid && lTeacherUid && (currentTeacherUid === lTeacherUid || currentTeacherUid.includes(lTeacherEmail) || lTeacherUid.includes(teacherEmailClean))) ||
          (teacherEmailClean && lTeacherEmail && teacherEmailClean === lTeacherEmail);
        if (!isMyLesson) return;
      }

      if (email && !map.has(email) && l.status === 'scheduled') {
        map.set(email, { email, name });
      }
    });

    return Array.from(map.values());
  }, [students, lessons, currentAccount?.role, currentAccount?.email, currentAccount?.id, (currentAccount as any)?.uid]);

  const sortedLessons = [...lessons].sort((a, b) => {
    return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
  });

  const filteredLessons = sortedLessons.filter((lesson) => {
    const isTeacher = currentAccount?.role === 'teacher';
    const teacherEmailClean = (currentAccount?.email || '').toLowerCase().trim();
    const currentTeacherUid = (currentAccount?.id || (currentAccount as any)?.uid || '').trim();

    if (isTeacher) {
      const lTeacherEmail = (lesson.teacherEmail || (lesson as any).tutorEmail || '').toLowerCase().trim();
      const lTeacherUid = (lesson.teacherUid || (lesson as any).tutorUid || '').trim();
      const isMyLesson =
        (currentTeacherUid && lTeacherUid && (currentTeacherUid === lTeacherUid || currentTeacherUid.includes(lTeacherEmail) || lTeacherUid.includes(teacherEmailClean))) ||
        (teacherEmailClean && lTeacherEmail && teacherEmailClean === lTeacherEmail);
      if (!isMyLesson) return false;
    }

    if (selectedStudentFilter !== 'all') {
      const filterEmail = selectedStudentFilter.toLowerCase().trim();
      const lStudentEmail = (lesson.studentEmail || '').toLowerCase().trim();
      if (lStudentEmail !== filterEmail) {
        return false;
      }
    }
    if (selectedStatusFilter !== 'all' && lesson.status !== selectedStatusFilter) {
      return false;
    }
    return true;
  });

  const teacherEmailKey = currentAccount?.email || '';
  const activeTeacherSettings = teacherMeetSettings[teacherEmailKey] || {
    teacherEmail: teacherEmailKey,
    meetLink: 'https://meet.google.com/new',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    slotDurationMinutes: 30,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    timezone: 'America/Sao_Paulo',
  };

  return (
    <div className="bg-white rounded-2xl border border-[#607EC9]/30 shadow-xs p-3.5 sm:p-5 space-y-4" id="teacher-schedule-control-table">
      {/* 🌟 Native Friend Profile & Approval Status Header Card */}
      {tutorProfile && (
        <div className="bg-gradient-to-r from-[#000035] via-[#062863] to-[#1C4C96] rounded-2xl p-4 sm:p-5 text-white border border-[#9AB4FF]/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-[#F4CA54] shrink-0 bg-white/10 shadow-md flex items-center justify-center">
              {tutorProfile.avatar && tutorProfile.avatar.trim() !== '' ? (
                <img
                  src={tutorProfile.avatar}
                  alt={tutorProfile.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-black text-lg sm:text-xl text-white">
                  {tutorProfile.name?.slice(0, 2).toUpperCase() || 'NF'}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {tutorProfile.name}
                </h2>
                <span className="text-base">{tutorProfile.flag}</span>
                <span className="text-xs text-[#9AB4FF] font-medium">
                  {tutorProfile.country} • {tutorProfile.accent}
                </span>
              </div>
              <p className="text-xs text-white/90 line-clamp-1 mt-0.5 max-w-xl">
                {tutorProfile.headline || tutorProfile.bio}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-[#9AB4FF]">
                <span className="font-bold text-[#F4CA54]">
                  ${tutorProfile.pricePerSessionUsd}/lesson (R$ {tutorProfile.pricePerSessionBrl})
                </span>
                <span>•</span>
                <span>{tutorProfile.email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            {/* Approval Status Badge */}
            {tutorProfile.approvalStatus === 'approved' ? (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Profile Approved & Active</span>
              </div>
            ) : tutorProfile.approvalStatus === 'rejected' ? (
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-200 text-xs font-bold flex items-center gap-1.5">
                <X className="w-4 h-4 text-rose-400" />
                <span>Registration Declined</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Awaiting Administrator Approval</span>
              </div>
            )}

            {onOpenEditProfile && (
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#000035] font-black text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span>Edit My Profile</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header (100% English) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#9AB4FF]/25 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#062863] text-white flex items-center justify-center border border-[#1C4C96] shadow-2xs shrink-0">
            <Calendar className="w-4 h-4 text-[#9AB4FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm sm:text-base text-[#000035] tracking-tight">
                Native Friend Master Schedule Control
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#062863]/10 text-[#062863] border border-[#607EC9]/40">
                Master Control
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Chronological schedule of all your 1-on-1 English practice sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onOpenScheduleModal && (
            <button
              type="button"
              onClick={onOpenScheduleModal}
              className="px-3.5 py-1.5 bg-[#062863] hover:bg-[#000035] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#9AB4FF]/30"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-[#F4CA54]" />
              <span>+ Schedule Lesson</span>
            </button>
          )}

          {onOpenEditProfile && (
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="px-3 py-1.5 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs border border-[#9AB4FF]/40"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#9AB4FF]" />
              <span>Edit Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenTeacherMeetConfig(currentAccount?.email || '')}
            className="px-3 py-1.5 bg-white hover:bg-[#9AB4FF]/15 border border-[#607EC9]/40 rounded-xl text-xs font-bold text-[#062863] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-[#1C4C96]" />
            <span>Meet & Schedule Config</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (100% English) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#9AB4FF]/10 rounded-2xl border border-[#607EC9]/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#1C4C96]" />
          <span className="text-xs font-bold text-[#000035]">
            Filter by Student:
          </span>
          <select
            value={selectedStudentFilter}
            onChange={(e) => handleStudentFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
          >
            <option value="all">All Students</option>
            {availableStudentsForFilter.map((st) => (
              <option key={st.email} value={st.email}>
                {st.name} ({st.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#000035]">
            Status:
          </span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs font-semibold text-[#000035] focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled / Active</option>
            <option value="completed">Completed</option>
            <option value="not_completed">Not Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table with Student PHOTO column & Sorted Chronologically */}
      <div className="overflow-x-auto rounded-2xl border border-[#607EC9]/30 shadow-xs">
        <table className="w-full text-left text-xs text-[#000035]">
          <thead className="bg-[#000035] text-white uppercase text-[10px] font-black tracking-wider">
            <tr>
              <th className="p-3.5">DATE & TIME</th>
              <th className="p-3.5">PHOTO</th>
              <th className="p-3.5">STUDENT</th>
              <th className="p-3.5">LESSON TITLE</th>
              <th className="p-3.5">STATUS</th>
              <th className="p-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#9AB4FF]/20 bg-white">
            {filteredLessons.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                  No lessons matching selected filters.
                </td>
              </tr>
            ) : (
              filteredLessons.map((lesson) => {
                const isScheduled = lesson.status === 'scheduled';
                const isCompleted = lesson.status === 'completed';
                const isNotCompleted = lesson.status === 'not_completed';

                // Look up student photo
                const studentData = students.find(
                  (s) => s.email.toLowerCase() === lesson.studentEmail.toLowerCase()
                );
                const studentPhoto =
                  studentData?.picture ||
                  lesson.studentAvatar ||
                  '';

                return (
                  <tr key={lesson.id} className="hover:bg-[#9AB4FF]/10 transition">
                    {/* Date & Time */}
                    <td className="p-3.5 whitespace-nowrap font-bold text-[#062863]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#1C4C96]" />
                        <span>
                          {formatDateInTimeZone(lesson.startDateTime, timeZone, 'en')} •{' '}
                          {formatTimeInTimeZone(lesson.startDateTime, timeZone)} -{' '}
                          {formatTimeInTimeZone(lesson.endDateTime, timeZone)}
                        </span>
                        {lesson.endDateTime && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1C4C96]/10 text-[#1C4C96]">
                            {Math.round((new Date(lesson.endDateTime).getTime() - new Date(lesson.startDateTime).getTime()) / (60 * 1000)) >= 45 ? '50m' : '25m'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PHOTO Column */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="relative inline-block">
                        {studentPhoto && studentPhoto.trim() !== '' ? (
                          <img
                            src={studentPhoto}
                            alt={lesson.studentName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border-2 border-[#1C4C96]/30 shadow-xs"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#1C4C96]/20 border border-[#1C4C96]/40 flex items-center justify-center font-bold text-xs text-[#062863]">
                            {lesson.studentName?.slice(0, 2).toUpperCase() || 'ST'}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Student Info */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-[#000035]">{lesson.studentName}</div>
                      <div className="text-[11px] text-[#607EC9]">{lesson.studentEmail}</div>
                    </td>

                    {/* Lesson Title */}
                    <td className="p-3.5 font-medium text-[#000035] max-w-xs truncate">
                      {lesson.title}
                    </td>

                    {/* Status */}
                    <td className="p-3.5 whitespace-nowrap">
                      {isScheduled && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#9AB4FF]/25 text-[#062863] border border-[#9AB4FF]">
                          Scheduled
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-700 text-white">
                          ✓ Completed
                        </span>
                      )}
                      {isNotCompleted && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          Not Completed
                        </span>
                      )}
                      {lesson.status === 'cancelled' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          Cancelled
                        </span>
                      )}

                      {/* Pending Reschedule Proposal Actions in Teacher Table */}
                      {lesson.proposalStatus === 'pending_teacher_reschedule' && lesson.proposedNewStartDateTime && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300">
                            Proposal: {formatDateInTimeZone(lesson.proposedNewStartDateTime, timeZone, 'en')} {formatTimeInTimeZone(lesson.proposedNewStartDateTime, timeZone)}
                          </span>
                          {onAcceptReschedule && (
                            <button
                              type="button"
                              onClick={() => onAcceptReschedule(lesson.id)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded cursor-pointer transition shadow-2xs"
                              title="Accept Reschedule"
                            >
                              ✓ Accept
                            </button>
                          )}
                          {onDeclineReschedule && (
                            <button
                              type="button"
                              onClick={() => onDeclineReschedule(lesson.id)}
                              className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[10px] rounded cursor-pointer transition"
                              title="Decline Reschedule"
                            >
                              ✗ Decline
                            </button>
                          )}
                        </div>
                      )}

                      {lesson.proposalStatus === 'pending_student_reschedule' && (
                        <div className="mt-1.5">
                          <span className="text-[10px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200">
                            ⏳ Waiting student approval
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Meet - padronizado na cor verde */}
                        <a
                          href={lesson.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition flex items-center gap-1 shadow-2xs"
                          title="Open Google Meet"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Meet</span>
                        </a>

                        {/* Calendar - somente o símbolo do calendário em formato quadrado */}
                        <a
                          href={
                            lesson.calendarHtmlLink ||
                            generateGoogleCalendarWebLink({
                              title: lesson.title,
                              description: lesson.description,
                              startDateTime: lesson.startDateTime,
                              endDateTime: lesson.endDateTime,
                              studentEmail: lesson.studentEmail,
                              studentName: lesson.studentName,
                              teacherEmail: lesson.teacherEmail,
                              teacherName: lesson.teacherName,
                              meetLink: lesson.meetLink,
                            })
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-300 text-[#1C4C96] rounded-lg transition flex items-center justify-center shadow-2xs shrink-0"
                          title="Sync with Google Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#1C4C96]" />
                        </a>

                        {isScheduled && (
                          <>
                            {/* Done - somente o símbolo de Certo */}
                            <button
                              type="button"
                              onClick={() => onCompleteLesson(lesson.id)}
                              className="w-7 h-7 bg-[#062863] hover:bg-[#000035] text-white rounded-lg transition cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                              title="Mark as Completed"
                            >
                              <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            </button>

                            {/* Not Done - somente o X */}
                            <button
                              type="button"
                              onClick={() => onMarkNotCompleted(lesson)}
                              className="w-7 h-7 bg-[#FFFBEB] hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 transition cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                              title="Mark as Not Completed"
                            >
                              <X className="w-3.5 h-3.5 text-amber-800 stroke-[2.5]" />
                            </button>

                            {/* Reschedule - formato quadrado pequeno com RotateCcw */}
                            <button
                              type="button"
                              onClick={() => onRescheduleLesson(lesson)}
                              className="w-7 h-7 bg-white hover:bg-slate-50 text-[#062863] rounded-lg border border-slate-300 transition cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                              title="Reschedule Lesson"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-[#1C4C96]" />
                            </button>

                            {/* Cancel - somente o símbolo da lixeira e o botão vermelho */}
                            {onCancelLesson && (
                              <button
                                type="button"
                                onClick={() => handleCancelClick(lesson)}
                                className="w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                                title="Cancel Lesson"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white" />
                              </button>
                            )}
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

      {/* Cancel Lesson Confirmation Modal */}
      <CancelLessonModal
        isOpen={!!lessonToCancel}
        onClose={() => setLessonToCancel(null)}
        lesson={lessonToCancel}
        onConfirmCancel={(lessonId, reason, cancelledBy) => {
          if (onCancelLesson) {
            onCancelLesson(lessonId, reason, cancelledBy);
          }
          setLessonToCancel(null);
        }}
        currentLanguage="en"
        timeZone={timeZone}
      />
    </div>
  );
};
