import {aiResultSchema, type AIResult} from './schema';
import {SYSTEM_PROMPT} from './prompt';

/**
 * Calls Vercel AI Gateway directly. We use fetch against the Gateway's
 * OpenAI-compatible chat completions endpoint so we don't take a hard
 * dependency on a specific provider SDK. The gateway routes the call to the
 * configured upstream model (set via `AI_MODEL`, default Claude Sonnet 4.6
 * through the Anthropic provider).
 *
 * Required environment variables on the Vercel project:
 *   - VERCEL_AI_GATEWAY_API_KEY: gateway credential. On Vercel-managed
 *     deployments this can be supplied automatically; locally you must set it.
 *   - AI_MODEL (optional): model id understood by the gateway. Defaults to
 *     "anthropic/claude-sonnet-4-6".
 *
 * The function returns one AIResult per input item (in order). If the gateway
 * call fails we throw — the caller turns failures into per-item errors.
 */

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-6';
const GATEWAY_URL =
  process.env.VERCEL_AI_GATEWAY_URL ??
  'https://gateway.ai.vercel.app/v1/chat/completions';

interface GatewayItem {
  id: string;
  imageBase64: string;
}

interface RawResponse {
  results: Array<{
    id: string;
    status: 'green' | 'yellow' | 'red';
    confidence: number;
    reason: string;
    signals: string[];
    reviewPriority: number;
  }>;
}

const ALLOWED_SIGNALS = new Set([
  'blurry',
  'duplicate_like',
  'screenshot',
  'receipt',
  'low_light',
  'document',
  'pet',
  'person',
  'scenic',
  'memory_worthy',
  'pocket_shot',
  'text_heavy',
]);

export async function analyzeWithGateway(
  items: GatewayItem[],
): Promise<Map<string, AIResult>> {
  if (items.length === 0) return new Map();

  const apiKey =
    process.env.VERCEL_AI_GATEWAY_API_KEY ?? process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VERCEL_AI_GATEWAY_API_KEY env var');
  }

  const userContent: Array<
    | {type: 'text'; text: string}
    | {type: 'image_url'; image_url: {url: string}}
  > = [
    {
      type: 'text',
      text:
        `Analyze the following ${items.length} photos. Return JSON of shape ` +
        `{"results":[{"id":...,"status":...,"confidence":...,"reason":...,"signals":[...],"reviewPriority":...}]}.` +
        ` Use exactly these ids in order: ${items.map((i) => JSON.stringify(i.id)).join(', ')}.`,
    },
  ];
  for (const item of items) {
    userContent.push({type: 'text', text: `Photo id: ${item.id}`});
    userContent.push({
      type: 'image_url',
      image_url: {url: `data:image/jpeg;base64,${item.imageBase64}`},
    });
  }

  const body = {
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
    response_format: {type: 'json_object'},
    temperature: 0.2,
    messages: [
      {role: 'system', content: SYSTEM_PROMPT},
      {role: 'user', content: userContent},
    ],
  };

  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`gateway ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{message?: {content?: string}}>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('gateway returned no content');

  let parsed: RawResponse;
  try {
    parsed = JSON.parse(content) as RawResponse;
  } catch (err) {
    throw new Error(
      `gateway returned invalid JSON: ${(err as Error).message}; body=${content.slice(0, 200)}`,
    );
  }
  if (!Array.isArray(parsed.results)) {
    throw new Error('gateway response missing results array');
  }

  const out = new Map<string, AIResult>();
  for (const r of parsed.results) {
    const cleaned = {
      status: r.status,
      confidence: clamp01(r.confidence),
      reason: String(r.reason ?? '').slice(0, 280),
      signals: (Array.isArray(r.signals) ? r.signals : [])
        .filter((s): s is string => typeof s === 'string')
        .filter((s) => ALLOWED_SIGNALS.has(s))
        .slice(0, 8),
      reviewPriority: clamp01(r.reviewPriority),
    };
    const validated = aiResultSchema.safeParse(cleaned);
    if (validated.success) out.set(r.id, validated.data);
  }
  return out;
}

function clamp01(n: unknown): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(1, x));
}
