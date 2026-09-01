import React, { useState } from 'react';
import {
  X,
  User,
  GraduationCap,
  Save,
  Check,
  Sparkles,
  Target,
  Clock,
  Globe,
} from 'lucide-react';
import { UserProfile, EnglishLevel, Language, GoogleAccount } from '../types';
import { ImageUploadInput } from './ImageUploadInput';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  currentAccount: GoogleAccount | null;
  onSave: (updatedProfile: UserProfile, updatedPicture?: string) => void;
  currentLanguage: Language;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  currentAccount,
  onSave,
  currentLanguage,
}) => {
  const isEn = currentLanguage === 'en';
  const [name, setName] = useState(userProfile.name || currentAccount?.name || '');
  const [avatar, setAvatar] = useState(
    currentAccount?.picture ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80'
  );
  const [level, setLevel] = useState<EnglishLevel>(
    userProfile.level || EnglishLevel.BEGINNER
  );
  const [goal, setGoal] = useState(
    userProfile.learningGoal || 'Daily routine conversation, travel, and career English'
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(
    userProfile.dailyGoalMinutes || 30
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...userProfile,
      name: name.trim() || userProfile.name,
      level,
      learningGoal: goal.trim(),
      dailyGoalMinutes: Number(dailyGoalMinutes) || 30,
    };
    onSave(updated, avatar);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#000035]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      id="student-profile-modal"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#607EC9]/40 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#000035] via-[#062863] to-[#1C4C96] text-white flex items-center justify-between border-b border-[#607EC9]/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1C4C96] text-[#F4CA54] flex items-center justify-center font-black shadow-md border border-[#9AB4FF]/50">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isEn ? 'Your Profile & Photo' : 'Seu Perfil & Sua Foto'}
              </h2>
              <p className="text-xs text-[#9AB4FF]">
                {isEn
                  ? 'Personalize your photo, name, and English goals.'
                  : 'Personalize sua foto, seu nome e seus objetivos com o inglês.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#9AB4FF] hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>
                {isEn
                  ? 'Profile and photo updated successfully!'
                  : 'Perfil e foto atualizados com sucesso!'}
              </span>
            </div>
          )}

          {/* Photo Upload Zone */}
          <ImageUploadInput
            label={isEn ? 'Your Profile Photo' : 'Sua Foto de Perfil'}
            value={avatar}
            onChange={(newImg) => setAvatar(newImg)}
            currentLanguage={currentLanguage}
            helperText={
              isEn
                ? 'Your photo is visible in your practice space and during live sessions with your Native Friend.'
                : 'Sua foto ficará visível no seu espaço de prática e durante as sessões com seu Amigo Nativo.'
            }
          />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'How would you like to be called? *' : 'Como você quer ser chamado(a)? *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035] font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
                placeholder="Ex: Regina Helena"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Your Current Level' : 'Seu Nível Atual'}
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as EnglishLevel)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035] font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
                >
                  <option value={EnglishLevel.BEGINNER}>
                    🌱 {isEn ? 'Beginner' : 'Iniciante (Começando do zero)'}
                  </option>
                  <option value={EnglishLevel.INTERMEDIATE}>
                    🌿 {isEn ? 'Intermediate' : 'Intermediário (Já entendo o dia a dia)'}
                  </option>
                  <option value={EnglishLevel.ADVANCED}>
                    🌳 {isEn ? 'Advanced' : 'Avançado (Buscando naturalidade)'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Daily Practice Time (Minutes)' : 'Sua Meta de Prática Diária (Minutos)'}
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="10"
                    max="180"
                    step="5"
                    value={dailyGoalMinutes}
                    onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035] font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'What is your main goal with English?' : 'Qual é o seu objetivo com o inglês?'}
              </label>
              <div className="relative">
                <Target className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={3}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g., Speak fluently in daily routines, meetings, and vacation trips'
                      : 'Ex: Falar com naturalidade na minha rotina, reuniões e viagens'
                  }
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035]"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#062863] to-[#1C4C96] hover:from-[#000035] hover:to-[#062863] text-white font-black text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4 text-[#F4CA54]" />
              <span>{isEn ? 'Save Profile' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
