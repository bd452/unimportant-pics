import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { Asset } from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { DeleteConfirmation } from "./src/components/DeleteConfirmation";
import { PermissionGate } from "./src/components/PermissionGate";
import { PhotoDetailModal } from "./src/components/PhotoDetailModal";
import { PhotoGrid } from "./src/components/PhotoGrid";
import { SwipeReview } from "./src/components/SwipeReview";
import { useAnalysisController } from "./src/hooks/useAnalysisController";
import { usePhotoLibrary } from "./src/hooks/usePhotoLibrary";
import { colors, radius, spacing } from "./src/styles/theme";
import type { UserDecision } from "./shared/analysis";

type AppMode = "grid" | "swipe" | "delete";

export default function App() {
  const [mode, setMode] = useState<AppMode>("grid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewScopeIds, setReviewScopeIds] = useState<string[]>([]);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const library = usePhotoLibrary();
  const analysis = useAnalysisController();

  useEffect(() => {
    if (library.assets.length > 0) {
      analysis.schedulePhotos(library.assets.slice(0, 12), "visible");
    }
  }, [analysis.schedulePhotos, library.assets]);

  const reviewScopeSet = useMemo(
    () => new Set(reviewScopeIds),
    [reviewScopeIds]
  );

  const swipeAssets = useMemo(() => {
    if (reviewScopeIds.length === 0) {
      return library.assets;
    }

    return library.assets.filter((asset) => reviewScopeSet.has(asset.id));
  }, [library.assets, reviewScopeIds.length, reviewScopeSet]);

  const stats = useMemo(() => {
    const analyzed = Object.values(analysis.records).filter(
      (record) => record.stage === "analyzed"
    );
    const deleteCount = Object.values(analysis.decisions).filter(
      (decision) => decision === "delete"
    ).length;

    return {
      analyzed: analyzed.length,
      deleteCount,
      red: analyzed.filter((record) => record.analysis.status === "red").length,
      yellow: analyzed.filter((record) => record.analysis.status === "yellow")
        .length,
      green: analyzed.filter((record) => record.analysis.status === "green")
        .length
    };
  }, [analysis.decisions, analysis.records]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }, []);

  const markSelection = useCallback(
    (decision: UserDecision) => {
      for (const id of selectedIds) {
        analysis.markDecision(id, decision);
      }
      setSelectedIds([]);
    },
    [analysis.markDecision, selectedIds]
  );

  const openSelectedSwipeReview = useCallback(() => {
    setReviewScopeIds(selectedIds);
    setMode("swipe");
  }, [selectedIds]);

  const scheduleGridWindow = useCallback(
    (startIndex: number, endIndex: number) => {
      const start = Math.max(0, startIndex - 3);
      const end = Math.min(library.assets.length, endIndex + 4);
      analysis.schedulePhotos(library.assets.slice(start, end), "visible");
    },
    [analysis.schedulePhotos, library.assets]
  );

  const scheduleSwipeLookahead = useCallback(
    (assets: Asset[]) => {
      analysis.schedulePhotos(assets, "lookahead");
    },
    [analysis.schedulePhotos]
  );

  const handleDeleted = useCallback(
    (ids: string[]) => {
      library.removeAssets(ids);
      analysis.removeRecords(ids);
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setReviewScopeIds((current) => current.filter((id) => !ids.includes(id)));
    },
    [analysis.removeRecords, library.removeAssets]
  );

  const handleDecisionFromDetail = useCallback(
    (id: string, decision: UserDecision) => {
      analysis.markDecision(id, decision);
      setDetailAsset(null);
    },
    [analysis.markDecision]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setReviewScopeIds([]);
  }, []);

  if (!library.permission?.granted) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <PermissionGate
          permission={library.permission}
          onRequestAccess={library.requestAccess}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>unimportant-pics</Text>
            <Text style={styles.headerSubcopy}>
              {stats.analyzed}/{library.assets.length} analyzed ·{" "}
              {stats.deleteCount} marked for deletion
            </Text>
          </View>
          {library.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        <View style={styles.stats}>
          <Text style={styles.statGreen}>{stats.green} keep</Text>
          <Text style={styles.statYellow}>{stats.yellow} review</Text>
          <Text style={styles.statRed}>{stats.red} delete?</Text>
        </View>

        <View style={styles.tabs}>
          {(["grid", "swipe", "delete"] as AppMode[]).map((tab) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={tab}
              style={[styles.tab, mode === tab && styles.activeTab]}
              onPress={() => {
                if (tab !== "swipe") {
                  setReviewScopeIds([]);
                }
                setMode(tab);
              }}
            >
              <Text
                style={[styles.tabText, mode === tab && styles.activeTabText]}
              >
                {tab === "grid"
                  ? "Grid"
                  : tab === "swipe"
                    ? "Swipe"
                    : "Delete"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {library.error ? <Text style={styles.error}>{library.error}</Text> : null}

        {library.assets.length === 0 && !library.isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No photos found.</Text>
            <Text style={styles.emptyBody}>
              Grant access to at least one photo to start a review session.
            </Text>
          </View>
        ) : mode === "grid" ? (
          <PhotoGrid
            assets={library.assets}
            decisions={analysis.decisions}
            hasNextPage={library.hasNextPage}
            isLoading={library.isLoading}
            records={analysis.records}
            selectedIds={selectedIds}
            onClearSelection={clearSelection}
            onLoadMore={library.loadNextPage}
            onMarkSelection={markSelection}
            onOpenPhoto={setDetailAsset}
            onReviewSelection={openSelectedSwipeReview}
            onScheduleWindow={scheduleGridWindow}
            onToggleSelection={toggleSelection}
          />
        ) : mode === "swipe" ? (
          <SwipeReview
            assets={swipeAssets}
            decisions={analysis.decisions}
            records={analysis.records}
            onDecision={analysis.markDecision}
            onScheduleLookahead={scheduleSwipeLookahead}
          />
        ) : (
          <DeleteConfirmation
            assets={library.assets}
            decisions={analysis.decisions}
            records={analysis.records}
            onDeleted={handleDeleted}
            onRescue={(id) => analysis.markDecision(id, "keep")}
          />
        )}

        <PhotoDetailModal
          asset={detailAsset}
          decision={detailAsset ? analysis.decisions[detailAsset.id] : undefined}
          record={detailAsset ? analysis.records[detailAsset.id] : undefined}
          onClose={() => setDetailAsset(null)}
          onDecision={handleDecisionFromDetail}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    backgroundColor: colors.primary
  },
  activeTabText: {
    color: colors.text
  },
  appName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "800"
  },
  error: {
    color: colors.destructive,
    fontSize: 13,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  headerSubcopy: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  statGreen: {
    color: colors.success,
    fontWeight: "800"
  },
  statRed: {
    color: colors.destructive,
    fontWeight: "800"
  },
  stats: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  statYellow: {
    color: colors.warning,
    fontWeight: "800"
  },
  tab: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: spacing.sm
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg
  },
  tabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "900"
  }
});
