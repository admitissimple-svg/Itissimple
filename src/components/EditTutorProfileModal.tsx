import React, { useState } from 'react';
import {
  X,
  User,
  Save,
  Check,
  Camera,
  Video,
  DollarSign,
  MapPin,
  Globe,
  Sparkles,
  FileText,
} from 'lucide-react';
import { NativeFriendTutor, Language } from '../types';
import { ImageUploadInput } from './ImageUploadInput';

interface EditTutorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: NativeFriendTutor;
  onSave: (updated: NativeFriendTutor) => void;
  currentLanguage: Language;
}

export const EditTutorProfileModal: React.FC<EditTutorProfileModalProps> = ({
  isOpen,
  onClose,
  tutor,
  onSave,
  currentLanguage,
}) => {
  const [formData, setFormData] = useState<NativeFriendTutor>({ ...tutor });
  const [specialtiesText, setSpecialtiesText] = useState(
    (tutor.specialties || []).join(', ')
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const isEn = currentLanguage === 'en';

  const handleChange = (field: keyof NativeFriendTutor, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: NativeFriendTutor = {
      ...formData,
      specialties: specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" id="edit-tutor-profile-modal">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#607EC9]/40 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#000035] via-[#062863] to-[#1C4C96] text-white flex items-center justify-between border-b border-[#607EC9]/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1C4C96] text-[#F4CA54] flex items-center justify-center font-black shadow-md border border-[#9AB4FF]/50">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isEn ? 'Edit My Public Profile & Presentation' : 'Editar Meu Perfil e Apresentação'}
              </h2>
              <p className="text-xs text-[#9AB4FF]">
                {isEn
                  ? 'Update your bio, photo, hourly rate, and video introduction.'
                  : 'Atualize sua foto, biografia, valor por hora e vídeo de apresentação.'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{isEn ? 'Profile updated successfully!' : 'Perfil de Amigo Nativo atualizado com sucesso!'}</span>
            </div>
          )}

          {/* Profile Photo Upload */}
          <ImageUploadInput
            label={isEn ? 'Profile Photo / Avatar (Upload from device or choose)' : 'Foto de Perfil / Avatar (Carregar do dispositivo ou escolher)'}
            value={formData.avatar}
            onChange={(newAvatar) => handleChange('avatar', newAvatar)}
            currentLanguage={currentLanguage}
            helperText={
              isEn
                ? 'Your photo will be showcased on the Native Friends catalog and live session bookings.'
                : 'Sua foto será exibida no catálogo de Amigos Nativos e nas reservas de aulas ao vivo.'
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Display Name' : 'Nome de Exibição'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Headline / Subtitle' : 'Título Curto / Especialidade'} *
              </label>
              <input
                type="text"
                required
                value={formData.headline}
                onChange={(e) => handleChange('headline', e.target.value)}
                placeholder="e.g. Native New Yorker • Daily Conversation"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Price per 30-min Session (USD)' : 'Valor por Sessão de 30 min (USD)'} *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="5"
                  max="200"
                  required
                  value={formData.pricePerSessionUsd}
                  onChange={(e) => handleChange('pricePerSessionUsd', Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Accent / Origin Description' : 'Sotaque / Descrição de Origem'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.accent}
                  onChange={(e) => handleChange('accent', e.target.value)}
                  placeholder="e.g. North American (Canadian/Toronto)"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Native Country' : 'País de Origem'}
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="e.g. Canada, United States, UK"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Specialties (separated by comma)' : 'Especialidades (separadas por vírgula)'}
            </label>
            <input
              type="text"
              value={specialtiesText}
              onChange={(e) => setSpecialtiesText(e.target.value)}
              placeholder="e.g. Daily Habits, Accent Polish, Business Confidence"
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Video Introduction Link (YouTube / Vimeo / Loom)' : 'Link do Vídeo de Apresentação (YouTube / Vimeo)'}
            </label>
            <div className="relative">
              <Video className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={formData.videoIntroUrl || ''}
                onChange={(e) => handleChange('videoIntroUrl', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-[#000035]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Biography & Presentation' : 'Biografia e Apresentação'} *
            </label>
            <textarea
              rows={4}
              required
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell students about yourself and your approach to practicing English through daily routines..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-[#000035]"
            />
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#000035] hover:bg-[#1C4C96] text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-[#F4CA54]" />
              <span>{isEn ? 'Save Presentation' : 'Salvar Apresentação'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
