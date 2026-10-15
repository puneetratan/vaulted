const ProdConfig = {
  environment: 'production' as const,
  appName: 'Vaulted',

  // Firebase
  firebaseProjectId: 'vaulted',
  functionsRegion: 'us-central1',

  // App identifiers
  bundleId: 'com.vaultedapp',       // iOS
  androidPackage: 'com.vaultedapp', // Android

  // Apple subscription validation
  appleBundleId: 'com.vaultedapp',

  // Google Sign-In (web OAuth client from vaulted-6b9b9's google-services.json)
  googleWebClientId: '899300491798-duum91r4a43u526a1uvta6qofjpa31i6.apps.googleusercontent.com',

  // Google Sign-In: iOS OAuth client (CLIENT_ID from ios/GoogleService-Info-prod.plist).
  // Must match Info.plist's CFBundleURLSchemes $(GOOGLE_REVERSED_CLIENT_ID), which resolves
  // to the prod value in the Release build configuration.
  googleIosClientId: '899300491798-jepucsko6qk160vnf84ej7m0b2nmph0c.apps.googleusercontent.com',

  // Feature flags
  enableDebugLogs: false,
};

export default ProdConfig;
