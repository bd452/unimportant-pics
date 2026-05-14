import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {usePhotoStore} from '../state/photoStore';
import {analysisScheduler} from '../scheduler/analysisScheduler';
import {useSchedulerTick} from '../scheduler/hooks';
import {effectiveStatus, type PhotoRecord} from '../types/photo';
import {PhotoTile} from '../components/PhotoTile';
import {colors} from '../theme/colors';
import {loadPhotosPage} from '../services/photoLibrary';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Grid'>;

type Filter = 'all' | 'red' | 'yellow' | 'unreviewed';
const PAGE_SIZE = 60;
const VIEWPORT_LOOKAHEAD = 12;
const COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_SIZE = Math.floor((SCREEN_WIDTH - 8) / COLUMNS);

export function GridScreen() {
  const navigation = useNavigation<Nav>();
  const ingestPhotos = usePhotoStore((s) => s.ingestPhotos);
  const order = usePhotoStore((s) => s.order);
  const photos = usePhotoStore((s) => s.photos);

  const [filter, setFilter] = useState<Filter>('all');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const visibleIdsRef = useRef<string[]>([]);

  useSchedulerTick();

  const loadNextPage = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPhotosPage({first: PAGE_SIZE, after: cursor});
      ingestPhotos(
        page.photos.map((p) => ({
          id: p.id,
          uri: p.uri,
          width: p.width,
          height: p.height,
          createdAt: p.createdAt,
        })),
      );
      setCursor(page.endCursor);
      setHasMore(page.hasNextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cursor, ingestPhotos]);

  useEffect(() => {
    if (order.length === 0) loadNextPage();
  }, [order.length, loadNextPage]);

  const filtered = useMemo<PhotoRecord[]>(() => {
    const list = order
      .map((id) => photos[id])
      .filter((p): p is PhotoRecord => !!p);
    if (filter === 'all') return list;
    return list.filter((p) => {
      const s = effectiveStatus(p);
      if (filter === 'red') return s === 'red';
      if (filter === 'yellow') return s === 'yellow';
      if (filter === 'unreviewed')
        return s === 'pending' || s === 'unknown' || p.userDecision === null;
      return true;
    });
  }, [order, photos, filter]);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      const ids = viewableItems
        .map((v) => (v.item as PhotoRecord | undefined)?.id)
        .filter((x): x is string => !!x);
      visibleIdsRef.current = ids;
      const window = computeAnalysisWindow(order, ids, VIEWPORT_LOOKAHEAD);
      analysisScheduler.setViewport(window, 1000);
    },
  ).current;

  /**
   * Only allow loading more pages once the photos currently on-screen have
   * settled. This matches the spec: the user should not outrun the AI.
   */
  const canLoadMore = useMemo(() => {
    const visible = visibleIdsRef.current;
    if (visible.length === 0) return true;
    return analysisScheduler.allReady(visible);
  }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps

  const onEndReached = useCallback(() => {
    if (canLoadMore) loadNextPage();
  }, [canLoadMore, loadNextPage]);

  const toggleSelect = useCallback((id: string) => {
    setSelection((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<PhotoRecord>) => (
      <PhotoTile
        photo={item}
        size={TILE_SIZE - 2}
        selected={selection.has(item.id)}
        onPress={() => {
          if (selection.size > 0) {
            toggleSelect(item.id);
          } else {
            navigation.navigate('PhotoDetail', {photoId: item.id});
          }
        }}
        onLongPress={() => toggleSelect(item.id)}
      />
    ),
    [selection, toggleSelect, navigation],
  );

  const startSwipeReview = useCallback(() => {
    const ids = selection.size > 0 ? Array.from(selection) : filtered.map((p) => p.id);
    if (ids.length === 0) return;
    navigation.navigate('Swipe', {queue: ids});
  }, [selection, filtered, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {(['all', 'red', 'yellow', 'unreviewed'] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip,
              filter === f && styles.filterChipActive,
            ]}>
            <Text style={styles.filterText}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        estimatedItemSize={TILE_SIZE}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{itemVisiblePercentThreshold: 50}}
        onEndReachedThreshold={0.6}
        onEndReached={onEndReached}
      />

      <View style={styles.actionBar}>
        <Text style={styles.actionText}>
          {selection.size > 0
            ? `${selection.size} selected`
            : `${filtered.length} photos · ${filter}`}
        </Text>
        <Pressable
          style={[
            styles.actionButton,
            filtered.length === 0 && styles.actionButtonDisabled,
          ]}
          onPress={startSwipeReview}
          disabled={filtered.length === 0}>
          <Text style={styles.actionButtonText}>Review →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function computeAnalysisWindow(
  order: string[],
  visible: string[],
  buffer: number,
): string[] {
  if (visible.length === 0) return [];
  const indices = visible.map((id) => order.indexOf(id)).filter((i) => i >= 0);
  if (indices.length === 0) return visible;
  const lo = Math.max(0, Math.min(...indices) - buffer);
  const hi = Math.min(order.length - 1, Math.max(...indices) + buffer);
  return order.slice(lo, hi + 1);
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  filterBar: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: colors.background,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  filterText: {color: colors.text, fontSize: 12, textTransform: 'capitalize'},
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionText: {color: colors.textMuted},
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  actionButtonDisabled: {opacity: 0.4},
  actionButtonText: {color: '#0E0F12', fontWeight: '600'},
});
