# Project Summary

## Working Title

unimportant-pics

## Goal

Build a native iOS app that helps users review photos in their camera roll and decide which images are worth keeping or deleting. The app should use AI to analyze selected photos, surface likely duplicates or low-value shots, and present clear keep/delete recommendations that the user can confirm.

## Platform and Stack

- Native mobile app, not a web app.
- React Native with TypeScript.
- iOS first, with camera roll access through native permissions and photo library APIs.
- Yarn for package management.
- Vercel AI Gateway for AI model access, routing, observability, and cost tracking.

## AI Architecture

The app should not embed provider credentials or long-lived AI Gateway secrets in the native client. Photo analysis requests should be sent through a secure backend boundary, such as a Vercel Function, which calls Vercel AI Gateway using server-side credentials or Vercel-managed authentication.

Initial AI responsibilities:

- Analyze user-selected photos for quality, duplicates, screenshots, blurry images, and low-information images.
- Return a structured recommendation: keep, review, or delete.
- Explain the recommendation in short, user-readable language.
- Support batching so users can review groups of photos efficiently.
- Distinguish between merely imperfect photos and genuinely unimportant photos. A blurry photo of a meaningful moment may still be green or yellow, while a sharp duplicate, accidental screenshot, receipt, or pocket photo may be red.
- Avoid overconfident deletion recommendations when the image contains people, pets, travel, documents, memories, or anything that may be personally meaningful.

## Intended User Flow

The app should feel like an assisted camera roll cleanup tool, not an automatic deletion bot.

1. The user grants photo library access.
2. The app loads the camera roll and begins with a limited visible set.
3. AI analysis starts only for the photos needed by the current UI mode.
4. The user reviews AI recommendations through either the grid or swipe interface.
5. The app records explicit keep/delete decisions.
6. Before destructive deletion, the user sees a final confirmation list.
7. Deleted photos are removed only after the user confirms through the native iOS photo deletion flow.

## Core User Interfaces

The app should have two primary ways to review the camera roll. Both UIs are powered by the same underlying photo analysis state, so a photo analyzed in one mode should already have its status available in the other.

### 1. Whole-Library Grid View

The grid view is the "map" of the user's photo library. It should present the entire camera roll as a chronological thumbnail grid, but only allow the user to move deeper into the library as AI analysis keeps up with what is currently visible.

Each photo tile should show an AI status tag:

- Green: important, meaningful, or likely worth keeping.
- Yellow: unsure, medium-value, ambiguous, or worth human review.
- Red: unimportant, low-quality, redundant, or likely safe to delete.

The tag should be visible directly on the thumbnail, ideally as a small color badge or border that does not obscure the image. Tiles that have not been analyzed yet should have a distinct "analyzing" or pending state instead of showing a guessed color.

#### Grid Analysis Behavior

Photos should be analyzed as they come into view. The grid should maintain an analysis window that includes:

- The photos currently visible on screen.
- A small buffer just before and after the visible range.
- Any previously visible photos that still need analysis before the user can continue scrolling deeper.

The depth of scrolling should be limited by the analysis progress of prior photos. In practical terms: the user should not be able to keep loading more and more thumbnails far beyond the current analyzed frontier. Before the app reveals the next page or deeper scroll segment, the current screen-viewable photos should be analyzed.

This creates a controlled pacing loop:

1. The user opens the grid.
2. The first visible photos begin analysis immediately.
3. The grid shows pending states while analysis is in flight.
4. Completed photos receive green, yellow, or red tags.
5. Once the current visible set is analyzed, the user can scroll farther.
6. Newly visible photos enter the analysis queue, and the same gating repeats.

The goal is not to block every tiny scroll gesture, but to prevent the UI from outrunning the AI system. The user should always be reviewing a region of the library where the visible photos either have tags or are actively being analyzed.

#### Grid User Actions

The grid should make it easy to:

- Scan the whole library by AI status.
- Visually identify clusters of red or yellow photos.
- Filter or focus on red candidates, yellow candidates, or unreviewed photos.
- Tap a photo to inspect the AI explanation.
- Select one or more photos for keep/delete review.
- Jump from a selected grid region into swipe review.
- Preserve user overrides if the user changes a photo from red to keep or green to delete.

### 2. Swipe Review UI

The swipe review mode is a focused, Tinder-like flow for deciding on photos one at a time. It should be optimized for fast decisions once the AI has finished evaluating the current photo.

Core gestures:

