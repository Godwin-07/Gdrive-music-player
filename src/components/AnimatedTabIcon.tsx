import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';

type Props = {
  name: keyof typeof Icon.glyphMap;
  focusedName?: keyof typeof Icon.glyphMap;
  label: string;
  focused: boolean;
  size?: number;
  rotateOnFocus?: boolean;
};

const ACTIVE = '#1DB954';
const INACTIVE = '#B3B3B3';

export default function AnimatedTabIcon({
  name,
  focusedName,
  label,
  focused,
  size = 24,
  rotateOnFocus = false,
}: Props) {
  const progress = useSharedValue(focused ? 1 : 0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 12, stiffness: 180 });
    if (rotateOnFocus && focused) {
      rotation.value = 0;
      rotation.value = withTiming(180, { duration: 400 });
    }
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + progress.value * 0.15 },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + progress.value * 0.3,
  }));

  const color = useDerivedValue(() => interpolateColor(progress.value, [0, 1], [INACTIVE, ACTIVE]));
  const animatedColorStyle = useAnimatedStyle(() => ({ color: color.value }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Animated.View style={iconStyle}>
        <Icon name={focused && focusedName ? focusedName : name} size={size} color={focused ? ACTIVE : INACTIVE} />
      </Animated.View>
      <Animated.Text style={[{ fontSize: 11, fontWeight: focused ? '600' : '400' }, labelStyle, animatedColorStyle]}>
        {label}
      </Animated.Text>
    </View>
  );
}