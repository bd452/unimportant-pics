import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken
} from "react-native";
import type { Asset } from "expo-media-library";
import type { AnalysisRecord, UserDecision } from "../../shared/analysis";
import { colors, radius, spacing } from "../styles/theme";
import { PhotoTile } from "./PhotoTile";

type PhotoGridProps = {
  assets: Asset[];
  decisions: Record<string, UserDecision>;
  hasNextPage: boolean;
  isLoading: boolean;
  records: Record<string, AnalysisRecord>;
  selectedIds: string[];
  onClearSelection: () => void;
  onLoadMore: () => void;
  onMarkSelection: (decision: UserDecision) => void;
  onOpenPhoto: (asset: Asset) => void;
  onReviewSelection: () => void;
  onScheduleWindow: (startIndex: number, endIndex: number) => void;
  onToggleSelection: (id: string) => void;
};

const columns = 3;
const screenWidth = Dimensions.get("window").width;
const tileSize = Math.floor((screenWidth - spacing.lg * 2 - 12) / columns);

function isReady(id: string, records: Record<string, AnalysisRecord>) {
  return records[id]?.stage === "analyzed";
}

export function PhotoGrid({
  assets,
  decisions,
  hasNextPage,
  isLoading,
  onClearSelection,
  onLoadMore,
  onMarkSelection,
  onOpenPhoto,
  onReviewSelection,
  onScheduleWindow,
  onToggleSelection,
  records,
  selectedIds
}: PhotoGridProps) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const currentWindowReady = useMemo(() => {
    const { start, end } = visibleRange;
    const visibleAssets = assets.slice(start, end + 1);
    return (
      visibleAssets.length === 0 ||
      visibleAssets.every((asset) => decisions[asset.id] || isReady(asset.id, records))
    );
  }, [assets, decisions, records, visibleRange]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Asset>[] }) => {
      const indexes = viewableItems
        .map((token) => token.index)
        .filter((index): index is number => index !== null);

      if (indexes.length === 0) {
        return;
      }

      const start = Math.min(...indexes);
      const end = Math.max(...indexes);
      setVisibleRange({ start, end });
      onScheduleWindow(start, end);
    },
    [onScheduleWindow]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Asset>) => (
      <PhotoTile
        asset={item}
        decision={decisions[item.id]}
        isSelected={selectedIds.includes(item.id)}
        record={records[item.id]}
        size={tileSize}
        onLongPress={(asset) => onToggleSelection(asset.id)}
        onPress={(asset) =>
          selectedIds.length > 0 ? onToggleSelection(asset.id) : onOpenPhoto(asset)
        }
      />
    ),
    [decisions, onOpenPhoto, onToggleSelection, records, selectedIds]
  );

  const footer = (
    <View style={styles.footer}>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {!currentWindowReady ? (
        <Text style={styles.footerText}>
          Finish analyzing the visible photos before loading deeper into the
          library.
        </Text>
      ) : null}
      {hasNextPage && currentWindowReady && !isLoading ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.loadMoreButton}
          onPress={onLoadMore}
        >
          <Text style={styles.loadMoreText}>Reveal next batch</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.title}>Library map</Text>
          <Text style={styles.subtitle}>
            {assets.length} loaded · {selectedIds.length} selected
          </Text>
        </View>
        {selectedIds.length > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.clearButton}
            onPress={onClearSelection}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {selectedIds.length > 0 ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.actionButton, styles.keepButton]}
            onPress={() => onMarkSelection("keep")}
          >
            <Text style={styles.actionText}>Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onMarkSelection("delete")}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.actionButton, styles.reviewButton]}
            onPress={onReviewSelection}
          >
            <Text style={styles.actionText}>Swipe review</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={assets}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        renderItem={renderItem}
        ListFooterComponent={footer}
        onEndReached={() => {
          if (currentWindowReady) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.35}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 45 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: spacing.sm
  },
  actionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  clearButton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  clearText: {
    color: colors.text,
    fontWeight: "700"
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg
  },
  deleteButton: {
    backgroundColor: colors.destructive
  },
  footer: {
    alignItems: "center",
    minHeight: 120,
    paddingVertical: spacing.xl
  },
  footerText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: spacing.xl,
    textAlign: "center"
  },
  keepButton: {
    backgroundColor: colors.success
  },
  loadMoreButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  loadMoreText: {
    color: colors.text,
    fontWeight: "800"
  },
  reviewButton: {
    backgroundColor: colors.primary
  },
  selectionBar: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800"
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md
  }
});
