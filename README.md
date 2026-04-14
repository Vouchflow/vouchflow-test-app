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

Edit `src/config/debug.config.ts` or set environment variables:

| Variable | Description |
|---|---|
| `VOUCHFLOW_STAGING_KEY` | API key for staging environment |
| `VOUCHFLOW_PROD_KEY` | API key for production environment |

## Swapping in the real SDK

1. Set `useMockSDK: false` in `src/config/debug.config.ts`
2. Implement `IVouchflowClient` (from `src/sdk/VouchflowClient.ts`) with the real SDK
3. Instantiate it in `src/hooks/useSDKClient.ts` in the `else` branch

## Mock SDK behavior

- All calls have randomized 200–800 ms latency
- `tamperNextSignature()`: arms a flag so the next `verify()` returns HTTP 401
- `forceExpireSession(id)`: immediately marks session as EXPIRED
- `hammerRateLimit(n)`: fires `n` requests; returns 429 after threshold (default: 10)
- `simulateReinstall()`: clears all in-memory state (device ID, sessions, graph opt-ins)
- OTP validation: any non-repeating 6-digit code passes; repeated digits (e.g. 111111) fail

## APK build note

Building the APK requires Java 17+ and the Android SDK. On this environment (Linux CI without Android SDK installed), the APK was not built. To build manually:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
cd android && ./gradlew assembleDebug
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
