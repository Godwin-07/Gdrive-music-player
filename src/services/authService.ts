import * as SecureStore from 'expo-secure-store';
import { OAUTH_TOKEN_URL } from '../constants/driveConfig';

const ACCESS_TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

let cachedToken: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken) {
    const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() < parseInt(expiry, 10)) {
      return cachedToken;
    }
    cachedToken = null;
  }

  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  console.log(`[Auth] Token from store: ${token ? token.substring(0, 10) + '...' : 'null'}`);
  if (!token) return null;

  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
  if (expiry && Date.now() >= parseInt(expiry, 10)) {
    console.log('[Auth] Token expired, refreshing...');
    return refreshAccessToken();
  }

  cachedToken = token;
  return token;
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    const clientId =
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      await signOut();
      return null;
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    cachedToken = newToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(
      TOKEN_EXPIRY_KEY,
      String(Date.now() + expiresIn * 1000)
    );

    if (data.refresh_token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
    }

    return newToken;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
}

export async function setTokens(
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<void> {
  cachedToken = accessToken;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
  await SecureStore.setItemAsync(
    TOKEN_EXPIRY_KEY,
    String(Date.now() + (expiresIn ?? 3600) * 1000)
  );
}
