import { DayOfWeek, EnglishLevel } from '../types';

/**
 * Utility helpers for Spotify URLs, Embeds, and Automated Level-Based Daily Listening Playlists
 */

export type SpotifyContentType = 'podcast' | 'music' | 'episode' | 'track' | 'playlist' | 'show' | 'album';

export type NormalizedStudentLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SpotifyDailyTrack {
  dayOfWeek: DayOfWeek;
  dayLabelPt: string;
  dayLabelEn: string;
  trackId: string;
  title: string;
  artist: string;
  url: string;
  embedUrl: string;
  imageUrl?: string;
  albumImages?: Array<{ url: string; height?: number; width?: number }>;
  teacherTipPt: string;
  teacherTipEn: string;
}

export interface SpotifyLevelPlaylistConfig {
  level: NormalizedStudentLevel;
  levelLabelPt: string;
  levelLabelEn: string;
  playlistId: string;
  playlistTitle: string;
  playlistUrl: string;
  embedPlaylistUrl: string;
  descriptionPt: string;
  descriptionEn: string;
  tracks: Record<DayOfWeek, SpotifyDailyTrack>;
  pool?: SpotifyDailyTrack[];
}

export const DAYS_SEQUENCE: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Curated, verified Spotify playlists and sequential daily tracks from It's simple official account (Adm Itissimple).
 * - Beginner: https://open.spotify.com/playlist/5MMU9H5oXDd7FCWr0gkzHE
 * - Intermediate: https://open.spotify.com/playlist/34E52K1dEJO5CzZRPkIR4I
 * - Advanced: https://open.spotify.com/playlist/6ScLXNefp8JFohezoJve2Z
 */
/**
 * Official Bearer Token provided for Spotify Web API consumption
 */
export const SPOTIFY_BEARER_TOKEN =
  'BQDZaOSauB_P1_dU6XQhoSrxpGaylICF2pDVY0_ujvV8FtfaNbTzr2Gg4N9Krdaw9juHr6wQchk3s9UyGhVWWzp-GaKVoo2b3cMixk1louMzpm4aLU2GMfrtxo4qR0lJEyamoOf6ZdwSaJKdvjGunIALjFFXOuT4O2wjuk_cBM82i99nFBdPgBaBmZX9pYkBGJ-ZIGkM5It_oi0a9cTikMRL8pamkTLIKHJsgOwv5cpQwopmJfo02haX-1G96bQpGiEdO4Q0J6xP4MSQZv7Vnevfk9paZFbX_gyNCWITYOsV74pCZL7Fhvc3dRPU-b9jyfddByQ';

export const SPOTIFY_IT_IS_SIMPLE_TOKEN = SPOTIFY_BEARER_TOKEN;

export const DAY_LABELS: Record<DayOfWeek, { pt: string; en: string }> = {
  monday: { pt: 'Segunda-feira', en: 'Monday' },
  tuesday: { pt: 'Terça-feira', en: 'Tuesday' },
  wednesday: { pt: 'Quarta-feira', en: 'Wednesday' },
  thursday: { pt: 'Quinta-feira', en: 'Thursday' },
  friday: { pt: 'Sexta-feira', en: 'Friday' },
  saturday: { pt: 'Sábado', en: 'Saturday' },
  sunday: { pt: 'Domingo', en: 'Sunday' },
};

/**
 * Official Spotify Playlist IDs by level:
 * - Beginner: 5MMU9H5oXDd7FCWr0gkzHE
 * - Intermediate: 34E52K1dEJO5CzZRPkIR4I
 * - Advanced: 6ScLXNefp8JFohezoJve2Z
 */
export const SPOTIFY_PLAYLIST_IDS: Record<NormalizedStudentLevel, string> = {
  beginner: '5MMU9H5oXDd7FCWr0gkzHE',
  intermediate: '34E52K1dEJO5CzZRPkIR4I',
  advanced: '6ScLXNefp8JFohezoJve2Z',
};

