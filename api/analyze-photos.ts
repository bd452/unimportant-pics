import type { VercelRequest, VercelResponse } from "@vercel/node";
import { APICallError, Output, generateText } from "ai";
import {
  analysisRequestSchema,
  analysisResponseSchema,
  type AnalysisResponse,
  type AnalysisSignal
} from "../shared/analysis";

const DEFAULT_MODEL = "openai/gpt-5.5";

const fallbackSignals: AnalysisSignal[] = ["needs-human-review"];

function fallbackResponse(ids: string[], reason: string): AnalysisResponse {
  return {
    results: ids.map((id, index) => ({
      id,
      status: "yellow",
      confidence: 0.2,
      reason,
      signals: fallbackSignals,
      reviewPriority: 50 + index
    }))
  };
}

function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(status).json(payload);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const parsed = analysisRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    sendJson(res, 400, {
      error: "Invalid analysis request",
      details: parsed.error.flatten()
    });
    return;
  }

  const { photos, userId } = parsed.data;
  const ids = photos.map((photo) => photo.id);

  if (photos.some((photo) => !photo.imageBase64)) {
    sendJson(
      res,
      200,
      fallbackResponse(
        ids,
        "No image data was provided, so this photo needs a manual review."
      )
    );
    return;
  }

  try {
    const result = await generateText({
      model: process.env.AI_GATEWAY_MODEL ?? DEFAULT_MODEL,
      system:
        "You classify personal photo-library images for a cleanup assistant. Favor yellow review over red delete when a photo may contain people, pets, travel, documents, memories, or personally meaningful context. Never claim deletion is automatic.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Return one result for each image in order. Use green for worth keeping, yellow for ambiguous/manual review, and red only for likely low-value, accidental, redundant, or safe-to-delete candidates. Keep reasons short and user-readable. Photo IDs: " +
                ids.join(", ")
            },
            ...photos.map((photo) => ({
              type: "image" as const,
              image: photo.imageBase64 ?? "",
              mediaType: photo.mediaType
            }))
          ]
        }
      ],
      output: Output.object({
        schema: analysisResponseSchema,
        name: "photo_cleanup_analysis",
        description:
          "Structured keep, review, or delete recommendations for a batch of camera roll photos."
      }),
      providerOptions: {
        gateway: {
          user: userId ?? "anonymous-photo-reviewer",
          tags: ["feature:photo-analysis", "app:unimportant-pics"]
        }
      }
    });

    sendJson(res, 200, result.output);
  } catch (error) {
    if (APICallError.isInstance(error)) {
      const message =
        error.statusCode === 402
          ? "AI budget limit reached. Review this photo manually."
          : error.statusCode === 429
            ? "AI rate limit reached. Try this batch again shortly."
            : "AI analysis is temporarily unavailable. Review this photo manually.";

      sendJson(res, 200, fallbackResponse(ids, message));
      return;
    }

    sendJson(
      res,
      200,
      fallbackResponse(
        ids,
        "AI analysis failed unexpectedly. Review this photo manually."
      )
    );
  }
}
