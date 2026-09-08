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
} from 'lucide-react';
import { TeacherMeetSettings, DayOfWeek, Language } from '../types';
import { TIMEZONE_OPTIONS, DEFAULT_TEACHER_TIMEZONE } from '../utils/timezone';

interface TeacherMeetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherEmail: string;
  currentSettings?: TeacherMeetSettings;
  onSave: (settings: TeacherMeetSettings) => void;
  currentLanguage: Language;
}

const ALL_DAYS: { id: DayOfWeek; labelEn: string }[] = [
  { id: 'monday', labelEn: 'Mon' },
  { id: 'tuesday', labelEn: 'Tue' },
  { id: 'wednesday', labelEn: 'Wed' },
  { id: 'thursday', labelEn: 'Thu' },
  { id: 'friday', labelEn: 'Fri' },
  { id: 'saturday', labelEn: 'Sat' },
  { id: 'sunday', labelEn: 'Sun' },
];

export const TeacherMeetConfigModal: React.FC<TeacherMeetConfigModalProps> = ({
  isOpen,
  onClose,
  teacherEmail,
  currentSettings,
  onSave,
}) => {
  const [meetLink, setMeetLink] = useState<string>(
    currentSettings?.meetLink || ''
  );
  const [workingHoursStart, setWorkingHoursStart] = useState<string>(
    currentSettings?.workingHoursStart || ''
  );
  const [workingHoursEnd, setWorkingHoursEnd] = useState<string>(
    currentSettings?.workingHoursEnd || ''
  );
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(
    currentSettings?.slotDurationMinutes || 30
  );
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>(
    currentSettings?.availableDays || []
  );
  const [timezone, setTimezone] = useState<string>(
    currentSettings?.timezone || DEFAULT_TEACHER_TIMEZONE
  );
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && currentSettings) {
      setMeetLink(currentSettings.meetLink || '');
      setWorkingHoursStart(currentSettings.workingHoursStart || '');
      setWorkingHoursEnd(currentSettings.workingHoursEnd || '');
      setSlotDurationMinutes(currentSettings.slotDurationMinutes || 30);
      setAvailableDays(currentSettings.availableDays || []);
      setTimezone(currentSettings.timezone || DEFAULT_TEACHER_TIMEZONE);
    }
  }, [isOpen, currentSettings]);

  const toggleDay = (day: DayOfWeek) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      teacherEmail,
      meetLink: meetLink.trim(),
      workingHoursStart,
      workingHoursEnd,
      slotDurationMinutes,
      availableDays,
      timezone,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#607EC9]/30 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#000035] text-white flex items-center justify-between border-b border-[#1C4C96]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] flex items-center justify-center text-white shadow-xs border border-[#9AB4FF]/40">
              <Settings className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                Native Friend Schedule & Meet Setup
              </h3>
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

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3 bg-[#9AB4FF]/20 border border-[#607EC9] rounded-2xl text-xs font-bold text-[#062863] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#1C4C96]" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {/* Google Meet Link */}
          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>Default Google Meet Room Link *</span>
            </label>
            <input
              type="url"
              required
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/gmt-kxnw-zpq"
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs sm:text-sm text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>Timezone *</span>
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

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#000035] mb-1">
                End Time
              </label>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035]"
              />
            </div>
          </div>

          {/* Available Days */}
          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1">
              Available Teaching Days
            </label>
            <div className="grid grid-cols-7 gap-1">
              {ALL_DAYS.map((day) => {
                const isSelected = availableDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-2 text-center rounded-xl text-xs font-bold transition border cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C4C96] text-white border-[#1C4C96]'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>{day.labelEn}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configurations</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
