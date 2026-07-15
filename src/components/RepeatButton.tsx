import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';
import { RepeatMode } from 'react-native-track-player';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  repeatMode: RepeatMode;
  onPress: () => void;
  size?: number;
};

const ACTIVE = '#1DB954';
const INACTIVE = '#B3B3B3';

export default function RepeatButton({ repeatMode, onPress, size = 22 }: Props) {
  const scale = useSharedValue(1);
  const isActive = repeatMode !== RepeatMode.Off;

  useEffect(() => {
    scale.value = withSpring(1.2, { damping: 5 }, () => {
      scale.value = withSpring(1, { damping: 8 });
    });
  }, [repeatMode]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View style={[animatedStyle, { alignItems: 'center' }]}>
        <Icon
          name={repeatMode === RepeatMode.Track ? 'repeat' : 'repeat'}
          size={size}
          color={isActive ? ACTIVE : INACTIVE}
        />
        {repeatMode === RepeatMode.Track && (
          <View style={{ position: 'absolute', top: -2, right: -4, backgroundColor: ACTIVE, borderRadius: 4, width: 8, height: 8 }} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}