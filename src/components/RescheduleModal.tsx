import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Heart,
  Send,
  AlertCircle,
} from 'lucide-react';
import { LiveLesson, GoogleAccount, Language } from '../types';
import { generate30MinTimeSlots, formatDateInTimeZone, formatTimeInTimeZone } from '../utils/timezone';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LiveLesson | null;
  currentAccount: GoogleAccount | null;
  onConfirmReschedule: (
    lessonId: string,
    newStartIso: string,
    newEndIso: string,
    reason: string
  ) => void;
  currentLanguage: Language;
  timeZone?: string;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  lesson,
  currentAccount,
  onConfirmReschedule,
  currentLanguage,
  timeZone = 'America/Sao_Paulo',
}) => {
  if (!isOpen || !lesson) return null;

  const isEn = currentLanguage === 'en';
  const isTeacher = currentAccount ? (currentAccount.role === 'teacher' || currentAccount.role === 'admin') : false;

  const defaultDate = lesson.startDateTime.split('T')[0];
  const [newDate, setNewDate] = useState<string>(defaultDate);
  const [newStartTime, setNewStartTime] = useState<string>('10:00');
  const [reason, setReason] = useState<string>('');

  const timeSlots = generate30MinTimeSlots('07:00', '21:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newStartTime) return;

    const [h, m] = newStartTime.split(':').map(Number);
    const start = new Date(newDate + 'T00:00:00');
    start.setHours(h, m, 0, 0);

    const end = new Date(start.getTime() + 30 * 60 * 1000);

    onConfirmReschedule(lesson.id, start.toISOString(), end.toISOString(), reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#607EC9]/30 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#000035] text-white flex items-center justify-between border-b border-[#1C4C96]">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
            <div>
              <h3 className="font-black text-base text-white">
                {isEn ? 'Reschedule Lesson' : 'Reagendar Aula'}
              </h3>
              <p className="text-[11px] text-[#9AB4FF]">
                {lesson.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#9AB4FF] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-[#9AB4FF]/10 rounded-xl border border-[#607EC9]/30 text-xs text-[#062863] space-y-1">
            <span className="font-bold text-[#000035] block">
              {isEn ? 'Current Lesson Time:' : 'Horário Atual da Aula:'}
            </span>
            <p>
              {formatDateInTimeZone(lesson.startDateTime, timeZone, isEn ? 'en' : 'pt')} • {formatTimeInTimeZone(lesson.startDateTime, timeZone)} - {formatTimeInTimeZone(lesson.endDateTime, timeZone)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'New Date' : 'Nova Data'}
              </label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                {isEn ? 'New Time Slot' : 'Novo Horário (30 min)'}
              </label>
              <select
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035]"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1">
              {isEn ? 'Reason for Rescheduling (Optional)' : 'Motivo do Reagendamento (Opcional)'}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEn ? 'e.g. Schedule conflict with meeting...' : 'Ex.: Imprevisto no trabalho...'}
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035] resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isEn ? 'Send Reschedule' : 'Confirmar Reagendamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