/**
 * Creates a clean official playlist default entry for a day of week
 * No mock/hardcoded tracks are used.
 */
export function createDefaultTrackForDay(
  level: NormalizedStudentLevel,
  dayOfWeek: DayOfWeek
): SpotifyDailyTrack {
  const playlistId = SPOTIFY_PLAYLIST_IDS[level] || SPOTIFY_PLAYLIST_IDS.beginner;
  const label = DAY_LABELS[dayOfWeek] || { pt: 'Dia', en: 'Day' };
  const levelTitle =
    level === 'advanced'
      ? "Advanced • It's simple"
      : level === 'intermediate'
      ? "Intermediate • It's simple"
      : "Beginner • It's simple";

  return {
    dayOfWeek,
    dayLabelPt: label.pt,
    dayLabelEn: label.en,
    trackId: playlistId,
    title: levelTitle,
    artist: "It's simple (Adm Itissimple)",
    url: `https://open.spotify.com/playlist/${playlistId}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`,
    imageUrl: undefined,
    albumImages: [],
    teacherTipPt: "Ouça a playlist oficial da It's simple no Spotify para praticar sua compreensão auditiva diária.",
    teacherTipEn: "Listen to the official It's simple Spotify playlist to practice your daily listening comprehension.",
  };
}

export const createLevelTracksMap = (level: NormalizedStudentLevel): Record<DayOfWeek, SpotifyDailyTrack> => {
  const map = {} as Record<DayOfWeek, SpotifyDailyTrack>;
  DAYS_SEQUENCE.forEach((day) => {
    map[day] = createDefaultTrackForDay(level, day);
  });
  return map;
};

export const SPOTIFY_LEVEL_PLAYLISTS: Record<NormalizedStudentLevel, SpotifyLevelPlaylistConfig> = {
  beginner: {
    level: "beginner",
    levelLabelPt: "Iniciante",
    levelLabelEn: "Beginner",
    playlistId: "5MMU9H5oXDd7FCWr0gkzHE",
    playlistTitle: "Beginner • It's simple",
    playlistUrl: "https://open.spotify.com/playlist/5MMU9H5oXDd7FCWr0gkzHE",
    embedPlaylistUrl: "https://open.spotify.com/embed/playlist/5MMU9H5oXDd7FCWr0gkzHE?utm_source=generator&theme=0",
    descriptionPt: "Playlist oficial da It's simple (Adm Itissimple) para Iniciantes: músicas com dicção clara, frases fundamentais e ritmo acolhedor.",
    descriptionEn: "Official It's simple playlist (Adm Itissimple) for Beginners: songs featuring clear diction, foundational phrasing, and accessible rhythm.",
    tracks: createLevelTracksMap("beginner"),
    pool: [],
  },
  intermediate: {
    level: "intermediate",
    levelLabelPt: "Intermediário",
    levelLabelEn: "Intermediate",
    playlistId: "34E52K1dEJO5CzZRPkIR4I",
    playlistTitle: "Intermediate • It's simple",
    playlistUrl: "https://open.spotify.com/playlist/34E52K1dEJO5CzZRPkIR4I",
    embedPlaylistUrl: "https://open.spotify.com/embed/playlist/34E52K1dEJO5CzZRPkIR4I?utm_source=generator&theme=0",
    descriptionPt: "Playlist oficial da It's simple (Adm Itissimple) para Intermediários: vocabulário do cotidiano, expressões idiomáticas e estruturas gramaticais variadas.",
    descriptionEn: "Official It's simple playlist (Adm Itissimple) for Intermediates: everyday vocabulary, idiomatic expressions, and diverse sentence structures.",
    tracks: createLevelTracksMap("intermediate"),
    pool: [],
  },
  advanced: {
    level: "advanced",
    levelLabelPt: "Avançado",
    levelLabelEn: "Advanced",
    playlistId: "6ScLXNefp8JFohezoJve2Z",
    playlistTitle: "Advanced • It's simple",
    playlistUrl: "https://open.spotify.com/playlist/6ScLXNefp8JFohezoJve2Z",
    embedPlaylistUrl: "https://open.spotify.com/embed/playlist/6ScLXNefp8JFohezoJve2Z?utm_source=generator&theme=0",
    descriptionPt: "Playlist oficial da It's simple (Adm Itissimple) para Alunos Avançados: ritmo rápido, metáforas culturais, linguagem coloquial e rimas complexas.",
    descriptionEn: "Official It's simple playlist (Adm Itissimple) for Advanced Students: fast cadence, cultural metaphors, colloquial speech, and intricate phrasing.",
    tracks: createLevelTracksMap("advanced"),
    pool: [],
  },
};

