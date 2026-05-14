import {create} from 'zustand';
import type {
  AIResult,
  PhotoRecord,
  UserDecision,
  AnalysisState,
} from '../types/photo';

interface PhotoStoreState {
  photos: Record<string, PhotoRecord>;
  order: string[];
  ingestPhotos: (
    incoming: Array<Omit<PhotoRecord, 'analysisState' | 'userDecision' | 'attempts'>>,
  ) => void;
  setAnalysisState: (id: string, state: AnalysisState) => void;
  setAnalysisResult: (id: string, result: AIResult) => void;
  setAnalysisError: (id: string, error: string) => void;
  setUserDecision: (id: string, decision: UserDecision) => void;
  bulkSetUserDecision: (ids: string[], decision: UserDecision) => void;
  removePhotos: (ids: string[]) => void;
  reset: () => void;
}

export const usePhotoStore = create<PhotoStoreState>((set) => ({
  photos: {},
  order: [],

  ingestPhotos: (incoming) =>
    set((state) => {
      const photos = {...state.photos};
      const order = [...state.order];
      for (const p of incoming) {
        if (!photos[p.id]) {
          photos[p.id] = {
            ...p,
            analysisState: 'not_queued',
            userDecision: null,
            attempts: 0,
          };
          order.push(p.id);
        }
      }
      return {photos, order};
    }),

  setAnalysisState: (id, analysisState) =>
    set((state) => {
      const existing = state.photos[id];
      if (!existing) return state;
      return {
        photos: {
          ...state.photos,
          [id]: {
            ...existing,
            analysisState,
            attempts:
              analysisState === 'analyzing'
                ? existing.attempts + 1
                : existing.attempts,
          },
        },
      };
    }),

  setAnalysisResult: (id, analysis) =>
    set((state) => {
      const existing = state.photos[id];
      if (!existing) return state;
      return {
        photos: {
          ...state.photos,
          [id]: {
            ...existing,
            analysisState: 'analyzed',
            analysis,
            analysisError: undefined,
          },
        },
      };
    }),

  setAnalysisError: (id, analysisError) =>
    set((state) => {
      const existing = state.photos[id];
      if (!existing) return state;
      return {
        photos: {
          ...state.photos,
          [id]: {
            ...existing,
            analysisState: 'error',
            analysisError,
          },
        },
      };
    }),

  setUserDecision: (id, decision) =>
    set((state) => {
      const existing = state.photos[id];
      if (!existing) return state;
      return {
        photos: {
          ...state.photos,
          [id]: {...existing, userDecision: decision},
        },
      };
    }),

  bulkSetUserDecision: (ids, decision) =>
    set((state) => {
      const photos = {...state.photos};
      for (const id of ids) {
        const existing = photos[id];
        if (existing) {
          photos[id] = {...existing, userDecision: decision};
        }
      }
      return {photos};
    }),

  removePhotos: (ids) =>
    set((state) => {
      const photos = {...state.photos};
      const idSet = new Set(ids);
      for (const id of ids) delete photos[id];
      const order = state.order.filter((id) => !idSet.has(id));
      return {photos, order};
    }),

  reset: () => set({photos: {}, order: []}),
}));

export function selectDeleteList(state: PhotoStoreState): PhotoRecord[] {
  return state.order
    .map((id) => state.photos[id])
    .filter((p): p is PhotoRecord => !!p && p.userDecision === 'delete');
}

export function selectKeepList(state: PhotoStoreState): PhotoRecord[] {
  return state.order
    .map((id) => state.photos[id])
    .filter((p): p is PhotoRecord => !!p && p.userDecision === 'keep');
}
