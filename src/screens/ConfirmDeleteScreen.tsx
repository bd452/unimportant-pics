import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Asset } from "expo-media-library";
import { DeleteConfirmation } from "../components/DeleteConfirmation";
import { usePhotoStore } from "../state/photoStore";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "ConfirmDelete">;

export function ConfirmDeleteScreen() {
  const navigation = useNavigation<Nav>();
  const order = usePhotoStore((state) => state.order);
  const assets = usePhotoStore((state) => state.assets);
  const records = usePhotoStore((state) => state.records);
  const decisions = usePhotoStore((state) => state.decisions);
  const removeAssets = usePhotoStore((state) => state.removeAssets);
  const setDecision = usePhotoStore((state) => state.setDecision);

  const orderedAssets = order
    .map((id) => assets[id])
    .filter((asset): asset is Asset => Boolean(asset));

  const handleDeleted = useCallback(
    (ids: string[]) => {
      removeAssets(ids);
      navigation.goBack();
    },
    [navigation, removeAssets]
  );

  const handleRescue = useCallback(
    (id: string) => {
      setDecision(id, "keep");
    },
    [setDecision]
  );

  return (
    <DeleteConfirmation
      assets={orderedAssets}
      decisions={decisions}
      records={records}
      onDeleted={handleDeleted}
      onRescue={handleRescue}
    />
  );
}
