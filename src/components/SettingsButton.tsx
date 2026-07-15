import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';

type Props = {
  focused?: boolean;
  color?: string;
  size?: number;
};

export default function SettingsButton({ focused, color = '#1DB954', size = 24 }: Props) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('SettingsButton focused:', focused);
    if (focused) {
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }).start(() => spinAnim.setValue(0));

      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }, { scale: pulseAnim }] }}>
      <Icon name="settings-outline" size={size} color={color} />
    </Animated.View>
  );
}