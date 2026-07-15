import React, { useEffect } from 'react';
import Icon from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  focused?: boolean;
  color?: string;
  size?: number;
};

export default function PlaylistButton({ focused, color = '#1DB954', size = 24 }: Props) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      translateY.value = withSequence(
        withTiming(-10, { duration: 150 }),
        withSpring(0, { damping: 8 })
      );
      scale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon name="list" size={size} color={color} />
    </Animated.View>
  );
}