import * as FileSystem from 'expo-file-system';
import type { Track } from 'react-native-track-player';
import { getAccessToken } from './authService';
import { DRIVE_API_BASE } from '../constants/driveConfig';
import { insertCacheEntry, getCachedPaths, deleteCacheEntry } from '../db/queries';
import type { SongRow } from '../db/queries';

const CACHE_DIR = FileSystem.cacheDirectory + 'music-cache/';

export async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function getLocalPath(song: SongRow): string {
  return CACHE_DIR + song.id;
}

export async function downloadSong(song: SongRow): Promise<void> {
  if (song.source !== 'drive' || !song.drive_file_id) return;
  const cached = await getCachedPaths([song.id]);
  if (cached.has(song.id)) return;
  await ensureCacheDir();
  const token = await getAccessToken();
  if (!token) throw new Error('No access token');
  const remoteUri = `${DRIVE_API_BASE}/files/${song.drive_file_id}?alt=media`;
  const localUri = getLocalPath(song);
  await FileSystem.downloadAsync(remoteUri, localUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const info = await FileSystem.getInfoAsync(localUri);
  const fileSize = info.exists ? info.size : 0;
  await insertCacheEntry(song.id, localUri, fileSize);
}

export async function downloadAllSongs(
  songs: SongRow[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const driveSongs = songs.filter(s => s.source === 'drive' && s.drive_file_id);
  const cachedPaths = await getCachedPaths(driveSongs.map(s => s.id));
  const uncached = driveSongs.filter(s => !cachedPaths.has(s.id));
  let success = 0;
  let failed = 0;
  for (let i = 0; i < uncached.length; i++) {
    try {
      await downloadSong(uncached[i]);
      success++;
    } catch (e) {
      console.error(`[Cache] Failed to download ${uncached[i].title}:`, e);
      failed++;
    }
    onProgress?.(success + failed, uncached.length);
  }
  return { success, failed };
}

export async function buildTracksWithCache(songs: SongRow[], token: string): Promise<Track[]> {
  const cachedPaths = await getCachedPaths(songs.map(s => s.id));
  const validPaths = new Map<string, string>();
  for (const [id, path] of cachedPaths) {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      validPaths.set(id, path);
    } else {
      await deleteCacheEntry(id).catch(() => {});
    }
  }
  return songs.map(s => {
    const localPath = validPaths.get(s.id);
    return {
      id: s.id,
      url: localPath ?? (
        s.source === 'drive' && s.drive_file_id
          ? `${DRIVE_API_BASE}/files/${s.drive_file_id}?alt=media`
          : s.local_path || ''
      ),
      headers: !localPath && s.source === 'drive'
        ? { Authorization: `Bearer ${token}` }
        : undefined,
      title: s.title,
      artist: s.artist || undefined,
      album: s.album || undefined,
      artwork: s.artwork_uri || undefined,
    };
  });
}
