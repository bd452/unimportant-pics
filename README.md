# unimportant-pics

AI-assisted iOS camera roll cleanup tool. The app loads photos from the user's
library, asks an AI model to triage each one as green / yellow / red, and lets
the user confirm keep/delete decisions through a grid review or a swipe review.
Destructive deletion always goes through the native iOS photo deletion
confirmation.

See [`SUMMARY.md`](./SUMMARY.md) for the product spec.

## Stack

- Expo + React Native + TypeScript, iOS-first
- React Navigation native-stack (`Grid` / `Swipe` / `PhotoDetail` /
  `ConfirmDelete`)
- Zustand store as the single source of truth for assets, AI records, and
  user decisions
- `@shopify/flash-list` for the grid
- Priority-queue analysis scheduler with parallel batches and retries
- `expo-media-library` for permissions, paging, and deletion
- `expo-image-manipulator` to resize/compress photos before upload
- Vercel Function (`api/analyze-photos.ts`) that calls Vercel AI Gateway via
  the Vercel AI SDK with a Zod-typed structured output
- A single `shared/analysis.ts` Zod schema, reused on client and server

## Layout

```
.
├── App.tsx                              entry: gesture handler + safe area + nav
├── app.json                             Expo config + iOS permission strings
├── shared/analysis.ts                   Zod schemas + status copy/colors
├── src/
│   ├── styles/theme.ts                  colors, spacing, radius
│   ├── api/photoAnalysisClient.ts       preprocess + POST to the function
│   ├── lib/mockAnalysis.ts              local-dev fallback (no server needed)
│   ├── state/photoStore.ts              Zustand store
│   ├── scheduler/analysisScheduler.ts   priority queue, batching, retries
│   ├── hooks/usePhotoLibrary.ts         permission + paging
│   ├── components/                      presentational pieces
│   ├── screens/                         one screen per nav route
│   └── navigation/                      stack + param types
└── api/analyze-photos.ts                Vercel Function
```

## Local development

```bash
yarn install
yarn start
```

With no `EXPO_PUBLIC_ANALYSIS_API_URL` set the Expo app uses
`src/lib/mockAnalysis.ts`, so you can drive the full UI without any server
or AI credentials.

To use the Vercel Function:

```bash
cp .env.example .env.local   # then fill in the URL
yarn api:dev                 # serves /api/analyze-photos locally
yarn ios                     # build/run on iOS simulator
```

For deployed AI Gateway calls, enable AI Gateway on the Vercel project and use
Vercel-managed OIDC auth (`vercel env pull .env.local`) or another supported
server-side Gateway credential. Never embed provider or Gateway secrets in the
native app.

## How the analysis loop works

The store holds `records[id]` for every photo. Each record moves through:

```
(absent) → queued → analyzing → analyzed → (user decision: keep | delete)
```

The scheduler is a singleton with a priority queue. The Grid screen calls
`analysisScheduler.setActiveWindow(visibleAssets, "visible")` from
`onViewableItemsChanged` plus a small buffer; the Swipe screen calls
`analysisScheduler.schedule([active], "active")` for the top card and
`schedule(rest, "lookahead")` for the next few. The Grid only allows revealing
the next page once every visible photo is settled — the gating the spec calls
for. The Swipe screen disables gestures on the active card until its record
reaches `analyzed`.

## Deletion safety

Swiping or marking from the grid records intent in the store. Real deletion
happens only when the user opens `ConfirmDelete`, taps the destructive button,
and approves iOS's native photo deletion confirmation
(`MediaLibrary.deleteAssetsAsync`). Photos can be rescued any time before that
step.

## Scripts

- `yarn start` – start Expo
- `yarn ios` – build/run the native iOS app
- `yarn api:dev` – run the Vercel Function locally
- `yarn typecheck` – TypeScript verification
