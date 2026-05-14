import { z } from "zod";

export const aiStatuses = ["green", "yellow", "red"] as const;
export const analysisStages = [
  "not_queued",
  "queued",
  "analyzing",
  "analyzed"
] as const;
export const userDecisions = ["keep", "delete"] as const;

export const analysisSignals = [
  "blurry",
  "duplicate-like",
  "screenshot",
  "receipt",
  "low-light",
  "document",
  "pet",
  "person",
  "scenic",
  "memory-worthy",
  "low-information",
  "accidental",
  "needs-human-review"
] as const;

export type AiStatus = (typeof aiStatuses)[number];
export type AnalysisStage = (typeof analysisStages)[number];
export type UserDecision = (typeof userDecisions)[number];
export type AnalysisSignal = (typeof analysisSignals)[number];

export const photoAnalysisSchema = z.object({
  id: z.string().min(1),
  status: z.enum(aiStatuses),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(240),
  signals: z.array(z.enum(analysisSignals)).default([]),
  reviewPriority: z.number().min(0).max(100)
});

export const analysisResponseSchema = z.object({
  results: z.array(photoAnalysisSchema)
});

export const analysisRequestSchema = z.object({
  userId: z.string().optional(),
  photos: z
    .array(
      z.object({
        id: z.string().min(1),
        mediaType: z.string().default("image/jpeg"),
        imageBase64: z.string().optional(),
        fileName: z.string().optional()
      })
    )
    .min(1)
    .max(6)
});

export type PhotoAnalysis = z.infer<typeof photoAnalysisSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

export type AnalysisRecord =
  | {
      stage: "not_queued" | "queued" | "analyzing";
      analysis?: undefined;
      error?: string;
    }
  | {
      stage: "analyzed";
      analysis: PhotoAnalysis;
      error?: string;
    };

export const statusCopy: Record<AiStatus, string> = {
  green: "Keep",
  yellow: "Review",
  red: "Delete?"
};

export const statusColors: Record<AiStatus, string> = {
  green: "#34C759",
  yellow: "#FFCC00",
  red: "#FF453A"
};

export function decisionToStatus(decision: UserDecision): AiStatus {
  return decision === "keep" ? "green" : "red";
}
