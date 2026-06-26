import { useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import TrackPlayer from 'react-native-track-player';
import type { Track } from 'react-native-track-player';
import SongCard from '../../src/components/SongCard';
import { useLibraryStore } from '../../src/store/libraryStore';
import { usePlayerStore } from '../../src/store/playerStore';
import { useDriveFiles } from '../../src/hooks/useDriveFiles';
import {
  insertSongs, getAllSongs, updateSongMetadata,
  getAllPlaylists, addSongToPlaylist,
} from '../../src/db/queries';
import { getAccessToken } from '../../src/services/authService';
import { streamFile } from '../../src/services/driveService';
import { parseMetadataFromBuffer, updateActiveTrackMetadata } from '../../src/services/metadataService';
import { DRIVE_API_BASE } from '../../src/constants/driveConfig';
import type { SongRow, PlaylistWithCount } from '../../src/db/queries';

export default function LibraryScreen() {
  const router = useRouter();
  const {
    songs,
    sourceFilter,
    sortOption,
    setSongs,
    setLoading,
    setSourceFilter,
    setSortOption,
    getFilteredSongs,
  } = useLibraryStore();

  const { data: driveFiles, isLoading: driveLoading, error: driveError, refetch } = useDriveFiles();

  const [menuSong, setMenuSong] = useState<SongRow | null>(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [allPlaylists, setAllPlaylists] = useState<PlaylistWithCount[]>([]);

  const openPlaylistPicker = async (song: SongRow) => {
    setMenuSong(song);
    const list = await getAllPlaylists();
    setAllPlaylists(list);
    setShowPlaylistPicker(true);
  };

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getAllSongs();
      console.log(`[Library] Loaded ${stored.length} songs from DB`);
      setSongs(stored);

      // Trigger metadata parsing for songs missing it
      stored.forEach((song, i) => {
        if (
          song.source === 'drive' &&
          (song.artist === 'Unknown Artist' || !song.artwork_uri) &&
          song.drive_file_id &&
          song.mime_type
        ) {
          setTimeout(() => {
            parseDriveMetadata(song.drive_file_id!, song.mime_type!, song.id);
          }, i * 1000); // Spread out requests
        }
      });
    } catch (e) {
      console.error('[Library] Failed to load songs', e);
    } finally {
      setLoading(false);
    }
  }, [parseDriveMetadata, setSongs, setLoading]);

  useEffect(() => {
    loadSongs();
  }, []);

  const parseDriveMetadata = useCallback(async (fileId: string, mimeType: string, songId: string) => {
    try {
      const response = await streamFile(fileId, 0, 512000);
      const buffer = await response.arrayBuffer();
      const metadata = await parseMetadataFromBuffer(buffer, mimeType);
      if (metadata.title !== 'Unknown Title' || metadata.artist !== 'Unknown Artist') {
        const baseUpdate = {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          genre: metadata.genre,
          bpm: metadata.bpm,
          duration: metadata.duration,
        };
        const dbUpdate = metadata.artworkUri
          ? { ...baseUpdate, artwork_uri: metadata.artworkUri }
          : baseUpdate;
        await updateSongMetadata(songId, dbUpdate);

        // Update library store so the UI and queue creation get the new metadata
        const currentSongs = useLibraryStore.getState().songs;
        const updatedSongs = currentSongs.map(s =>
          s.id === songId ? { ...s, ...dbUpdate } : s
        );
        useLibraryStore.getState().setSongs(updatedSongs);

        await updateActiveTrackMetadata(songId, {
          title: metadata.title,
          artist: metadata.artist,
          artworkUri: metadata.artworkUri || undefined,
        });
      }
    } catch (e) {
      console.log(`[Metadata] Parse failed for ${fileId}:`, e);
    }
  }, []);

  useEffect(() => {
    if (driveFiles) {
      console.log(`[Library] Drive files received: ${driveFiles.length}`);
      if (driveFiles.length > 0) {
        const songsToInsert = driveFiles.map((file: any) => ({
          id: `drive_${file.id}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          genre: null,
          bpm: null,
          duration: 0,
          artwork_uri: file.thumbnailLink || null,
          source: 'drive' as const,
          drive_file_id: file.id,
          local_path: null,
          file_size: file.size ? parseInt(file.size, 10) : null,
          mime_type: file.mimeType,
          added_at: file.modifiedTime
            ? new Date(file.modifiedTime).getTime()
            : Date.now(),
        }));

        console.log(`[Library] Inserting ${songsToInsert.length} songs into DB`);
        insertSongs(songsToInsert).then(() => {
          console.log('[Library] DB insert complete, reloading...');
          loadSongs();
          songsToInsert.forEach((song: any, i: number) => {
            setTimeout(() => {
              if (song.drive_file_id && song.mime_type) {
                parseDriveMetadata(song.drive_file_id, song.mime_type, song.id);
              }
            }, i * 2000);
          });
        }).catch((e) => {
          console.error('[Library] DB insert failed', e);
        });
      }
    }
  }, [driveFiles]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredSongs = getFilteredSongs();

  if (driveError) {
    return (
      <View className="flex-1 bg-[#121212]">
        <View className="px-4 pt-12 pb-2">
          <Text className="text-white text-2xl font-bold mb-4">Library</Text>
        </View>
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-red-400 text-center mb-2">Failed to load from Drive</Text>
          <Text className="text-gray-500 text-center text-sm mb-4">
            {driveError instanceof Error ? driveError.message : 'Unknown error'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-[#1DB954] px-6 py-2 rounded-full"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#121212]">
      <View className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold mb-4">Library</Text>

        <View className="flex-row mb-3">
          {(['all', 'drive', 'local'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSourceFilter(filter)}
              className={`mr-2 px-3 py-1.5 rounded-full ${
                sourceFilter === filter ? 'bg-white' : 'bg-[#282828]'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  sourceFilter === filter ? 'text-black' : 'text-white'
                }`}
              >
                {filter === 'all' ? 'All' : filter === 'drive' ? 'Drive' : 'Local'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row mb-2">
          {(['recent', 'title', 'artist', 'duration'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setSortOption(option)}
              className={`mr-2 px-2.5 py-1 rounded ${
                sortOption === option ? 'bg-[#1DB954]' : 'bg-[#282828]'
              }`}
            >
              <Text className="text-white text-xs capitalize">{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {driveLoading && songs.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1DB954" />
          <Text className="text-gray-400 mt-3">Loading your music...</Text>
        </View>
      ) : filteredSongs.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-gray-400 text-center mb-4">
            {sourceFilter === 'drive'
              ? 'No Drive files found.'
              : sourceFilter === 'local'
              ? 'No local files found.'
              : 'Your music library is empty.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-[#1DB954] px-6 py-2 rounded-full"
          >
            <Text className="text-white font-semibold">Sync from Drive</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={filteredSongs}
          keyExtractor={(item: SongRow) => item.id}
          renderItem={({ item }: { item: SongRow }) => (
            <SongCard
              title={item.title}
              artist={item.artist || ''}
              duration={item.duration || undefined}
              artworkUri={item.artwork_uri}
              source={item.source}
              onPress={async () => {
                try {
                  const token = await getAccessToken();
                  if (!token) return;

                  const tapIndex = filteredSongs.findIndex((s: SongRow) => s.id === item.id);
                  if (tapIndex === -1) return;

                  const allTracks: Track[] = filteredSongs.map((s: SongRow) => ({
                    id: s.id,
                    url:
                      s.source === 'drive' && s.drive_file_id
                        ? `${DRIVE_API_BASE}/files/${s.drive_file_id}?alt=media`
                        : s.local_path || '',
                    headers: s.source === 'drive' ? { Authorization: `Bearer ${token}` } : undefined,
                    title: s.title,
                    artist: s.artist || undefined,
                    album: s.album || undefined,
                    artwork: s.artwork_uri || undefined,
                  }));

                  await TrackPlayer.setQueue(allTracks);
                  usePlayerStore.setState({
                    activeTrack: allTracks[tapIndex],
                    queue: allTracks,
                  });
                  await TrackPlayer.skip(tapIndex);
                  await TrackPlayer.play();
                  router.push('/player');
                } catch (error) {
                  console.error('[Playback] Failed to play track', error);
                }
              }}
              onMenu={() => openPlaylistPicker(item)}
            />
          )}
          estimatedItemSize={64}
          refreshControl={
            <RefreshControl
              refreshing={driveLoading}
              onRefresh={onRefresh}
              tintColor="#1DB954"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Modal visible={showPlaylistPicker} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-[#282828] w-full rounded-xl p-6" style={{ maxHeight: '60%' }}>
            <Text className="text-white text-lg font-bold mb-4">Add to Playlist</Text>
            {allPlaylists.length === 0 ? (
              <Text className="text-gray-400 text-center py-6">
                No playlists yet{'\n'}Create one from the Playlists tab
              </Text>
            ) : (
              <FlatList
                data={allPlaylists}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={async () => {
                      if (menuSong) {
                        await addSongToPlaylist(item.id, menuSong.id);
                        Alert.alert('Added', `"${menuSong.title}" added to ${item.name}`);
                      }
                      setShowPlaylistPicker(false);
                      setMenuSong(null);
                    }}
                    className="py-3 border-b border-[#3a3a3a]"
                  >
                    <Text className="text-white text-base">{item.name}</Text>
                    <Text className="text-[#b3b3b3] text-xs mt-0.5">
                      {item.song_count} songs
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              onPress={() => { setShowPlaylistPicker(false); setMenuSong(null); }}
              className="mt-4 self-center"
            >
              <Text className="text-[#b3b3b3] font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
