import { View, Text, Image, TouchableOpacity } from 'react-native';

interface SongCardProps {
  title: string;
  artist: string;
  duration?: number;
  artworkUri?: string | null;
  source: 'drive' | 'local';
  onPress?: () => void;
  onMenu?: () => void;
}

export default function SongCard({
  title,
  artist,
  duration,
  artworkUri,
  source,
  onPress,
  onMenu,
}: SongCardProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-2 active:opacity-70"
    >
      <View className="w-12 h-12 rounded bg-[#282828] mr-3 overflow-hidden">
        {artworkUri ? (
          <Image
            source={{ uri: artworkUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Text className="text-[#b3b3b3] text-lg">♪</Text>
          </View>
        )}
      </View>

      <View className="flex-1 mr-2">
        <Text className="text-white text-sm font-semibold" numberOfLines={1}>
          {title}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Text className="text-[#b3b3b3] text-xs" numberOfLines={1}>
            {artist}
          </Text>
          {source === 'local' && (
            <View className="ml-2 bg-[#1DB954] px-1.5 py-0.5 rounded">
              <Text className="text-[10px] text-black font-bold">Local</Text>
            </View>
          )}
        </View>
      </View>

      <Text className="text-[#b3b3b3] text-xs mr-2">
        {formatDuration(duration)}
      </Text>

      {onMenu && (
        <TouchableOpacity onPress={onMenu} className="p-2">
          <Text className="text-[#b3b3b3] text-lg">⋯</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
