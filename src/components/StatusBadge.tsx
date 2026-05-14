import { StyleSheet, Text, View } from "react-native";
import type { AnalysisRecord, UserDecision } from "../../shared/analysis";
import {
  decisionToStatus,
  statusColors,
  statusCopy
} from "../../shared/analysis";
import { colors, radius, spacing } from "../styles/theme";

type StatusBadgeProps = {
  decision?: UserDecision;
  record?: AnalysisRecord;
  compact?: boolean;
};

export function StatusBadge({ compact, decision, record }: StatusBadgeProps) {
  if (decision) {
    const status = decisionToStatus(decision);
    return (
      <View
        style={[
          styles.badge,
          compact && styles.compact,
          { backgroundColor: statusColors[status] }
        ]}
      >
        <Text style={styles.darkText}>
          {decision === "keep" ? "Kept" : "Delete"}
        </Text>
      </View>
    );
  }

  if (record?.stage === "analyzed") {
    const status = record.analysis.status;
    return (
      <View
        style={[
          styles.badge,
          compact && styles.compact,
          { backgroundColor: statusColors[status] }
        ]}
      >
        <Text style={styles.darkText}>{statusCopy[status]}</Text>
      </View>
    );
  }

  const label =
    record?.stage === "analyzing"
      ? "Analyzing"
      : record?.stage === "queued"
        ? "Queued"
        : "Pending";

  return (
    <View style={[styles.badge, styles.pending, compact && styles.compact]}>
      <Text style={styles.lightText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  compact: {
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  darkText: {
    color: "#07110B",
    fontSize: 11,
    fontWeight: "800"
  },
  lightText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  pending: {
    backgroundColor: "rgba(12, 13, 16, 0.72)",
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: 1
  }
});
