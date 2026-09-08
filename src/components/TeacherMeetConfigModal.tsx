import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Video,
  Clock,
  Globe,
  Calendar,
  Save,
  Check,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { TeacherMeetSettings, DayOfWeek, Language } from '../types';
import {
  TIMEZONE_OPTIONS,
  DEFAULT_TEACHER_TIMEZONE,
  generate30MinTimeSlots,
  FIXED_30MIN_AVAILABILITY_SLOTS,
  DEFAULT_TEACHER_AVAILABILITY_HOURS,
} from '../utils/timezone';

interface TeacherMeetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherEmail: string;
  currentSettings?: TeacherMeetSettings;
  onSave: (settings: TeacherMeetSettings) => void;
  currentLanguage?: Language;
}

const ALL_DAYS: { id: DayOfWeek; labelEn: string; labelPt: string }[] = [
  { id: 'monday', labelEn: 'Mon', labelPt: 'Seg' },
  { id: 'tuesday', labelEn: 'Tue', labelPt: 'Ter' },
  { id: 'wednesday', labelEn: 'Wed', labelPt: 'Qua' },
  { id: 'thursday', labelEn: 'Thu', labelPt: 'Qui' },
  { id: 'friday', labelEn: 'Fri', labelPt: 'Sex' },
  { id: 'saturday', labelEn: 'Sat', labelPt: 'Sáb' },
  { id: 'sunday', labelEn: 'Sun', labelPt: 'Dom' },
];

