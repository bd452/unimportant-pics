import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import type { Asset } from "expo-media-library";
import type { AnalysisRecord, UserDecision } from "../../shared/analysis";
import { decisionToStatus, statusColors } from "../../shared/analysis";
import { StatusBadge } from "./StatusBadge";

type PhotoTileProps = {
  asset: Asset;
  decision?: UserDecision;
  isSelected: boolean;
  record?: AnalysisRecord;
  size: number;
  onLongPress: (asset: Asset) => void;
  onPress: (asset: Asset) => void;
};

export function PhotoTile({
  asset,
  decision,
  isSelected,
  onLongPress,
  onPress,
  record,
  size
}: PhotoTileProps) {
  const status =
    decision !== undefined
      ? decisionToStatus(decision)
      : record?.stage === "analyzed"
        ? record.analysis.status
        : undefined;

  return (
    <TouchableOpacity
      accessibilityRole="imagebutton"
      activeOpacity={0.82}
      onLongPress={() => onLongPress(asset)}
      onPress={() => onPress(asset)}
      style={[
        styles.tile,
        {
          height: size,
          width: size
        },
        status && {
          borderColor: statusColors[status]
        },
        isSelected && styles.selected
      ]}
    >
      <Image source={{ uri: asset.uri }} style={styles.image} />
      <View style={styles.badge}>
        <StatusBadge compact decision={decision} record={record} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    bottom: 6,
    left: 6,
    position: "absolute"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  selected: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
    transform: [{ scale: 0.97 }]
  },
  tile: {
    backgroundColor: "#1C1F28",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    borderWidth: 2,
    margin: 2,
    overflow: "hidden"
  }
});
