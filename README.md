# Unimportant Pics

AI-assisted iOS camera roll cleanup tool. The app loads photos from the user's
library, asks an AI model to triage each one as green/yellow/red, and lets the
user confirm keep/delete decisions through either a grid review UI or a
Tinder-style swipe UI. Destructive deletion always goes through the native iOS
photo deletion confirmation.

See [`SUMMARY.md`](./SUMMARY.md) for the product spec this implementation
follows.

## Stack

- React Native 0.75 with TypeScript, iOS-first.
- Yarn for JS package management; CocoaPods for iOS native modules.
- Zustand for the shared analysis state model.
- `@shopify/flash-list` for the grid, `react-native-reanimated` +
  `react-native-gesture-handler` for swipe gestures.
- Vercel Functions backend (in [`api/`](./api)) that proxies image analysis
  through Vercel AI Gateway. No provider credentials live in the client.

## Layout

```
.
├── App.tsx                       app entry; wires permission + navigation
├── index.js
├── app.json
├── babel.config.js / metro.config.js
├── package.json / tsconfig.json
├── src/
│   ├── config.ts                 runtime API base URL
│   ├── types/photo.ts            shared AI + photo types
│   ├── state/photoStore.ts       Zustand store: photos, decisions, ordering
│   ├── services/
│   │   ├── photoLibrary.ts       camera roll + permission + delete
│   │   └── aiClient.ts           POSTs to the Vercel Function
│   ├── scheduler/
│   │   ├── analysisScheduler.ts  priority queue, batching, retry, gating
│   │   └── hooks.ts              React hook that re-renders on tick
│   ├── theme/colors.ts
│   ├── components/
│   │   ├── StatusBadge.tsx
│   │   ├── PhotoTile.tsx
│   │   └── SwipeCard.tsx
│   ├── screens/
│   │   ├── PermissionScreen.tsx
│   │   ├── GridScreen.tsx        analysis-aware scrolling
│   │   ├── SwipeScreen.tsx       lookahead + gating
│   │   ├── PhotoDetailScreen.tsx
│   │   └── ConfirmDeleteScreen.tsx
│   └── navigation/
│       ├── types.ts
│       └── RootNavigator.tsx
├── api/                          Vercel Functions (see api/README.md)
│   ├── analyze.ts
│   ├── health.ts
│   └── _lib/{schema,prompt,aiGateway}.ts
├── ios/INFO_PLIST_KEYS.md        iOS permission strings to add
└── vercel.json
```

## Local setup

```bash
# JS deps
yarn install
yarn pods                 # iOS only; runs `pod install`

# Backend
cd api && yarn install
yarn vercel dev           # serves /api/analyze on http://localhost:3000

# Mobile
API_BASE_URL=http://localhost:3000 yarn ios
```

The first `react-native init` is intentionally not committed here — generate
the platform projects with:

```bash
npx react-native@0.75 init unimportantpics --template react-native-template-typescript --directory .
```

then overlay the files in this repository, run `yarn`, and apply the keys
from [`ios/INFO_PLIST_KEYS.md`](./ios/INFO_PLIST_KEYS.md).

## How the analysis loop works

The same photo store powers both UIs. Each photo moves through:

```
not_queued → queued → analyzing → analyzed (green | yellow | red) → user keep/delete
                                ↘ error
```

The scheduler keeps a priority queue. The Grid screen sets the queue from the
viewport (`onViewableItemsChanged` + a small buffer); the Swipe screen sets
the queue from the active card and a small lookahead window. The Grid only
loads the next page once everything currently on-screen is settled — this is
the "gating" behavior the spec calls for. The Swipe screen disables gestures
on the active card until its AI result is ready.

## Deletion safety

Swiping records intent. Real deletion happens only when the user opens the
delete list, taps "Delete from camera roll", and approves iOS's native photo
deletion confirmation. Photos can be rescued any time before that step.

## Where the AI is called

Photos never travel directly to a model provider from the device. The mobile
client encodes JPEG bytes as base64 and POSTs to `POST /api/analyze`, which
runs on Vercel and calls Vercel AI Gateway with server-side credentials. See
[`api/README.md`](./api/README.md) for the required env vars.
