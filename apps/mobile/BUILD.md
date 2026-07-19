# Building testable Little Grip apps (Android APK & iPad)

Little Grip is an **Expo (managed) React Native app** using native modules
(`@shopify/react-native-skia`, `expo-sqlite`), so **Expo Go cannot run it** — it
needs a real native build. This guide covers the two ways to get an installable
build you can test.

> These builds cannot be produced inside the Claude cloud session: its egress
> policy blocks Google's Android download servers (`dl.google.com`), so the
> Android SDK and Gradle dependencies can't be fetched there. Run the steps below
> on your own machine (normal internet) or use EAS cloud builds.

The build profiles referenced here live in [`eas.json`](./eas.json).

---

## Option A — EAS Build (cloud, easiest; does both platforms)

EAS builds on Expo's servers, so you don't install Android Studio or Xcode.

**One-time setup**

```bash
npm install -g eas-cli
cd apps/mobile
eas login                 # free Expo account (expo.dev)
eas init                  # creates the EAS project + writes extra.eas.projectId to app.json
```

**Android — installable APK** (the `preview` profile builds an `.apk`, not an
`.aab`, so it side-loads directly onto a device):

```bash
eas build --platform android --profile preview
```

When it finishes (~10–15 min) EAS prints a download URL. Download the `.apk`,
copy it to your Android device, and install it (enable *Install unknown apps*
for your file manager/browser first).

**iPad / iPhone — IPA:** iOS builds must be signed with an Apple account.

```bash
eas build --platform ios --profile preview
```

- With a **paid Apple Developer account** ($99/yr), EAS handles signing and gives
  you an install link (register your iPad's UDID when prompted for internal
  distribution).
- With only a **free Apple ID**, EAS cannot create a device build — use Option B
  (Mac + Xcode) for a free 7-day sideload instead.

---

## Option B — Local build on your own machine

### Android APK (Windows/macOS/Linux)

1. Install **JDK 17**, **Android Studio** (which brings the Android SDK), and set
   `ANDROID_HOME`.
2. From the repo root:

   ```bash
   npm install
   cd apps/mobile
   npx expo prebuild --platform android     # generates the android/ project
   cd android
   ./gradlew assembleRelease                 # bundles JS + builds the APK
   ```

3. The installable APK is at
   `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
   (Expo's template signs the release build with the debug keystore, so it
   installs without extra signing setup — fine for testing, not for the Play
   Store.)

### iPad (requires a Mac)

iOS apps can only be built on **macOS with Xcode** — there is no Windows/Linux
path.

1. On a Mac: install **Xcode**, then:

   ```bash
   npm install
   cd apps/mobile
   npx expo prebuild --platform ios
   npx expo run:ios --device        # pick your connected iPad
   ```

2. In Xcode (`ios/LittleGrip.xcworkspace`) select your iPad and your personal
   Apple ID team to sign. A **free Apple ID** allows a **7-day** sideload to your
   own device; a paid Apple Developer account removes the 7-day limit and enables
   TestFlight.

---

## Notes

- App identifiers (already set in `app.json`): Android package and iOS bundle id
  are `au.example.littlegrip`. Change these to your own reverse-domain id before
  any store submission.
- `ios.supportsTablet` is `true`, so the build runs natively on iPad.
- The child-safety permission blocks in `app.json` (no location/camera/mic/
  contacts/advertising-id) are enforced by the CI manifest audit — keep them.
- No custom icon/splash is set yet, so builds use Expo's defaults. Add
  `icon`/`splash` in `app.json` when you want branded artwork.
