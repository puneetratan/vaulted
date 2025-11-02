# Vault App

A React Native app for managing shoe collection.

## Features

- Splash screen with Vault logo
- Google Sign-In (and Apple Sign-In for iOS)
- Dashboard with shoe collection tracking
- Barcode scanning, XLS import, and image upload

## Setup

1. Install dependencies:
```bash
npm install
```

2. For iOS:
```bash
cd ios && pod install && cd ..
```

3. Run the app:
```bash
npm run ios
# or
npm run android
# or
npm run web    # For web browser
```

## Configuration

### Google Sign-In
Configure your Google Sign-In credentials in the respective platform files:
- iOS: `ios/VaultTemp/GoogleService-Info.plist` (and add `iosClientId` in `src/App.tsx`)
- Android: `android/app/google-services.json`

Note: The iOS project directory is still named `VaultTemp` but the app displays as "Vaulted"

### Apple Sign-In (iOS only)
Configure in Xcode under Signing & Capabilities.

