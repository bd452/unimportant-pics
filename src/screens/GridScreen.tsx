import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Asset } from "expo-media-library";
import { PhotoGrid } from "../components/PhotoGrid";
import { analysisScheduler } from "../scheduler/analysisScheduler";
import { selectReady, usePhotoStore } from "../state/photoStore";
import { colors, spacing } from "../styles/theme";
import type { RootStackParamList } from "../navigation/types";

const VISIBLE_BUFFER = 4;
const INITIAL_PREFETCH = 12;

type Nav = NativeStackNavigationProp<RootStackParamList, "Grid">;

type GridScreenProps = {
  isLoading: boolean;
  hasNextPage: boolean;
  error: string | null;
  onLoadMore: () => void;
};

export function GridScreen({
  error,
  hasNextPage,
  isLoading,
  onLoadMore
}: GridScreenProps) {
  const navigation = useNavigation<Nav>();
  const order = usePhotoStore((state) => state.order);
  const assets = usePhotoStore((state) => state.assets);
  const records = usePhotoStore((state) => state.records);
  const decisions = usePhotoStore((state) => state.decisions);
  const bulkSetDecision = usePhotoStore((state) => state.bulkSetDecision);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  const orderedAssets = useMemo<Asset[]>(
    () =>
      order.map((id) => assets[id]).filter((asset): asset is Asset => Boolean(asset)),
    [assets, order]
  );

  useEffect(() => {
    if (orderedAssets.length === 0) return;
    analysisScheduler.setActiveWindow(
      orderedAssets.slice(0, INITIAL_PREFETCH),
      "visible"
    );
  }, [orderedAssets]);

  const visibleAssets = useMemo(
    () => orderedAssets.slice(visibleRange.start, visibleRange.end + 1),
    [orderedAssets, visibleRange]
  );

  const visibleReady = useMemo(
    () =>
      selectReady(
        records,
        decisions,
        visibleAssets.map((asset) => asset.id)
      ),
    [decisions, records, visibleAssets]
  );

  const handleScheduleWindow = useCallback(
    (startIndex: number, endIndex: number) => {
      setVisibleRange({ start: startIndex, end: endIndex });
      const start = Math.max(0, startIndex - VISIBLE_BUFFER);
      const end = Math.min(orderedAssets.length, endIndex + VISIBLE_BUFFER + 1);
      analysisScheduler.setActiveWindow(
        orderedAssets.slice(start, end),
        "visible"
      );
    },
    [orderedAssets]
  );

  const handleLoadMore = useCallback(() => {
    if (!visibleReady) return;
    if (!hasNextPage) return;
    onLoadMore();
  }, [hasNextPage, onLoadMore, visibleReady]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const markSelection = useCallback(
    (decision: "keep" | "delete") => {
      if (selectedIds.length === 0) return;
      bulkSetDecision(selectedIds, decision);
      setSelectedIds([]);
    },
    [bulkSetDecision, selectedIds]
  );

  const reviewSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    navigation.navigate("Swipe", { queueIds: selectedIds });
  }, [navigation, selectedIds]);

  const openPhoto = useCallback(
    (asset: Asset) => {
      navigation.navigate("PhotoDetail", { photoId: asset.id });
    },
    [navigation]
  );

  useEffect(() => {
    if (error) {
      Alert.alert("Photo library", error);
    }
  }, [error]);

  const deleteCount = useMemo(
    () => Object.values(decisions).filter((value) => value === "delete").length,
    [decisions]
  );

  return (
    <View style={styles.container}>
      <PhotoGrid
        assets={orderedAssets}
        decisions={decisions}
        hasNextPage={hasNextPage}
        isLoading={isLoading}
        records={records}
        selectedIds={selectedIds}
        windowReady={visibleReady}
        onClearSelection={clearSelection}
        onLoadMore={handleLoadMore}
        onMarkSelection={markSelection}
        onOpenPhoto={openPhoto}
        onReviewSelection={reviewSelection}
        onScheduleWindow={handleScheduleWindow}
        onToggleSelection={toggleSelection}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {deleteCount > 0
            ? `${deleteCount} marked for deletion`
            : "Mark photos with swipe or grid review"}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={deleteCount === 0}
          style={[styles.footerButton, deleteCount === 0 && styles.disabled]}
          onPress={() => navigation.navigate("ConfirmDelete")}
        >
          <Text style={styles.footerButtonText}>Review delete list</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  disabled: {
    opacity: 0.4
  },
  footer: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  footerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  footerButtonText: {
    color: colors.text,
    fontWeight: "800"
  },
  footerText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13
  }
});
