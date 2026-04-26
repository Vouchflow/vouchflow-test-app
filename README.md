# Vouchflow Test App

A React Native debug harness for testing the Vouchflow SDK on iOS and Android. Covers all SDK code paths via a precision-industrial dark UI with a live request/response log, environment switcher, and edge-case simulation panel.

## Features

- **Panel 01 — Enrollment**: Enroll device, fetch device info, wipe and reset
- **Panel 02 — Session**: Create and inspect sessions with custom user IDs
- **Panel 03 — Verification**: Verify device signature, request OTP fallback, submit OTP code
- **Panel 04 — Network Graph**: Opt in to graph namespace, query reputation with signal breakdown
- **Panel 05 — Edge Cases**: Simulate reinstall, arm signature tamper, force session expiry, hammer rate limiter
- **Live Log**: Expandable request/response inspector, auto-scrolls, copy-all to clipboard
- **Env Switcher**: Toggle between local / staging / production instantly
- **Mock SDK**: Full in-memory mock with realistic latency simulation (200–800 ms). Drop in the real SDK by flipping `DEBUG_CONFIG.useMockSDK = false`.

## Requirements

- Node 20+
- Android Studio with Android SDK (API 28+) for Android builds
- Xcode 15+ for iOS builds (macOS only)
- Java 17+ for Gradle builds

## Quick start

```bash
git clone https://github.com/Vouchflow/vouchflow-test-app.git
cd vouchflow-test-app
npm install
```

### Android

```bash
# Start Metro
npm start

# In a separate terminal
npm run android
```

Or build a debug APK directly:

```bash
cd android
./gradlew assembleDebug
# APK output: android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS (macOS only)

```bash
cd ios && bundle exec pod install && cd ..
npm run ios
```

## Project structure

```
src/
  config/
    debug.config.ts       Environment URLs, feature flags
  theme/
    colors.ts             Full design-system color palette
    typography.ts         Font scale (system fonts)
    spacing.ts            Spacing + border-radius tokens
  sdk/
    types.ts              All TypeScript types
    VouchflowClient.ts    IVouchflowClient interface
    MockVouchflowClient.ts  Full mock implementation
  hooks/
    useLogger.ts          Log store: last 500 entries, copy-all
    useDeviceState.ts     Device info state wrapper
    useSDKClient.ts       Client factory, env switching
  components/
    DeviceStatusBar.tsx   Sticky header: device ID, platform, status
    PanelBlock.tsx        Collapsible dark card with teal border
    ActionButton.tsx      Primary / secondary / danger / ghost variants
    StatusBadge.tsx       Pill chip with status color mapping
    LiveLog.tsx           40% screen live log console
    LogEntry.tsx          Expandable log row with JSON inspector
    EnvPicker.tsx         Horizontal segmented env control
    OTPInput.tsx          6-box OTP entry with auto-advance
  screens/
    HarnessScreen.tsx     Main screen orchestrating all 5 panels
App.tsx
index.js
```

## Environment configuration

All environment settings live in `src/config/debug.config.ts`. No external environment variables are needed — sandbox keys are hardcoded there for convenience.

| Setting | Description |
|---|---|
| `ENVIRONMENTS.sandbox.writeKey` | Sandbox write key (`vsk_sandbox_...`) — pre-filled |
| `ENVIRONMENTS.sandbox.readKey` | Sandbox read key (`vsk_sandbox_read_...`) — pre-filled |
| `ENVIRONMENTS.production.writeKey` | Production write key — fill in before live testing |
| `ENVIRONMENTS.production.readKey` | Production read key — fill in before live testing |
| `DEBUG_CONFIG.defaultEnv` | Active environment (`sandbox` or `production`) |
| `DEBUG_CONFIG.useMockSDK` | `true` = in-memory mock, `false` = real SDK |

No `customerId` is needed — the customer account is identified server-side from the API key.

## Swapping in the real SDK

Set `useMockSDK: false` in `src/config/debug.config.ts` to route all calls through the real native SDKs.

### Android

The Android native bridge (`VouchflowBridgeModule.kt`) is already wired up. The SDK is currently included as a local AAR for development. To switch to the published Maven Central artifact once the first release is tagged:

**1.** In `android/app/build.gradle`, replace:

```groovy
// Vouchflow SDK (local AAR)
implementation(files('libs/vouchflow-sdk.aar'))

// Transitive dependencies required by the Vouchflow SDK
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.google.code.gson:gson:2.10.1")
implementation("com.google.android.play:integrity:1.4.0")
implementation("androidx.biometric:biometric:1.2.0-alpha05")
implementation("androidx.activity:activity-ktx:1.8.2")
implementation("androidx.lifecycle:lifecycle-process:2.7.0")
implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
```

With:

```groovy
// Vouchflow SDK (Maven Central)
implementation("com.vouchflow:android-sdk:1.0.0")
```

Transitive dependencies are declared in the published POM and resolved automatically.

**2.** Sync Gradle.

### iOS

> ⚠️ The iOS native bridge has not been implemented yet. The `RealVouchflowClient` currently routes all calls through `VouchflowBridge` (the Android bridge name). An iOS-specific Swift bridge module is needed before the real SDK can be used on iOS.

When the iOS bridge is ready, add the SDK via Xcode: **File → Add Package Dependencies**, enter `https://github.com/vouchflow/ios-sdk`, and pin to the latest release tag.

## Mock SDK behavior

- All calls have randomized 200–800 ms latency
- `tamperNextSignature()`: arms a flag so the next `verify()` returns HTTP 401
- `forceExpireSession(id)`: immediately marks session as EXPIRED
- `hammerRateLimit(n)`: fires `n` requests; returns 429 after threshold (default: 10)
- `simulateReinstall()`: clears all in-memory state (device ID, sessions, graph opt-ins)
- OTP validation: any non-repeating 6-digit code passes; repeated digits (e.g. 111111) fail

## Android APK

A pre-built debug APK is attached to the [v0.1.0 GitHub release](https://github.com/Vouchflow/vouchflow-test-app/releases/tag/v0.1.0). Install it with:

```bash
adb install vouchflow-test-app-v0.1.0.apk
```

Or build from source (requires Java 17+ and Android SDK API 36):

```bash
export ANDROID_HOME=$HOME/android-sdk
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Design system

Dark precision-industrial aesthetic:

- Background: `#0A0B0E` base, `#111318` surface, `#191C23` raised
- Brand: `#00E5BE` teal primary with glow/dim variants
- Status: teal verified, amber pending, red failed
- Typography: system sans / monospace, 11-step scale
- All styles use `StyleSheet.create()` referencing theme tokens — no inline color strings

## License

Private — Vouchflow internal use only.
