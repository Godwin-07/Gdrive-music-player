import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { useRouter, useFocusEffect } from 'expo-router';
import { getSongCount, getSongsBySource, getCacheStats, getAllCacheEntries, clearCacheTable } from '../../src/db/queries';
import { getAccessToken } from '../../src/services/authService';

const USER_INFO_KEY = 'cached_user_info';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function SettingsScreen() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);
  const [totalSongs, setTotalSongs] = useState(0);
  const [driveCount, setDriveCount] = useState(0);
  const [localCount, setLocalCount] = useState(0);
  const [cacheCount, setCacheCount] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  async function loadData() {
    setLoading(true);
    try {
      const cached = await SecureStore.getItemAsync(USER_INFO_KEY);
      if (cached) {
        const { email, name } = JSON.parse(cached);
        setUserEmail(email);
        setUserName(name);
      }

      const expiryStr = await SecureStore.getItemAsync('google_token_expiry');
      if (expiryStr) {
        const remaining = parseInt(expiryStr, 10) - Date.now();
        if (remaining <= 0) {
          setTokenExpiry('Expired');
        } else if (remaining < 60000) {
          setTokenExpiry('Expiring soon');
        } else if (remaining < 3600000) {
          setTokenExpiry(`Expires in ${Math.floor(remaining / 60000)}m`);
        } else {
          const h = Math.floor(remaining / 3600000);
          const m = Math.floor((remaining % 3600000) / 60000);
          setTokenExpiry(`Expires in ${h}h ${m}m`);
        }
      }

      const [total, drive, local, stats] = await Promise.all([
        getSongCount(),
        getSongsBySource('drive'),
        getSongsBySource('local'),
        getCacheStats(),
      ]);
      setTotalSongs(total);
      setDriveCount(drive.length);
      setLocalCount(local.length);
      setCacheCount(stats.count);
      setCacheSize(stats.totalSize);

      const token = await getAccessToken();
      if (token) {
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.email);
          setUserName(data.name);
          await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify({ email: data.email, name: data.name }));
        }
      }
    } catch (e) {
      console.log('[Settings] Load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearCache() {
    Alert.alert('Clear Cache', 'Delete all cached files from device storage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          try {
            const entries = await getAllCacheEntries();
            await Promise.allSettled(entries.map(e => FileSystem.deleteAsync(e.local_path, { idempotent: true })));
            await clearCacheTable();
            const stats = await getCacheStats();
            setCacheCount(stats.count);
            setCacheSize(stats.totalSize);
          } catch (e) {
            console.log('[Settings] Clear cache error:', e);
          }
        },
      },
    ]);
  }

  async function handleSignOut() {
    await SecureStore.deleteItemAsync('google_access_token');
    await SecureStore.deleteItemAsync('google_refresh_token');
    await SecureStore.deleteItemAsync('google_token_expiry');
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
    router.replace('/auth');
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#121212] pt-12 px-4 justify-center items-center">
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#121212] pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-6">Settings</Text>

      {/* Account */}
      <View className="mb-6">
        <Text className="text-[#b3b3b3] text-xs font-semibold uppercase tracking-wider mb-2">Account</Text>
        <View className="bg-[#282828] rounded-xl overflow-hidden">
          <View className="flex-row items-center px-4 py-4">
            <View className="w-10 h-10 rounded-full bg-[#1DB954] justify-center items-center mr-3">
              <Text className="text-white text-lg font-bold">
                {(userName || userEmail || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              {userName ? <Text className="text-white text-base font-semibold">{userName}</Text> : null}
              <Text className={userEmail ? 'text-[#b3b3b3] text-sm' : 'text-[#535353] text-sm'}>
                {userEmail || (loading ? 'Loading...' : 'Not connected')}
              </Text>
              {tokenExpiry ? (
                <Text className="text-[#535353] text-xs mt-0.5">{tokenExpiry}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* Library */}
      <View className="mb-6">
        <Text className="text-[#b3b3b3] text-xs font-semibold uppercase tracking-wider mb-2">Library</Text>
        <View className="bg-[#282828] rounded-xl overflow-hidden">
          <View className="flex-row items-center px-4 py-3.5 border-b border-[#3a3a3a]">
            <MaterialCommunityIcons name="music-note" size={20} color="#b3b3b3" />
            <Text className="text-white text-sm flex-1 ml-3">Total songs</Text>
            <Text className="text-white text-sm font-semibold">{totalSongs}</Text>
          </View>
          <View className="flex-row items-center px-4 py-3.5 border-b border-[#3a3a3a]">
            <MaterialCommunityIcons name="google-drive" size={20} color="#b3b3b3" />
            <Text className="text-white text-sm flex-1 ml-3">Drive files</Text>
            <Text className="text-white text-sm font-semibold">{driveCount}</Text>
          </View>
          <View className="flex-row items-center px-4 py-3.5">
            <MaterialCommunityIcons name="cellphone" size={20} color="#b3b3b3" />
            <Text className="text-white text-sm flex-1 ml-3">Local files</Text>
            <Text className="text-white text-sm font-semibold">{localCount}</Text>
          </View>
        </View>
      </View>

      {/* Cache */}
      <View className="mb-6">
        <Text className="text-[#b3b3b3] text-xs font-semibold uppercase tracking-wider mb-2">Cache</Text>
        <View className="bg-[#282828] rounded-xl overflow-hidden">
          <View className="flex-row items-center px-4 py-3.5 border-b border-[#3a3a3a]">
            <MaterialCommunityIcons name="database" size={20} color="#b3b3b3" />
            <Text className="text-white text-sm flex-1 ml-3">Cached songs</Text>
            <Text className="text-white text-sm font-semibold">{cacheCount}</Text>
          </View>
          <View className="flex-row items-center px-4 py-3.5 border-b border-[#3a3a3a]">
            <MaterialCommunityIcons name="harddisk" size={20} color="#b3b3b3" />
            <Text className="text-white text-sm flex-1 ml-3">Cache size</Text>
            <Text className="text-white text-sm font-semibold">{formatBytes(cacheSize)}</Text>
          </View>
          <TouchableOpacity
            onPress={handleClearCache}
            disabled={cacheCount === 0}
            className="flex-row items-center px-4 py-3.5"
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={cacheCount === 0 ? '#535353' : '#ff4444'}
            />
            <Text className={`text-sm flex-1 ml-3 ${cacheCount === 0 ? 'text-[#535353]' : 'text-red-500'}`}>
              Clear Cache
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={cacheCount === 0 ? '#535353' : '#ff4444'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        onPress={handleSignOut}
        className="bg-[#282828] rounded-xl py-4 items-center mb-8"
      >
        <Text className="text-red-500 font-semibold text-base">Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
