import type { Asset } from "expo-media-library";
import { analyzePhotoBatch } from "../api/photoAnalysisClient";
import { usePhotoStore } from "../state/photoStore";
import type { PhotoAnalysis } from "../../shared/analysis";

export type Priority = "active" | "visible" | "lookahead" | "background";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  active: 0,
  visible: 1,
  lookahead: 2,
  background: 3
};

const MAX_BATCH = 4;
const MAX_PARALLEL_BATCHES = 2;
const MAX_RETRIES = 2;

interface QueueEntry {
  id: string;
  asset: Asset;
  priority: Priority;
  enqueuedAt: number;
}

function manualReviewFallback(id: string, reason: string): PhotoAnalysis {
  return {
    id,
    status: "yellow",
    confidence: 0.2,
    reason,
    signals: ["needs-human-review"],
    reviewPriority: 70
  };
}

class AnalysisScheduler {
  private queue = new Map<string, QueueEntry>();
  private inflight = 0;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  schedule(assets: Asset[], priority: Priority): void {
    if (assets.length === 0) return;
    const store = usePhotoStore.getState();
    const queuedIds: string[] = [];
    let changed = false;

    for (const asset of assets) {
      const record = store.records[asset.id];
      if (record?.stage === "analyzed") continue;
      if (record?.stage === "analyzing") continue;

      const existing = this.queue.get(asset.id);
      if (existing) {
        if (
          PRIORITY_WEIGHT[priority] < PRIORITY_WEIGHT[existing.priority]
        ) {
          existing.priority = priority;
          changed = true;
        }
        continue;
      }

      this.queue.set(asset.id, {
        id: asset.id,
        asset,
        priority,
        enqueuedAt: Date.now()
      });
      queuedIds.push(asset.id);
      changed = true;
    }

    if (queuedIds.length > 0) {
      store.setQueued(queuedIds);
    }
    if (changed) {
      this.notify();
      this.pump();
    }
  }

  setActiveWindow(assets: Asset[], priority: Priority): void {
    const wanted = new Set(assets.map((asset) => asset.id));
    for (const id of Array.from(this.queue.keys())) {
      if (!wanted.has(id)) {
        this.queue.delete(id);
      }
    }
    this.schedule(assets, priority);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private pump(): void {
    while (this.inflight < MAX_PARALLEL_BATCHES && this.queue.size > 0) {
      const batch = this.takeBatch();
      if (batch.length === 0) break;
      this.inflight += 1;
      this.runBatch(batch).finally(() => {
        this.inflight -= 1;
        this.notify();
        this.pump();
      });
    }
  }

  private takeBatch(): QueueEntry[] {
    const sorted = Array.from(this.queue.values()).sort((a, b) => {
      const pa = PRIORITY_WEIGHT[a.priority];
      const pb = PRIORITY_WEIGHT[b.priority];
      return pa === pb ? a.enqueuedAt - b.enqueuedAt : pa - pb;
    });
    const batch = sorted.slice(0, MAX_BATCH);
    for (const entry of batch) this.queue.delete(entry.id);
    return batch;
  }

  private async runBatch(batch: QueueEntry[]): Promise<void> {
    const store = usePhotoStore.getState();
    store.setAnalyzing(batch.map((entry) => entry.id));

    try {
      const results = await analyzePhotoBatch(batch.map((entry) => entry.asset));
      const byId = new Map(results.map((result) => [result.id, result]));

      const analyzed: PhotoAnalysis[] = [];
      for (const entry of batch) {
        const result = byId.get(entry.id);
        if (result) {
          analyzed.push(result);
        } else {
          this.handleItemError(
            entry,
            "AI did not return a result for this photo."
          );
        }
      }
      if (analyzed.length > 0) {
        usePhotoStore.getState().setAnalyzed(analyzed);
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Analysis call failed";
      for (const entry of batch) {
        this.handleItemError(entry, message);
      }
    }
  }

  private handleItemError(entry: QueueEntry, message: string): void {
    const store = usePhotoStore.getState();
    const attempts = store.incrementAttempt(entry.id);
    if (attempts > MAX_RETRIES) {
      store.setAnalyzed([
        manualReviewFallback(
          entry.id,
          `Analysis unavailable: ${message}. Review this photo manually.`
        )
      ]);
      return;
    }
    store.setError(entry.id, message);
    this.queue.set(entry.id, {
      id: entry.id,
      asset: entry.asset,
      priority: "background",
      enqueuedAt: Date.now()
    });
  }
}

export const analysisScheduler = new AnalysisScheduler();
