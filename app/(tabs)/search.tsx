import { useState, useEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import TrackPlayer from 'react-native-track-player';
import SongCard from '../../src/components/SongCard';
import { searchSongs, getAllCacheEntries } from '../../src/db/queries';
import type { SongRow } from '../../src/db/queries';
import { getAccessToken } from '../../src/services/authService';
import { buildTracksWithCache } from '../../src/services/cacheService';
import { usePlayerStore } from '../../src/store/playerStore';
import { useRouter } from 'expo-router';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAllCacheEntries().then(entries => setCachedIds(new Set(entries.map(e => e.song_id))));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await searchSongs(query.trim());
      setResults(res);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const handlePlay = async (item: SongRow) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const idx = results.findIndex((s) => s.id === item.id);
      if (idx === -1) return;
      const tracks = await buildTracksWithCache(results, token);
      usePlayerStore.setState({ activeTrack: tracks[idx], queue: tracks });
      await TrackPlayer.setQueue(tracks);
      await TrackPlayer.skip(idx);
      await TrackPlayer.play();
      router.push('/player');
    } catch (e) {
      console.error('[Search] Play failed', e);
    }
  };

  return (
    <View className="flex-1 bg-[#121212]">
      <View className="px-4 pt-12 pb-2">
        <Text className="text-white text-2xl font-bold mb-4">Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="#666"
          className="bg-[#282828] text-white px-4 py-3 rounded-lg"
          autoFocus
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : !query.trim() ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-gray-500 text-center">Search your music library</Text>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-gray-500 text-center">No results for "{query}"</Text>
        </View>
      ) : (
        <FlashList
          data={results}
          keyExtractor={(item: SongRow) => item.id}
          renderItem={({ item }) => (
            <SongCard
              title={item.title}
              artist={item.artist || ''}
              duration={item.duration || undefined}
              artworkUri={item.artwork_uri}
              source={item.source}
              isCached={cachedIds.has(item.id)}
              onPress={() => handlePlay(item)}
            />
          )}
          estimatedItemSize={64}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}
