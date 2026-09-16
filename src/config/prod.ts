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

  // Feature flags
  enableDebugLogs: false,
};

export default ProdConfig;
