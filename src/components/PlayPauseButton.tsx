import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  isPlaying: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
  circle?: boolean;
};

export default function PlayPauseButton({ isPlaying, onPress, size = 32, color = '#FFFFFF', circle = false }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1.15, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 8 });
    });
  }, [isPlaying]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const circleSize = size * 2;

  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View
        style={[
          animatedStyle,
          circle && {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Icon
          name={isPlaying ? 'pause-sharp' : 'play-sharp'}
          size={size}
          color={circle ? '#000000' : color}
          style={circle && !isPlaying ? { marginLeft: size * 0.1 } : undefined}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}