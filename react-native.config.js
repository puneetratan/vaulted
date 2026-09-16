module.exports = {
  dependencies: {
    '@invertase/react-native-apple-authentication': {
      platforms: {
        android: null, // disable Android platform, linking only on iOS
      },
    },
    'react-native-iap': {
      platforms: {
        // Android purchases go through a custom native module (see
        // android/app/src/main/java/com/vaultedapp/billing) wrapping Play
        // Billing Library 8.0.0+ directly, since react-native-iap only
        // supports Billing 8+ via its Nitro/New-Architecture rewrite.
        android: null,
      },
    },
  },
};

