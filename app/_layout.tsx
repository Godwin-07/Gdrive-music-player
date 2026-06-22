import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
import '../global.css';
import '../trackPlayerService';

const queryClient = new QueryClient();

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

  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="sync" />
      </Stack>
    </QueryClientProvider>
  );
}
