import { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, PanResponder, LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import TrackPlayer, { State } from 'react-native-track-player';
import { usePlayer } from '../src/hooks/usePlayer';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const { activeTrack, progress, playbackState, seekTo } = usePlayer();

  const isPlaying = playbackState === State.Playing;
  const duration = progress.duration || 0;
  const position = progress.position || 0;

  const [isDragging, setIsDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  const displayFraction = isDragging ? dragFraction : (duration > 0 ? position / duration : 0);

  const barWidthRef = useRef(0);
  const dragState = useRef({ isDragging: false, fraction: 0 });
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const seekToRef = useRef(seekTo);
  seekToRef.current = seekTo;

  const seekPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const w = barWidthRef.current;
        if (w <= 0) return;
        dragState.current.isDragging = true;
        const x = evt.nativeEvent.locationX;
        dragState.current.fraction = Math.max(0, Math.min(1, x / w));
        setIsDragging(true);
        setDragFraction(dragState.current.fraction);
      },
      onPanResponderMove: (evt) => {
        if (!dragState.current.isDragging) return;
        const w = barWidthRef.current;
        if (w <= 0) return;
        const x = evt.nativeEvent.locationX;
        dragState.current.fraction = Math.max(0, Math.min(1, x / w));
        setDragFraction(dragState.current.fraction);
      },
      onPanResponderRelease: () => {
        dragState.current.isDragging = false;
        setIsDragging(false);
        const pos = dragState.current.fraction * durationRef.current;
        seekToRef.current(pos);
      },
      onPanResponderTerminate: () => {
        dragState.current.isDragging = false;
        setIsDragging(false);
      },
    })
  ).current;

  const handleSeekBarLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      barWidthRef.current = w;
      setBarWidth(w);
    }
  }, []);

  async function togglePlayback() {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }

  return (
    <View className="flex-1 bg-[#121212] pt-14 px-6">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Text className="text-white text-lg">{'\u2190'}</Text>
        </TouchableOpacity>
        <Text className="text-white text-sm font-semibold flex-1 text-center mr-8">
          Now Playing
        </Text>
      </View>

      <View className="items-center mb-10">
        {activeTrack?.artwork ? (
          <Image
            source={{ uri: activeTrack.artwork }}
            className="w-72 h-72 rounded-lg bg-gray-800"
            resizeMode="contain"
            onLoad={() => console.log('[Player] Art loaded successfully')}
            onError={(e) => console.log('[Player] Art load error:', e.nativeEvent.error)}
          />
        ) : (
          <View className="w-72 h-72 rounded-lg bg-[#282828] justify-center items-center">
            <Text className="text-6xl text-[#b3b3b3]">{"\u266B"}</Text>
          </View>
        )}
      </View>

      <View className="mb-6">
        <Text className="text-white text-xl font-bold" numberOfLines={1}>
          {activeTrack?.title || 'No track loaded'}
        </Text>
        <Text className="text-[#b3b3b3] text-base mt-1" numberOfLines={1}>
          {activeTrack?.artist || 'Unknown Artist'}
        </Text>
      </View>

      <View className="mb-8">
        <View
          onLayout={handleSeekBarLayout}
          {...seekPanResponder.panHandlers}
        >
          <View className="h-1.5 bg-[#535353] rounded-full justify-center">
            <View
              className="h-1.5 bg-white rounded-full"
              style={{ width: `${displayFraction * 100}%` }}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              top: -1,
              left: barWidth > 0 ? displayFraction * barWidth - 6 : 0,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.4,
              shadowRadius: 3,
              elevation: 4,
            }}
          />
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-[#b3b3b3] text-xs">
            {formatTime(isDragging ? dragFraction * durationRef.current : position)}
          </Text>
          <Text className="text-[#b3b3b3] text-xs">
            {duration > 0 ? `-${formatTime(duration - position)}` : '--:--'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-8 mb-8">
        <TouchableOpacity
          onPress={() => TrackPlayer.skipToPrevious()}
          className="p-3"
        >
          <Text className="text-white text-3xl">{'\u23EE'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlayback}
          className="w-16 h-16 rounded-full bg-white justify-center items-center"
        >
          <Text className="text-black text-3xl ml-0.5">
            {isPlaying ? '\u23F8' : '\u25B6'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => TrackPlayer.skipToNext()}
          className="p-3"
        >
          <Text className="text-white text-3xl">{'\u23ED'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