- Swipe right to mark the current photo to keep.
- Swipe left to mark the current photo to delete.

The review order can be chronological or AI-prioritized, but it should feel deterministic and explainable. For example, the app may default to library order, then later offer a queue of likely-red photos for faster cleanup.

#### Swipe Analysis Behavior

The current photo must be evaluated before the user can swipe it. If the active card is still being analyzed, swiping should be disabled and the UI should show a clear analyzing state.

The app should also analyze a few photos ahead of the current one. This ahead-of-current queue should keep the next cards ready without sending the entire library to the AI at once. A typical queue might include:

- Current photo: highest priority; must be analyzed before interaction.
- Next 2-5 photos: pre-analyzed so the user can keep moving.
- Later photos: left untouched until they approach the front of the queue.

If the user reaches a card before analysis is complete, the swipe UI should pause on that card until the result is ready. The app should not allow a blind swipe on a photo whose AI result has not finished.

#### Swipe Card Content

Each card should show:

- The photo at large size.
- The AI status color: green, yellow, or red.
- A short reason for the recommendation.
- The available action hints: swipe right to keep, swipe left to delete.
- A visible pending/analyzing state when analysis is not done.

For yellow photos, the UI should emphasize uncertainty and encourage the user to make the final call. For red photos, the app can be more direct, but deletion should still require a user action.

#### Swipe Decision State

Swiping should mark intent, not necessarily immediately delete from the system photo library. A safer flow is:

1. User swipes right or left through photos.
2. The app builds a keep list and a delete list.
3. The user reviews the delete list.
4. The app requests final confirmation before deleting from the camera roll.

This protects users from accidental deletion and gives them a chance to undo or rescue photos before destructive changes happen.

## Shared Analysis and Status Model

Both UIs should share the same photo status model. A photo can move through these states:

- Not queued: the app knows about the photo but has not scheduled analysis.
- Queued: the photo is waiting for AI analysis.
- Analyzing: the photo is actively being evaluated.
- Analyzed green: AI recommends keeping it.
- Analyzed yellow: AI is unsure or the photo is medium-value.
- Analyzed red: AI recommends deleting or reviewing for deletion.
- User marked keep: the user explicitly chose to keep it.
- User marked delete: the user explicitly chose to delete it.

User decisions should override AI recommendations. If the AI marks a photo red but the user swipes right, the app should treat the user decision as authoritative while still retaining the AI explanation for context.

The AI result should ideally include:

- `status`: green, yellow, or red.
- `confidence`: a numeric or categorical confidence score.
- `reason`: a short human-readable explanation.
- `signals`: optional labels such as blurry, duplicate-like, screenshot, receipt, low-light, document, pet, person, scenic, or memory-worthy.
- `reviewPriority`: a value that can help order swipe queues or filters.

## Analysis Scheduling Principles

The app should be conservative about AI work. It should analyze enough photos to keep the current UI useful, but not blindly process the entire camera roll in the background.

For the grid:

- Prioritize visible photos.
- Then prioritize the small buffer around the visible viewport.
- Gate deeper scrolling until the current screen-viewable photos are analyzed.

For swipe review:

- Prioritize the active card.
- Then pre-analyze a few upcoming cards.
- Block swiping only when the active card is not ready.

The backend should support batched analysis requests where possible, but the client should maintain enough queue state to avoid duplicate analysis and to recover gracefully if the app is backgrounded or loses network connectivity.

## Product Principles

- User control: the app recommends actions, but the user confirms deletion.
- Privacy first: request the minimum required photo access and avoid uploading photos without explicit user action.
- Transparency: explain why each photo was marked for deletion or review.
- Safety: favor "review" over "delete" when confidence is low.

## Near-Term Project Shape

Future implementation should start with:

1. A React Native/TypeScript app scaffold configured for iOS.
2. Yarn-based dependency management.
3. Photo library permission and selection flow.
4. A secure AI analysis API boundary that routes model calls through Vercel AI Gateway.
5. A shared photo analysis state model for queued, analyzing, analyzed, and user-decided photos.
6. An analysis scheduler that can prioritize visible grid photos or the active swipe card plus a small lookahead queue.
7. A grid review UI with green/yellow/red AI status tags and analysis-aware scrolling.
8. A swipe review UI with ahead-of-current photo analysis and swipe gating until the active photo is ready.
9. A final delete confirmation flow that separates "marked for deletion" from actually deleting photos from the iOS library.
