import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter, Slot } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync('google_access_token');
        setHasToken(!!token);
      } catch (e) {
        console.error("Failed to check token", e);
      } finally {
        setIsReady(true);
      }
    }
    checkAuth();
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="sync" />
    </Stack>
  );
}
