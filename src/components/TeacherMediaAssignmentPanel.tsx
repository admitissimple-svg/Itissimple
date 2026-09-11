import React, { useState } from 'react';
import {
  Youtube,
  Music,
  Headphones,
  Save,
  Check,
  Radio,
  Disc,
  Trash2,
  ExternalLink,
  User,
  Sparkles,
} from 'lucide-react';
import {
  RoutineItem,
  DayOfWeek,
  TeacherAssignedVideo,
  TeacherAssignedSpotify,
  Language,
  GoogleAccount,
} from '../types';
import { extractYouTubeVideoId } from '../utils/youtube';
import { isValidSpotifyUrl } from '../utils/spotify';
import { Translations, getActivityDisplayName } from '../utils/i18n';

interface TeacherMediaAssignmentPanelProps {
  routinesByDay: Record<DayOfWeek, RoutineItem[]>;
  students: GoogleAccount[];
  selectedStudentEmail?: string;
  onSelectStudentEmail?: (email: string) => void;
  onTeacherSaveVideos?: (
    activityId: string,
    videos: TeacherAssignedVideo[],
    teacherNotes?: string,
    replicateToAllDays?: boolean,
    targetDays?: DayOfWeek[],
    spotify?: TeacherAssignedSpotify | null
  ) => void;
  currentLanguage: Language;
  t: Translations;
}

const WEEK_DAYS: { id: DayOfWeek; name: string }[] = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' },
];

