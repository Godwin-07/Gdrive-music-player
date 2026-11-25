import { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, PanResponder, LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import TrackPlayer, { RepeatMode, State } from 'react-native-track-player';
import type { Track } from 'react-native-track-player';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { usePlayer, useStableIsPlaying } from '../src/hooks/usePlayer';
import { usePlayerStore } from '../src/store/playerStore';
import PlayPauseButton from '../src/components/PlayPauseButton';
import PlayerControlButton from '../src/components/PlayerButtonControl';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const { activeTrack, progress, seekTo, repeatMode, isShuffled, setRepeatMode, toggleShuffle, queue, removeFromQueue } = usePlayer();

  const isPlaying = useStableIsPlaying();
  const duration = progress.duration || 0;
  const position = progress.position || 0;

  const [isDragging, setIsDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const seekTargetRef = useRef<number | null>(null);

  const displayTarget = isDragging
    ? dragFraction * (duration || 1)
    : (seekTargetRef.current ?? position);
  const displayFraction = duration > 0 ? displayTarget / duration : 0;

  useEffect(() => {
    if (seekTargetRef.current !== null && Math.abs(position - seekTargetRef.current) < 0.3) {
      seekTargetRef.current = null;
    }
  });

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
        seekTargetRef.current = pos;
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

  const activeIndex = queue.findIndex(t => String(t.id) === String(activeTrack?.id));
  const upcoming = activeIndex >= 0 ? queue.slice(activeIndex + 1) : [];

  const handleRemoveUpcoming = (upcomingIndex: number) => {
    const absoluteIndex = activeIndex + 1 + upcomingIndex;
    removeFromQueue(absoluteIndex);
  };

  const handleDragEnd = async ({ data, from, to }: { data: Track[]; from: number; to: number }) => {
    const state = usePlayerStore.getState();
    const activeIdx = state.queue.findIndex(t => String(t.id) === String(state.activeTrack?.id));
    if (activeIdx < 0) return;
    const absFrom = activeIdx + 1 + from;
    const absTo = activeIdx + 1 + to;
    const newQueue = [...state.queue];
    const [moved] = newQueue.splice(absFrom, 1);
    newQueue.splice(absTo, 0, moved);
    await TrackPlayer.remove(absFrom);
    await TrackPlayer.add(moved, absTo);
    usePlayerStore.setState({ queue: newQueue });
  };

  const renderQueueItem = ({ item, drag, isActive }: { item: Track; drag?: () => void; isActive?: boolean }) => (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        delayLongPress={100}
        activeOpacity={0.7}
        className={`flex-row items-center py-2.5 px-1 border-b border-[#3a3a3a] ${isActive ? 'bg-[#3a3a3a]' : ''}`}
      >
        <MaterialCommunityIcons name="drag" size={18} color="#535353" style={{ marginRight: 8 }} />
        <View className="flex-1">
          <Text className="text-white text-sm" numberOfLines={1}>{item.title}</Text>
          <Text className="text-[#b3b3b3] text-xs mt-0.5" numberOfLines={1}>
            {item.artist || 'Unknown Artist'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            const idx = upcoming.findIndex(t => String(t.id) === String(item.id));
            if (idx >= 0) handleRemoveUpcoming(idx);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="p-2"
        >
          <MaterialCommunityIcons name="close" size={18} color="#535353" />
        </TouchableOpacity>
      </TouchableOpacity>
    </ScaleDecorator>
  );

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
        <View className="flex-row items-center">
          <Text className="text-white text-xl font-bold flex-shrink" numberOfLines={1}>
            {activeTrack?.title || 'No track loaded'}
          </Text>
        </View>
        <Text className="text-[#b3b3b3] text-base mt-1" numberOfLines={1}>
          {activeTrack?.artist || 'Unknown Artist'}
        </Text>
      </View>

      <View className="mb-8">
        <View className="py-3">
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
              top: -2,
              left: barWidth > 0 ? displayFraction * barWidth - 5 : 0,
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

      <View className="flex-row items-center justify-center gap-6 mb-4">
        <TouchableOpacity
          onPress={toggleShuffle}
          className="p-3"
        >
          <MaterialCommunityIcons
            name="shuffle-variant"
            size={24}
            color={isShuffled ? '#1DB954' : '#FFFFFF'}
          />
        </TouchableOpacity>

        <PlayerControlButton name="play-skip-back-sharp" size={32} onPress={() => TrackPlayer.skipToPrevious()} />

        <PlayPauseButton
          isPlaying={isPlaying}
          size={32}
          circle
          onPress={togglePlayback}
        />

        <PlayerControlButton name="play-skip-forward-sharp" size={32} onPress={() => TrackPlayer.skipToNext()} />

        <TouchableOpacity
          onPress={() => setRepeatMode(
            repeatMode === RepeatMode.Off ? RepeatMode.Queue
            : repeatMode === RepeatMode.Queue ? RepeatMode.Track
            : RepeatMode.Off
          )}
          className="p-3"
        >
          <MaterialCommunityIcons
            name={
              repeatMode === RepeatMode.Off ? 'repeat-off'
              : repeatMode === RepeatMode.Track ? 'repeat-once'
              : 'repeat'
            }
            size={24}
            color={repeatMode !== RepeatMode.Off ? '#1DB954' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <View className="flex-row items-center px-1 py-2 border-t border-[#3a3a3a]">
          <Text className="text-[#b3b3b3] text-sm font-semibold flex-1">Up Next</Text>
          <Text className="text-[#b3b3b3] text-xs">{upcoming.length} tracks</Text>
        </View>
        {upcoming.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-[#535353] text-sm">No upcoming tracks</Text>
          </View>
        ) : (
          <DraggableFlatList
            data={upcoming}
            keyExtractor={(item) => String(item.id)}
            onDragEnd={handleDragEnd}
            renderItem={renderQueueItem}
          />
        )}
      </View>
    </View>
  );
}
