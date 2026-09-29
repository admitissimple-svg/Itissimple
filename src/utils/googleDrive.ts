/**
 * Google Drive API Integration for Session Notes Synchronization
 * Handles folder creation, searching, updating, and uploading session notes documents.
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
 * Escapes single quotes and backslashes for Google Drive v3 search queries
 */
function escapeDriveQueryString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Finds or automatically creates the dedicated "It's Simple - Session Notes" folder
 */
export async function getOrCreateSessionNotesFolder(accessToken: string): Promise<DriveFolderResult> {
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapeDriveQueryString(
    GOOGLE_DRIVE_SESSION_FOLDER
  )}' and trashed = false`;

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,webViewLink)&pageSize=5`;

  const res = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to query Google Drive folder (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    const existing = data.files[0];
    return {
      id: existing.id,
      name: existing.name,
      webViewLink: existing.webViewLink,
    };
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_SESSION_FOLDER,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => '');
    throw new Error(`Failed to create Google Drive folder (${createRes.status}): ${errText}`);
  }

  const newFolder = await createRes.json();
  return {
    id: newFolder.id,
    name: newFolder.name,
    webViewLink: newFolder.webViewLink,
  };
}

/**
 * Checks if a session notes document already exists in the given folder
 */
export async function findExistingSessionNotesFile(
  accessToken: string,
  folderId: string,
  fileName: string
): Promise<DriveFileResult | null> {
  if (!accessToken || !folderId || !fileName) return null;
  try {
    const query = `'${folderId}' in parents and name = '${escapeDriveQueryString(
      fileName
    )}' and trashed = false`;

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,webViewLink)&pageSize=5`;

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        name: data.files[0].name,
        webViewLink: data.files[0].webViewLink,
      };
    }

    return null;
  } catch (err) {
    console.warn('findExistingSessionNotesFile caught error:', err);
    return null;
  }
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
 * Synchronizes session notes to Google Drive:
 * 1. Checks/creates folder "It's Simple - Session Notes"
 * 2. Checks if file already exists (by existingFileId or filename query)
 * 3. Updates existing file or creates new file
 */
export async function syncSessionNotesToGoogleDrive(params?: {
  accessToken?: string;
  studentName?: string;
  sessionDate?: string;
  content?: string;
  existingFileId?: string;
}): Promise<SyncSessionNotesResult> {
  if (!params || !params.accessToken) {
    return { success: false, error: 'No Google OAuth access token provided.' };
  }

  const {
    accessToken,
    studentName = 'Student',
    sessionDate = new Date().toISOString().split('T')[0],
    content = '',
    existingFileId,
  } = params;

  try {
    // 1. Ensure folder exists
    const folder = await getOrCreateSessionNotesFolder(accessToken);
    if (!folder || !folder.id) {
      throw new Error('Could not access or create Google Drive session notes folder.');
    }
    const fileName = formatSessionNotesFileName(studentName, sessionDate);

    // 2. Identify if target file already exists
    let targetFileId = existingFileId;
    let existingFileMeta: DriveFileResult | null = null;

    if (targetFileId) {
      // Validate that file still exists in Drive
      const verifyRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${targetFileId}?fields=id,name,webViewLink,trashed`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (!verifyData.trashed) {
          existingFileMeta = {
            id: verifyData.id,
            name: verifyData.name,
            webViewLink: verifyData.webViewLink,
          };
        } else {
          targetFileId = undefined;
        }
      } else {
        targetFileId = undefined;
      }
    }

    if (!targetFileId) {
      existingFileMeta = await findExistingSessionNotesFile(accessToken, folder.id, fileName);
      if (existingFileMeta) {
        targetFileId = existingFileMeta.id;
      }
    }

    // 3. Update existing file if present
    if (targetFileId) {
      // Update media content
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media&fields=id,name,webViewLink`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'text/plain; charset=UTF-8',
          },
          body: content,
        }
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text().catch(() => '');
        throw new Error(`Failed to update existing Drive file (${updateRes.status}): ${errText}`);
      }

      const updatedData = await updateRes.json();

      // Ensure file name matches current session details
      if (existingFileMeta?.name !== fileName) {
        fetch(`https://www.googleapis.com/drive/v3/files/${targetFileId}?fields=id,name,webViewLink`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: fileName }),
        }).catch(() => null);
      }

      return {
        success: true,
        fileId: targetFileId,
        fileName,
        folderId: folder.id,
        folderName: folder.name,
        webViewLink: updatedData.webViewLink || existingFileMeta?.webViewLink,
        isUpdated: true,
      };
    }

    // 4. Create new file via multipart upload inside the dedicated folder
    const boundary = `its_simple_boundary_${Date.now()}`;
    const metadata = {
      name: fileName,
      parents: [folder.id],
      mimeType: 'text/plain',
    };

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
      content +
      `\r\n--${boundary}--`;

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => '');
      throw new Error(`Failed to create file in Google Drive (${createRes.status}): ${errText}`);
    }

    const createdData = await createRes.json();
    return {
      success: true,
      fileId: createdData.id,
      fileName: createdData.name || fileName,
      folderId: folder.id,
      folderName: folder.name,
      webViewLink: createdData.webViewLink,
      isUpdated: false,
    };
  } catch (err: any) {
    console.error('Google Drive synchronization error:', err);
    return {
      success: false,
      error: err.message || 'Error communicating with Google Drive.',
    };
  }
}
