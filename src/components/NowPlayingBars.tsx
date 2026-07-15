import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

export default function NowPlayingBars({ color = '#1DB954', size = 14 }) {
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.6)).current;
  const bar3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animateBar = (bar: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration, easing: Easing.ease, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 0.2, duration, easing: Easing.ease, useNativeDriver: false }),
        ])
      ).start();
    };
    animateBar(bar1, 400);
    animateBar(bar2, 550);
    animateBar(bar3, 300);
  }, []);

  const barStyle = (anim: Animated.Value) => ({
    width: size / 5,
    marginHorizontal: 1,
    backgroundColor: color,
    borderRadius: 2,
    height: anim.interpolate({ inputRange: [0, 1], outputRange: [size * 0.2, size] }),
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: size }}>
      <Animated.View style={barStyle(bar1)} />
      <Animated.View style={barStyle(bar2)} />
      <Animated.View style={barStyle(bar3)} />
    </View>
  );
}