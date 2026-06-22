export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
export const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/flac',
  'audio/ogg',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
  'audio/x-flac',
];

export const DRIVE_FILES_FIELDS =
  'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webContentLink)';
