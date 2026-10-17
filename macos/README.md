# Transight AI · macOS

Native macOS development workspace for **Transight AI**. This is a SwiftUI app shell that shares the product vocabulary and translation constraints with the browser extension, while keeping platform-specific code isolated under `macos/`.

## Requirements

- macOS 14 Sonoma or later
- Xcode 16 or later
- Swift 6 toolchain

## Open and run

```bash
open macos/TransightAI.xcodeproj
```

Select the `TransightAI` scheme and run on **My Mac**. An unsigned debug app can also be built from the repository root:

```bash
macos/scripts/build.sh
```

The app currently uses an explicit `DemoTranslationService`: it returns a fixed offline fixture, sends no text over the network, and labels the output as a demo. This keeps the UI and state flow testable before a production provider is selected.

## Structure

- `Sources/TransightApp/` — SwiftUI app, workspace, settings, menu bar extra, and presentation layer.
- `Sources/TransightCore/` — platform-independent translation contracts, preferences, validation, and observable app state.
- `Tests/TransightCoreTests/` — Swift Testing coverage for validation, cancellation, stale-result protection, history privacy, and persistence.
- `Configuration/` — app metadata and sandbox entitlements.
- `scripts/build.sh` — reproducible local Xcode build without code signing.

## Planned integration points

1. Replace `DemoTranslationService` with an actor-backed HTTP provider implementing `TranslationService`.
2. Store API credentials in Keychain; never encode secrets in `Preferences` or `UserDefaults`.
3. Add streaming output and multi-model result cards, matching the browser extension's current product behavior.
4. Add global selection translation through a Service/shortcut or accessibility integration, with explicit user permission and cancellation.
5. Add an onboarding flow, provider/model settings, and app icon assets before distribution.
