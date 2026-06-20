import { View, Text } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function LibraryScreen() {
  const router = useRouter();

  useEffect(() => {
    // Basic Auth Guard on mount
    SecureStore.getItemAsync('google_access_token').then(token => {
      if (!token) {
        router.replace('/auth');
      }
    });
  }, []);

  return (
    <View className="flex-1 bg-[#121212] pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-4">Library</Text>
      <Text className="text-gray-400">Your Google Drive music will appear here.</Text>
    </View>
  );
}