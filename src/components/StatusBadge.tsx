import React from 'react';
import {StyleSheet, View} from 'react-native';
import {statusColor} from '../theme/colors';
import type {AIStatus} from '../types/photo';

interface Props {
  status: AIStatus | 'pending' | 'unknown';
  size?: number;
}

export function StatusBadge({status, size = 12}: Props) {
  const color = statusColor[status] ?? statusColor.unknown;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: status === 'pending' ? 'transparent' : color,
          borderColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: status === 'pending' ? 2 : 0,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {},
});
