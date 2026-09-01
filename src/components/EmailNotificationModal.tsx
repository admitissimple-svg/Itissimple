import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  Check,
  AlertCircle,
  User,
  ExternalLink,
} from 'lucide-react';
import { GoogleAccount, Language } from '../types';
import { sendEmailNotificationApi } from '../utils/gmail';

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAccount | null;
  teachers: GoogleAccount[];
  activityName?: string;
  currentLanguage: Language;
}

export const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  teachers,
  activityName = 'Daily English Practice',
  currentLanguage,
}) => {
  if (!isOpen) return null;

  const isEn = currentLanguage === 'en';
  const defaultTeacher = teachers[0]?.email || 'itissimple.school@gmail.com';
  const [recipient, setRecipient] = useState<string>(defaultTeacher);
  const [subject, setSubject] = useState<string>(
    `[It is Simple] Video request for routine: ${activityName}`
  );
  const [body, setBody] = useState<string>(
    `Hello Teacher,\n\nI am currently working on my routine activity "${activityName}" and would like to request a personalized YouTube video recommendation and guidance for this step.\n\nThank you,\n${currentAccount?.name || 'Student'}`
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      await sendEmailNotificationApi({
        to: recipient,
        subject,
        body,
        fromEmail: currentAccount?.email || 'student@itissimple.com',
        fromName: currentAccount?.name || 'Student',
      });

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.warn('Error sending email:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000035]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#607EC9]/30 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#000035] text-white flex items-center justify-between border-b border-[#1C4C96]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C4C96] flex items-center justify-center text-white shadow-xs border border-[#9AB4FF]/40">
              <Mail className="w-5 h-5 text-[#9AB4FF]" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                {isEn ? 'Send Email to Teacher' : 'Enviar E-mail ao Professor'}
              </h3>
              <p className="text-xs text-[#9AB4FF]">
                {isEn ? 'Google Workspace Gmail Notification' : 'Notificação via Gmail'}
              </p>
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
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {sentSuccess && (
            <div className="p-3 bg-[#9AB4FF]/20 border border-[#607EC9] rounded-2xl text-xs font-bold text-[#062863] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#1C4C96]" />
              <span>{isEn ? 'Email sent successfully!' : 'E-mail enviado com sucesso!'}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1">
              {isEn ? 'Teacher Recipient' : 'Destinatário (Professor)'}
            </label>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035]"
            >
              {teachers.map((tc) => (
                <option key={tc.email} value={tc.email}>
                  {tc.name} ({tc.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1">
              {isEn ? 'Subject' : 'Assunto'}
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#000035] mb-1">
              {isEn ? 'Message Body' : 'Mensagem'}
            </label>
            <textarea
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#607EC9]/40 rounded-xl text-xs text-[#000035] resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 bg-[#1C4C96] hover:bg-[#062863] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? (isEn ? 'Sending...' : 'Enviando...') : isEn ? 'Send Email' : 'Enviar E-mail'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
