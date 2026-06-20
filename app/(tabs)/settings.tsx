import { View, Text, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('google_access_token');
    await SecureStore.deleteItemAsync('google_refresh_token');
    router.replace('/auth');
  };

  return (
    <View className="flex-1 bg-[#121212] pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-8">Settings</Text>

      <TouchableOpacity 
        className="bg-red-500 py-3 px-6 rounded-full self-start"
        onPress={handleSignOut}
      >
        <Text className="text-white font-bold">Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}