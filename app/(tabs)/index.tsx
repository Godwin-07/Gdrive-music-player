import { useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import TrackPlayer from 'react-native-track-player';
import SongCard from '../../src/components/SongCard';
import { useLibraryStore } from '../../src/store/libraryStore';
import { usePlayerStore } from '../../src/store/playerStore';
import { useDriveFiles } from '../../src/hooks/useDriveFiles';
import {
  insertSongs, getAllSongs, updateSongMetadata,
  getAllPlaylists, addSongToPlaylist, deleteSongsByDriveIds, getSongsBySource,
  getAllCacheEntries, getCachedPaths,
} from '../../src/db/queries';
import { getAccessToken } from '../../src/services/authService';
import { streamFile } from '../../src/services/driveService';
import { parseMetadataFromBuffer, updateActiveTrackMetadata } from '../../src/services/metadataService';
import { downloadSong, downloadAllSongs, buildTracksWithCache } from '../../src/services/cacheService';
import { importLocalFile, AUDIO_MIME_TYPES } from '../../src/services/localImportService';
import * as DocumentPicker from 'expo-document-picker';
import type { SongRow, PlaylistWithCount } from '../../src/db/queries';
import { State, usePlaybackState } from 'react-native-track-player';



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
  const [showSongMenu, setShowSongMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [allPlaylists, setAllPlaylists] = useState<PlaylistWithCount[]>([]);
  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const { state: playbackState } = usePlaybackState();

  const openSongMenu = async (song: SongRow) => {
    setMenuSong(song);
    setShowSongMenu(true);
  };

  const openPlaylistPicker = async () => {
    if (!menuSong) return;
    const list = await getAllPlaylists();
    setAllPlaylists(list);
    setShowPlaylistPicker(true);
  };

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

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getAllSongs();
      console.log(`[Library] Loaded ${stored.length} songs from DB`);
      setSongs(stored);
    } catch (e) {
      console.error('[Library] Failed to load songs', e);
    } finally {
      setLoading(false);
    }
  }, [setSongs, setLoading]);

  useEffect(() => {
    loadSongs();
    getAllCacheEntries().then(entries => setCachedIds(new Set(entries.map(e => e.song_id))));
  }, []);



  useEffect(() => {
    if (driveFiles) {
      console.log(`[Library] Drive files received: ${driveFiles.length}`);

      const currentIds = new Set(driveFiles.map((f: any) => f.id));

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

      const doSync = async () => {
        if (songsToInsert.length > 0) {
          console.log(`[Library] Inserting ${songsToInsert.length} songs into DB`);
          await insertSongs(songsToInsert);
        }

        const dbDriveSongs = await getSongsBySource('drive');
        const orphanedIds = dbDriveSongs
          .filter((s) => s.drive_file_id && !currentIds.has(s.drive_file_id))
          .map((s) => s.drive_file_id) as string[];
        if (orphanedIds.length > 0) {
          console.log(`[Library] Removing ${orphanedIds.length} orphaned songs`);
          await deleteSongsByDriveIds(orphanedIds);
        }

        console.log('[Library] Sync complete, reloading...');
        loadSongs();

        songsToInsert.forEach((song: any, i: number) => {
          setTimeout(() => {
            if (song.drive_file_id && song.mime_type) {
              parseDriveMetadata(song.drive_file_id, song.mime_type, song.id);
            }
          }, i * 2000);
        });
      };

      doSync().catch((e) => {
        console.error('[Library] Sync failed', e);
      });
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
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-2xl font-bold">Library</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={async () => {
                try {
                  const result = await DocumentPicker.getDocumentAsync({
                    type: AUDIO_MIME_TYPES,
                    multiple: true,
                    copyToCacheDirectory: false,
                  });
                  if (result.canceled || !result.assets.length) return;
                  setImporting(true);
                  for (const asset of result.assets) {
                    await importLocalFile(asset.name, asset.uri, asset.mimeType ?? null, asset.size ?? null);
                  }
                  setImporting(false);
                  Alert.alert('Import complete', `${result.assets.length} song${result.assets.length > 1 ? 's' : ''} imported.`);
                  loadSongs();
                } catch (e) {
                  setImporting(false);
                  Alert.alert('Import failed', 'Could not import selected files.');
                }
              }}
              disabled={importing}
              className="p-2"
            >
              <Text className={`text-sm font-semibold ${importing ? 'text-gray-500' : 'text-white'}`}>
                {importing ? 'Importing...' : 'Import Local'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                const driveSongs = filteredSongs.filter(s => s.source === 'drive' && s.drive_file_id);
                if (driveSongs.length === 0) {
                  Alert.alert('Nothing to download', 'No Drive songs in the current view.');
                  return;
                }
                const cachedPaths = await getCachedPaths(driveSongs.map(s => s.id));
                const uncached = driveSongs.filter(s => !cachedPaths.has(s.id));
                if (uncached.length === 0) {
                  Alert.alert('All cached', 'All Drive songs are already downloaded.');
                  return;
                }
                Alert.alert(
                  'Download all',
                  `Download ${uncached.length} song${uncached.length > 1 ? 's' : ''} from Drive for offline playback?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Download',
                      onPress: async () => {
                        setDownloading(true);
                        const result = await downloadAllSongs(filteredSongs);
                        setDownloading(false);
                        Alert.alert(
                          'Download complete',
                          `${result.success} downloaded, ${result.failed} failed.`
                        );
                      },
                    },
                  ]
                );
              }}
              disabled={downloading}
              className="p-2"
            >
              <Text className="text-[#1DB954] font-semibold text-sm">
                {downloading ? 'Downloading...' : 'Download All'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
              isCached={cachedIds.has(item.id)}
              isPlaying={activeTrack?.id === item.id && playbackState === State.Playing}
              onPress={async () => {
                try {
                  const token = await getAccessToken();
                  if (!token) return;

                  const tapIndex = filteredSongs.findIndex((s: SongRow) => s.id === item.id);
                  if (tapIndex === -1) return;

                  const allTracks = await buildTracksWithCache(filteredSongs, token);

                  usePlayerStore.setState({
                    activeTrack: allTracks[tapIndex],
                    queue: allTracks,
                  });
                  await TrackPlayer.setQueue(allTracks);
                  await TrackPlayer.skip(tapIndex);
                  await TrackPlayer.play();
                  router.push('/player');
                } catch (error) {
                  console.error('[Playback] Failed to play track', error);
                }
              }}
              onMenu={() => openSongMenu(item)}
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

      {/* 3-dot menu */}
      {menuSong && (
        <Modal visible={showSongMenu} transparent animationType="fade">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { setShowSongMenu(false); setMenuSong(null); }}
            className="flex-1 justify-center items-center bg-black/60"
          >
            <View className="bg-[#282828] w-64 rounded-xl overflow-hidden">
              <TouchableOpacity
                onPress={async () => {
                  setShowSongMenu(false);
                  if (menuSong && menuSong.source !== 'drive') {
                    Alert.alert('Not available', 'Only Drive songs can be downloaded.');
                    return;
                  }
                  if (menuSong) {
                    try {
                      setDownloading(true);
                      await downloadSong(menuSong);
                      Alert.alert('Downloaded', `"${menuSong.title}" saved for offline.`);
                    } catch {
                      Alert.alert('Failed', 'Could not download this song.');
                    } finally {
                      setDownloading(false);
                      setMenuSong(null);
                    }
                  }
                }}
                className="px-6 py-4 border-b border-[#3a3a3a]"
              >
                <Text className="text-white text-base">Download</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowSongMenu(false); openPlaylistPicker(); }}
                className="px-6 py-4"
              >
                <Text className="text-white text-base">Add to Playlist</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
