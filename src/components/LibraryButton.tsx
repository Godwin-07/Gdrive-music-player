import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';

type Props = {
  focused?: boolean;
  color?: string;
  size?: number;
};

export default function LibraryButton({ focused, color = '#1DB954', size = 24 }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.7, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 2, tension: 100, useNativeDriver: true }),
      ]).start();

      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
      ]).start();
    }
  }, [focused]);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(29, 185, 84, 0.2)'],
  });

  return (
    // Outer view: JS-driven (backgroundColor)
    <Animated.View style={{ backgroundColor, borderRadius: size, padding: 4 }}>
      {/* Inner view: native-driven (scale transform) */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Icon name={focused ? 'library' : 'library-outline'} size={size} color={color} />
      </Animated.View>
    </Animated.View>
  );
}