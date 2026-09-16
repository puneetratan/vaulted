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

  // Feature flags
  enableDebugLogs: true,
};

export default DevConfig;
