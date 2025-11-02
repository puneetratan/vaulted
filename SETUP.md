# Setup Instructions

## Prerequisites

1. Node.js (v18 or higher)
2. React Native CLI: `npm install -g react-native-cli`
3. For iOS:
   - Xcode (latest version)
   - CocoaPods: `sudo gem install cocoapods`
4. For Android:
   - Android Studio
   - Android SDK
   - Java Development Kit (JDK)

## Initial Setup

1. Install dependencies:
```bash
npm install
```

2. For iOS, install pods:
```bash
cd ios && pod install && cd ..
```

## Running the App

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Configuration

### Google Sign-In Setup

1. Get your Google OAuth credentials from [Firebase Console](https://console.firebase.google.com/)
2. For iOS:
   - Enable Google Sign-In in Firebase Console: Authentication > Sign-in providers > Google
   - Download `GoogleService-Info.plist` from Firebase Console > Project Settings
   - Place it in `ios/VaultTemp/` directory (already done)
   - Open Xcode and add `GoogleService-Info.plist` to your target:
     - Drag the file into Xcode project navigator
     - Make sure "Copy items if needed" is checked
     - Ensure VaultTemp target is checked in "Add to targets" (Note: Project still uses VaultTemp name internally)
     - Verify it's listed in Build Phases > Copy Bundle Resources
3. For Android:
   - Add `google-services.json` to `android/app/` directory
4. Update `src/App.tsx` with your client IDs:
```typescript
GoogleSignin.configure({
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Get from Firebase Console > Project Settings > OAuth Client (iOS)
  webClientId: 'YOUR_WEB_CLIENT_ID', // Get from Firebase Console > Project Settings > OAuth Client (Web)
});
```

### Apple Sign-In Setup (iOS only)

1. Enable Sign in with Apple capability in Xcode
2. Configure your Apple Developer account
3. The code is already set up to handle Apple Sign-In on iOS

### Vector Icons Setup

For iOS, add to `ios/Podfile`:
```ruby
pod 'RNVectorIcons', :path => '../node_modules/react-native-vector-icons'
```

For Android, add to `android/app/build.gradle`:
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

### Image Picker Setup

Add permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

Add to `ios/Info.plist`:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to upload images</string>
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos</string>
```

### Camera/Barcode Scanner Setup

The barcode scanner uses `react-native-vision-camera`. You'll need to:

1. Add camera permissions (similar to image picker)
2. Configure native permissions in both iOS and Android

## Project Structure

```
src/
├── App.tsx                    # Main app entry point
├── navigation/
│   └── AppNavigator.tsx      # Navigation setup
├── screens/
│   ├── SplashScreen.tsx      # Splash screen with Vault logo
│   ├── LoginScreen.tsx       # Login with Google/Apple
│   └── DashboardScreen.tsx   # Main dashboard
├── components/
│   ├── ShoeSizeModal.tsx     # Shoe size popup
│   ├── DashboardTabs.tsx     # Tabs component
│   └── AddItemOptions.tsx    # Add item modal with 3 options
└── types/
    └── index.ts              # TypeScript type definitions
```

## Features Implemented

✅ Splash screen with "Vaulted" logo  
✅ Login screen with Google Sign-In  
✅ Apple Sign-In for iOS  
✅ Dashboard with hamburger menu, search, and notification icons  
✅ Shoe size popup modal  
✅ Three tabs: Total Pairs, Brands, Total Value  
✅ Add Item button with three options:
  - Barcode Reader (placeholder)
  - XLS Import (functional)
  - Image Upload (functional)

## Next Steps

1. Implement barcode scanning functionality
2. Connect to backend/API
3. Add state management (Redux/Context API)
4. Implement actual data storage
5. Add error handling and loading states
6. Implement search and notification functionality


