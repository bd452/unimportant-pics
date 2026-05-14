import { useCallback } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PhotoDetailModal } from "../components/PhotoDetailModal";
import { usePhotoStore } from "../state/photoStore";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "PhotoDetail">;
type Route = RouteProp<RootStackParamList, "PhotoDetail">;

export function PhotoDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { photoId } = route.params;

  const asset = usePhotoStore((state) => state.assets[photoId]);
  const record = usePhotoStore((state) => state.records[photoId]);
  const decision = usePhotoStore((state) => state.decisions[photoId]);
  const setDecision = usePhotoStore((state) => state.setDecision);

  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDecision = useCallback(
    (id: string, next: "keep" | "delete") => {
      setDecision(id, next);
      close();
    },
    [close, setDecision]
  );

  return (
    <PhotoDetailModal
      asset={asset ?? null}
      decision={decision}
      record={record}
      onClose={close}
      onDecision={handleDecision}
    />
  );
}