export const SPOTIFY_PLAYLISTS = SPOTIFY_LEVEL_PLAYLISTS;

export const SPOTIFY_CACHE_KEY_PREFIX = 'its_simple_spotify_playlist_v4_';
export const SPOTIFY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SpotifyPlaylistCacheEntry {
  playlistId: string;
  tracks: SpotifyDailyTrack[];
  timestamp: number;
}

/**
 * Checks all levels in localStorage and purges entries whose playlistId no longer matches
 * the active configuration.
 */
export function checkAndInvalidateSpotifyCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  (['beginner', 'intermediate', 'advanced'] as NormalizedStudentLevel[]).forEach((lvl) => {
    try {
      // Purge old v3 cache if present
      localStorage.removeItem(`its_simple_spotify_playlist_v3_${lvl}`);

      const raw = localStorage.getItem(`${SPOTIFY_CACHE_KEY_PREFIX}${lvl}`);
      if (raw) {
        const parsed: SpotifyPlaylistCacheEntry = JSON.parse(raw);
        if (parsed.playlistId !== SPOTIFY_LEVEL_PLAYLISTS[lvl].playlistId) {
          console.info(
            `[Spotify Cache] Invalidação automática para "${lvl}": removendo cache da playlist antiga "${parsed.playlistId}". Nova playlist: "${SPOTIFY_LEVEL_PLAYLISTS[lvl].playlistId}".`
          );
          localStorage.removeItem(`${SPOTIFY_CACHE_KEY_PREFIX}${lvl}`);
        }
      }
    } catch {
      localStorage.removeItem(`${SPOTIFY_CACHE_KEY_PREFIX}${lvl}`);
    }
  });
}

/**
 * Retrieves cached playlist tracks from localStorage with strict playlistId validation.
 * If the playlist ID stored in cache does not match the current level's playlist ID (e.g. updated Intermediate playlist),
 * the cache is automatically invalidated, cleared from persistent storage, and null is returned to force fresh consumption.
 */
export function getCachedPlaylistTracks(rawLevel?: string | EnglishLevel | null): SpotifyDailyTrack[] | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const norm = normalizeStudentLevel(rawLevel);
  const currentConfig = SPOTIFY_LEVEL_PLAYLISTS[norm];
  if (!currentConfig) return null;

  try {
    const raw = localStorage.getItem(`${SPOTIFY_CACHE_KEY_PREFIX}${norm}`);
    if (!raw) return null;
    const parsed: SpotifyPlaylistCacheEntry = JSON.parse(raw);

    // Strict validation: Invalidate cache when playlist ID changed
    if (parsed.playlistId !== currentConfig.playlistId) {
      console.info(
        `[Spotify Cache] Invalidação detectada no nível "${norm}": ID armazenado ("${parsed.playlistId}") diferente do atual ("${currentConfig.playlistId}"). Limpando cache.`
      );
      invalidateSpotifyPlaylistCache(norm);
      return null;
    }

    if (Date.now() - parsed.timestamp > SPOTIFY_CACHE_TTL_MS) {
      invalidateSpotifyPlaylistCache(norm);
      return null;
    }

    return parsed.tracks;
  } catch (e) {
    invalidateSpotifyPlaylistCache(norm);
    return null;
  }
}

