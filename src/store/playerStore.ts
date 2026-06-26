import { create } from 'zustand';
import TrackPlayer, { RepeatMode, State } from 'react-native-track-player';
import type { Track } from 'react-native-track-player';

interface PlaybackState {
  activeTrack: Track | null;
  queue: Track[];
  repeatMode: RepeatMode;
  isShuffled: boolean;
  playbackState: State | undefined;
}

interface PlayerActions {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  seekBy: (offset: number) => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  addToQueue: (track: Track) => Promise<void>;
  removeFromQueue: (index: number) => Promise<void>;
  clearQueue: () => Promise<void>;
  setQueue: (tracks: Track[]) => Promise<void>;
  playTrack: (index: number) => Promise<void>;
}

type PlayerStore = PlaybackState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  activeTrack: null,
  queue: [],
  repeatMode: RepeatMode.Off,
  isShuffled: false,
  playbackState: undefined,

  play: async () => {
    await TrackPlayer.play();
  },

  pause: async () => {
    await TrackPlayer.pause();
  },

  togglePlayback: async () => {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  },

  skipToNext: async () => {
    await TrackPlayer.skipToNext();
  },

  skipToPrevious: async () => {
    await TrackPlayer.skipToPrevious();
  },

  seekTo: async (position: number) => {
    await TrackPlayer.seekTo(position);
  },

  seekBy: async (offset: number) => {
    await TrackPlayer.seekBy(offset);
  },

  setRepeatMode: async (mode: RepeatMode) => {
    await TrackPlayer.setRepeatMode(mode);
    set({ repeatMode: mode });
  },

  toggleShuffle: async () => {
    const { queue, isShuffled, activeTrack } = get();
    if (!isShuffled) {
      const shuffled = [...queue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      await TrackPlayer.setQueue(shuffled);
      const newIndex = shuffled.findIndex(t => String(t.id) === String(activeTrack?.id));
      if (newIndex >= 0) {
        await TrackPlayer.skip(newIndex);
        await TrackPlayer.play();
      }
      set({ queue: shuffled, isShuffled: true });
    } else {
      set({ isShuffled: false });
    }
  },

  addToQueue: async (track: Track) => {
    await TrackPlayer.add(track);
    const queue = await TrackPlayer.getQueue();
    set({ queue });
  },

  removeFromQueue: async (index: number) => {
    await TrackPlayer.remove(index);
    const queue = await TrackPlayer.getQueue();
    set({ queue });
  },

  clearQueue: async () => {
    await TrackPlayer.reset();
    set({ queue: [], activeTrack: null });
  },

  setQueue: async (tracks: Track[]) => {
    await TrackPlayer.setQueue(tracks);
    set({ queue: tracks });
  },

  playTrack: async (index: number) => {
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
  },
}));
