import { useEffect } from 'react';
import TrackPlayer, {
  useProgress,
  usePlaybackState,
  Event,
} from 'react-native-track-player';
import type { Track } from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';

function resolveTrack(id: string | undefined, queue: Track[]): Track | null {
  if (!id) return null;
  return queue.find((t) => String(t.id) === String(id)) ?? null;
}

export function usePlayer() {
  const progress = useProgress(1000);
  const playbackState = usePlaybackState();
  const store = usePlayerStore();

  useEffect(() => {
    TrackPlayer.getActiveTrackIndex().then((index) => {
      const state = usePlayerStore.getState();
      if (index !== undefined && state.queue.length > 0 && !state.activeTrack) {
        const track = state.queue[index];
        if (track) usePlayerStore.setState({ activeTrack: track });
      }
    });
  }, []);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async ({ track }) => {
        const state = usePlayerStore.getState();
        let activeTrack: Track | null = null;
        if (track) {
          activeTrack = resolveTrack(track.id, state.queue) ?? (track as Track);
        }
        usePlayerStore.setState({ activeTrack, queue: state.queue });
      }
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    usePlayerStore.setState({
      playbackState: playbackState.state,
    });
  }, [playbackState]);

  return {
    activeTrack: store.activeTrack,
    queue: store.queue,
    repeatMode: store.repeatMode,
    isShuffled: store.isShuffled,
    playbackState: store.playbackState,
    progress,
    play: store.play,
    pause: store.pause,
    togglePlayback: store.togglePlayback,
    skipToNext: store.skipToNext,
    skipToPrevious: store.skipToPrevious,
    seekTo: store.seekTo,
    seekBy: store.seekBy,
    setRepeatMode: store.setRepeatMode,
    toggleShuffle: store.toggleShuffle,
    addToQueue: store.addToQueue,
    removeFromQueue: store.removeFromQueue,
    clearQueue: store.clearQueue,
    setQueue: store.setQueue,
    playTrack: store.playTrack,
  };
}
