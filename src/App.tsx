import React from 'react';
import 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Platform} from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import {AuthProvider} from './contexts/AuthContext';

// console.log('Initializing Firebase...');
// // Initialize Firebase on native platforms
// const firebaseConfig = {
//   apiKey: "AIzaSyBZuRY5RIdwCG7TmI81u8tOmX5-dG8h1IM",
//   authDomain: "dev-vaultapp.firebaseapp.com",
//   projectId: "dev-vaultapp",
//   storageBucket: "dev-vaultapp.firebasestorage.app",
//   messagingSenderId: "872715867979",
//   appId: "1:872715867979:web:ceafa65bf8bfc5a7db7ace",
//   measurementId: "G-PNKEGHHYSF"
// };

// const firebaseAppModule = require('@react-native-firebase/app');
// firebaseAppModule.initializeApp(firebaseConfig);
// console.log('Firebase initialized');

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;

