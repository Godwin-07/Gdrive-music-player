import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability, Event } from 'react-native-track-player';
import type { Track } from 'react-native-track-player';
import { usePlayerStore } from '../src/store/playerStore';
import '../global.css';
import '../trackPlayerService';

const queryClient = new QueryClient();

function resolveTrack(id: string | undefined, queue: Track[]): Track | null {
  if (!id) return null;
  return queue.find((t) => String(t.id) === String(id)) ?? null;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
          autoHandleInterruptions: true,
        });

        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior:
              AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
            Capability.JumpForward,
            Capability.JumpBackward,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
        });

        const token = await SecureStore.getItemAsync('google_access_token');
        setHasToken(!!token);
      } catch (e) {
        console.error("Failed to initialize", e);
      } finally {
        setIsReady(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (isReady) {
      if (!hasToken) {
        router.replace('/auth');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isReady, hasToken]);

  // Global sync: keep Zustand store in sync with TrackPlayer
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

  // Deep link: notification body tap -> player screen
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('notification.click')) {
        router.replace('/player');
      }
    });

    const sub = Linking.addEventListener('url', (event) => {
      if (event.url.includes('notification.click')) {
        router.replace('/player');
      }
    });
    return () => sub.remove();
  }, [router]);

  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="sync" />
          <Stack.Screen name="playlist-detail" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
