import React, { useState } from 'react';
import {
  X,
  AlertOctagon,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { LiveLesson, Language } from '../types';
import { formatDateInTimeZone, formatTimeInTimeZone } from '../utils/timezone';

interface CancelLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LiveLesson | null;
  onConfirmCancel: (lessonId: string, reason?: string) => void;
  currentLanguage: Language;
  timeZone?: string;
}

export const CancelLessonModal: React.FC<CancelLessonModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onConfirmCancel,
  currentLanguage,
  timeZone,
}) => {
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !lesson) return null;

  const isEn = currentLanguage === 'en';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmCancel(lesson.id, reason.trim() || undefined);
      setReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#607EC9]/30 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">
                {isEn ? 'Cancel Live Session' : 'Cancelar Aula Ao Vivo'}
              </h3>
              <p className="text-xs text-rose-100">
                {isEn ? 'Google Meet Practice Session' : 'Sessão de Prática Google Meet'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Lesson Details Box */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-sm text-[#000035]">{lesson.title}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#062863]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span className="font-semibold">
                  {formatDateInTimeZone(lesson.startDateTime, timeZone, isEn ? 'en' : 'pt')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span className="font-semibold">
                  {formatTimeInTimeZone(lesson.startDateTime, timeZone)}
                </span>
              </div>
            </div>

            {(lesson.teacherName || lesson.studentName) && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-200">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {lesson.teacherName || 'Amigo Nativo'} • {lesson.studentName || 'Aluno'}
                </span>
              </div>
            )}
          </div>

          {/* Balance Protection Reassurance Notice */}
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              {isEn
                ? 'Your lesson balance will NOT be deducted. You can reschedule or book another session at any time.'
                : 'O seu saldo de aulas NÃO será descontado. Você poderá agendar outra sessão quando desejar.'}
            </p>
          </div>

          {/* Optional cancellation reason */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#000035]">
              {isEn ? 'Reason for cancellation (optional):' : 'Motivo do cancelamento (opcional):'}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isEn
                  ? 'e.g. Last-minute schedule conflict, unexpected trip...'
                  : 'Ex.: Imprevisto no trabalho, conflito de agenda...'
              }
              className="w-full p-3 bg-white border border-[#607EC9]/30 rounded-xl text-xs text-[#000035] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
            >
              {isEn ? 'Keep Lesson' : 'Não, Manter Aula'}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? isEn
                    ? 'Cancelling...'
                    : 'Cancelando...'
                  : isEn
                  ? 'Yes, Cancel Lesson'
                  : 'Sim, Cancelar Aula'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
