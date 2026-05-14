import React, {memo} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {effectiveStatus, type PhotoRecord} from '../types/photo';
import {statusColor, colors} from '../theme/colors';
import {StatusBadge} from './StatusBadge';

interface Props {
  photo: PhotoRecord;
  size: number;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

function PhotoTileImpl({photo, size, selected, onPress, onLongPress}: Props) {
  const status = effectiveStatus(photo);
  const borderColor =
    selected
      ? colors.primary
      : status === 'unknown' || status === 'pending'
      ? 'transparent'
      : statusColor[status];

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({pressed}) => [
        styles.tile,
        {
          width: size,
          height: size,
          borderColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Image
        source={{uri: photo.thumbnailUri ?? photo.uri}}
        style={styles.image}
        resizeMode="cover"
      />
      {photo.userDecision === 'delete' && <View style={styles.deleteOverlay} />}
      <View style={styles.corner}>
        {status === 'pending' ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <StatusBadge status={status} size={14} />
        )}
      </View>
    </Pressable>
  );
}

export const PhotoTile = memo(PhotoTileImpl);

const styles = StyleSheet.create({
  tile: {
    margin: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  corner: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 2,
    borderRadius: 10,
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(229,96,78,0.25)',
  },
});
