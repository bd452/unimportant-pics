import { useCallback, useRef, useState } from "react";
import type { Asset } from "expo-media-library";
import { analyzePhotoBatch } from "../api/photoAnalysisClient";
import type {
  AnalysisRecord,
  PhotoAnalysis,
  UserDecision
} from "../../shared/analysis";

type QueuePriority = "visible" | "lookahead" | "background";

type QueuedPhoto = {
  asset: Asset;
  priority: QueuePriority;
  enqueuedAt: number;
};

const priorityWeight: Record<QueuePriority, number> = {
  visible: 0,
  lookahead: 1,
  background: 2
};

function manualReviewAnalysis(asset: Asset, reason: string): PhotoAnalysis {
  return {
    id: asset.id,
    status: "yellow",
    confidence: 0.2,
    reason,
    signals: ["needs-human-review"],
    reviewPriority: 70
  };
}

export function useAnalysisController() {
  const [records, setRecords] = useState<Record<string, AnalysisRecord>>({});
  const [decisions, setDecisions] = useState<Record<string, UserDecision>>({});
  const queueRef = useRef<QueuedPhoto[]>([]);
  const recordsRef = useRef(records);
  const inFlightRef = useRef(false);

  recordsRef.current = records;

  const processQueue = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    const nextJobs = queueRef.current.filter((job) => {
      const record = recordsRef.current[job.asset.id];
      return !record || record.stage === "queued";
    });
    queueRef.current = nextJobs;

    const batch = nextJobs.slice(0, 6);
    queueRef.current = nextJobs.slice(batch.length);

    if (batch.length === 0) {
      return;
    }

    const batchIds = new Set(batch.map((job) => job.asset.id));
    inFlightRef.current = true;
    setRecords((current) => {
      const next = { ...current };

      for (const id of batchIds) {
        next[id] = { stage: "analyzing" };
      }

      return next;
    });

    try {
      const results = await analyzePhotoBatch(batch.map((job) => job.asset));
      const byId = new Map(results.map((result) => [result.id, result]));

      setRecords((current) => {
        const next = { ...current };

        for (const job of batch) {
          const result =
            byId.get(job.asset.id) ??
            manualReviewAnalysis(
              job.asset,
              "AI did not return a result for this photo. Review it manually."
            );
          next[job.asset.id] = { stage: "analyzed", analysis: result };
        }

        return next;
      });
    } catch (caught) {
      const reason =
        caught instanceof Error
          ? `Analysis unavailable: ${caught.message}`
          : "Analysis unavailable. Review this photo manually.";

      setRecords((current) => {
        const next = { ...current };

        for (const job of batch) {
          next[job.asset.id] = {
            stage: "analyzed",
            analysis: manualReviewAnalysis(job.asset, reason),
            error: reason
          };
        }

        return next;
      });
    } finally {
      inFlightRef.current = false;
      void processQueue();
    }
  }, []);

  const schedulePhotos = useCallback(
    (assets: Asset[], priority: QueuePriority) => {
      const now = Date.now();
      const existing = new Set(queueRef.current.map((job) => job.asset.id));
      const jobsToAdd: QueuedPhoto[] = [];

      setRecords((current) => {
        const next = { ...current };
        let didChange = false;

        for (const asset of assets) {
          const currentRecord = current[asset.id];

          if (
            currentRecord?.stage === "analyzed" ||
            currentRecord?.stage === "analyzing"
          ) {
            continue;
          }

          next[asset.id] = { stage: "queued" };
          didChange = true;

          if (!existing.has(asset.id)) {
            existing.add(asset.id);
            jobsToAdd.push({ asset, priority, enqueuedAt: now });
          }
        }

        return didChange ? next : current;
      });

      if (jobsToAdd.length > 0) {
        queueRef.current = [...queueRef.current, ...jobsToAdd].sort((a, b) => {
          const priorityDelta =
            priorityWeight[a.priority] - priorityWeight[b.priority];
          return priorityDelta === 0 ? a.enqueuedAt - b.enqueuedAt : priorityDelta;
        });
        void processQueue();
      }
    },
    [processQueue]
  );

  const markDecision = useCallback((id: string, decision: UserDecision) => {
    setDecisions((current) => ({
      ...current,
      [id]: decision
    }));
  }, []);

  const clearDecision = useCallback((id: string) => {
    setDecisions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const removeRecords = useCallback((ids: string[]) => {
    const deleteSet = new Set(ids);
    setRecords((current) => {
      const next = { ...current };
      for (const id of ids) {
        delete next[id];
      }
      return next;
    });
    setDecisions((current) => {
      const next = { ...current };
      for (const id of ids) {
        delete next[id];
      }
      return next;
    });
    queueRef.current = queueRef.current.filter(
      (job) => !deleteSet.has(job.asset.id)
    );
  }, []);

  return {
    clearDecision,
    decisions,
    markDecision,
    records,
    removeRecords,
    schedulePhotos
  };
}