/**
 * Saves tracks in localStorage cache alongside the playlistId for future invalidation checks.
 */
export function setCachedPlaylistTracks(
  rawLevel: string | EnglishLevel | null | undefined,
  playlistId: string,
  tracks: SpotifyDailyTrack[]
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const norm = normalizeStudentLevel(rawLevel);
  try {
    const entry: SpotifyPlaylistCacheEntry = {
      playlistId,
      tracks,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${SPOTIFY_CACHE_KEY_PREFIX}${norm}`, JSON.stringify(entry));
  } catch (e) {
    console.warn('[Spotify Cache] Erro ao salvar cache de faixas:', e);
  }
}

/**
 * Explicitly clears/invalidates the Spotify playlist cache for a specific level or all levels.
 */
export function invalidateSpotifyPlaylistCache(level?: NormalizedStudentLevel | string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (level) {
      const norm = normalizeStudentLevel(level);
      localStorage.removeItem(`${SPOTIFY_CACHE_KEY_PREFIX}${norm}`);
    } else {
      (['beginner', 'intermediate', 'advanced'] as NormalizedStudentLevel[]).forEach((lvl) => {
        localStorage.removeItem(`${SPOTIFY_CACHE_KEY_PREFIX}${lvl}`);
      });
    }
  } catch (e) {
    console.warn('[Spotify Cache] Erro ao invalidar cache:', e);
  }
}

// Automatically purge outdated cache on module initialization in browser environment
if (typeof window !== 'undefined') {
  checkAndInvalidateSpotifyCache();
}

/**
 * Triggers the dynamic Spotify API request to search/fetch tracks for a playlist:
 * Endpoint: https://api.spotify.com/v1/playlists/${playlistId}/tracks
 * For Intermediate: https://api.spotify.com/v1/playlists/34E52K1dEJO5CzZRPkIR4I/tracks
 */
export async function fetchPlaylistTracksFromSpotifyApi(
  playlistId: string,
  token: string = SPOTIFY_IT_IS_SIMPLE_TOKEN
): Promise<any> {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`[Spotify API] Requisição para ${url} retornou status [${res.status}]`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Spotify API] Erro ao buscar faixas em ${url}:`, err);
    return null;
  }
}

/**
 * Triggers dynamic track fetching for student's level (Intermediate -> 34E52K1dEJO5CzZRPkIR4I, etc.).
 * Checks and invalidates local cache if playlistId differs, then requests tracks from Spotify API.
 */
export async function fetchTracksForStudentLevel(
  rawLevel?: string | EnglishLevel | null,
  token: string = SPOTIFY_IT_IS_SIMPLE_TOKEN
): Promise<SpotifyDailyTrack[] | null> {
  const norm = normalizeStudentLevel(rawLevel);
  const config = SPOTIFY_LEVEL_PLAYLISTS[norm];
  if (!config) return null;

  // 1. Verify and retrieve from valid cache (automatically invalidates if playlistId differs)
  const cached = getCachedPlaylistTracks(norm);
  if (cached && cached.length > 0) {
    return cached;
  }

  // 2. Trigger dynamic request: https://api.spotify.com/v1/playlists/${config.playlistId}/tracks
  // When norm === 'intermediate', this explicitly calls https://api.spotify.com/v1/playlists/34E52K1dEJO5CzZRPkIR4I/tracks
  const data = await fetchPlaylistTracksFromSpotifyApi(config.playlistId, token);
  if (data && Array.isArray(data.items) && data.items.length > 0) {
    const mappedTracks: SpotifyDailyTrack[] = data.items
      .filter((item: any) => item && item.track && item.track.id)
      .map((item: any, idx: number) => {
        const t = item.track;
        const day = DAYS_SEQUENCE[idx % 7];
        const artistNames = t.artists?.map((a: any) => a.name).join(', ') || 'Adm Itissimple';
        const albumImages = t.album?.images || [];
        const imageUrl = albumImages[0]?.url || albumImages[1]?.url || undefined;
        return {
          dayOfWeek: day,
          dayLabelPt: config.tracks[day]?.dayLabelPt || DAY_LABELS[day]?.pt || day,
          dayLabelEn: config.tracks[day]?.dayLabelEn || DAY_LABELS[day]?.en || day,
          trackId: t.id,
          title: t.name,
          artist: artistNames,
          url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
          embedUrl: `https://open.spotify.com/embed/track/${t.id}?utm_source=generator&theme=0`,
          imageUrl,
          albumImages,
          teacherTipPt: `Prática auditiva com "${t.name}" (${artistNames}). Preste atenção na pronúncia, ritmo e vocabulário.`,
          teacherTipEn: `Active listening practice with "${t.name}" (${artistNames}). Focus on rhythm, pronunciation, and vocabulary.`,
        };
      });

    if (mappedTracks.length > 0) {
      // Synchronize in-memory config for immediate access
      DAYS_SEQUENCE.forEach((d, idx) => {
        if (mappedTracks[idx]) {
          config.tracks[d] = mappedTracks[idx];
        }
      });
      if (mappedTracks.length > 7) {
        config.pool = mappedTracks.slice(7);
      }
      setCachedPlaylistTracks(norm, config.playlistId, mappedTracks);
      return mappedTracks;
    }
  }

  return null;
}

