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

## Core User Interfaces

The app should support two complementary review modes.

### 1. Photo Library Grid

The grid view shows the user's photo library as a scrollable collection of thumbnails. Each visible photo should have an AI-generated status tag:

- Green: important and likely worth keeping.
- Yellow: unsure, medium-value, or needs human review.
- Red: unimportant and likely safe to delete.

Photos should be analyzed as they come into view. Scrolling should be intentionally backpressured by the analysis pipeline: the user should not be able to keep loading deeper into the library until the currently viewable photos, and enough of the preceding photos, have completed analysis. This keeps the UI from racing far ahead of the AI state and ensures every visible screen has meaningful labels.

The grid should make it easy to:

- Scan the whole library by AI status.
- Filter or focus on red/yellow candidates.
- Open a photo for more detail.
- Move selected photos into the keep/delete decision flow.

### 2. Swipe Review

The swipe review mode is a Tinder-like interface for deciding on photos one at a time, in library order or in an AI-prioritized review queue.

- Swipe right to mark the current photo to keep.
- Swipe left to mark the current photo to delete.
- The current photo must finish AI evaluation before it can be swiped.
- The app should evaluate a small number of upcoming photos ahead of the current card so recommendations feel ready by the time the user reaches them.

If the next card is not analyzed yet, the UI should pause interaction and show a clear analyzing state instead of allowing an uninformed swipe. AI output should be visible enough to help the user decide, but the final keep/delete action remains user-controlled.

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
5. A grid review UI with green/yellow/red AI status tags and analysis-aware scrolling.
6. A swipe review UI with ahead-of-current photo analysis and swipe gating until the active photo is ready.
