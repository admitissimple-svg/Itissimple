/**
 * Utility helpers for Spotify URLs and Embeds
 */

export type SpotifyContentType = 'podcast' | 'music' | 'episode' | 'track' | 'playlist' | 'show' | 'album';

/**
 * Validates if the string is a valid Spotify URL or URI
 */
export function isValidSpotifyUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return (
    clean.includes('spotify.com/') ||
    clean.startsWith('spotify:') ||
    /^https?:\/\/(open\.)?spotify\.com\/(track|episode|show|playlist|album)\/[a-zA-Z0-9]+/i.test(clean)
  );
}

/**
 * Extracts the embed URL for an iframe from any standard Spotify link
 * E.g.: https://open.spotify.com/episode/xyz -> https://open.spotify.com/embed/episode/xyz?utm_source=generator&theme=0
 * E.g.: https://open.spotify.com/track/xyz -> https://open.spotify.com/embed/track/xyz?utm_source=generator&theme=0
 */
export function getSpotifyEmbedUrl(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // If already an embed URL
  if (clean.includes('open.spotify.com/embed/')) {
    return clean;
  }

  // Matches open.spotify.com/(track|episode|show|playlist|album)/ID
  const match = clean.match(/spotify\.com\/(track|episode|show|playlist|album)\/([a-zA-Z0-9]+)/i);
  if (match) {
    const type = match[1].toLowerCase();
    const id = match[2];
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  }

  // Matches URI format spotify:(track|episode|show|playlist|album):ID
  const uriMatch = clean.match(/spotify:(track|episode|show|playlist|album):([a-zA-Z0-9]+)/i);
  if (uriMatch) {
    const type = uriMatch[1].toLowerCase();
    const id = uriMatch[2];
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  }

  // Fallback: if it's an open.spotify.com link with query params
  if (clean.includes('open.spotify.com/')) {
    const parts = clean.split('?')[0].split('/');
    const id = parts[parts.length - 1];
    const type = parts[parts.length - 2];
    if (id && type && ['track', 'episode', 'show', 'playlist', 'album'].includes(type)) {
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
  }

  return null;
}

/**
 * Returns a standardized web link to open in Spotify app/browser
 */
export function getSpotifyDirectUrl(url: string): string {
  if (!url) return 'https://open.spotify.com';
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.startsWith('spotify:')) {
    const parts = clean.split(':');
    if (parts.length === 3) {
      return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
    }
  }
  return clean;
}

/**
 * Determines content type (podcast vs music) from Spotify URL
 */
export function getSpotifyContentType(url: string): SpotifyContentType {
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
