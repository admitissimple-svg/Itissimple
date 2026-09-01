import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Globe,
  Sparkles,
  DollarSign,
  Calendar,
  Video,
  User,
  Mail,
  Send,
  Heart,
} from 'lucide-react';
import { Language, DayOfWeek } from '../types';
import { ImageUploadInput } from './ImageUploadInput';

interface BecomeTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: Language;
  onRegisteredSuccess?: (tutorData: any) => void;
}

export const BecomeTutorModal: React.FC<BecomeTutorModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onRegisteredSuccess,
}) => {
  const isEn = currentLanguage === 'en';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
    country: 'United States',
    accent: 'American (Standard)',
    nativeLanguage: 'English',
    headline: '',
    bio: '',
    videoUrl: '',
    priceUsd: '20',
    meetUrl: 'https://meet.google.com/new',
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayOfWeek[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Register with backend
      const tutorPayload = {
        name: formData.name,
        email: formData.email.toLowerCase().trim(),
        avatar: formData.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
        role: 'teacher',
        country: formData.country,
        accent: formData.accent,
        headline: formData.headline,
        bio: formData.bio,
        videoIntroUrl: formData.videoUrl,
        pricePerSessionUsd: Number(formData.priceUsd) || 18,
        pricePerSessionBrl: Math.round((Number(formData.priceUsd) || 18) * 5.5),
        availableDays: formData.availableDays,
        approvalStatus: 'pending',
        registeredByAdmin: false,
      };

      await fetch('/api/tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutor: tutorPayload }),
      });

      // Save meet settings
      await fetch('/api/meet-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherEmail: formData.email.toLowerCase().trim(),
          settings: {
            meetLink: formData.meetUrl,
            workingHoursStart: '08:00',
            workingHoursEnd: '18:00',
            slotDurationMinutes: 30,
            availableDays: formData.availableDays,
            timezone: 'America/New_York',
          },
        }),
      });

      setIsSubmitted(true);
      if (onRegisteredSuccess) {
        onRegisteredSuccess(tutorPayload);
      }
    } catch (err) {
      console.error('Error registering tutor:', err);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#607EC9]/30 relative my-8 animate-in fade-in zoom-in duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-black text-[#000035]">
              {isEn ? 'Application Received!' : 'Cadastro Enviado com Sucesso!'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {isEn
                ? 'Thank you for applying to be a Native Friend! Your profile has been sent for administrative approval. Once approved, your profile will be published on the platform.'
                : 'Obrigado pelo seu cadastro como Amigo Nativo! Seu perfil foi encaminhado para aprovação do administrador. Assim que aprovado, seu perfil será publicado na plataforma.'}
            </p>
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-[#062863] max-w-md mx-auto">
              <p className="font-bold">
                {isEn ? 'Status: Pending Administrator Review' : 'Status: Aguardando Aprovação do Administrador'}
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#062863] text-white hover:bg-[#000035] font-bold text-sm shadow-xs transition cursor-pointer"
              >
                {isEn ? 'Done / Back to Home' : 'Concluir / Voltar ao Início'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="space-y-1 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#062863]/10 text-[#062863] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#1C4C96]" />
                <span>{isEn ? 'Become a Native Friend' : 'Seja um Amigo Nativo'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#000035] tracking-tight">
                {isEn ? 'Share English by Living Life' : 'Ensine Inglês Vivendo a Vida'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {isEn
                  ? 'No grammar textbooks. Connect with Brazilian learners through daily routine conversations.'
                  : 'Sem livros chatos de gramática. Conecte-se com alunos através de conversas práticas sobre o dia a dia.'}
              </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  step === 1
                    ? 'border-[#1C4C96] text-[#000035]'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px]">1</span>
                <span>{isEn ? 'Personal Info' : 'Dados Pessoais'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  step === 2
                    ? 'border-[#1C4C96] text-[#000035]'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px]">2</span>
                <span>{isEn ? 'Bio & Video' : 'Bio & Apresentação'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  step === 3
                    ? 'border-[#1C4C96] text-[#000035]'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px]">3</span>
                <span>{isEn ? 'Schedule & Rate' : 'Horários & Preço'}</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Personal info */}
              {step === 1 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <ImageUploadInput
                    label={isEn ? 'Profile Photo / Avatar (Upload from device or choose)' : 'Foto de Perfil / Avatar (Carregar foto do dispositivo)'}
                    value={formData.avatar}
                    onChange={(newAvatar) => setFormData({ ...formData, avatar: newAvatar })}
                    currentLanguage={currentLanguage}
                    helperText={
                      isEn
                        ? 'Upload a friendly, clear headshot photo for your Native Friend profile.'
                        : 'Carregue uma foto nítida e simpática para o seu perfil de Amigo Nativo.'
                    }
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'Full Name *' : 'Nome Completo *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Charles Lambert"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm text-[#000035] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'Email Address (Google/Gmail) *' : 'Endereço de E-mail (Gmail) *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Ex: charles.lambert1939@gmail.com"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm text-[#000035] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1C4C96]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Native Country' : 'País de Origem'}
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm text-[#000035] focus:bg-white focus:outline-hidden"
                      >
                        <option value="United States">🇺🇸 United States</option>
                        <option value="Canada">🇨🇦 Canada</option>
                        <option value="United Kingdom">🇬🇧 United Kingdom</option>
                        <option value="South Africa">🇿🇦 South Africa</option>
                        <option value="Ireland">🇮🇪 Ireland</option>
                        <option value="Australia">🇦🇺 Australia</option>
                        <option value="New Zealand">🇳🇿 New Zealand</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Accent/Region' : 'Sotaque / Região'}
                      </label>
                      <input
                        type="text"
                        value={formData.accent}
                        onChange={(e) => setFormData({ ...formData, accent: e.target.value })}
                        placeholder="Ex: North American"
                        className="w-full px-3 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm text-[#000035] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!formData.name || !formData.email}
                      className="px-5 py-2.5 rounded-xl bg-[#062863] text-white hover:bg-[#000035] font-bold text-xs sm:text-sm disabled:opacity-50 cursor-pointer transition"
                    >
                      {isEn ? 'Next: Bio & Video →' : 'Avançar: Bio & Vídeo →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Bio & Video */}
              {step === 2 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'Short Catchy Headline' : 'Título Curto do Perfil'}
                    </label>
                    <input
                      type="text"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      placeholder="Ex: Certified Canadian educator helping you master everyday conversation."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm text-[#000035] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'About You & Teaching Approach' : 'Sobre Você e Método de Ensino'}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Ex: I love turning morning coffee and daily habits into natural English conversation..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm text-[#000035] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'YouTube Video Intro Link (Optional)' : 'Link do Vídeo de Apresentação no YouTube (Opcional)'}
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm text-[#000035] focus:bg-white"
                    />
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                    >
                      ← {isEn ? 'Back' : 'Voltar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 rounded-xl bg-[#062863] text-white hover:bg-[#000035] font-bold text-xs sm:text-sm cursor-pointer transition"
                    >
                      {isEn ? 'Next: Schedule & Rate →' : 'Avançar: Horários & Preço →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Rate & Availability */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Rate per 30-min Session (USD)' : 'Valor por Sessão de 30 min (USD)'}
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          value={formData.priceUsd}
                          onChange={(e) => setFormData({ ...formData, priceUsd: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-sm font-bold text-[#000035]"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        ≈ R$ {Math.round(Number(formData.priceUsd || 18) * 5.5)} BRL
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Personal Google Meet Link' : 'Link Padrão do Google Meet'}
                      </label>
                      <input
                        type="url"
                        value={formData.meetUrl}
                        onChange={(e) => setFormData({ ...formData, meetUrl: e.target.value })}
                        placeholder="https://meet.google.com/..."
                        className="w-full px-3 py-2 bg-slate-50 border border-[#607EC9]/30 rounded-xl text-xs font-mono text-[#000035]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      {isEn ? 'Available Days for 30-min Sessions' : 'Dias Disponíveis para Aulas'}
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((d) => {
                        const isSelected = formData.availableDays.includes(d);
                        const label = d.substring(0, 3).toUpperCase();
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDay(d)}
                            className={`py-2 text-xs font-extrabold rounded-xl border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#062863] text-white border-[#062863]'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                    >
                      ← {isEn ? 'Back' : 'Voltar'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? (isEn ? 'Submitting...' : 'Enviando...') : (isEn ? 'Complete Registration' : 'Concluir Cadastro')}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
