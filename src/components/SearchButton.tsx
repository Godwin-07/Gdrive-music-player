import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';

type SearchButtonProps = {
  focused?: boolean;
  color?: string;
  size?: number;
};

export default function SearchButton({ focused, color = '#1DB954', size = 24 }: SearchButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 300, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 300, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate }] }}>
      <Icon name="search" size={size} color={color} />
    </Animated.View>
  );
}