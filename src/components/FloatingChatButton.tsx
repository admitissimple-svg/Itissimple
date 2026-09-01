import React from 'react';
import { MessageSquare } from 'lucide-react';
import { GoogleAccount, Language } from '../types';

interface FloatingChatButtonProps {
  onOpenChat: () => void;
  currentAccount: GoogleAccount | null;
  currentLanguage: Language;
  unreadCount?: number;
  currentActivity?: any;
  userLevel?: any;
  t?: any;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  onOpenChat,
  currentAccount,
  currentLanguage,
  unreadCount = 0,
}) => {
  const isTeacher = currentAccount?.role === 'teacher' || currentAccount?.role === 'admin';
  const label = isTeacher
    ? (currentLanguage === 'en' ? 'Student Chat' : 'Chat com Alunos')
    : (currentLanguage === 'en' ? 'Chat with Your Native Friend' : 'Chat com Seu Amigo Nativo');

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        type="button"
        onClick={onOpenChat}
        className="flex items-center gap-3 px-4 py-3.5 bg-[#062863] hover:bg-[#000035] text-white rounded-2xl shadow-xl hover:shadow-2xl border-2 border-[#607EC9] transition-all transform hover:scale-105 cursor-pointer"
        title={currentLanguage === 'en' ? 'Open Chat with Your Native Friend' : 'Abrir Chat com Seu Amigo Nativo'}
        id="floating-chat-button"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-[#1C4C96] flex items-center justify-center text-white border border-[#9AB4FF]/40">
            <MessageSquare className="w-4 h-4 text-[#9AB4FF]" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#9AB4FF] rounded-full border-2 border-[#000035] animate-pulse" />
        </div>

        <div className="text-left pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white tracking-wide">{label}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#1C4C96] text-[#9AB4FF] border border-[#9AB4FF]/40 rounded-full uppercase">
              Online
            </span>
          </div>
          <span className="text-[10px] text-[#9AB4FF]/80 block">
            {currentLanguage === 'en' ? 'Direct messages & notices' : 'Mensagens e avisos da aula'}
          </span>
        </div>

        {unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
