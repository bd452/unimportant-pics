import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {usePhotoStore} from '../state/photoStore';
import {analysisScheduler} from '../scheduler/analysisScheduler';
import {useSchedulerTick} from '../scheduler/hooks';
import {SwipeCard} from '../components/SwipeCard';
import {colors} from '../theme/colors';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Swipe'>;

const LOOKAHEAD = 3;

export function SwipeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Swipe'>>();
  const photos = usePhotoStore((s) => s.photos);
  const setUserDecision = usePhotoStore((s) => s.setUserDecision);
  const queue = route.params.queue;

  const [cursor, setCursor] = useState(0);
  useSchedulerTick();

  /**
   * Whenever the active card changes, push the active card and the lookahead
   * window into the scheduler at the highest priority. The active id gets the
   * top slot so it lands in the very next batch.
   */
  useEffect(() => {
    const window = queue.slice(cursor, cursor + 1 + LOOKAHEAD);
    if (window.length === 0) return;
    analysisScheduler.setViewport(window, 10_000);
  }, [cursor, queue]);

  const decide = useCallback(
    (id: string, decision: 'keep' | 'delete') => {
      setUserDecision(id, decision);
      setCursor((c) => c + 1);
    },
    [setUserDecision],
  );

  const top = photos[queue[cursor]];
  const upcoming = useMemo(
    () =>
      queue
        .slice(cursor, cursor + 1 + LOOKAHEAD)
        .map((id) => photos[id])
        .filter(Boolean),
    [photos, queue, cursor],
  );

  if (!top) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Reviewed all photos in this queue.</Text>
        <Pressable
          style={styles.cta}
          onPress={() => navigation.navigate('Confirm')}>
          <Text style={styles.ctaText}>Review delete list</Text>
        </Pressable>
        <Pressable
          style={[styles.cta, styles.ctaSecondary]}
          onPress={() => navigation.goBack()}>
          <Text style={[styles.ctaText, styles.ctaSecondaryText]}>
            Back to grid
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          {cursor + 1} / {queue.length}
        </Text>
        <Pressable onPress={() => navigation.navigate('Confirm')}>
          <Text style={styles.progressLink}>Review delete list →</Text>
        </Pressable>
      </View>

      <View style={styles.stack}>
        {upcoming
          .slice()
          .reverse()
          .map((p, revIdx) => {
            const idx = upcoming.length - 1 - revIdx;
            return (
              <SwipeCard
                key={p.id}
                photo={p}
                index={idx}
                isTop={idx === 0}
                onSwipe={(decision) => decide(p.id, decision)}
              />
            );
          })}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.button, {backgroundColor: colors.red}]}
          onPress={() => decide(top.id, 'delete')}>
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
        <Pressable
          style={[styles.button, {backgroundColor: colors.green}]}
          onPress={() => decide(top.id, 'keep')}>
          <Text style={styles.buttonText}>Keep</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressText: {color: colors.textMuted, fontVariant: ['tabular-nums']},
  progressLink: {color: colors.primary, fontWeight: '600'},
  stack: {flex: 1},
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {color: '#0E0F12', fontWeight: '700', fontSize: 16},
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.background,
  },
  emptyText: {color: colors.text, fontSize: 16, textAlign: 'center'},
  cta: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  ctaText: {color: '#0E0F12', fontWeight: '700'},
  ctaSecondary: {backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border},
  ctaSecondaryText: {color: colors.text},
});
