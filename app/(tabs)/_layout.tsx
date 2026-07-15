import { Tabs } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import MiniPlayer from '../../src/components/MiniPlayer';
import AnimatedTabIcon from '@/src/components/AnimatedTabIcon';

function TabButton({ onPress, focused, name, focusedName, label, rotateOnFocus}: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 6 }}
    >
      <AnimatedTabIcon name={name} focusedName={focusedName} label={label} focused={focused} rotateOnFocus={rotateOnFocus} />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#121212', borderTopColor: '#282828' },
      }}
      tabBar={(props) => (
        <View className="bg-[#121212]">
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarButton: (props) => (
            <TabButton
              onPress={props.onPress}
              focused={!!props.accessibilityState?.selected}
              name="library-outline"
              focusedName="library"
              label="Library"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarButton: (props) => (
            <TabButton
              onPress={props.onPress}
              focused={!!props.accessibilityState?.selected}
              name="search-outline"
              focusedName="search"
              label="Search"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="playlists"
        options={{
          title: 'Playlists',
          tabBarButton: (props) => (
            <TabButton
              onPress={props.onPress}
              focused={!!props.accessibilityState?.selected}
              name="list-outline"
              focusedName="list"
              label="Playlists"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarButton: (props) => (
            <TabButton
              onPress={props.onPress}
              focused={!!props.accessibilityState?.selected}
              name="settings-outline"
              focusedName="settings"
              label="Settings"
              rotateOnFocus
            />
          ),
        }}
      />
    </Tabs>
  );
}