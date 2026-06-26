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
    await db.withTransactionAsync(async () => {
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

// --- Playlist CRUD ---

export interface PlaylistRow {
  id: string;
  name: string;
  created_at: number;
  is_smart: number;
  smart_rule: string | null;
  cover_art: string | null;
}

export interface PlaylistWithCount extends PlaylistRow {
  song_count: number;
}

export async function createPlaylist(name: string): Promise<string> {
  return withDb(async (db) => {
    const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.runAsync(
      'INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)',
      [id, name, Date.now()]
    );
    return id;
  });
}

export async function getAllPlaylists(): Promise<PlaylistWithCount[]> {
  return withDb(async (db) => {
    return db.getAllAsync<PlaylistWithCount>(
      `SELECT p.*, COALESCE(ps.song_count, 0) as song_count
       FROM playlists p
       LEFT JOIN (SELECT playlist_id, COUNT(*) as song_count FROM playlist_songs GROUP BY playlist_id) ps
       ON p.id = ps.playlist_id
       ORDER BY p.created_at DESC`
    );
  });
}

export async function getPlaylist(id: string): Promise<PlaylistRow | null> {
  return withDb(async (db) => {
    return db.getFirstAsync<PlaylistRow>('SELECT * FROM playlists WHERE id = ?', [id]);
  });
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  return withDb(async (db) => {
    await db.runAsync('UPDATE playlists SET name = ? WHERE id = ?', [name, id]);
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  return withDb(async (db) => {
    await db.runAsync('DELETE FROM playlist_songs WHERE playlist_id = ?', [id]);
    await db.runAsync('DELETE FROM playlists WHERE id = ?', [id]);
  });
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  return withDb(async (db) => {
    const existing = await db.getFirstAsync<{ position: number }>(
      'SELECT MAX(position) as position FROM playlist_songs WHERE playlist_id = ?',
      [playlistId]
    );
    const pos = (existing?.position ?? -1) + 1;
    await db.runAsync(
      'INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)',
      [playlistId, songId, pos]
    );
    await regeneratePlaylistCover(db, playlistId);
  });
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  return withDb(async (db) => {
    await db.runAsync(
      'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [playlistId, songId]
    );
    await regeneratePlaylistCover(db, playlistId);
  });
}

async function regeneratePlaylistCover(db: SQLiteDatabase, playlistId: string): Promise<void> {
  const songs = await db.getAllAsync<{ artwork_uri: string | null }>(
    `SELECT s.artwork_uri FROM songs s
     JOIN playlist_songs ps ON s.id = ps.song_id
     WHERE ps.playlist_id = ?
     ORDER BY ps.position ASC LIMIT 4`,
    [playlistId]
  );
  const uris = songs.map((s) => s.artwork_uri).filter(Boolean) as string[];
  const coverArt = uris.length > 0 ? JSON.stringify(uris) : null;
  await db.runAsync('UPDATE playlists SET cover_art = ? WHERE id = ?', [coverArt, playlistId]);
}

export async function getPlaylistSongs(playlistId: string): Promise<SongRow[]> {
  return withDb(async (db) => {
    return db.getAllAsync<SongRow>(
      `SELECT s.* FROM songs s
       JOIN playlist_songs ps ON s.id = ps.song_id
       WHERE ps.playlist_id = ?
       ORDER BY ps.position ASC`,
      [playlistId]
    );
  });
}

export async function reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<void> {
  return withDb(async (db) => {
    for (let i = 0; i < songIds.length; i++) {
      await db.runAsync(
        'UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?',
        [i, playlistId, songIds[i]]
      );
    }
  });
}
