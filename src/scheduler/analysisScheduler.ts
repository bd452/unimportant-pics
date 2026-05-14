import {usePhotoStore} from '../state/photoStore';
import {analyzePhotos, type AnalyzeRequestItem} from '../services/aiClient';

const MAX_BATCH = 4;
const MAX_PARALLEL_BATCHES = 2;
const MAX_RETRIES = 2;

interface QueueEntry {
  id: string;
  priority: number;
  enqueuedAt: number;
}

class AnalysisScheduler {
  private queue: Map<string, QueueEntry> = new Map();
  private inflight = 0;
  private paused = false;
  private listeners = new Set<() => void>();

  enqueue(ids: string[], priority: number) {
    const now = Date.now();
    const store = usePhotoStore.getState();
    let changed = false;
    for (const id of ids) {
      const photo = store.photos[id];
      if (!photo) continue;
      if (photo.analysisState === 'analyzed') continue;
      if (photo.analysisState === 'analyzing') continue;

      const existing = this.queue.get(id);
      if (existing) {
        if (priority > existing.priority) {
          existing.priority = priority;
          changed = true;
        }
        continue;
      }
      this.queue.set(id, {id, priority, enqueuedAt: now});
      if (photo.analysisState !== 'queued') {
        store.setAnalysisState(id, 'queued');
      }
      changed = true;
    }
    if (changed) {
      this.notify();
      this.pump();
    }
  }

  /**
   * Replace the priority queue for a scroll viewport. Photos already analyzing
   * are left alone; queued photos no longer in scope are removed.
   */
  setViewport(activeIds: string[], priorityBase: number) {
    const wanted = new Set(activeIds);
    for (const id of Array.from(this.queue.keys())) {
      if (!wanted.has(id)) this.queue.delete(id);
    }
    activeIds.forEach((id, i) => {
      this.enqueue([id], priorityBase - i);
    });
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.pump();
  }

  isAnalyzedOrSettled(id: string): boolean {
    const store = usePhotoStore.getState();
    const photo = store.photos[id];
    if (!photo) return true;
    return (
      photo.analysisState === 'analyzed' ||
      photo.userDecision !== null
    );
  }

  /** True when every id in the set is analyzed or the user already decided. */
  allReady(ids: string[]): boolean {
    return ids.every((id) => this.isAnalyzedOrSettled(id));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  private pump() {
    if (this.paused) return;
    while (this.inflight < MAX_PARALLEL_BATCHES && this.queue.size > 0) {
      const batch = this.takeBatch();
      if (batch.length === 0) break;
      this.inflight += 1;
      this.runBatch(batch)
        .catch(() => {
          /* errors are recorded against individual photos */
        })
        .finally(() => {
          this.inflight -= 1;
          this.notify();
          this.pump();
        });
    }
  }

  private takeBatch(): QueueEntry[] {
    const sorted = Array.from(this.queue.values()).sort(
      (a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt,
    );
    const batch = sorted.slice(0, MAX_BATCH);
    for (const e of batch) this.queue.delete(e.id);
    return batch;
  }

  private async runBatch(batch: QueueEntry[]) {
    const store = usePhotoStore.getState();
    const items: AnalyzeRequestItem[] = [];
    for (const entry of batch) {
      const photo = store.photos[entry.id];
      if (!photo) continue;
      if (photo.attempts >= MAX_RETRIES + 1) {
        store.setAnalysisError(entry.id, 'max retries exceeded');
        continue;
      }
      store.setAnalysisState(entry.id, 'analyzing');
      items.push({
        id: entry.id,
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        createdAt: photo.createdAt,
      });
    }
    if (items.length === 0) return;

    try {
      const results = await analyzePhotos(items);
      for (const r of results) {
        if (r.result) {
          store.setAnalysisResult(r.id, r.result);
        } else {
          this.handleItemError(r.id, r.error ?? 'unknown analysis error');
        }
      }
      // Cover items that did not appear in the response at all.
      const seen = new Set(results.map((r) => r.id));
      for (const item of items) {
        if (!seen.has(item.id)) {
          this.handleItemError(item.id, 'missing in response');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const item of items) {
        this.handleItemError(item.id, message);
      }
    }
  }

  private handleItemError(id: string, message: string) {
    const store = usePhotoStore.getState();
    const photo = store.photos[id];
    if (!photo) return;
    if (photo.attempts >= MAX_RETRIES + 1) {
      store.setAnalysisError(id, message);
      return;
    }
    // Re-queue with a slightly lower priority so other photos make progress.
    store.setAnalysisState(id, 'queued');
    this.queue.set(id, {
      id,
      priority: -photo.attempts,
      enqueuedAt: Date.now(),
    });
    this.notify();
  }
}

export const analysisScheduler = new AnalysisScheduler();
