import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getAllPlaylists, createPlaylist, deletePlaylist,
} from '../../src/db/queries';
import type { PlaylistWithCount } from '../../src/db/queries';

function CoverArt({ coverArt }: { coverArt: string | null }) {
  const uris: string[] = coverArt ? (() => { try { return JSON.parse(coverArt); } catch { return []; } })() : [];

  if (uris.length === 0) {
    return <View className="w-16 h-16 rounded bg-[#282828] justify-center items-center mr-3"><Text className="text-2xl text-[#b3b3b3]">{'\u266B'}</Text></View>;
  }

  if (uris.length === 1) {
    return <Image source={{ uri: uris[0] }} className="w-16 h-16 rounded mr-3" resizeMode="cover" />;
  }

  if (uris.length === 2) {
    return (
      <View className="w-16 h-16 rounded overflow-hidden mr-3">
        <Image source={{ uri: uris[0] }} className="w-full h-1/2" resizeMode="cover" />
        <Image source={{ uri: uris[1] }} className="w-full h-1/2" resizeMode="cover" />
      </View>
    );
  }

  // 3 or 4 images in a 2x2 grid
  const cells = uris.slice(0, 4);
  const grid = [cells.slice(0, 2), cells.slice(2, 4)];
  return (
    <View className="w-16 h-16 rounded overflow-hidden mr-3">
      {grid.map((row, ri) => (
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

export default function PlaylistsScreen() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistWithCount[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    const list = await getAllPlaylists();
    setPlaylists(list);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createPlaylist(name);
    setNewName('');
    setShowCreate(false);
    load();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deletePlaylist(id);
        load();
      }},
    ]);
  };

  return (
    <View className="flex-1 bg-[#121212]">
      <View className="px-4 pt-12 pb-2 flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">Playlists</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="bg-[#1DB954] px-4 py-2 rounded-full"
        >
          <Text className="text-white font-semibold">New</Text>
        </TouchableOpacity>
      </View>

      {playlists.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-gray-400 text-center mb-2">No playlists yet</Text>
          <Text className="text-gray-600 text-sm text-center">
            Tap "New" to create your first playlist
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/playlist-detail?id=${item.id}`)}
              onLongPress={() => handleDelete(item.id, item.name)}
              className="flex-row items-center px-4 py-4 active:opacity-70 border-b border-[#282828]"
            >
              <CoverArt coverArt={item.cover_art} />
              <View className="flex-1">
                <Text className="text-white text-base font-semibold" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-[#b3b3b3] text-sm mt-0.5">
                  {item.song_count} {item.song_count === 1 ? 'song' : 'songs'}
                </Text>
              </View>
              <Text className="text-[#b3b3b3] text-lg">{'\u203A'}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-[#282828] w-full rounded-xl p-6">
            <Text className="text-white text-lg font-bold mb-4">New Playlist</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Playlist name"
              placeholderTextColor="#666"
              className="bg-[#3a3a3a] text-white px-4 py-3 rounded-lg mb-4"
              autoFocus
            />
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => { setShowCreate(false); setNewName(''); }} className="px-4 py-2">
                <Text className="text-[#b3b3b3] font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} className="bg-[#1DB954] px-6 py-2 rounded-full">
                <Text className="text-white font-semibold">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
