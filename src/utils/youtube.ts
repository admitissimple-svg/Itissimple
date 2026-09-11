export function extractYouTubeVideoId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const clean = urlOrId.trim();

  // Direct 11 char alphanumeric/dash/underscore ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Handle standard watch?v=, youtu.be, embed, shorts, etc.
  const watchMatch = clean.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (watchMatch && watchMatch[1] && watchMatch[1].length === 11) {
    return watchMatch[1];
  }

  return null;
}

export function isValidYouTubeVideoId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[a-zA-Z0-9_-]{11}$/.test(id.trim());
}

export function getYouTubeEmbedUrl(urlOrId: string | null | undefined): string {
  const cleanId = extractYouTubeVideoId(urlOrId);
  if (!cleanId) {
    return '';
  }
  return `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1&enablejsapi=1`;
}

export function getYouTubeWatchUrl(urlOrId: string | null | undefined): string {
  const cleanId = extractYouTubeVideoId(urlOrId);
  if (!cleanId) {
    return urlOrId || '';
  }
  return `https://www.youtube.com/watch?v=${cleanId}`;
}

export function getYouTubeThumbnailUrl(urlOrId: string | null | undefined): string {
  const cleanId = extractYouTubeVideoId(urlOrId);
  if (!cleanId) {
    return '';
  }
  return `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;
}

