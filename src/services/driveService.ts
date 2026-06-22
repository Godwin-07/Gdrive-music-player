import { getAccessToken } from './authService';
import {
  DRIVE_API_BASE,
  DRIVE_UPLOAD_BASE,
  DRIVE_FILES_FIELDS,
} from '../constants/driveConfig';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) {
    console.error('[Drive] No access token available');
    throw new Error('Not authenticated');
  }
  const masked = token.substring(0, 8) + '...' + token.substring(token.length - 4);
  console.log(`[Drive] Token: ${masked}, length: ${token.length}`);
  return { Authorization: `Bearer ${token}` };
}

export async function listAudioFiles(
  pageToken?: string
): Promise<DriveFileListResponse> {
  const headers = await authHeaders();

  const audioQuery = [
    "mimeType contains 'audio/'",
    "mimeType != 'application/vnd.google-apps.folder'",
  ].join(' and ');

  const params = new URLSearchParams({
    q: audioQuery,
    fields: DRIVE_FILES_FIELDS,
    pageSize: '100',
    orderBy: 'modifiedTime desc',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const url = `${DRIVE_API_BASE}/files?${params.toString()}`;
  console.log(`[Drive] Fetching: GET /files`);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[Drive] API error ${response.status}: ${body}`);
    throw new Error(`Drive API error: ${response.status}`);
  }

  return response.json();
}

export async function listAllAudioFiles(): Promise<DriveFile[]> {
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const result = await listAudioFiles(pageToken);
    allFiles.push(...result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);

  return allFiles;
}

export async function getDownloadUrl(fileId: string): Promise<string> {
  const headers = await authHeaders();
  return `${DRIVE_API_BASE}/files/${fileId}?alt=media&access_token=${encodeURIComponent(headers.Authorization.replace('Bearer ', ''))}`;
}

export async function streamFile(
  fileId: string,
  rangeStart = 0,
  rangeEnd?: number
): Promise<Response> {
  const headers = await authHeaders();
  const rangeHeader =
    rangeEnd !== undefined
      ? `bytes=${rangeStart}-${rangeEnd}`
      : `bytes=${rangeStart}-`;

  return fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { ...headers, Range: rangeHeader },
  });
}

export async function uploadFile(
  fileName: string,
  mimeType: string,
  fileUri: string
): Promise<DriveFile> {
  const headers = await authHeaders();

  const metadata = JSON.stringify({
    name: fileName,
    mimeType,
  });

  const formData = new FormData();
  formData.append('metadata', {
    uri: fileUri,
    type: 'application/json',
    name: 'metadata',
  } as any);
  formData.append('media', {
    uri: fileUri,
    type: mimeType,
    name: fileName,
  } as any);

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'multipart/related',
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

export function getStreamUrl(fileId: string, accessToken: string): string {
  return `${DRIVE_API_BASE}/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;
}