export const TeacherMeetConfigModal: React.FC<TeacherMeetConfigModalProps> = ({
  isOpen,
  onClose,
  teacherEmail,
  currentSettings,
  onSave,
  currentLanguage = 'en',
}) => {
  const isEn = currentLanguage === 'en';

  const [meetLink, setMeetLink] = useState<string>(currentSettings?.meetLink || '');
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>(
    currentSettings?.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  );
  const [timezone, setTimezone] = useState<string>(
    currentSettings?.timezone || DEFAULT_TEACHER_TIMEZONE
  );
  const [availableHours, setAvailableHours] = useState<string[]>(() => {
    if (currentSettings?.availableHours && currentSettings.availableHours.length > 0) {
      return currentSettings.availableHours;
    }
    if (currentSettings?.workingHoursStart && currentSettings?.workingHoursEnd) {
      return generate30MinTimeSlots(currentSettings.workingHoursStart, currentSettings.workingHoursEnd);
    }
    return DEFAULT_TEACHER_AVAILABILITY_HOURS;
  });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && currentSettings) {
      setMeetLink(currentSettings.meetLink || '');
      setAvailableDays(
        currentSettings.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      );
      setTimezone(currentSettings.timezone || DEFAULT_TEACHER_TIMEZONE);
      if (currentSettings.availableHours && currentSettings.availableHours.length > 0) {
        setAvailableHours(currentSettings.availableHours);
      } else if (currentSettings.workingHoursStart && currentSettings.workingHoursEnd) {
        setAvailableHours(
          generate30MinTimeSlots(currentSettings.workingHoursStart, currentSettings.workingHoursEnd)
        );
      } else {
        setAvailableHours(DEFAULT_TEACHER_AVAILABILITY_HOURS);
      }
    }
  }, [isOpen, currentSettings]);

  const toggleDay = (day: DayOfWeek) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day]
    );
  };

  const toggleHourSlot = (slot: string) => {
    setAvailableHours((prev) => {
      if (prev.includes(slot)) {
        if (prev.length <= 1) return prev; // keep at least 1 slot open
        return prev.filter((s) => s !== slot);
      } else {
        return [...prev, slot].sort();
      }
    });
  };

  const handleSelectPreset = (preset: 'morning' | 'afternoon' | 'evening' | 'business' | 'all') => {
    switch (preset) {
      case 'morning':
        setAvailableHours(generate30MinTimeSlots('08:00', '12:30'));
        break;
      case 'afternoon':
        setAvailableHours(generate30MinTimeSlots('13:00', '18:30'));
        break;
      case 'evening':
        setAvailableHours(generate30MinTimeSlots('18:00', '22:00'));
        break;
      case 'business':
        setAvailableHours(generate30MinTimeSlots('08:00', '18:00'));
        break;
      case 'all':
        setAvailableHours(FIXED_30MIN_AVAILABILITY_SLOTS);
        break;
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const sortedHours = [...availableHours].sort();
    const startHour = sortedHours[0] || '08:00';
    const lastSlot = sortedHours[sortedHours.length - 1] || '18:00';
    const [h, m] = lastSlot.split(':').map(Number);
    const endMin = h * 60 + m + 30;
    const endHour = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    onSave({
      teacherEmail,
      meetLink: meetLink.trim(),
      workingHoursStart: startHour,
      workingHoursEnd: endHour,
      slotDurationMinutes: 30,
      availableDays,
      availableHours: sortedHours,
      timezone,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  const totalHoursAvailable = ((availableHours.length * 30) / 60).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#607EC9]/30 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#000035] text-white flex items-center justify-between border-b border-[#1C4C96] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] flex items-center justify-center text-white shadow-xs border border-[#9AB4FF]/40">
              <Settings className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  {isEn ? 'Native Friend Schedule & Meet Setup' : 'Configuração de Grade e Meet'}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#9AB4FF] border border-[#9AB4FF]/30">
                  30-min Slots
                </span>
              </div>
              <p className="text-xs text-[#9AB4FF]">{teacherEmail}</p>
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

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          {savedSuccess && (
            <div className="p-3.5 bg-[#9AB4FF]/20 border border-[#607EC9] rounded-2xl text-xs font-bold text-[#062863] flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-[#1C4C96]" />
              <span>
                {isEn ? 'Availability schedule saved successfully!' : 'Grade de horários salva com sucesso!'}
              </span>
            </div>
          )}

          {/* Google Meet Link */}
          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>{isEn ? 'Default Google Meet Room Link *' : 'Link Padrão da Sala do Google Meet *'}</span>
            </label>
            <input
              type="url"
              required
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/gmt-kxnw-zpq"
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs sm:text-sm text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {isEn
                ? 'Used automatically whenever a student schedules a 1-on-1 session with you.'
                : 'Utilizado automaticamente sempre que um aluno agendar uma sessão com você.'}
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>{isEn ? 'Timezone *' : 'Fuso Horário *'}</span>
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.offset})
                </option>
              ))}
            </select>
          </div>

          {/* Available Days */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#000035] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span>{isEn ? 'Available Teaching Days' : 'Dias da Semana Disponíveis'}</span>
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">
                {availableDays.length} {isEn ? 'days active' : 'dias ativos'}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {ALL_DAYS.map((day) => {
                const isSelected = availableDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-black transition border cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C4C96] text-white border-[#1C4C96] shadow-2xs'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>{isEn ? day.labelEn : day.labelPt}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🌟 GERENCIADOR DE DISPONIBILIDADE EM BLOCOS DE 30 MINUTOS */}
          <div className="p-4 bg-[#9AB4FF]/10 rounded-2xl border border-[#607EC9]/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#607EC9]/25 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1C4C96]" />
                  <span className="font-black text-xs sm:text-sm text-[#000035]">
                    {isEn ? 'Availability Schedule (Fixed 30-min Slots)' : 'Grade de Disponibilidade (Slots de 30 min)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {isEn
                    ? 'Click to open or close 30-minute intervals for students to book.'
                    : 'Clique nos blocos para abrir ou fechar horários de 30 minutos para agendamento.'}
                </p>
              </div>

              <div className="px-2.5 py-1 rounded-xl bg-white border border-[#607EC9]/40 text-[#062863] text-xs font-bold shrink-0">
                {availableHours.length} {isEn ? 'slots' : 'horários'} • {totalHoursAvailable}h/{isEn ? 'day' : 'dia'}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                {isEn ? 'Quick Select:' : 'Seleção Rápida:'}
              </span>
              <button
                type="button"
                onClick={() => handleSelectPreset('morning')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                {isEn ? 'Morning (08h-12h)' : 'Manhã (08h-12h)'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('afternoon')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                {isEn ? 'Afternoon (13h-18h)' : 'Tarde (13h-18h)'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('evening')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                {isEn ? 'Evening (18h-22h)' : 'Noite (18h-22h)'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('business')}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer"
              >
                {isEn ? 'Full Day (08h-18h)' : 'Integral (08h-18h)'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                className="px-2 py-1 bg-[#1C4C96]/10 hover:bg-[#1C4C96]/20 border border-[#1C4C96]/30 rounded-lg text-[11px] font-black text-[#1C4C96] cursor-pointer"
              >
                {isEn ? 'Select All' : 'Marcar Todos'}
              </button>
            </div>

            {/* 30-min Slot Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-56 overflow-y-auto p-1 bg-white rounded-xl border border-[#607EC9]/30">
              {FIXED_30MIN_AVAILABILITY_SLOTS.map((slot) => {
                const isSelected = availableHours.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleHourSlot(slot)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#1C4C96] text-white border-[#1C4C96] shadow-2xs'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3 h-3 text-[#F4CA54] shrink-0 stroke-[3]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    )}
                    <span>{slot}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500">
              {isEn
                ? 'ℹ️ Blue slots are open for student bookings. Slots are strictly 30 minutes. The anti-duplicity lock ensures no two lessons can ever be scheduled at the exact same slot.'
                : 'ℹ️ Blocos azuis estão abertos para agendamento. Cada aula ocupa 30 min. A trava anti-duplicidade garante que nenhuma outra aula seja agendada no mesmo horário.'}
            </p>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#F4CA54]" />
              <span>{isEn ? 'Save Availability & Settings' : 'Salvar Disponibilidade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
