import { openDatabaseAsync } from 'expo-sqlite';

const DB_NAME = 'gdrive-music.db';

let _db: Awaited<ReturnType<typeof openDatabaseAsync>> | null = null;

export async function getDb() {
  if (_db) return _db;
  const db = await openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      genre TEXT,
      bpm INTEGER,
      duration INTEGER,
      artwork_uri TEXT,
      source TEXT NOT NULL,
      drive_file_id TEXT,
      local_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      added_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      is_smart INTEGER DEFAULT 0,
      smart_rule TEXT,
      cover_art TEXT
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS cache (
      song_id TEXT PRIMARY KEY,
      local_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      downloaded_at INTEGER NOT NULL
    );
  `);

  try { await db.execAsync('ALTER TABLE playlists ADD COLUMN cover_art TEXT'); } catch {}

  _db = db;
  return _db;
}
