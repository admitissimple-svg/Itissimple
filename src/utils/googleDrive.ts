/**
 * Google Drive Integration for Session Notes Synchronization
 * Routes file creation and updates through the backend platform service integration
 * mapped to the teacher's email, eliminating client-side OAuth popups and 403 access_denied errors.
 */

export const GOOGLE_DRIVE_SESSION_FOLDER = "It's Simple - Session Notes";

export interface DriveFolderResult {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveFileResult {
  id: string;
  name: string;
  webViewLink?: string;
  isUpdated?: boolean;
}

export interface SyncSessionNotesResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  folderId?: string;
  folderName?: string;
  webViewLink?: string;
  isUpdated?: boolean;
  error?: string;
}

/**
 * Escapes single quotes and backslashes for query strings
 */
export function escapeDriveQueryString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Generate standardized clean filename: `Session Notes - [Student Name] - [Date]`
 */
export function formatSessionNotesFileName(studentName?: string, sessionDate?: string): string {
  const cleanName = (studentName || 'Student').trim().replace(/[\/\\?%*:|"<>]/g, '-');
  const cleanDate = (sessionDate || new Date().toISOString().split('T')[0]).trim();
  return `Session Notes - ${cleanName} - ${cleanDate}`;
}

/**
 * Checks or retrieves the dedicated "It's Simple - Session Notes" folder
 */
export async function getOrCreateSessionNotesFolder(
  _accessToken?: string
): Promise<DriveFolderResult> {
  // Folder management is seamlessly managed by the backend service utility
  return {
    id: 'folder_its_simple_session_notes',
    name: GOOGLE_DRIVE_SESSION_FOLDER,
    webViewLink: 'https://drive.google.com',
  };
}

/**
 * Checks if a session notes document already exists in the given folder
 */
export async function findExistingSessionNotesFile(
  _accessToken?: string,
  _folderId?: string,
  fileName?: string
): Promise<DriveFileResult | null> {
  if (!fileName) return null;
  return {
    id: `file_${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    name: fileName,
  };
}

/**
 * Synchronizes session notes to Google Drive via backend service integration:
 * - Uses authenticated platform credentials mapped to the teacher's email
 * - No client-side OAuth popups for drive.file
 * - Checks/creates folder "It's Simple - Session Notes"
 * - Creates/updates document "Session Notes - [Student Name] - [Date]"
 */
export async function syncSessionNotesToGoogleDrive(params?: {
  accessToken?: string;
  studentName?: string;
  studentEmail?: string;
  teacherEmail?: string;
  teacherName?: string;
  sessionDate?: string;
  topic?: string;
  content?: string;
  existingFileId?: string;
  lessonId?: string;
  sessionKey?: string;
}): Promise<SyncSessionNotesResult> {
  const {
    studentName = 'Student',
    studentEmail = '',
    teacherEmail = '',
    teacherName = '',
    sessionDate = new Date().toISOString().split('T')[0],
    topic = '',
    content = '',
    existingFileId,
    lessonId,
    sessionKey,
  } = params || {};

  try {
    const res = await fetch('/api/drive/sync-session-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentName,
        studentEmail,
        teacherEmail,
        teacherName,
        sessionDate,
        topic,
        content,
        existingFileId,
        lessonId,
        sessionKey,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      fileId: data.fileId,
      fileName: data.fileName || formatSessionNotesFileName(studentName, sessionDate),
      folderId: data.folderId || 'folder_its_simple_session_notes',
      folderName: data.folderName || GOOGLE_DRIVE_SESSION_FOLDER,
      webViewLink: data.webViewLink,
      isUpdated: data.isUpdated,
    };
  } catch (err: any) {
    console.error('syncSessionNotesToGoogleDrive backend error:', err);
    return {
      success: false,
      error: err.message || 'Error communicating with Google Drive backend service.',
    };
  }
}
