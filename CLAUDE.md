# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Vaulted (package name "Vaulted", iOS project still named `VaultTemp`, bundle id `com.vaulted.dev`) is a React Native app for tracking a shoe collection: inventory with barcode scanning, XLS import, image upload, AI-assisted metadata lookup, and a paid subscription tier. It targets iOS, Android, and web (via `react-native-web`) from one `src/` tree, plus a Firebase Cloud Functions backend in `functions/`.

## Commands

### App (root)
```bash
npm install                # install deps (postinstall runs patch-package)
cd ios && pod install       # iOS native deps (after npm install)

npm run ios                 # run on iOS simulator
npm run android              # run on Android emulator
npm run web                  # webpack-dev-server on :3000

npm run lint                 # eslint .
npm test                     # jest
npm run test:watch
npm run test:coverage
npx jest __tests__/services/inventoryService.test.ts   # single test file
npx jest -t "name of test"                              # single test by name
```

### Cloud Functions (`functions/`)
```bash
cd functions
npm run serve                # firebase emulators:start --only functions
npm run shell                # firebase functions:shell
npm run deploy                # firebase deploy --only functions
npm run logs                  # firebase functions:log
```
Local emulator env vars come from `functions/.env` (see `.env.example`); in production, secrets are pulled from Secret Manager (see the `secrets` arrays in `firebase.json` and the `functions.runWith({ secrets: [...] })` calls per function).

## Architecture

### Cross-platform screen/component pairing
Most screens and some components have a `.web.tsx` twin (e.g. `LoginScreen.tsx` / `LoginScreen.web.tsx`, `AddItemOptions.tsx` / `AddItemOptions.web.tsx`). Metro resolves native files by default; webpack resolves `.web.tsx` first (see `resolve.extensions` in `webpack.config.js`). `AppNavigator.tsx` additionally does explicit `Platform.OS === 'web' ? require('./X.web') : require('./X')` for every screen it registers, so **adding a new screen used on web requires updating both the file pair and the conditional require in `src/navigation/AppNavigator.tsx`**. Native-only APIs (camera, vision-camera, barcode scanning, document picker) are only wired into the non-`.web` variants; the web variants substitute browser-friendly equivalents or stubs.

### App shell / providers
Entry points: `index.js` (native) and `index.web.js` (web) both mount `src/App.tsx` / `App.web.tsx`. The provider order wraps auth → subscription → theme (see `AuthContext`, `SubscriptionContext`, `ThemeContext` in `src/contexts/`) around `AppNavigator`. `AuthContext` owns Google/Apple sign-in (Firebase Auth) and exposes `useAuth()`. `SubscriptionContext` owns `react-native-iap` purchase flow + calls into Cloud Functions for receipt validation and exposes entitlement state via `useSubscriptionContext()`/`useSubscription()`-style hooks — gate premium-only UI (e.g. beyond `FREE_TIER_ITEM_LIMIT` items in `src/config/subscriptions.ts`) through this context rather than re-implementing limit checks.

### Firebase access layer
`src/services/firebase.ts` centralizes Firebase initialization and is the only place that should call `initializeApp`/`getApps`. It reads platform-specific config out of `firebaseConfig.json` (`ios` vs `android` keys) and exposes lazy `getAuth()`, `getFirestore()`, `getStorage()`, `getFunctions()` getters — call these getters rather than importing `@react-native-firebase/*` directly in screens/components, since Firestore/Functions are lazily initialized to avoid startup issues. `src/services/inventoryService.ts` and `userService.ts` are the data-access layer on top of this (Firestore reads/writes scoped by `userId`); screens should go through these services rather than querying Firestore directly.

### Cloud Functions (`functions/index.js`)
Single-file Firebase Functions v1 (`firebase-functions` v5 `.runWith(...).https.onCall/onRequest`) backend, callable from the client via `httpsCallable`. Key exports: `exportInventoryToExcel` (ExcelJS + nodemailer email delivery, handles Apple private-relay emails via `overrideEmail`), `analyzeShoeMetadata` (OpenAI-backed), `lookupbarcode` (BarcodeSpider), `validateAppleReceipt`/`validateGooglePurchase`/`handleAppleWebhook`/`handleGoogleWebhook`/`getSubscriptionStatus` (subscription/receipt validation, mirrors `FREE_TIER_ITEM_LIMIT` and product IDs also defined client-side in `src/config/subscriptions.ts` — keep the two in sync). Each function declares its own `secrets` array matching `firebase.json`.

### Testing
Jest with `react-native` preset; `jest.setup.js` centralizes mocks for `react-native-reanimated`, `@react-navigation/stack`, `react-native-safe-area-context`, `react-native-screens`, and other native modules — extend it there rather than re-mocking per test file. Tests live under `__tests__/`, mirroring `src/` structure (`components/`, `screens/`, `services/`).

### Native patches
`patches/` (applied via `patch-package` on `postinstall`) carries fixes for `react-native`, `@react-native-firebase/auth`, `react-native-gesture-handler`, and `react-native-reanimated`/`react-native-screens`. If bumping one of these dependencies, check whether the corresponding patch still applies/is still needed.

### Config files with real credentials
`firebaseConfig.json` (per-platform Firebase config) and native `GoogleService-Info.plist` / `google-services.json` are required for auth/Firestore/Storage to work — see `SETUP.md` for where each goes and how to obtain them. Google Sign-In client IDs are also hardcoded in `AuthContext.tsx`.
