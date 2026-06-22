import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { setTokens } from '../src/services/authService';

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export default function AuthScreen() {
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId,
    webClientId,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'error') {
      const errMsg =
        (response as any).params?.error_description ||
        (response as any).error?.message ||
        'Access denied';
      Alert.alert('Authentication failed', errMsg);
      return;
    }

    if (response.type !== 'success') return;

    const result = response as any;
    const { authentication, params } = result;

    const accessToken =
      authentication?.accessToken || params?.access_token;
    const refreshToken =
      authentication?.refreshToken || params?.refresh_token;
    const expiresIn =
      authentication?.expiresIn ||
      (params?.expires_in ? parseInt(params.expires_in, 10) : undefined);

    if (!accessToken) {
      console.log('[Auth] No access token yet, waiting for auto-exchange...');
      return;
    }

    console.log('[Auth] Token received, storing...');
    setTokens(accessToken, refreshToken, expiresIn).then(() => {
      router.replace('/(tabs)');
    });
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
