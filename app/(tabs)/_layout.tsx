import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import MiniPlayer from '../../src/components/MiniPlayer';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ 
          headerShown: false,
          tabBarStyle: { backgroundColor: '#121212', borderTopColor: '#282828' },
          tabBarActiveTintColor: '#1DB954',
          tabBarInactiveTintColor: '#B3B3B3'
      }}
      tabBar={(props) => (
        <View className="bg-[#121212]">
          {/* ponytail: second MiniPlayer instance for tab screens — see playlist-detail.tsx for the other */}
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Library' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="playlists" options={{ title: 'Playlists' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}