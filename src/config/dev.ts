const DevConfig = {
  environment: 'development' as const,
  appName: 'Vaulted Dev',

  // Firebase
  firebaseProjectId: 'dev-vaultapp',
  functionsRegion: 'us-central1',

  // App identifiers
  bundleId: 'com.vault.dev',       // iOS
  androidPackage: 'com.vault.dev', // Android

  // Apple subscription validation
  appleBundleId: 'com.vaulted.dev',

  // Google Sign-In: web OAuth client from the dev-vaultapp project's google-services.json
  // (android/app/src/dev/google-services.json), matching androidPackage above.
  googleWebClientId: '872715867979-rmth3jpbic8jorgksr6i9r6j83vjqpdo.apps.googleusercontent.com',

  // Google Sign-In: iOS OAuth client (CLIENT_ID from ios/VaultTemp/GoogleService-Info.plist).
  // Must match the CFBundleURLSchemes entry in Info.plist ($(GOOGLE_REVERSED_CLIENT_ID),
  // dev value in the Debug build configuration) -- a mismatch here was the cause of a crash
  // Apple's review flagged tapping Google Sign-In on the prod build (iosClientId was
  // hardcoded to this dev value regardless of environment).
  googleIosClientId: '872715867979-r9b7b05lutnkblrstufbrh00aaqehgb8.apps.googleusercontent.com',

  // Feature flags
  enableDebugLogs: true,
};

export default DevConfig;
