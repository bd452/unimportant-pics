import type { Asset } from "expo-media-library";
import type { PhotoAnalysis } from "../../shared/analysis";

const redReasons = [
  "Looks like a low-information or accidental shot.",
  "Likely redundant and safe to review for deletion.",
  "Looks like a screenshot or utility image with low long-term value."
];

const yellowReasons = [
  "Could be meaningful, so it should get a human review.",
  "The image quality or context is ambiguous.",
  "Worth checking before making a delete decision."
];

const greenReasons = [
  "Likely captures a meaningful moment or subject.",
  "Looks distinct enough to keep.",
  "This appears more memory-worthy than cleanup-worthy."
];

function scoreAsset(asset: Asset): number {
  const filenameScore = Array.from(asset.filename).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );

  return (filenameScore + asset.width + asset.height + asset.creationTime) % 10;
}

export async function mockAnalyzePhotos(assets: Asset[]): Promise<PhotoAnalysis[]> {
  await new Promise((resolve) => setTimeout(resolve, 650));

  return assets.map((asset, index) => {
    const score = scoreAsset(asset);

    if (score <= 2) {
      return {
        id: asset.id,
        status: "red",
        confidence: 0.68,
        reason: redReasons[index % redReasons.length],
        signals: ["low-information"],
        reviewPriority: 85
      };
    }

    if (score <= 5) {
      return {
        id: asset.id,
        status: "yellow",
        confidence: 0.45,
        reason: yellowReasons[index % yellowReasons.length],
        signals: ["needs-human-review"],
        reviewPriority: 60
      };
    }

    return {
      id: asset.id,
      status: "green",
      confidence: 0.72,
      reason: greenReasons[index % greenReasons.length],
      signals: ["memory-worthy"],
      reviewPriority: 20
    };
  });
}
