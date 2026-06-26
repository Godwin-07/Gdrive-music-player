import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Image, Modal } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import TrackPlayer from 'react-native-track-player';
import type { Track } from 'react-native-track-player';
import { getPlaylist, getPlaylistSongs, removeSongFromPlaylist, renamePlaylist, reorderPlaylistSongs } from '../src/db/queries';
import type { PlaylistRow, SongRow } from '../src/db/queries';
import { getAccessToken } from '../src/services/authService';
import { usePlayerStore } from '../src/store/playerStore';
import MiniPlayer from '../src/components/MiniPlayer';
import { DRIVE_API_BASE } from '../src/constants/driveConfig';

function DetailCoverArt({ coverArt }: { coverArt: string | null }) {
  const uris: string[] = coverArt ? (() => { try { return JSON.parse(coverArt); } catch { return []; } })() : [];

  if (uris.length === 0) {
    return <View className="w-12 h-12 rounded bg-[#282828] justify-center items-center"><Text className="text-lg text-[#b3b3b3]">{'\u266B'}</Text></View>;
  }

  if (uris.length === 1) {
    return <Image source={{ uri: uris[0] }} className="w-12 h-12 rounded" resizeMode="cover" />;
  }

  if (uris.length === 2) {
    return (
      <View className="w-12 h-12 rounded overflow-hidden">
        <Image source={{ uri: uris[0] }} className="w-full h-1/2" resizeMode="cover" />
        <Image source={{ uri: uris[1] }} className="w-full h-1/2" resizeMode="cover" />
      </View>
    );
  }

  const cells = uris.slice(0, 4);
  return (
    <View className="w-12 h-12 rounded overflow-hidden">
      {[cells.slice(0, 2), cells.slice(2, 4)].map((row, ri) => (
        <View key={ri} className="flex-row" style={{ height: '50%' }}>
          {[0, 1].map((ci) => (
            row[ci] ? <Image key={ci} source={{ uri: row[ci] }} className="flex-1" resizeMode="cover" />
              : <View key={ci} className="flex-1 bg-[#282828]" />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function PlaylistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameText, setRenameText] = useState('');

  useFocusEffect(useCallback(() => {
    if (!id) return;
    getPlaylist(id).then((p) => { setPlaylist(p); setRenameText(p?.name || ''); });
    getPlaylistSongs(id).then(setSongs);
  }, [id]));

  const q = searchQuery.trim().toLowerCase();
  const displaySongs = isEditing ? songs : (q ? songs.filter((s) =>
    s.title.toLowerCase().includes(q) || (s.artist && s.artist.toLowerCase().includes(q))
  ) : songs);

  const handlePlay = async (tapIndex: number) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const allTracks: Track[] = displaySongs.map((s: SongRow) => ({
        id: s.id,
        url: s.source === 'drive' && s.drive_file_id
          ? `${DRIVE_API_BASE}/files/${s.drive_file_id}?alt=media`
          : s.local_path || '',
        headers: s.source === 'drive' ? { Authorization: `Bearer ${token}` } : undefined,
        title: s.title,
        artist: s.artist || undefined,
        album: s.album || undefined,
        artwork: s.artwork_uri || undefined,
      }));
      await TrackPlayer.setQueue(allTracks);
      usePlayerStore.setState({ activeTrack: allTracks[tapIndex], queue: allTracks });
      await TrackPlayer.skip(tapIndex);
      await TrackPlayer.play();
      router.push('/player');
    } catch (error) {
      console.error('[Playlist] Play failed', error);
    }
  };

  const handleRemove = (songId: string, title: string) => {
    if (!id) return;
    Alert.alert('Remove', `Remove "${title}" from playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removeSongFromPlaylist(id, songId);
        setSongs((prev) => prev.filter((s) => s.id !== songId));
      }},
    ]);
  };

  const handleDragEnd = async ({ data }: { data: SongRow[] }) => {
    setSongs(data);
    if (id) {
      await reorderPlaylistSongs(id, data.map((s) => s.id));
    }
  };

  const handleRename = async () => {
    if (!id || !renameText.trim()) return;
    await renamePlaylist(id, renameText.trim());
    setPlaylist((prev) => prev ? { ...prev, name: renameText.trim() } : prev);
    setShowRename(false);
  };

  const renderItem = useCallback(({ item, drag, isActive, index }: { item: SongRow; drag?: () => void; isActive?: boolean; index?: number }) => (
    <ScaleDecorator>
      <View className={`flex-row items-center px-4 py-3 ${isActive ? 'bg-[#3a3a3a]' : ''}`}>
        {isEditing ? (
          <TouchableOpacity
            onPress={() => handleRemove(item.id, item.title)}
            className="w-8 h-8 rounded-full bg-red-500 justify-center items-center mr-2"
          >
            <Text className="text-white font-bold text-lg leading-none">{'\u2212'}</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10 h-10 rounded bg-[#282828] justify-center items-center mr-3">
            <Text className="text-[#b3b3b3] text-sm">{(index ?? 0) + 1}</Text>
          </View>
        )}

        <View className="flex-1">
          <Text className="text-white text-sm font-semibold" numberOfLines={1}>{item.title}</Text>
          <Text className="text-[#b3b3b3] text-xs mt-0.5" numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
        </View>

        {isEditing ? (
          <TouchableOpacity onPress={drag} className="p-2">
            <Text className="text-[#b3b3b3] text-xl font-bold">{'\u2261'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScaleDecorator>
  ), [isEditing, handleRemove]);

  if (!playlist) {
    return (
      <View className="flex-1 bg-[#121212] justify-center items-center">
        <Text className="text-gray-400">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#121212]">
      <View style={{ flex: 1 }}>
        <View className="flex-row items-center px-4 pt-12 pb-2 gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Text className="text-white text-lg">{'\u2190'}</Text>
          </TouchableOpacity>
          <DetailCoverArt coverArt={playlist.cover_art} />
          <Text className="text-white text-2xl font-bold flex-1" numberOfLines={1}>
            {playlist.name}
          </Text>
          {isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(false)} className="px-3 py-1">
              <Text className="text-[#1DB954] font-semibold">Done</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowMenu(true)} className="p-2">
              <Text className="text-white text-xl font-bold">{'\u22EE'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {songs.length > 0 && !isEditing && (
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Find in playlist"
            placeholderTextColor="#666"
            className="bg-[#282828] text-white mx-4 px-4 py-3 rounded-lg mb-2"
          />
        )}

        {songs.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-gray-400 text-center">This playlist is empty</Text>
            <Text className="text-gray-600 text-sm text-center mt-2">
              Add songs from your library
            </Text>
          </View>
        ) : displaySongs.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-gray-500 text-center">No results in this playlist</Text>
          </View>
        ) : isEditing ? (
          <DraggableFlatList
            data={songs}
            keyExtractor={(item) => item.id}
            onDragEnd={handleDragEnd}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        ) : (
          <FlatList
            data={displaySongs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => handlePlay(index)}
                onLongPress={() => handleRemove(item.id, item.title)}
                className="flex-row items-center px-4 py-3 active:opacity-70"
              >
                <View className="w-10 h-10 rounded bg-[#282828] justify-center items-center mr-3">
                  <Text className="text-[#b3b3b3] text-sm">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-[#b3b3b3] text-xs mt-0.5" numberOfLines={1}>
                    {item.artist || 'Unknown Artist'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* ponytail: MiniPlayer inlined here so it stays visible inside fullScreenModal. Tabs have their own instance above tab bar — never both visible at once since modal covers tabs. */}
      <MiniPlayer />

      {/* 3-dot menu */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
          className="flex-1 justify-center items-center bg-black/60"
        >
          <View className="bg-[#282828] w-64 rounded-xl overflow-hidden">
            <TouchableOpacity
              onPress={() => { setShowMenu(false); setIsEditing(true); }}
              className="px-6 py-4 border-b border-[#3a3a3a]"
            >
              <Text className="text-white text-base">Edit playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowMenu(false); setShowRename(true); setRenameText(playlist.name); }}
              className="px-6 py-4"
            >
              <Text className="text-white text-base">Edit playlist name</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename modal */}
      <Modal visible={showRename} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-[#282828] w-full rounded-xl p-6">
            <Text className="text-white text-lg font-bold mb-4">Rename Playlist</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Playlist name"
              placeholderTextColor="#666"
              className="bg-[#3a3a3a] text-white px-4 py-3 rounded-lg mb-4"
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setShowRename(false)} className="px-4 py-2">
                <Text className="text-[#b3b3b3] font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRename} className="bg-[#1DB954] px-6 py-2 rounded-full">
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
