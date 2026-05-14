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
5. A review UI that lets users accept or reject AI recommendations before deleting anything.
