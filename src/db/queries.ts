import { getDb } from './schema';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface SongRow {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  genre: string | null;
  bpm: number | null;
  duration: number | null;
  artwork_uri: string | null;
  source: 'drive' | 'local';
  drive_file_id: string | null;
  local_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  added_at: number;
}

async function withDb<T>(fn: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDb();
  return fn(db);
}

export async function insertSong(song: SongRow): Promise<void> {
  await withDb(async (db) => {
    await db.runAsync(
      `INSERT OR REPLACE INTO songs (id, title, artist, album, genre, bpm, duration, artwork_uri, source, drive_file_id, local_path, file_size, mime_type, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        song.id,
        song.title,
        song.artist,
        song.album,
        song.genre,
        song.bpm,
        song.duration,
        song.artwork_uri,
        song.source,
        song.drive_file_id,
        song.local_path,
        song.file_size,
        song.mime_type,
        song.added_at,
      ]
    );
  });
}

export async function insertSongs(songs: SongRow[]): Promise<void> {
  await withDb(async (db) => {
    for (const song of songs) {
      await db.runAsync(
        `INSERT OR REPLACE INTO songs (id, title, artist, album, genre, bpm, duration, artwork_uri, source, drive_file_id, local_path, file_size, mime_type, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          song.id,
          song.title,
          song.artist,
          song.album,
          song.genre,
          song.bpm,
          song.duration,
          song.artwork_uri,
          song.source,
          song.drive_file_id,
          song.local_path,
          song.file_size,
          song.mime_type,
          song.added_at,
        ]
      );
    }
  });
}

export async function getAllSongs(): Promise<SongRow[]> {
  return withDb(async (db) => {
    return db.getAllAsync<SongRow>('SELECT * FROM songs ORDER BY added_at DESC');
  });
}

export async function getSongsBySource(
  source: 'drive' | 'local'
): Promise<SongRow[]> {
  return withDb(async (db) => {
    return db.getAllAsync<SongRow>(
      'SELECT * FROM songs WHERE source = ? ORDER BY added_at DESC',
      [source]
    );
  });
}

export async function getSongById(id: string): Promise<SongRow | null> {
  return withDb(async (db) => {
    return db.getFirstAsync<SongRow>(
      'SELECT * FROM songs WHERE id = ?',
      [id]
    );
  });
}

export async function searchSongs(query: string): Promise<SongRow[]> {
  return withDb(async (db) => {
    const searchTerm = `%${query}%`;
    return db.getAllAsync<SongRow>(
      `SELECT * FROM songs
       WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ?
       ORDER BY title ASC`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
  });
}

export async function deleteSong(id: string): Promise<void> {
  return withDb(async (db) => {
    await db.runAsync('DELETE FROM songs WHERE id = ?', [id]);
  });
}

export async function updateSongMetadata(
  id: string,
  metadata: Partial<Pick<SongRow, 'title' | 'artist' | 'album' | 'genre' | 'bpm' | 'duration' | 'artwork_uri'>>
): Promise<void> {
  await withDb(async (db) => {
    const existing = await db.getFirstAsync<SongRow>('SELECT * FROM songs WHERE id = ?', [id]);
    if (!existing) return;

    const merged = { ...existing, ...metadata };
    await db.runAsync(
      `INSERT OR REPLACE INTO songs (id, title, artist, album, genre, bpm, duration, artwork_uri, source, drive_file_id, local_path, file_size, mime_type, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        merged.id, merged.title, merged.artist, merged.album,
        merged.genre, merged.bpm, merged.duration, merged.artwork_uri,
        merged.source, merged.drive_file_id, merged.local_path,
        merged.file_size, merged.mime_type, merged.added_at,
      ]
    );
  });
}

export async function clearSongs(): Promise<void> {
  return withDb(async (db) => {
    await db.execAsync('DELETE FROM songs');
  });
}

export async function getSongCount(): Promise<number> {
  return withDb(async (db) => {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM songs'
    );
    return result?.count ?? 0;
  });
}
