import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/playerStore';
import TrackPlayer, { usePlaybackState, useProgress, State } from 'react-native-track-player';

export default function MiniPlayer() {
  const router = useRouter();
  const activeTrack = usePlayerStore((s) => s.activeTrack);
  const { state: playbackState } = usePlaybackState();
  const { position, duration } = useProgress(1000);

  if (!activeTrack) return null;

  const isPlaying = playbackState === State.Playing;
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View>
      <View className="h-0.5 bg-[#3a3a3a]">
        <View
          className="h-full bg-white"
          style={{ width: `${progress * 100}%` }}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/player')}
        className="flex-row items-center bg-[#282828] px-4 py-3"
      >
        {activeTrack.artwork ? (
          <Image
            source={{ uri: activeTrack.artwork }}
            className="w-12 h-12 rounded"
            resizeMode="cover"
          />
        ) : (
          <View className="w-12 h-12 rounded bg-[#3a3a3a] justify-center items-center">
            <Text className="text-[#b3b3b3] text-lg">{'\u266B'}</Text>
          </View>
        )}

        <View className="flex-1 mx-3">
          <Text className="text-white text-sm font-semibold" numberOfLines={1}>
            {activeTrack.title || 'Unknown'}
          </Text>
          <Text className="text-[#b3b3b3] text-xs" numberOfLines={1}>
            {activeTrack.artist || 'Unknown Artist'}
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => TrackPlayer.skipToPrevious()}
          >
            <Text className="text-white text-xl">{'\u23EE'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={async () => {
              const state = await TrackPlayer.getPlaybackState();
              if (state.state === State.Playing) {
                await TrackPlayer.pause();
              } else {
                await TrackPlayer.play();
              }
            }}
          >
            <Text className="text-white text-2xl w-7 text-center">
              {isPlaying ? '\u23F8' : '\u25B6'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => TrackPlayer.skipToNext()}
          >
            <Text className="text-white text-xl">{'\u23ED'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}
