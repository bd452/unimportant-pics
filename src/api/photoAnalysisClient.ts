import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import type { Asset } from "expo-media-library";
import { analysisResponseSchema, type PhotoAnalysis } from "../../shared/analysis";
import { mockAnalyzePhotos } from "../lib/mockAnalysis";

const MAX_BATCH_SIZE = 6;
const ANALYSIS_ENDPOINT = process.env.EXPO_PUBLIC_ANALYSIS_API_URL;
const APP_KEY = process.env.EXPO_PUBLIC_APP_SHARED_KEY;

async function preparePhotoForAnalysis(asset: Asset) {
  const info = await MediaLibrary.getAssetInfoAsync(asset, {
    shouldDownloadFromNetwork: true
  });
  const uri = info.localUri ?? info.uri ?? asset.uri;
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 768 } }],
    {
      base64: true,
      compress: 0.68,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  return {
    id: asset.id,
    fileName: asset.filename,
    mediaType: "image/jpeg",
    imageBase64: resized.base64
  };
}

export async function analyzePhotoBatch(assets: Asset[]): Promise<PhotoAnalysis[]> {
  const batch = assets.slice(0, MAX_BATCH_SIZE);

  if (!ANALYSIS_ENDPOINT) {
    return mockAnalyzePhotos(batch);
  }

  const photos = await Promise.all(batch.map(preparePhotoForAnalysis));
  const response = await fetch(ANALYSIS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(APP_KEY ? { "x-app-key": APP_KEY } : {})
    },
    body: JSON.stringify({
      userId: "local-device",
      photos
    })
  });

  if (!response.ok) {
    throw new Error(`Analysis request failed with ${response.status}`);
  }

  const json = await response.json();
  const parsed = analysisResponseSchema.parse(json);

  return parsed.results;
}
