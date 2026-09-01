import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Video,
  Calendar,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Filter,
  Play,
  X,
  ArrowRight,
  Globe,
  Clock,
} from 'lucide-react';
import { NativeFriendTutor, INITIAL_NATIVE_FRIENDS } from '../data/tutors';
import { Language } from '../types';
import { getTranslations } from '../utils/i18n';

interface FindTutorsSectionProps {
  currentLanguage: Language;
  tutors?: NativeFriendTutor[];
  onBookLesson?: (tutor: NativeFriendTutor) => void;
  onSendMessage?: (tutor: NativeFriendTutor) => void;
  onSelectMentor?: (tutor: NativeFriendTutor) => void;
  selectedMentorEmail?: string;
}

export const FindTutorsSection: React.FC<FindTutorsSectionProps> = ({
  currentLanguage,
  tutors: passedTutors,
  onBookLesson,
  onSendMessage,
  onSelectMentor,
  selectedMentorEmail,
}) => {
  const t = getTranslations(currentLanguage);
  const tutors = useMemo(() => {
    const list = passedTutors && passedTutors.length > 0 ? passedTutors : INITIAL_NATIVE_FRIENDS;
    return list.filter((t) => t.approvalStatus !== 'rejected');
  }, [passedTutors]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [activeVideoModal, setActiveVideoModal] = useState<NativeFriendTutor | null>(null);

  const countries = useMemo(() => {
    const list = Array.from(new Set(tutors.map((t) => t.country)));
    return ['all', ...list];
  }, [tutors]);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    tutors.forEach((t) => t.specialties.forEach((s) => set.add(s)));
    return ['all', ...Array.from(set)];
  }, [tutors]);

  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      const matchesSearch =
        tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutor.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutor.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutor.accent.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCountry = selectedCountry === 'all' || tutor.country === selectedCountry;
      const matchesSpecialty =
        selectedSpecialty === 'all' || tutor.specialties.includes(selectedSpecialty);

      return matchesSearch && matchesCountry && matchesSpecialty;
    });
  }, [tutors, searchQuery, selectedCountry, selectedSpecialty]);

  return (
    <section className="py-16 sm:py-24 bg-[#000035] text-white border-t border-[#1C4C96]/50" id="find-native-friend">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C4C96]/60 border border-[#9AB4FF]/50 text-[#9AB4FF] text-xs sm:text-sm font-bold">
            <Globe className="w-4 h-4 text-[#9AB4FF]" />
            <span>{t.tutorsHeaderBadge}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {t.tutorsHeaderTitle}
          </h2>

          <p className="text-base sm:text-lg text-blue-100 font-normal leading-relaxed">
            {t.tutorsHeaderSubtitle}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="mt-10 bg-[#062863]/60 border border-[#607EC9]/40 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-[#9AB4FF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchTutorsPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 bg-[#000035] border border-[#607EC9]/50 rounded-xl text-sm text-white placeholder:text-[#9AB4FF]/60 focus:outline-hidden focus:ring-2 focus:ring-[#9AB4FF]"
              />
            </div>

            {/* Country Selector */}
            <div className="sm:col-span-3">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#000035] border border-[#607EC9]/50 rounded-xl text-sm text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#9AB4FF]"
              >
                <option value="all" className="bg-[#000035] text-white">
                  {t.allCountriesOption}
                </option>
                {countries
                  .filter((c) => c !== 'all')
                  .map((c) => (
                    <option key={c} value={c} className="bg-[#000035] text-white">
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            {/* Specialty Selector */}
            <div className="sm:col-span-3">
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#000035] border border-[#607EC9]/50 rounded-xl text-sm text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#9AB4FF]"
              >
                <option value="all" className="bg-[#000035] text-white">
                  {t.allSpecialtiesOption}
                </option>
                {allSpecialties
                  .filter((s) => s !== 'all')
                  .map((s) => (
                    <option key={s} value={s} className="bg-[#000035] text-white">
                      {s}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#9AB4FF] px-1 pt-1 border-t border-[#1C4C96]/50">
            <span className="font-semibold">
              {filteredTutors.length} {t.badge100Native}
            </span>
            {(searchQuery || selectedCountry !== 'all' || selectedSpecialty !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCountry('all');
                  setSelectedSpecialty('all');
                }}
                className="text-[#F4CA54] hover:underline font-bold cursor-pointer"
              >
                {t.cancel}
              </button>
            )}
          </div>
        </div>

        {/* Tutors List */}
        <div className="mt-8 space-y-6">
          {filteredTutors.length === 0 ? (
            <div className="text-center py-16 bg-[#062863]/40 rounded-3xl border border-dashed border-[#607EC9]/40">
              <Search className="w-10 h-10 text-[#9AB4FF]/50 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">
                {t.noTutorsFound}
              </h3>
            </div>
          ) : (
            filteredTutors.map((tutor) => {
              const isSelectedMentor = selectedMentorEmail === tutor.email;

              return (
                <div
                  key={tutor.id}
                  className={`bg-gradient-to-br from-[#062863]/90 via-[#000035] to-[#1C4C96]/60 rounded-3xl p-6 sm:p-8 border transition-all duration-200 shadow-xl flex flex-col lg:flex-row gap-6 items-start justify-between ${
                    isSelectedMentor
                      ? 'border-[#9AB4FF] ring-2 ring-[#9AB4FF]/60 bg-[#062863]'
                      : 'border-[#607EC9]/45 hover:border-[#9AB4FF]'
                  }`}
                >
                  {/* Left: Avatar & Intro Video Preview */}
                  <div className="flex flex-col items-center sm:items-start gap-4 shrink-0 w-full sm:w-auto">
                    <div className="relative">
                      <img
                        src={tutor.avatar}
                        alt={tutor.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#9AB4FF]/60 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-2 -right-2 text-2xl drop-shadow-md" title={tutor.country}>
                        {tutor.flag}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveVideoModal(tutor)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C4C96]/60 hover:bg-[#1C4C96] text-[#9AB4FF] hover:text-white text-xs font-bold transition cursor-pointer border border-[#607EC9]/40"
                    >
                      <Play className="w-3.5 h-3.5 fill-[#9AB4FF]" />
                      <span>{t.watchIntroVideoBtn}</span>
                    </button>
                  </div>

                  {/* Center: Tutor Details & Bio */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        {tutor.name}
                      </h3>
                      {tutor.isSuperTutor && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-[#F4CA54] border border-[#F4CA54]/50">
                          <Sparkles className="w-3 h-3 text-[#F4CA54]" />
                          <span>Super Native Friend</span>
                        </span>
                      )}
                      {isSelectedMentor && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1C4C96] text-white border border-[#9AB4FF]">
                          <CheckCircle className="w-3 h-3 text-[#9AB4FF]" />
                          <span>Mentor</span>
                        </span>
                      )}
                    </div>

                    {/* Stats & Accent */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#9AB4FF]">
                      <div className="flex items-center gap-1 text-[#F4CA54] font-bold">
                        <Star className="w-4 h-4 fill-[#F4CA54] text-[#F4CA54]" />
                        <span>{tutor.rating.toFixed(1)}</span>
                        <span className="text-[#9AB4FF]/70">({tutor.reviewsCount} {t.reviewsLabel})</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-200">
                        <Globe className="w-3.5 h-3.5 text-[#9AB4FF]" />
                        <span>{tutor.accent}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{tutor.lessonsTaught}+ {t.badge30MinMeet}</span>
                      </div>
                    </div>

                    {/* Headline */}
                    <p className="text-sm font-bold text-[#9AB4FF]">
                      “{tutor.headline}”
                    </p>

                    {/* Bio excerpt */}
                    <p className="text-sm text-blue-100/90 leading-relaxed">
                      {tutor.bio}
                    </p>

                    {/* Specialties Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tutor.specialties.map((spec, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#000035]/80 text-[#9AB4FF] border border-[#607EC9]/40"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Booking Actions & Price */}
                  <div className="w-full lg:w-56 shrink-0 bg-[#000035]/90 rounded-2xl p-4 border border-[#607EC9]/50 flex flex-col justify-between gap-4">
                    <div>
                      <span className="text-xs text-[#9AB4FF]/80 font-bold block">
                        {t.badge30MinMeet}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl sm:text-3xl font-black text-white">
                          R$ {tutor.pricePerSessionBrl}
                        </span>
                        <span className="text-xs text-[#9AB4FF] font-semibold">
                          / ${tutor.pricePerSessionUsd} USD
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Google Meet</span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => onBookLesson && onBookLesson(tutor)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#607EC9] text-white hover:bg-[#1C4C96] font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#9AB4FF]/60"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>{t.bookLesson30MinBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSendMessage && onSendMessage(tutor)}
                        className="w-full py-2 px-3 rounded-xl bg-[#000035] text-white border border-[#607EC9] hover:bg-[#062863] font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#9AB4FF]" />
                        <span>{t.sendMessageBtn}</span>
                      </button>

                      {onSelectMentor && !isSelectedMentor && (
                        <button
                          type="button"
                          onClick={() => onSelectMentor(tutor)}
                          className="w-full py-1.5 text-center text-xs text-[#9AB4FF] hover:text-white underline font-bold cursor-pointer"
                        >
                          {t.findNativeFriend}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Intro Video Modal */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 bg-[#000035] text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeVideoModal.flag}</span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">{activeVideoModal.name}</h4>
                  <span className="text-xs text-[#9AB4FF]">{activeVideoModal.accent}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideoModal.youtubeEmbedId || 'dQw4w9WgXcQ'}?autoplay=1&rel=0`}
                title={`Introduction by ${activeVideoModal.name}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  {activeVideoModal.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const tutor = activeVideoModal;
                  setActiveVideoModal(null);
                  if (onBookLesson) onBookLesson(tutor);
                }}
                className="px-4 py-2 rounded-xl bg-[#062863] text-white hover:bg-[#000035] font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer shrink-0"
              >
                {t.bookLesson30MinBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

