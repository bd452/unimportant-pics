# unimportant-pics

## Overview

`unimportant-pics` is a native iOS application that uses AI to help users clean up their camera roll. The app scans photos on the device, analyzes them with a vision-capable language model, and recommends which photos to keep and which to delete (e.g. blurry shots, accidental screenshots, duplicates, low-value images).

## Goals

- Reduce the friction of cleaning up a cluttered camera roll.
- Use AI to make per-photo keep/delete recommendations with a short justification.
- Keep the user in control: the app suggests, the user confirms before anything is deleted.
- Run as a native iOS experience with smooth access to the Photos library.

## Tech Stack

- **Platform:** Native iOS (no web app)
- **Framework:** React Native
- **Language:** TypeScript
- **Package manager:** Yarn
- **AI:** [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) as the unified entry point to vision-capable models
- **Photos access:** iOS Photos framework via a React Native photo library module (e.g. `@react-native-camera-roll/camera-roll` or `expo-media-library`, TBD)

## High-Level Architecture

1. **Photo access layer** — Requests permission and enumerates assets from the iOS camera roll. Loads thumbnails/previews for analysis without copying full-resolution originals unnecessarily.
2. **AI analysis layer** — Sends image data (or compact representations) to the Vercel AI Gateway. The gateway routes to a vision-capable model that returns a keep/delete recommendation plus a short reason.
3. **Review UI** — Presents the AI's recommendations in a swipeable, Tinder-style review interface so users can quickly accept or override suggestions.
4. **Deletion layer** — Batches user-confirmed deletions and applies them through the Photos framework (which prompts the user for final confirmation per iOS rules).

## Why Vercel AI Gateway

- Single integration point for multiple model providers.
- Centralized API keys, rate limiting, and observability.
- Easy to swap or A/B test underlying vision models without changing the app.

## Status

Project scaffolding has not started yet. This document is the initial project summary; the React Native app, gateway integration, and Photos access work will follow.
