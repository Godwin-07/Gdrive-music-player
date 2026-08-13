import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';

type Props = {
  isPlaying: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
  circle?: boolean;
};

export default function PlayPauseButton({ isPlaying, onPress, size = 32, color = '#FFFFFF', circle = false }: Props) {
  const circleSize = size * 2;

  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <View
        style={
          circle && {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
          }
        }
      >
        <Icon
          name={isPlaying ? 'pause-sharp' : 'play-sharp'}
          size={size}
          color={circle ? '#000000' : color}
          style={circle && !isPlaying ? { marginLeft: size * 0.1 } : undefined}
        />
      </View>
    </TouchableOpacity>
  );
}
