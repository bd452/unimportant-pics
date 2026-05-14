import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import type { Asset } from "expo-media-library";
import type { AnalysisRecord, UserDecision } from "../../shared/analysis";
import { colors, radius, spacing } from "../styles/theme";
import { StatusBadge } from "./StatusBadge";

type DeleteConfirmationProps = {
  assets: Asset[];
  decisions: Record<string, UserDecision>;
  records: Record<string, AnalysisRecord>;
  onDeleted: (ids: string[]) => void;
  onRescue: (id: string) => void;
};

export function DeleteConfirmation({
  assets,
  decisions,
  onDeleted,
  onRescue,
  records
}: DeleteConfirmationProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAssets = useMemo(
    () => assets.filter((asset) => decisions[asset.id] === "delete"),
    [assets, decisions]
  );

  const confirmDelete = async () => {
    if (deleteAssets.length === 0 || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const ids = deleteAssets.map((asset) => asset.id);
      const didDelete = await MediaLibrary.deleteAssetsAsync(ids);

      if (didDelete) {
        onDeleted(ids);
      }
    } catch (caught) {
      Alert.alert(
        "Could not delete photos",
        caught instanceof Error
          ? caught.message
          : "iOS did not complete the deletion request."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<Asset>) => {
    const record = records[item.id];

    return (
      <View style={styles.row}>
        <Image source={{ uri: item.uri }} style={styles.thumbnail} />
        <View style={styles.rowBody}>
          <StatusBadge decision={decisions[item.id]} record={record} />
          <Text style={styles.reason} numberOfLines={2}>
            {record?.stage === "analyzed"
              ? record.analysis.reason
              : "Marked for deletion by you."}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.rescueButton}
          onPress={() => onRescue(item.id)}
        >
          <Text style={styles.rescueText}>Keep</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Final delete review</Text>
      <Text style={styles.subtitle}>
        Nothing is removed until you confirm here and then approve the native iOS
        photo deletion prompt.
      </Text>

      {deleteAssets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No photos marked for deletion.</Text>
          <Text style={styles.emptyBody}>
            Swipe left or mark red candidates from the grid to build this list.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={deleteAssets}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
          <TouchableOpacity
            accessibilityRole="button"
            disabled={isDeleting}
            style={[styles.deleteButton, isDeleting && styles.disabled]}
            onPress={confirmDelete}
          >
            <Text style={styles.deleteText}>
              {isDeleting
                ? "Requesting iOS confirmation..."
                : `Confirm ${deleteAssets.length} deletion${
                    deleteAssets.length === 1 ? "" : "s"
                  }`}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.destructive,
    borderRadius: radius.lg,
    marginVertical: spacing.lg,
    paddingVertical: spacing.lg
  },
  deleteText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
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
    fontSize: 22,
    fontWeight: "800"
  },
  list: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.md
  },
  reason: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  rescueButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  rescueText: {
    color: colors.text,
    fontWeight: "800"
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  rowBody: {
    flex: 1
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  thumbnail: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    height: 72,
    width: 72
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800"
  }
});
