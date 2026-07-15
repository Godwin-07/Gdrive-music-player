import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  name: keyof typeof Icon.glyphMap;
  size?: number;
  color?: string;
  onPress: () => void;
  hitSlop?: number;
};

export default function PlayerControlButton({ name, size = 24, color = '#FFFFFF', onPress, hitSlop = 10 }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}>
      <Animated.View style={animatedStyle}>
        <Icon name={name} size={size} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
}