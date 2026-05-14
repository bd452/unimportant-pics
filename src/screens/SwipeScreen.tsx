import { useCallback, useEffect, useMemo } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Asset } from "expo-media-library";
import { SwipeReview } from "../components/SwipeReview";
import { analysisScheduler } from "../scheduler/analysisScheduler";
import { usePhotoStore } from "../state/photoStore";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Swipe">;
type Route = RouteProp<RootStackParamList, "Swipe">;

const LOOKAHEAD = 4;

export function SwipeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const order = usePhotoStore((state) => state.order);
  const assets = usePhotoStore((state) => state.assets);
  const records = usePhotoStore((state) => state.records);
  const decisions = usePhotoStore((state) => state.decisions);
  const setDecision = usePhotoStore((state) => state.setDecision);

  const queueAssets = useMemo<Asset[]>(() => {
    const queueIds = route.params?.queueIds;
    const ids = queueIds && queueIds.length > 0 ? queueIds : order;
    return ids
      .map((id) => assets[id])
      .filter((asset): asset is Asset => Boolean(asset));
  }, [assets, order, route.params?.queueIds]);

  const scheduleLookahead = useCallback((slice: Asset[]) => {
    if (slice.length === 0) return;
    const [active, ...rest] = slice;
    if (active) {
      analysisScheduler.schedule([active], "active");
    }
    if (rest.length > 0) {
      analysisScheduler.schedule(rest, "lookahead");
    }
  }, []);

  useEffect(() => {
    scheduleLookahead(queueAssets.slice(0, LOOKAHEAD));
  }, [queueAssets, scheduleLookahead]);

  const handleDecision = useCallback(
    (id: string, decision: "keep" | "delete") => {
      setDecision(id, decision);
    },
    [setDecision]
  );

  const handleScheduleLookahead = useCallback(
    (slice: Asset[]) => {
      scheduleLookahead(slice);
    },
    [scheduleLookahead]
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => undefined
    });
  }, [navigation]);

  return (
    <SwipeReview
      assets={queueAssets}
      decisions={decisions}
      records={records}
      onDecision={handleDecision}
      onScheduleLookahead={handleScheduleLookahead}
    />
  );
}
