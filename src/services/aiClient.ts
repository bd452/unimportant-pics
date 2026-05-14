import type {AIResult} from '../types/photo';

const DEFAULT_TIMEOUT_MS = 25_000;

export interface AnalyzeRequestItem {
  id: string;
  uri: string;
  width?: number;
  height?: number;
  createdAt?: number;
}

export interface AnalyzeResponseItem {
  id: string;
  result?: AIResult;
  error?: string;
}

export interface AIClientConfig {
  baseUrl: string;
  apiKey?: string;
}

let config: AIClientConfig = {
  baseUrl: '',
};

export function configureAIClient(next: AIClientConfig) {
  config = next;
}

function ensureConfigured() {
  if (!config.baseUrl) {
    throw new Error(
      'AI client is not configured. Call configureAIClient({baseUrl}) before analyzing photos.',
    );
  }
}

async function uriToBase64(uri: string): Promise<string> {
  // Photos library URIs on iOS look like `ph://...`. React Native's fetch
  // resolves these against the native asset loader and returns the JPEG bytes,
  // which we then base64-encode for transport.
  const res = await fetch(uri);
  const blob = await res.blob();
  return await blobToBase64(blob);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('blob read failed'));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export async function analyzePhotos(
  items: AnalyzeRequestItem[],
  options: {signal?: AbortSignal; timeoutMs?: number} = {},
): Promise<AnalyzeResponseItem[]> {
  ensureConfigured();
  if (items.length === 0) return [];

  const payloadItems = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      imageBase64: await uriToBase64(item.uri),
      width: item.width,
      height: item.height,
      createdAt: item.createdAt,
    })),
  );

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? {'x-app-key': config.apiKey} : {}),
      },
      body: JSON.stringify({items: payloadItems}),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`analyze failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as {items: AnalyzeResponseItem[]};
    return data.items;
  } finally {
    clearTimeout(timeout);
  }
}
