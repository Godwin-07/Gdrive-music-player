import { View, Text } from 'react-native';

export default function PlayerScreen() {
  return (
    <View className="flex-1 bg-[#121212] pt-12 px-4 justify-center items-center">
      <Text className="text-white text-2xl font-bold">Now Playing</Text>
    </View>
  );
}