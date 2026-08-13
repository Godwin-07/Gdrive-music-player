import * as FileSystem from 'expo-file-system';
import { insertSong } from '../db/queries';
import type { SongRow } from '../db/queries';
import { parseMetadataFromBuffer } from './metadataService';
import { AUDIO_MIME_TYPES } from '../constants/driveConfig';

const IMPORT_DIR = FileSystem.documentDirectory + 'imported/';

export { AUDIO_MIME_TYPES };

export async function ensureImportDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMPORT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMPORT_DIR, { intermediates: true });
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function importLocalFile(
  name: string,
  uri: string,
  mimeType: string | null,
  fileSize: number | null
): Promise<void> {
  await ensureImportDir();
  const dest = IMPORT_DIR + name;

  // Copy to persistent location
  await FileSystem.copyAsync({ from: uri, to: dest });

  // Parse metadata from first 512KB
  let title = name.replace(/\.[^/.]+$/, '');
  let artist = 'Unknown Artist';
  let artworkUri: string | null = null;
  const album: string | null = null;

  try {
    const base64 = await FileSystem.readAsStringAsync(dest, {
      encoding: FileSystem.EncodingType.Base64,
      length: 524288,
      position: 0,
    });
    const buffer = base64ToArrayBuffer(base64);
    const metadata = await parseMetadataFromBuffer(buffer, mimeType || 'audio/mpeg');
    if (metadata.title !== 'Unknown Title') title = metadata.title;
    if (metadata.artist !== 'Unknown Artist') artist = metadata.artist;
    artworkUri = metadata.artworkUri;
  } catch (e) {
    console.log('[Import] Metadata parse failed:', e);
  }

  const song: SongRow = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist,
    album,
    genre: null,
    bpm: null,
    duration: 0,
    artwork_uri: artworkUri,
    source: 'local',
    drive_file_id: null,
    local_path: dest,
    file_size: fileSize,
    mime_type: mimeType,
    added_at: Date.now(),
  };

  await insertSong(song);
}
