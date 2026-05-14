# Unimportant Pics — Vercel Functions backend

This directory hosts the secure API boundary for the mobile app. The native
client never holds AI provider credentials; instead it POSTs base64 image
payloads to `POST /api/analyze`, which forwards the call to Vercel AI Gateway.

## Endpoints

- `POST /api/analyze` — accepts up to 8 images per call, returns one
  `AIResult` per id (or a per-id error string).
- `GET /api/health` — liveness probe.

## Required environment variables

| Variable                       | Required | Purpose                                                |
| ------------------------------ | -------- | ------------------------------------------------------ |
| `VERCEL_AI_GATEWAY_API_KEY`    | yes      | Bearer token used to authenticate to AI Gateway.       |
| `VERCEL_AI_GATEWAY_URL`        | no       | Override gateway base URL. Defaults to the production URL. |
| `AI_MODEL`                     | no       | Gateway model id. Defaults to `anthropic/claude-sonnet-4-6`. |
| `APP_SHARED_KEY`               | no       | If set, requests must include `x-app-key: <value>`.    |

## Local development

```bash
yarn install
yarn vercel dev
```

The mobile client reads `API_BASE_URL` (see `src/config.ts`) to decide which
host to call. During simulator development this typically points at
`http://localhost:3000`.
