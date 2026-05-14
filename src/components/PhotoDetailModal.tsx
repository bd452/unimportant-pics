import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { Asset } from "expo-media-library";
import type { AnalysisRecord, UserDecision } from "../../shared/analysis";
import { colors, radius, spacing } from "../styles/theme";
import { StatusBadge } from "./StatusBadge";

type PhotoDetailModalProps = {
  asset: Asset | null;
  decision?: UserDecision;
  record?: AnalysisRecord;
  onClose: () => void;
  onDecision: (id: string, decision: UserDecision) => void;
};

export function PhotoDetailModal({
  asset,
  decision,
  onClose,
  onDecision,
  record
}: PhotoDetailModalProps) {
  const reason =
    record?.stage === "analyzed"
      ? record.analysis.reason
      : "Analysis is pending. This photo will get a recommendation before you act on it.";

  return (
    <Modal animationType="slide" visible={asset !== null} onRequestClose={onClose}>
      <View style={styles.container}>
        {asset ? (
          <>
            <Image source={{ uri: asset.uri }} style={styles.image} />
            <View style={styles.content}>
              <StatusBadge decision={decision} record={record} />
              <Text style={styles.title}>{asset.filename}</Text>
              <Text style={styles.reason}>{reason}</Text>
              {record?.stage === "analyzed" ? (
                <Text style={styles.meta}>
                  Confidence {Math.round(record.analysis.confidence * 100)}% ·{" "}
                  {record.analysis.signals.join(", ") || "no signals"}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.actionButton, styles.keepButton]}
                  onPress={() => onDecision(asset.id, "keep")}
                >
                  <Text style={styles.actionText}>Mark keep</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => onDecision(asset.id, "delete")}
                >
                  <Text style={styles.actionText}>Mark delete</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: spacing.md
  },
  actionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl
  },
  closeButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: spacing.md
  },
  closeText: {
    color: colors.text,
    fontWeight: "700"
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginTop: -spacing.xl,
    padding: spacing.xl
  },
  deleteButton: {
    backgroundColor: colors.destructive
  },
  image: {
    backgroundColor: colors.surfaceRaised,
    flex: 1,
    width: "100%"
  },
  keepButton: {
    backgroundColor: colors.success
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.md
  },
  reason: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.md
  }
});
