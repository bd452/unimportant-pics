import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { Asset } from "expo-media-library";
import type { AnalysisRecord, UserDecision } from "../../shared/analysis";
import { colors, radius, spacing } from "../styles/theme";
import { StatusBadge } from "./StatusBadge";

type SwipeReviewProps = {
  assets: Asset[];
  decisions: Record<string, UserDecision>;
  records: Record<string, AnalysisRecord>;
  onDecision: (id: string, decision: UserDecision) => void;
  onScheduleLookahead: (assets: Asset[]) => void;
};

export function SwipeReview({
  assets,
  decisions,
  onDecision,
  onScheduleLookahead,
  records
}: SwipeReviewProps) {
  const [index, setIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const current = assets[index];
  const record = current ? records[current.id] : undefined;
  const decision = current ? decisions[current.id] : undefined;
  const canAct = Boolean(decision || record?.stage === "analyzed");

  useEffect(() => {
    if (index > assets.length) {
      setIndex(assets.length);
    }
  }, [assets.length, index]);

  useEffect(() => {
    if (!current) {
      return;
    }

    onScheduleLookahead(assets.slice(index, index + 6));
  }, [assets, current, index, onScheduleLookahead]);

  const moveToNext = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    setIndex((currentIndex) =>
      Math.min(currentIndex + 1, assets.length)
    );
  }, [assets.length, pan]);

  const commitDecision = useCallback(
    (nextDecision: UserDecision) => {
      if (!current || !canAct) {
        return;
      }

      onDecision(current.id, nextDecision);
      Animated.timing(pan, {
        duration: 180,
        toValue: { x: nextDecision === "keep" ? 420 : -420, y: 0 },
        useNativeDriver: false
      }).start(moveToNext);
    },
    [canAct, current, moveToNext, onDecision, pan]
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          canAct && Math.abs(gesture.dx) > 12,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false
        }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 110) {
            commitDecision("keep");
            return;
          }

          if (gesture.dx < -110) {
            commitDecision("delete");
            return;
          }

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false
          }).start();
        }
      }),
    [canAct, commitDecision, pan]
  );

  const rotate = pan.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ["-10deg", "0deg", "10deg"]
  });

  if (!current) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No photos to review.</Text>
        <Text style={styles.emptyBody}>
          Load your library or select photos from the grid to start swiping.
        </Text>
      </View>
    );
  }

  const reason =
    record?.stage === "analyzed"
      ? record.analysis.reason
      : "Analyzing this photo before swipe actions are enabled.";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Swipe review</Text>
        <Text style={styles.subtitle}>
          {index + 1} of {assets.length} · right keeps, left deletes
        </Text>
      </View>

      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate }
            ]
          }
        ]}
      >
        <Image source={{ uri: current.uri }} style={styles.image} />
        <View style={styles.cardBody}>
          <StatusBadge decision={decision} record={record} />
          <Text style={styles.reason}>{reason}</Text>
          {!canAct ? (
            <Text style={styles.pending}>
              Swipe is locked until the active card has an AI result.
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canAct}
          style={[
            styles.actionButton,
            styles.deleteButton,
            !canAct && styles.disabled
          ]}
          onPress={() => commitDecision("delete")}
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canAct}
          style={[
            styles.actionButton,
            styles.keepButton,
            !canAct && styles.disabled
          ]}
          onPress={() => commitDecision("keep")}
        >
          <Text style={styles.actionText}>Keep</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: radius.lg,
    flex: 1,
    paddingVertical: spacing.lg
  },
  actionText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: spacing.lg,
    overflow: "hidden"
  },
  cardBody: {
    padding: spacing.lg
  },
  container: {
    flex: 1
  },
  deleteButton: {
    backgroundColor: colors.destructive
  },
  disabled: {
    opacity: 0.42
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
    fontSize: 24,
    fontWeight: "800"
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  image: {
    backgroundColor: colors.surfaceRaised,
    flex: 1,
    width: "100%"
  },
  keepButton: {
    backgroundColor: colors.success
  },
  pending: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.sm
  },
  reason: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    marginTop: spacing.md
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
  }
});
