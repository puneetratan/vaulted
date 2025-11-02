import React from 'react';
import 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
// IMPORTANT: For Android to work, you need:
// 1. SHA-1 fingerprint added to Firebase Console
// 2. Web Client ID from Google Cloud Console (OAuth 2.0 Web application)
GoogleSignin.configure({
  iosClientId: '872715867979-r9b7b05lutnkblrstufbrh00aaqehgb8.apps.googleusercontent.com', // iOS OAuth Client ID
  // webClientId should be a Web Application OAuth 2.0 Client ID from Google Cloud Console
  // NOT the Android client ID from google-services.json
  // Get it from: https://console.cloud.google.com/apis/credentials
  webClientId: '872715867979-rmth3jpbic8jorgksr6i9r6j83vjqpdo.apps.googleusercontent.com', // Web OAuth Client ID (OAuth 2.0 Web application)
  offlineAccess: false, // Set to true only if you need server-side authentication
  forceCodeForRefreshToken: false, // Set to true only if you need server-side authentication
});

const App = () => {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;

