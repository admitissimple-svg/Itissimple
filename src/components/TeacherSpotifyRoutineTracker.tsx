import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Music,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Send,
  CheckCircle2,
  Calendar,
  User,
  Radio,
  Clock,
  Loader2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { DayOfWeek } from '../types';
import { useNativeFriendStudentSync } from '../hooks/useNativeFriendStudentSync';
import { getDayLabel } from '../utils/notifications';
import { getSpotifyDirectUrl } from '../utils/spotify';

export interface TeacherSpotifyRoutineTrackerProps {
  studentUid: string;
  studentEmail: string;
  studentName?: string;
  teacherUid?: string;
  teacherName?: string;
  teacherEmail?: string;
  weekId?: string;
  weeklyCycle?: number;
  studentTimezone?: string;
  activeStudyDays?: DayOfWeek[];
  activeStudyDaysCount?: number;
  studentLevel?: string;
}

export const TeacherSpotifyRoutineTracker: React.FC<TeacherSpotifyRoutineTrackerProps> = ({
  studentUid,
  studentEmail,
  studentName,
  teacherUid,
  teacherName,
  teacherEmail,
  weekId = 'week-5',
  weeklyCycle = 5,
  studentTimezone = 'America/Sao_Paulo',
  activeStudyDays,
  activeStudyDaysCount,
  studentLevel = 'intermediate',
}) => {
  const {
    routineDoc,
    currentSpotifyTrack,
    teacherFeedback,
    todayInStudentTz,
    isRestDay,
    isLoading,
    isSavingFeedback,
    feedbackSuccess,
    sendFeedback,
  } = useNativeFriendStudentSync({
    studentUid,
    studentEmail,
    studentName,
    teacherUid,
    teacherName,
    teacherEmail,
    weekId,
    weeklyCycle,
    studentTimezone,
    activeStudyDays,
    activeStudyDaysCount,
    studentLevel,
  });

  const [commentText, setCommentText] = useState<string>('');
  const [recommendationText, setRecommendationText] = useState<string>('');

  const currentDay = currentSpotifyTrack?.dayOfWeek || todayInStudentTz || 'monday';
  const existingFeedback = teacherFeedback;

  // Pre-fill text inputs if feedback already exists for this track/day
  useEffect(() => {
    if (existingFeedback) {
      setCommentText(existingFeedback.comment || '');
      setRecommendationText(existingFeedback.recommendation || '');
    } else {
      setCommentText('');
      setRecommendationText('');
    }
  }, [existingFeedback, currentSpotifyTrack?.id]);

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !recommendationText.trim()) return;
    if (!currentSpotifyTrack) return;

    await sendFeedback(commentText.trim(), recommendationText.trim());
  };

  const directUrl = currentSpotifyTrack?.url || (currentSpotifyTrack?.id ? `https://open.spotify.com/track/${currentSpotifyTrack.id}` : 'https://open.spotify.com');

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 via-[#000035] to-[#000035] text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1DB954]/20 border border-[#1DB954]/50 text-[#1DB954] flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1DB954]/30 text-emerald-300 border border-[#1DB954]/40">
                Real-Time Firestore Sync
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                <span>onSnapshot Active</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
              Student Song of the Day • Live Tracking
            </h3>
          </div>
        </div>

        {/* Correlation metadata (studentUID <-> nativeFriendUID) */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-400">Student:</span>
            <span className="text-emerald-300 font-bold truncate max-w-[110px]" title={studentUid}>
              {studentUid.slice(0, 10)}...
            </span>
          </div>
          <span className="text-slate-500">↔</span>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-400">Native Friend:</span>
            <span className="text-amber-300 font-bold truncate max-w-[110px]" title={teacherUid || teacherEmail}>
              {(teacherUid || teacherEmail || 'tutor').slice(0, 10)}...
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-5">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-xs font-medium">Connecting to student's Firestore routine...</p>
          </div>
        ) : currentSpotifyTrack ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Col: Synchronized Track Card */}
            <div className="lg:col-span-6 bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 sm:p-5 rounded-2xl border border-emerald-200/90 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300/80 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-emerald-700" />
                  <span>
                    {getDayLabel(currentSpotifyTrack.dayOfWeek, 'en')} ({getDayLabel(currentSpotifyTrack.dayOfWeek, 'pt')})
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {routineDoc?.updatedAt
                    ? `Updated: ${new Date(routineDoc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Today'}
                </span>
              </div>

              {/* Track visual info */}
              <div className="flex items-center gap-4">
                {currentSpotifyTrack.coverUrl ? (
                  <img
                    src={currentSpotifyTrack.coverUrl}
                    alt={currentSpotifyTrack.title}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 shadow-md border-2 border-emerald-400/80"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#1DB954] text-[#000035] flex items-center justify-center shrink-0 shadow-md">
                    <Music className="w-10 h-10" />
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#1DB954]/20 text-emerald-900">
                      Active Day Song
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-[#000035] truncate leading-tight" title={currentSpotifyTrack.title}>
                    {currentSpotifyTrack.title}
                  </h4>
                  <p className="text-xs sm:text-sm font-bold text-emerald-800 truncate" title={currentSpotifyTrack.artist}>
                    {currentSpotifyTrack.artist}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ID: {currentSpotifyTrack.id}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <a
                  href={directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#1DB954] hover:bg-[#1ed760] text-[#000035] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Listen on Spotify</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="text-[11px] text-emerald-800 font-medium bg-emerald-100/70 px-2.5 py-1 rounded-xl">
                  {studentName || 'Student'} is currently seeing this exact track
                </div>
              </div>
            </div>

            {/* Right Col: Native Friend Feedback & Recommendations Form */}
            <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-[#000035]">
                    Native Friend Song Notes & Recommendations
                  </h4>
                </div>
                {existingFeedback && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Feedback Recorded</span>
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connect your guidance directly to this song. Your notes will appear live on {studentName || 'the student'}'s Spotify player card.
              </p>

              <form onSubmit={handleSaveFeedback} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pronunciation & Listening Tip (English)
                  </label>
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="E.g. Pay attention to how the singer connects words in the chorus..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Live Session Discussion Question
                  </label>
                  <input
                    type="text"
                    value={recommendationText}
                    onChange={(e) => setRecommendationText(e.target.value)}
                    placeholder="E.g. What do you think the main theme of the lyrics is?"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {feedbackSuccess ? (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Synchronized to student in real time!</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Saved directly to <code className="text-slate-600">users/{studentUid.slice(0, 8)}.../currentRoutine</code>
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingFeedback || (!commentText.trim() && !recommendationText.trim())}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-[#000035] hover:bg-[#1C4C96] text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSavingFeedback ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Recommendation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-[#000035]">
                No Spotify Track Active for Today
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
                The student is on a scheduled Rest Day according to their weekly study frequency (1 song per study day rule), or is yet to open today's routine.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