/**
 * Spotify Web API integration helper using Spotify Authorization Bearer Token
 * As provided in the It's simple developer integration specification.
 */
export async function fetchSpotifyWebApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  token: string = SPOTIFY_IT_IS_SIMPLE_TOKEN
): Promise<any> {
  try {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.warn(`Spotify API call failed [${res.status}]:`, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('Error fetching Spotify Web API:', err);
    return null;
  }
}

/**
 * Normalizes any variation of student level into 'beginner' | 'intermediate' | 'advanced'
 */
export function normalizeStudentLevel(rawLevel?: string | EnglishLevel | null): NormalizedStudentLevel {
  if (!rawLevel) return 'beginner';
  const l = String(rawLevel).toLowerCase().trim();
  if (l.includes('inter')) return 'intermediate';
  if (l.includes('avan') || l.includes('adv')) return 'advanced';
  return 'beginner';
}

/**
 * Retrieves the Spotify playlist configuration mapped to the student's level
 */
export function getSpotifyPlaylistForLevel(rawLevel?: string | EnglishLevel | null): SpotifyLevelPlaylistConfig {
  const norm = normalizeStudentLevel(rawLevel);
  return SPOTIFY_LEVEL_PLAYLISTS[norm] || SPOTIFY_LEVEL_PLAYLISTS.beginner;
}

/**
 * Retrieves the daily track sequentially mapped from the level's playlist for the selected day
 */
export function getDailySpotifyTrackForStudent(
  rawLevel: string | EnglishLevel | null | undefined,
  dayOfWeek: DayOfWeek
): SpotifyDailyTrack {
  const norm = normalizeStudentLevel(rawLevel);
  const cachedTracks = getCachedPlaylistTracks(norm);
  if (cachedTracks && cachedTracks.length > 0) {
    const found = cachedTracks.find((t) => t.dayOfWeek === dayOfWeek);
    if (found) return found;
    const dayIdx = DAYS_SEQUENCE.indexOf(dayOfWeek);
    if (dayIdx >= 0 && cachedTracks[dayIdx]) return cachedTracks[dayIdx];
  }
  const playlist = getSpotifyPlaylistForLevel(rawLevel);
  const track = playlist.tracks[dayOfWeek];
  if (track) return track;
  // Fallback to monday track of that level
  return playlist.tracks.monday;
}

/**
 * Known corrupt, deleted, or dummy Spotify IDs that fail, return 404, or produce "Couldn't find that podcast"
 */
export const CORRUPT_SPOTIFY_IDS = [
  '5VzKk7uV4C8Oa2sH3eWz9Y', // legacy dummy placeholder that returns 404
  '2qO2kUvhq8XwXhL3oG5F9y', // fake episode placeholder that returns 404
  '3G7aZ1pL9yQw6Vx8J2nMbT', // fake episode placeholder that returns 404
  '07eP4C54x26sOaVn9z1mJy', // fake show placeholder that returns 500
  '07eP4C54x26sQaVn9z1mJy', // fake show placeholder that returns 500
  '0nvd89U6p8s95aGphBvR5J', // fake show placeholder that returns 500
  '4bHsxqRFFGmgTyKeUmF9ox', // old broken track ID
];

export interface SpotifyUrlValidationResult {
  isValid: boolean;
  type: 'track' | 'episode' | 'show' | 'playlist' | 'album' | null;
  id: string | null;
  canonicalUrl: string | null;
  embedUrl: string | null;
  directUrl: string;
  contentType: SpotifyContentType;
  errorMessage?: string;
}

/**
 * Strict parser and sanitizer for Spotify URLs and URIs.
 * Validates /track/, /episode/, /show/, /playlist/, and /album/ URLs.
 * Handles internationalized prefixes (e.g. /intl-pt/) and strips query parameters.
 */
export function parseSpotifyUrl(url: string | null | undefined): SpotifyUrlValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      type: null,
      id: null,
      canonicalUrl: null,
      embedUrl: null,
      directUrl: 'https://open.spotify.com',
      contentType: 'podcast',
      errorMessage: 'URL do Spotify não fornecida.',
    };
  }

  const clean = url.trim();

  // Check for known corrupted or broken IDs
  for (const badId of CORRUPT_SPOTIFY_IDS) {
    if (clean.includes(badId)) {
      return {
        isValid: false,
        type: 'episode',
        id: badId,
        canonicalUrl: null,
        embedUrl: null,
        directUrl: 'https://open.spotify.com',
        contentType: 'podcast',
        errorMessage: 'Link corrompido do Spotify detectado: este conteúdo não existe no catálogo ("Couldn\'t find that podcast").',
      };
    }
  }

  // 1. Matches standard web URL or internationalized URL (e.g., /intl-pt/track/...)
  // or embed URL (e.g., /embed/track/...)
  const webRegex = /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*spotify\.com(?::\d+)?\/(?:intl-[a-z]{2,3}(?:-[a-z]{2,4})?\/)?(?:embed\/)?(track|episode|show|playlist|album)\/([a-zA-Z0-9]{15,35})(?:[?#].*)?$/i;
  const webMatch = clean.match(webRegex);

  if (webMatch) {
    const type = webMatch[1].toLowerCase() as 'track' | 'episode' | 'show' | 'playlist' | 'album';
    const id = webMatch[2];

    const canonicalUrl = `https://open.spotify.com/${type}/${id}`;
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    const contentType: SpotifyContentType = (type === 'episode' || type === 'show') ? 'podcast' : type === 'playlist' ? 'playlist' : 'music';

    return {
      isValid: true,
      type,
      id,
      canonicalUrl,
      embedUrl,
      directUrl: canonicalUrl,
      contentType,
    };
  }

  // 2. Matches Spotify URI (spotify:track:ID, spotify:episode:ID, etc.)
  const uriRegex = /^spotify:(track|episode|show|playlist|album):([a-zA-Z0-9]{15,35})$/i;
  const uriMatch = clean.match(uriRegex);

  if (uriMatch) {
    const type = uriMatch[1].toLowerCase() as 'track' | 'episode' | 'show' | 'playlist' | 'album';
    const id = uriMatch[2];

    const canonicalUrl = `https://open.spotify.com/${type}/${id}`;
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    const contentType: SpotifyContentType = (type === 'episode' || type === 'show') ? 'podcast' : type === 'playlist' ? 'playlist' : 'music';

    return {
      isValid: true,
      type,
      id,
      canonicalUrl,
      embedUrl,
      directUrl: canonicalUrl,
      contentType,
    };
  }

  // If it didn't match the strict patterns, generate a helpful diagnostic error
  if (!clean.includes('spotify.com') && !clean.startsWith('spotify:')) {
    return {
      isValid: false,
      type: null,
      id: null,
      canonicalUrl: null,
      embedUrl: null,
      directUrl: 'https://open.spotify.com',
      contentType: 'podcast',
      errorMessage: 'O link fornecido não pertence ao Spotify. Cole uma URL do open.spotify.com.',
    };
  }

  if (clean.includes('/episode/') || clean.includes('/track/') || clean.includes('/show/')) {
    return {
      isValid: false,
      type: null,
      id: null,
      canonicalUrl: null,
      embedUrl: null,
      directUrl: 'https://open.spotify.com',
      contentType: 'podcast',
      errorMessage: 'O ID do Spotify parece incompleto ou truncado. Copie o link completo através do botão "Compartilhar" no Spotify.',
    };
  }

  return {
    isValid: false,
    type: null,
    id: null,
    canonicalUrl: null,
    embedUrl: null,
    directUrl: 'https://open.spotify.com',
    contentType: 'podcast',
    errorMessage: 'Formato de link não suportado. Use links de episódios (/episode/), músicas (/track/) ou podcasts (/show/).',
  };
}

/**
 * Extracts a clean 22-character Spotify track or episode ID from any URL, URI, or ID string
 */
export function extractSpotifyTrackId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const clean = urlOrId.trim();
  if (/^[a-zA-Z0-9]{15,35}$/.test(clean)) return clean;
  const parsed = parseSpotifyUrl(clean);
  return parsed.isValid ? parsed.id : null;
}

