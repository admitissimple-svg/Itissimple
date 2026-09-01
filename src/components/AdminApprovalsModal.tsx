import React, { useState } from 'react';
import {
  X,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MapPin,
  DollarSign,
  ShieldCheck,
  Video,
  ExternalLink,
} from 'lucide-react';
import { NativeFriendTutor, Language } from '../types';

interface AdminApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutors: NativeFriendTutor[];
  onApproveTutor: (tutorId: string) => void;
  onRejectTutor: (tutorId: string) => void;
  currentLanguage: Language;
}

export const AdminApprovalsModal: React.FC<AdminApprovalsModalProps> = ({
  isOpen,
  onClose,
  tutors,
  onApproveTutor,
  onRejectTutor,
  currentLanguage,
}) => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  if (!isOpen) return null;

  const isEn = currentLanguage === 'en';

  const filteredTutors = tutors.filter((t) => {
    const status = t.approvalStatus || 'approved';
    if (filter === 'all') return true;
    return status === filter;
  });

  const pendingCount = tutors.filter((t) => (t.approvalStatus || 'approved') === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" id="admin-approvals-modal">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-[#607EC9]/40 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#000035] via-[#062863] to-[#1C4C96] text-white flex items-center justify-between border-b border-[#607EC9]/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1C4C96] text-[#F4CA54] flex items-center justify-center font-black shadow-md border border-[#9AB4FF]/50">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {isEn ? 'Native Friend Approval Center' : 'Aprovação de Amigos Nativos'}
                </h2>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#F4CA54] text-[#000035]">
                    {pendingCount} {isEn ? 'Pending' : 'Pendentes'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9AB4FF]">
                {isEn
                  ? 'Review and authorize native friends before they appear on the public directory.'
                  : 'Revise e aprove cadastros antes de serem listados publicamente na plataforma.'}
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

        {/* Filter bar */}
        <div className="flex items-center gap-2 p-4 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto">
          {[
            { id: 'pending', label: isEn ? 'Pending Review' : 'Pendentes de Análise', badge: pendingCount },
            { id: 'approved', label: isEn ? 'Approved Friends' : 'Aprovados' },
            { id: 'rejected', label: isEn ? 'Rejected' : 'Recusados' },
            { id: 'all', label: isEn ? 'All Applications' : 'Todos' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                filter === tab.id
                  ? 'bg-[#000035] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#F4CA54] text-[#000035] text-[10px] font-black flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tutors list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredTutors.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">
                {isEn ? 'No applications in this status.' : 'Nenhum cadastro com este status.'}
              </p>
            </div>
          ) : (
            filteredTutors.map((tutor) => {
              const status = tutor.approvalStatus || 'approved';
              return (
                <div
                  key={tutor.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-[#607EC9]/70 transition flex flex-col md:flex-row items-start justify-between gap-5"
                >
                  {/* Tutor Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={tutor.photoUrl}
                      alt={tutor.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#1C4C96]/20 shrink-0 shadow-xs"
                    />
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-black text-[#000035]">{tutor.name}</h3>
                        <span className="text-xs text-slate-500 font-medium">({tutor.headline})</span>

                        {status === 'pending' && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isEn ? 'Pending Review' : 'Aguardando Aprovação'}
                          </span>
                        )}
                        {status === 'approved' && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            {isEn ? 'Approved & Public' : 'Aprovado e Público'}
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            {isEn ? 'Rejected' : 'Recusado'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {tutor.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {tutor.location} • {tutor.nativeCountry}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          ${tutor.hourlyRateUsd}/h
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                        {tutor.bio}
                      </p>

                      {tutor.videoIntroUrl && (
                        <a
                          href={tutor.videoIntroUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#1C4C96] hover:underline font-bold mt-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Watch presentation video' : 'Ver vídeo de apresentação'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                    {status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => onApproveTutor(tutor.id)}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isEn ? 'Approve' : 'Aprovar'}</span>
                      </button>
                    )}

                    {status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => onRejectTutor(tutor.id)}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{isEn ? 'Reject' : 'Recusar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
