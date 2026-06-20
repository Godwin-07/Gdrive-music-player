import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

// You'll need to replace these with your actual Client IDs
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export default function AuthScreen() {
  const router = useRouter();

    const [request, response, promptAsync] = Google.useAuthRequest(
    {
      androidClientId,
      scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'],
    }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        SecureStore.setItemAsync('google_access_token', authentication.accessToken).then(() => {
           if (authentication.refreshToken) {
               SecureStore.setItemAsync('google_refresh_token', authentication.refreshToken);
           }
           router.replace('/(tabs)');
        });
      }
    } else if (response?.type === 'error') {
       const errorMsg = response.error?.message || 'Unknown error';
       Alert.alert('Authentication failed', errorMsg);
       console.log('OAuth error:', JSON.stringify(response));
    }
  }, [response]);

  return (
    <View className="flex-1 justify-center items-center bg-black p-4">
      <Text className="text-white text-3xl font-bold mb-8">Gdrive Music</Text>
      <Text className="text-gray-400 text-center mb-8">
        Connect your Google Drive to stream and manage your music library.
      </Text>
      
      <TouchableOpacity 
        className="bg-green-500 py-4 px-8 rounded-full flex-row items-center justify-center w-full max-w-sm"
        disabled={!request}
        onPress={() => promptAsync()}
      >
        <Text className="text-white font-bold text-lg">Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
}