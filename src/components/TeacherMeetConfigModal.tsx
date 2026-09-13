import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Settings,
  Video,
  Clock,
  Globe,
  Calendar,
  Save,
  Check,
  Sparkles,
  Copy,
  Info,
  CalendarDays,
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
  teacherUid?: string;
  currentSettings?: TeacherMeetSettings;
  onSave: (settings: TeacherMeetSettings) => void;
  currentLanguage?: Language;
}

const ALL_DAYS: { id: DayOfWeek; labelEn: string; fullEn: string }[] = [
  { id: 'monday', labelEn: 'Mon', fullEn: 'Monday' },
  { id: 'tuesday', labelEn: 'Tue', fullEn: 'Tuesday' },
  { id: 'wednesday', labelEn: 'Wed', fullEn: 'Wednesday' },
  { id: 'thursday', labelEn: 'Thu', fullEn: 'Thursday' },
  { id: 'friday', labelEn: 'Fri', fullEn: 'Friday' },
  { id: 'saturday', labelEn: 'Sat', fullEn: 'Saturday' },
  { id: 'sunday', labelEn: 'Sun', fullEn: 'Sunday' },
];

function getInitialAvailability(settings?: TeacherMeetSettings): Record<DayOfWeek, string[]> {
  const defaultSlots =
    settings?.availableHours && settings.availableHours.length > 0
      ? [...settings.availableHours]
      : DEFAULT_TEACHER_AVAILABILITY_HOURS;

  const legacyDays = settings?.availableDays || [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  const sourceMap = settings?.availability || settings?.availableHoursByDay || {};

  const result: Record<DayOfWeek, string[]> = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  ALL_DAYS.forEach((d) => {
    if (sourceMap[d.id] && Array.isArray(sourceMap[d.id])) {
      result[d.id] = [...sourceMap[d.id]].sort();
    } else if (legacyDays.includes(d.id)) {
      result[d.id] = [...defaultSlots].sort();
    } else {
      result[d.id] = [];
    }
  });

  return result;
}

export const TeacherMeetConfigModal: React.FC<TeacherMeetConfigModalProps> = ({
  isOpen,
  onClose,
  teacherEmail,
  teacherUid,
  currentSettings,
  onSave,
  currentLanguage = 'en',
}) => {
  const [meetLink, setMeetLink] = useState<string>(currentSettings?.meetLink || '');
  const [timezone, setTimezone] = useState<string>(
    currentSettings?.timezone || DEFAULT_TEACHER_TIMEZONE
  );
  const [activeDay, setActiveDay] = useState<DayOfWeek>('monday');
  const [availabilityByDay, setAvailabilityByDay] = useState<Record<DayOfWeek, string[]>>(() =>
    getInitialAvailability(currentSettings)
  );
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Re-sync on modal open
  useEffect(() => {
    if (isOpen) {
      setMeetLink(currentSettings?.meetLink || '');
      setTimezone(currentSettings?.timezone || DEFAULT_TEACHER_TIMEZONE);
      const initial = getInitialAvailability(currentSettings);
      setAvailabilityByDay(initial);
      setSavedSuccess(false);
      setActionNotice(null);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const activeDayObj = ALL_DAYS.find((d) => d.id === activeDay) || ALL_DAYS[0];
  const activeDaySlots = availabilityByDay[activeDay] || [];
  const activeDayHours = ((activeDaySlots.length * 30) / 60).toFixed(1);

  // Active days count (days with at least 1 open slot)
  const activeDaysCount = ALL_DAYS.filter((d) => (availabilityByDay[d.id] || []).length > 0).length;

  // Total weekly slots and hours
  const totalWeeklySlots = ALL_DAYS.reduce(
    (acc, day) => acc + (availabilityByDay[day.id]?.length || 0),
    0
  );
  const totalWeeklyHours = ((totalWeeklySlots * 30) / 60).toFixed(1);

  // Toggle a single 30-min slot for the currently active day ONLY
  const toggleSlotForActiveDay = (slot: string) => {
    setAvailabilityByDay((prev) => {
      const currentSlots = prev[activeDay] || [];
      const updated = currentSlots.includes(slot)
        ? currentSlots.filter((s) => s !== slot)
        : [...currentSlots, slot].sort();
      return {
        ...prev,
        [activeDay]: updated,
      };
    });
  };

  // Quick preset application for active day ONLY
  const handleSelectPreset = (
    preset: 'morning' | 'afternoon' | 'evening' | 'business' | 'all' | 'clear'
  ) => {
    let newSlots: string[] = [];
    switch (preset) {
      case 'morning':
        newSlots = generate30MinTimeSlots('08:00', '12:00');
        break;
      case 'afternoon':
        newSlots = generate30MinTimeSlots('13:00', '18:00');
        break;
      case 'evening':
        newSlots = generate30MinTimeSlots('18:00', '22:00');
        break;
      case 'business':
        newSlots = generate30MinTimeSlots('08:00', '18:00');
        break;
      case 'all':
        newSlots = [...FIXED_30MIN_AVAILABILITY_SLOTS];
        break;
      case 'clear':
        newSlots = [];
        break;
    }

    setAvailabilityByDay((prev) => ({
      ...prev,
      [activeDay]: newSlots,
    }));
  };

  // Smart replication: Copy active day slots to all weekdays or all days
  const copyActiveDaySchedule = (scope: 'weekdays' | 'all') => {
    const slotsToCopy = [...(availabilityByDay[activeDay] || [])];
    setAvailabilityByDay((prev) => {
      const next = { ...prev };
      ALL_DAYS.forEach((d) => {
        if (scope === 'weekdays') {
          if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d.id)) {
            next[d.id] = [...slotsToCopy];
          }
        } else {
          next[d.id] = [...slotsToCopy];
        }
      });
      return next;
    });

    const msg =
      scope === 'weekdays'
        ? `Applied ${activeDayObj.labelEn} schedule to Mon–Fri!`
        : `Applied ${activeDayObj.labelEn} schedule to all 7 days!`;
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Form submission: Saves structured availability map
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const activeDaysList = ALL_DAYS.map((d) => d.id).filter(
      (dayId) => (availabilityByDay[dayId] || []).length > 0
    );

    // Compute union of all slots for backward compatibility
    const allSlotsSet = new Set<string>();
    ALL_DAYS.forEach((d) => {
      const slots = availabilityByDay[d.id] || [];
      slots.forEach((s) => allSlotsSet.add(s));
    });
    const unionSlots = Array.from(allSlotsSet).sort();

    const startHour = unionSlots[0] || '08:00';
    const lastSlot = unionSlots[unionSlots.length - 1] || '18:00';
    const [h, m] = lastSlot.split(':').map(Number);
    const endMin = (isNaN(h) ? 18 : h) * 60 + (isNaN(m) ? 0 : m) + 30;
    const endHour = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(
      endMin % 60
    ).padStart(2, '0')}`;

    const updatedSettings: TeacherMeetSettings = {
      teacherEmail: teacherEmail.trim().toLowerCase(),
      uid: teacherUid || currentSettings?.uid,
      meetLink: meetLink.trim(),
      workingHoursStart: startHour,
      workingHoursEnd: endHour,
      slotDurationMinutes: 30,
      availableDays: activeDaysList,
      availableHours: availabilityByDay[activeDay] || unionSlots,
      availability: availabilityByDay,
      availableHoursByDay: availabilityByDay,
      timezone,
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#000035]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      id="teacher-meet-config-modal-backdrop"
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#607EC9]/30 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        id="teacher-meet-config-modal-container"
      >
        {/* Header */}
        <div
          className="px-6 py-4 bg-[#000035] text-white flex items-center justify-between border-b border-[#1C4C96] shrink-0"
          id="teacher-meet-config-modal-header"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] flex items-center justify-center text-white shadow-xs border border-[#9AB4FF]/40">
              <Settings className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  Native Friend Schedule & Setup
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#9AB4FF]/20 text-[#9AB4FF] border border-[#9AB4FF]/30">
                  Fixed 30-min Slots
                </span>
              </div>
              <p className="text-xs text-[#9AB4FF]">{teacherEmail}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="close-teacher-meet-config-button"
            className="p-1.5 rounded-xl text-[#9AB4FF] hover:text-white hover:bg-[#1C4C96] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form
          onSubmit={handleSave}
          className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm"
          id="teacher-meet-config-form"
        >
          {savedSuccess && (
            <div
              className="p-3.5 bg-[#9AB4FF]/20 border border-[#607EC9] rounded-2xl text-xs font-bold text-[#062863] flex items-center gap-2 animate-in fade-in"
              id="teacher-settings-saved-success"
            >
              <Check className="w-4 h-4 text-[#1C4C96]" />
              <span>Availability schedule saved successfully to Firestore!</span>
            </div>
          )}

          {actionNotice && (
            <div
              className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in"
              id="teacher-action-notice"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Google Meet Link */}
          <div id="meet-link-field-group">
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
              id="teacher-meet-link-input"
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs sm:text-sm text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used automatically whenever a student schedules a 1-on-1 session with you.
            </p>
          </div>

          {/* Timezone */}
          <div id="timezone-field-group">
            <label className="block text-xs font-bold text-[#000035] mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#1C4C96]" />
              <span>Timezone *</span>
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              id="teacher-timezone-select"
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035] focus:ring-2 focus:ring-[#1C4C96]"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.offset})
                </option>
              ))}
            </select>
          </div>

          {/* 🌟 AVAILABLE TEACHING DAYS SELECTOR (SWITCH DAY TO CONFIGURE) */}
          <div className="space-y-2" id="available-teaching-days-section">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#000035] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span>Select Day of the Week to Configure</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#062863] bg-[#9AB4FF]/20 px-2 py-0.5 rounded-full border border-[#607EC9]/30">
                  {activeDaysCount} of 7 days active
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {totalWeeklySlots} total slots/wk ({totalWeeklyHours}h)
                </span>
              </div>
            </div>

            {/* 7 Day Tabs */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2" id="day-selector-buttons-grid">
              {ALL_DAYS.map((day) => {
                const isCurrentActive = activeDay === day.id;
                const slotCount = (availabilityByDay[day.id] || []).length;
                const isDayEnabled = slotCount > 0;

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setActiveDay(day.id)}
                    id={`day-tab-${day.id}`}
                    className={`py-2 px-1 text-center rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                      isCurrentActive
                        ? 'bg-[#000035] text-white border-[#F4CA54] shadow-md ring-2 ring-[#1C4C96]/30'
                        : isDayEnabled
                        ? 'bg-[#1C4C96]/5 text-[#000035] border-[#1C4C96]/40 hover:border-[#1C4C96] hover:bg-[#1C4C96]/10'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black tracking-tight">{day.labelEn}</span>
                    <span
                      className={`text-[10px] font-semibold px-1 rounded-full ${
                        isCurrentActive
                          ? 'bg-[#F4CA54] text-[#000035] font-black'
                          : isDayEnabled
                          ? 'text-[#1C4C96] font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {isDayEnabled ? `${slotCount}` : 'Off'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Status & Action Bar */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1C4C96] shrink-0" />
                <span className="text-slate-700">
                  Editing:{' '}
                  <strong className="text-[#000035] font-black">{activeDayObj.fullEn}</strong> (
                  {activeDaySlots.length} slots • {activeDayHours}h)
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {activeDaySlots.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('clear')}
                    id="set-day-off-button"
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    Mark {activeDayObj.labelEn} as Day Off
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('business')}
                    id="enable-day-button"
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    + Enable {activeDayObj.labelEn} (08h-18h)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => copyActiveDaySchedule('weekdays')}
                  id="copy-to-weekdays-button"
                  title="Copy this day's slots to Monday through Friday"
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-[#062863] border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-[#1C4C96]" />
                  <span>Copy to Mon–Fri</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyActiveDaySchedule('all')}
                  id="copy-to-all-days-button"
                  title="Copy this day's slots to all 7 days"
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-[#062863] border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-[#1C4C96]" />
                  <span>Copy to All Days</span>
                </button>
              </div>
            </div>
          </div>

          {/* 🌟 AVAILABILITY SCHEDULE (GRANULAR 30-MIN SLOTS FOR ACTIVE DAY) */}
          <div
            className="p-4 bg-[#9AB4FF]/10 rounded-2xl border border-[#607EC9]/30 space-y-3"
            id="active-day-slots-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#607EC9]/25 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1C4C96]" />
                  <span className="font-black text-xs sm:text-sm text-[#000035]">
                    Availability Schedule — {activeDayObj.fullEn} (Fixed 30-min Slots)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Click to open or close 30-minute intervals for students to book on{' '}
                  <span className="font-bold text-[#000035]">{activeDayObj.fullEn}s</span>.
                </p>
              </div>

              <div
                className="px-3 py-1 rounded-xl bg-white border border-[#607EC9]/40 text-[#062863] text-xs font-bold shrink-0 self-start sm:self-auto shadow-2xs"
                id="active-day-slot-counter"
              >
                {activeDaySlots.length} slots • {activeDayHours}h on {activeDayObj.labelEn}
              </div>
            </div>

            {/* Quick Presets for Current Day */}
            <div
              className="flex items-center gap-1.5 flex-wrap"
              id="active-day-quick-presets"
            >
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                Quick Select for {activeDayObj.labelEn}:
              </span>
              <button
                type="button"
                onClick={() => handleSelectPreset('morning')}
                id="preset-morning-button"
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition"
              >
                Morning (08h-12h)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('afternoon')}
                id="preset-afternoon-button"
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition"
              >
                Afternoon (13h-18h)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('evening')}
                id="preset-evening-button"
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition"
              >
                Evening (18h-22h)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('business')}
                id="preset-full-day-button"
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition"
              >
                Full Day (08h-18h)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                id="preset-select-all-button"
                className="px-2 py-1 bg-[#1C4C96]/10 hover:bg-[#1C4C96]/20 border border-[#1C4C96]/30 rounded-lg text-[11px] font-black text-[#1C4C96] cursor-pointer transition"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('clear')}
                id="preset-clear-button"
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 cursor-pointer transition"
              >
                Clear Day
              </button>
            </div>

            {/* 30-min Slot Grid for Active Day */}
            <div
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-60 overflow-y-auto p-1.5 bg-white rounded-2xl border border-[#607EC9]/30"
              id="active-day-slots-grid"
            >
              {FIXED_30MIN_AVAILABILITY_SLOTS.map((slot) => {
                const isSelected = activeDaySlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlotForActiveDay(slot)}
                    id={`slot-btn-${activeDay}-${slot.replace(':', '-')}`}
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
              ℹ️ Blue slots are open for student bookings on <strong>{activeDayObj.fullEn}s</strong>.
              Each slot is strictly 30 minutes. Anti-duplicity lock prevents overlapping bookings.
            </p>
          </div>

          {/* Footer */}
          <div
            className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0"
            id="teacher-meet-config-footer"
          >
            <button
              type="button"
              onClick={onClose}
              id="cancel-teacher-config-button"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-teacher-availability-button"
              className="px-5 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#F4CA54]" />
              <span>Save Availability & Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
