import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
// In the future, we'll import Icons and MiniPlayer here

export default function TabLayout() {
  return (
    <>
      <Tabs screenOptions={{ 
          headerShown: false,
          tabBarStyle: { backgroundColor: '#121212', borderTopColor: '#282828' },
          tabBarActiveTintColor: '#1DB954',
          tabBarInactiveTintColor: '#B3B3B3'
      }}>
        <Tabs.Screen name="index" options={{ title: 'Library' }} />
        <Tabs.Screen name="search" options={{ title: 'Search' }} />
        <Tabs.Screen name="playlists" options={{ title: 'Playlists' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
      {/* MiniPlayer will go here above the tab bar */}
    </>
  );
}