export const TeacherMediaAssignmentPanel: React.FC<TeacherMediaAssignmentPanelProps> = ({
  routinesByDay,
  students,
  selectedStudentEmail,
  onTeacherSaveVideos,
}) => {
  // Find current active student info
  const selectedStudent = (students || []).find((s) => s.email === selectedStudentEmail);

  // Local state for each day's YouTube URL & Activity
  const [youtubeUrls, setYoutubeUrls] = useState<Record<DayOfWeek, string>>(() => {
    const initial: Record<DayOfWeek, string> = {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
    };
    WEEK_DAYS.forEach((d) => {
      const dayItems = (routinesByDay && routinesByDay[d.id]) || [];
      const itemWithVid = dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) || dayItems[0];
      if (itemWithVid?.teacherVideos?.[0]?.url) {
        initial[d.id] = itemWithVid.teacherVideos[0].url;
      }
    });
    return initial;
  });

  // Local state for each day's Spotify URL & Type
  const [spotifyUrls, setSpotifyUrls] = useState<Record<DayOfWeek, string>>(() => {
    const initial: Record<DayOfWeek, string> = {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
    };
    WEEK_DAYS.forEach((d) => {
      const dayItems = (routinesByDay && routinesByDay[d.id]) || [];
      const itemWithSpot = dayItems.find((i) => i && i.teacherSpotify?.url) || dayItems[0];
      if (itemWithSpot?.teacherSpotify?.url) {
        initial[d.id] = itemWithSpot.teacherSpotify.url;
      }
    });
    return initial;
  });

  const [spotifyTypes, setSpotifyTypes] = useState<Record<DayOfWeek, 'podcast' | 'music'>>(() => {
    const initial: Record<DayOfWeek, 'podcast' | 'music'> = {
      monday: 'podcast',
      tuesday: 'podcast',
      wednesday: 'podcast',
      thursday: 'podcast',
      friday: 'music',
      saturday: 'podcast',
      sunday: 'music',
    };
    WEEK_DAYS.forEach((d) => {
      const dayItems = (routinesByDay && routinesByDay[d.id]) || [];
      const itemWithSpot = dayItems.find((i) => i && i.teacherSpotify?.url) || dayItems[0];
      if (itemWithSpot?.teacherSpotify?.type) {
        initial[d.id] = (itemWithSpot.teacherSpotify.type as 'podcast' | 'music') || 'podcast';
      }
    });
    return initial;
  });

  // Save feedback state per day
  const [savedDayFeedback, setSavedDayFeedback] = useState<Record<string, boolean>>({});

  // Sync if routinesByDay updates
  React.useEffect(() => {
    WEEK_DAYS.forEach((d) => {
      const dayItems = (routinesByDay && routinesByDay[d.id]) || [];
      const itemWithVid = dayItems.find((i) => i && i.teacherVideos && i.teacherVideos.length > 0) || dayItems[0];
      if (itemWithVid?.teacherVideos?.[0]?.url) {
        setYoutubeUrls((prev) => ({ ...prev, [d.id]: itemWithVid.teacherVideos![0].url }));
      }
      const itemWithSpot = dayItems.find((i) => i && i.teacherSpotify?.url) || dayItems[0];
      if (itemWithSpot?.teacherSpotify?.url) {
        setSpotifyUrls((prev) => ({ ...prev, [d.id]: itemWithSpot.teacherSpotify!.url }));
        if (itemWithSpot.teacherSpotify.type) {
          setSpotifyTypes((prev) => ({
            ...prev,
            [d.id]: (itemWithSpot.teacherSpotify!.type as 'podcast' | 'music') || 'podcast',
          }));
        }
      }
    });
  }, [routinesByDay]);

  // Handler: Save individual YouTube Video for a day
  const handleSaveYouTubeDay = (dayId: DayOfWeek) => {
    if (!onTeacherSaveVideos) return;
    const dayItems = (routinesByDay && routinesByDay[dayId]) || [];
    const targetActivity = dayItems[0];
    if (!targetActivity) return;

    const url = (youtubeUrls[dayId] || '').trim();
    let finalVideos: TeacherAssignedVideo[] = [];

    if (url) {
      const vidId = extractYouTubeVideoId(url);
      finalVideos = [
        {
          id: `vid-${dayId}-${Date.now()}`,
          url,
          videoId: vidId || '',
          title: `${getActivityDisplayName(targetActivity.activityName, 'en')} Practice Video`,
          addedAt: new Date().toISOString(),
        },
      ];
    }

    onTeacherSaveVideos(targetActivity.id, finalVideos, undefined, false, [dayId]);

    setSavedDayFeedback((prev) => ({ ...prev, [`yt-${dayId}`]: true }));
    setTimeout(() => {
      setSavedDayFeedback((prev) => ({ ...prev, [`yt-${dayId}`]: false }));
    }, 2500);
  };

  // Handler: Save individual Spotify Audio for a day
  const handleSaveSpotifyDay = (dayId: DayOfWeek) => {
    if (!onTeacherSaveVideos) return;
    const dayItems = (routinesByDay && routinesByDay[dayId]) || [];
    const targetActivity = dayItems[0];
    if (!targetActivity) return;

    const url = (spotifyUrls[dayId] || '').trim();
    const type = spotifyTypes[dayId] || 'podcast';
    let finalSpotify: TeacherAssignedSpotify | null = null;

    if (url) {
      finalSpotify = {
        id: `spot-${dayId}-${Date.now()}`,
        url,
        title: type === 'podcast' ? 'Recommended English Podcast' : 'Recommended English Song',
        type,
        addedAt: new Date().toISOString(),
      };
    }

    onTeacherSaveVideos(targetActivity.id, targetActivity.teacherVideos || [], undefined, false, [dayId], finalSpotify);

    setSavedDayFeedback((prev) => ({ ...prev, [`spot-${dayId}`]: true }));
    setTimeout(() => {
      setSavedDayFeedback((prev) => ({ ...prev, [`spot-${dayId}`]: false }));
    }, 2500);
  };

  // Helper to get first routine item display text (always in English for teacher)
  const getActivityLabel = (dayId: DayOfWeek) => {
    const dayItems = routinesByDay[dayId] || [];
    const first = dayItems[0];
    if (!first) return 'Morning routine';
    const englishName = getActivityDisplayName(first.activityName, 'en');
    return `${first.time} ${englishName}`;
  };

  return (
    <div className="space-y-6">
      {/* Student context banner if selected */}
      {selectedStudent && (
        <div className="bg-[#000035] text-white p-4 rounded-2xl border border-[#1C4C96] flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1C4C96] flex items-center justify-center font-bold text-white border border-[#607EC9] shrink-0 overflow-hidden">
              {selectedStudent.picture && selectedStudent.picture.trim() !== '' ? (
                <img
                  src={selectedStudent.picture}
                  alt={selectedStudent.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#9AB4FF] uppercase tracking-wider">
                INDIVIDUAL STUDENT MEDIA RECOMMENDATIONS
              </div>
              <div className="text-sm font-black text-white">
                {selectedStudent.name} ({selectedStudent.email})
              </div>
            </div>
          </div>
          <div className="text-xs text-[#9AB4FF] flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Videos and music below are assigned specifically to this student</span>
          </div>
        </div>
      )}

      {/* TABLE 1: Assign YouTube Videos (Matching attached image 3) */}
      <div className="bg-white rounded-2xl border border-[#607EC9]/30 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Youtube className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#000035] uppercase tracking-wider">
                Assign YouTube Videos
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Paste daily YouTube links for listening practice throughout the week
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#000035] text-white uppercase text-[10px] font-black tracking-wider">
                <th className="p-3 w-32 border-b border-[#062863]">Week day</th>
                <th className="p-3 w-72 border-b border-[#062863]">Activity Moment</th>
                <th className="p-3 border-b border-[#062863]">Youtube video url</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {WEEK_DAYS.map((day) => {
                const isSaved = savedDayFeedback[`yt-${day.id}`];
                const currentUrl = youtubeUrls[day.id] || '';
                return (
                  <tr key={day.id} className="hover:bg-slate-50/70 transition">
                    {/* Day column */}
                    <td className="p-3 font-bold text-[#000035] whitespace-nowrap">
                      {day.name}
                    </td>

                    {/* Activity Moment column */}
                    <td className="p-3 text-slate-600 font-medium whitespace-nowrap">
                      <span className="truncate block max-w-xs" title={getActivityLabel(day.id)}>
                        {getActivityLabel(day.id)}
                      </span>
                    </td>

                    {/* Youtube Video URL input row with Trash and Save button */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="url"
                            value={currentUrl}
                            onChange={(e) =>
                              setYoutubeUrls((prev) => ({ ...prev, [day.id]: e.target.value }))
                            }
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full px-3 py-1.5 text-xs text-[#000035] bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1C4C96] focus:bg-white transition"
                          />
                        </div>

                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setYoutubeUrls((prev) => ({ ...prev, [day.id]: '' }));
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition rounded-md hover:bg-rose-50 cursor-pointer shrink-0"
                            title="Clear video URL"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveYouTubeDay(day.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                            isSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#1C4C96] hover:bg-[#062863] text-white'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: Assign Spotify Podcasts & Music (Matching attached image 4) */}
      <div className="bg-white rounded-2xl border border-[#607EC9]/30 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4 text-[#1DB954]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#000035] uppercase tracking-wider">
                Assign Spotify Podcasts & Music
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Curate daily podcasts or songs directly to the student's Spotify player
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#000035] text-white uppercase text-[10px] font-black tracking-wider">
                <th className="p-3 w-32 border-b border-[#062863]">Week day</th>
                <th className="p-3 border-b border-[#062863]">Spotify audio url</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {WEEK_DAYS.map((day) => {
                const isSaved = savedDayFeedback[`spot-${day.id}`];
                const currentUrl = spotifyUrls[day.id] || '';
                const currentType = spotifyTypes[day.id] || 'podcast';

                return (
                  <tr key={day.id} className="hover:bg-slate-50/70 transition">
                    {/* Day column */}
                    <td className="p-3 font-bold text-[#000035] whitespace-nowrap">
                      {day.name}
                    </td>

                    {/* Spotify Audio URL input row with Podcast/Music switch, Trash and Save */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {/* Audio Type Pill Toggle */}
                        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setSpotifyTypes((prev) => ({ ...prev, [day.id]: 'podcast' }))
                            }
                            className={`px-2 py-1 rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                              currentType === 'podcast'
                                ? 'bg-[#000035] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-[#000035]'
                            }`}
                          >
                            <Radio className="w-3 h-3 text-[#1DB954]" />
                            <span>Podcast</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSpotifyTypes((prev) => ({ ...prev, [day.id]: 'music' }))
                            }
                            className={`px-2 py-1 rounded-md text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                              currentType === 'music'
                                ? 'bg-[#000035] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-[#000035]'
                            }`}
                          >
                            <Disc className="w-3 h-3 text-amber-400" />
                            <span>Music</span>
                          </button>
                        </div>

                        {/* URL input */}
                        <div className="relative flex-1">
                          <input
                            type="url"
                            value={currentUrl}
                            onChange={(e) =>
                              setSpotifyUrls((prev) => ({ ...prev, [day.id]: e.target.value }))
                            }
                            placeholder="https://open.spotify.com/episode/... or track/..."
                            className="w-full px-3 py-1.5 text-xs text-[#000035] bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1DB954] focus:bg-white transition"
                          />
                        </div>

                        {currentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setSpotifyUrls((prev) => ({ ...prev, [day.id]: '' }));
                            }}
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition rounded-md hover:bg-rose-50 cursor-pointer shrink-0"
                            title="Clear Spotify URL"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveSpotifyDay(day.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                            isSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#1DB954] hover:bg-[#1ed760] text-[#000035]'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
