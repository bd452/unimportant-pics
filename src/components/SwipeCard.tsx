import React, {useEffect} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {effectiveStatus, type PhotoRecord} from '../types/photo';
import {colors, statusColor} from '../theme/colors';
import {StatusBadge} from './StatusBadge';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

interface Props {
  photo: PhotoRecord;
  onSwipe: (decision: 'keep' | 'delete') => void;
  isTop: boolean;
  index: number;
}

export function SwipeCard({photo, onSwipe, isTop, index}: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const status = effectiveStatus(photo);
  const ready = status !== 'pending' && status !== 'unknown';

  useEffect(() => {
    tx.value = 0;
    ty.value = 0;
  }, [photo.id, tx, ty]);

  const pan = Gesture.Pan()
    .enabled(isTop && ready)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        tx.value = withTiming(SCREEN_WIDTH * 1.5, {duration: 220});
        runOnJS(onSwipe)('keep');
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        tx.value = withTiming(-SCREEN_WIDTH * 1.5, {duration: 220});
        runOnJS(onSwipe)('delete');
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const animated = useAnimatedStyle(() => {
    const rot = interpolate(
      tx.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-12, 0, 12],
    );
    const scale = isTop ? 1 : Math.max(0.92, 1 - index * 0.04);
    const translateY = isTop ? ty.value : index * 8;
    return {
      transform: [
        {translateX: tx.value},
        {translateY},
        {rotate: `${rot}deg`},
        {scale},
      ],
    };
  });

  const keepOverlay = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, tx.value / SWIPE_THRESHOLD)),
  }));
  const deleteOverlay = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -tx.value / SWIPE_THRESHOLD)),
  }));

  const tint =
    status === 'pending' || status === 'unknown'
      ? statusColor.unknown
      : statusColor[status];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        pointerEvents={isTop ? 'auto' : 'none'}
        style={[styles.card, {borderColor: tint, zIndex: 100 - index}, animated]}>
        <Image source={{uri: photo.uri}} style={styles.image} resizeMode="cover" />
        <Animated.View
          style={[styles.overlay, styles.keep, keepOverlay]}
          pointerEvents="none">
          <Text style={styles.overlayText}>KEEP</Text>
        </Animated.View>
        <Animated.View
          style={[styles.overlay, styles.delete, deleteOverlay]}
          pointerEvents="none">
          <Text style={styles.overlayText}>DELETE</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.statusRow}>
            <StatusBadge status={status} size={14} />
            <Text style={[styles.statusLabel, {color: tint}]}>
              {status === 'pending'
                ? 'Analyzing…'
                : status === 'unknown'
                ? 'Awaiting analysis'
                : status.toUpperCase()}
            </Text>
            {!ready && <ActivityIndicator color={colors.text} />}
          </View>
          <Text numberOfLines={3} style={styles.reason}>
            {photo.analysis?.reason ??
              (ready ? '' : 'Waiting for AI before you can decide.')}
          </Text>
          {ready && (
            <Text style={styles.hint}>
              Swipe right to keep · swipe left to delete
            </Text>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    bottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
  },
  image: {width: '100%', height: '70%'},
  footer: {flex: 1, padding: 16, gap: 8, justifyContent: 'space-between'},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  statusLabel: {fontWeight: '700', letterSpacing: 1},
  reason: {color: colors.text, fontSize: 15, lineHeight: 20},
  hint: {color: colors.textMuted, fontSize: 12},
  overlay: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 3,
  },
  keep: {
    right: 24,
    borderColor: colors.green,
    transform: [{rotate: '15deg'}],
  },
  delete: {
    left: 24,
    borderColor: colors.red,
    transform: [{rotate: '-15deg'}],
  },
  overlayText: {
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 24,
  },
});
