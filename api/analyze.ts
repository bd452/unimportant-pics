import type {VercelRequest, VercelResponse} from '@vercel/node';
import {requestBodySchema, type ResponseItem} from './_lib/schema';
import {analyzeWithGateway} from './_lib/aiGateway';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({error: 'method not allowed'});
    return;
  }

  // Optional shared-secret check between the mobile client and this function.
  const appKey = process.env.APP_SHARED_KEY;
  if (appKey && req.headers['x-app-key'] !== appKey) {
    res.status(401).json({error: 'unauthorized'});
    return;
  }

  const parsed = requestBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({error: 'invalid request', detail: parsed.error.flatten()});
    return;
  }

  const items = parsed.data.items;

  try {
    const resultsById = await analyzeWithGateway(
      items.map((i) => ({id: i.id, imageBase64: i.imageBase64})),
    );

    const response: ResponseItem[] = items.map((i) => {
      const r = resultsById.get(i.id);
      if (r) return {id: i.id, result: r};
      return {id: i.id, error: 'no result for id'};
    });

    res.status(200).json({items: response});
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analysis failed';
    const response: ResponseItem[] = items.map((i) => ({
      id: i.id,
      error: message,
    }));
    // Surface the error to clients but with HTTP 200 so each item carries its
    // own error string. The scheduler will retry.
    res.status(200).json({items: response});
  }
}