/**
 * Returns the ordered array of 7 tracks for a student's level (Monday through Sunday)
 */
export function getWeeklySpotifyTracksForLevel(level: NormalizedStudentLevel = 'beginner'): SpotifyDailyTrack[] {
  const playlist = SPOTIFY_LEVEL_PLAYLISTS[level] || SPOTIFY_LEVEL_PLAYLISTS.beginner;
  return DAYS_SEQUENCE.map((day) => playlist.tracks[day]);
}

/**
 * Validates if the string is a valid Spotify URL or URI
 */
export function isValidSpotifyUrl(url: string): boolean {
  return parseSpotifyUrl(url).isValid;
}

/**
 * Extracts the embed URL for an iframe from any standard Spotify link
 * E.g.: https://open.spotify.com/episode/xyz -> https://open.spotify.com/embed/episode/xyz?utm_source=generator&theme=0
 * E.g.: https://open.spotify.com/track/xyz -> https://open.spotify.com/embed/track/xyz?utm_source=generator&theme=0
 */
export function getSpotifyEmbedUrl(url: string): string | null {
  const result = parseSpotifyUrl(url);
  return result.isValid ? result.embedUrl : null;
}

/**
 * Returns a standardized canonical web link to open in Spotify app/browser
 */
export function getSpotifyDirectUrl(url: string): string {
  const result = parseSpotifyUrl(url);
  if (result.isValid && result.canonicalUrl) {
    return result.canonicalUrl;
  }
  if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url.trim();
  }
  return 'https://open.spotify.com';
}

/**
 * Determines content type (podcast vs music) from Spotify URL
 */
export function getSpotifyContentType(url: string): SpotifyContentType {
  const result = parseSpotifyUrl(url);
  if (result.isValid) {
    return result.contentType;
  }
  if (!url) return 'podcast';
  const lower = url.toLowerCase();
  if (lower.includes('/episode/') || lower.includes(':episode:') || lower.includes('/show/') || lower.includes(':show:')) {
    return 'podcast';
  }
  if (lower.includes('/track/') || lower.includes(':track:') || lower.includes('/album/') || lower.includes(':album:')) {
    return 'music';
  }
  if (lower.includes('/playlist/') || lower.includes(':playlist:')) {
    return 'playlist';
  }
  return 'podcast';
}

