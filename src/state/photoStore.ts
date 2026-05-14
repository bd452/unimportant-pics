import { create } from "zustand";
import type { Asset } from "expo-media-library";
import type {
  AnalysisRecord,
  PhotoAnalysis,
  UserDecision
} from "../../shared/analysis";

interface PhotoStoreState {
  order: string[];
  assets: Record<string, Asset>;
  records: Record<string, AnalysisRecord>;
  decisions: Record<string, UserDecision>;
  attempts: Record<string, number>;
  ingestAssets: (assets: Asset[]) => void;
  removeAssets: (ids: string[]) => void;
  setQueued: (ids: string[]) => void;
  setAnalyzing: (ids: string[]) => void;
  setAnalyzed: (results: PhotoAnalysis[]) => void;
  setError: (id: string, error: string) => void;
  incrementAttempt: (id: string) => number;
  setDecision: (id: string, decision: UserDecision) => void;
  clearDecision: (id: string) => void;
  bulkSetDecision: (ids: string[], decision: UserDecision) => void;
}

export const usePhotoStore = create<PhotoStoreState>((set, get) => ({
  order: [],
  assets: {},
  records: {},
  decisions: {},
  attempts: {},

  ingestAssets: (incoming) =>
    set((state) => {
      if (incoming.length === 0) return state;
      const order = state.order.slice();
      const assets = { ...state.assets };
      let changed = false;
      for (const asset of incoming) {
        if (assets[asset.id]) continue;
        assets[asset.id] = asset;
        order.push(asset.id);
        changed = true;
      }
      return changed ? { ...state, order, assets } : state;
    }),

  removeAssets: (ids) =>
    set((state) => {
      const remove = new Set(ids);
      const order = state.order.filter((id) => !remove.has(id));
      const assets = { ...state.assets };
      const records = { ...state.records };
      const decisions = { ...state.decisions };
      const attempts = { ...state.attempts };
      for (const id of ids) {
        delete assets[id];
        delete records[id];
        delete decisions[id];
        delete attempts[id];
      }
      return { ...state, order, assets, records, decisions, attempts };
    }),

  setQueued: (ids) =>
    set((state) => {
      const records = { ...state.records };
      let changed = false;
      for (const id of ids) {
        const current = records[id];
        if (current?.stage === "analyzed" || current?.stage === "analyzing") {
          continue;
        }
        records[id] = { stage: "queued" };
        changed = true;
      }
      return changed ? { ...state, records } : state;
    }),

  setAnalyzing: (ids) =>
    set((state) => {
      if (ids.length === 0) return state;
      const records = { ...state.records };
      for (const id of ids) {
        records[id] = { stage: "analyzing" };
      }
      return { ...state, records };
    }),

  setAnalyzed: (results) =>
    set((state) => {
      if (results.length === 0) return state;
      const records = { ...state.records };
      for (const analysis of results) {
        records[analysis.id] = { stage: "analyzed", analysis };
      }
      return { ...state, records };
    }),

  setError: (id, error) =>
    set((state) => ({
      ...state,
      records: {
        ...state.records,
        [id]: { stage: "queued", error }
      }
    })),

  incrementAttempt: (id) => {
    const next = (get().attempts[id] ?? 0) + 1;
    set((state) => ({
      ...state,
      attempts: { ...state.attempts, [id]: next }
    }));
    return next;
  },

  setDecision: (id, decision) =>
    set((state) => ({
      ...state,
      decisions: { ...state.decisions, [id]: decision }
    })),

  clearDecision: (id) =>
    set((state) => {
      if (state.decisions[id] === undefined) return state;
      const next = { ...state.decisions };
      delete next[id];
      return { ...state, decisions: next };
    }),

  bulkSetDecision: (ids, decision) =>
    set((state) => {
      if (ids.length === 0) return state;
      const decisions = { ...state.decisions };
      for (const id of ids) {
        decisions[id] = decision;
      }
      return { ...state, decisions };
    })
}));

export function selectDeleteList(state: PhotoStoreState): Asset[] {
  return state.order
    .map((id) => state.assets[id])
    .filter((asset): asset is Asset => Boolean(asset))
    .filter((asset) => state.decisions[asset.id] === "delete");
}

export function selectReady(
  records: Record<string, AnalysisRecord>,
  decisions: Record<string, UserDecision>,
  ids: string[]
): boolean {
  return ids.every(
    (id) => decisions[id] !== undefined || records[id]?.stage === "analyzed"
  );
}
