# unimportant-pics

A native iOS-first React Native app for assisted camera roll cleanup. The app
loads a limited photo-library window, analyzes only photos needed for the
current grid or swipe review flow, and lets the user explicitly keep or mark
photos for deletion before invoking the native iOS deletion confirmation.

## Stack

- Expo + React Native + TypeScript
- `expo-media-library` for iOS photo-library permissions, paging, and deletion
- Vercel Function at `api/analyze-photos.ts`
- Vercel AI Gateway through the AI SDK for server-side photo analysis
- Yarn package management

## Local development

```bash
yarn install
yarn start
```

By default, the Expo app uses a local mock analyzer so the UI works without
server credentials. To use the Vercel Function, set:

```bash
EXPO_PUBLIC_ANALYSIS_API_URL=https://your-vercel-project.vercel.app/api/analyze-photos
```

For local or deployed AI Gateway calls, enable AI Gateway on the Vercel project
and use Vercel-managed OIDC auth (`vercel env pull .env.local`) or another
supported server-side Gateway credential. Never embed provider or Gateway
secrets in the native app.

## Scripts

- `yarn start` - start Expo
- `yarn ios` - build/run the native iOS app
- `yarn api:dev` - run the Vercel Function locally
- `yarn typecheck` - TypeScript verification
