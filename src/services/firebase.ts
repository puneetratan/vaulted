// firebase.js
import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZuRY5RIdwCG7TmI81u8tOmX5-dG8h1IM",
  authDomain: "dev-vaultapp.firebaseapp.com",
  projectId: "dev-vaultapp",
  storageBucket: "dev-vaultapp.firebasestorage.app",
  messagingSenderId: "872715867979",
  appId: "1:872715867979:web:ceafa65bf8bfc5a7db7ace",
  measurementId: "G-PNKEGHHYSF"
};

// Initialize Firebase app based on platform
let app: any;

if (Platform.OS === 'web') {
  // Web: Use web Firebase SDK
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} else {
  // Native: Use React Native Firebase
  // React Native Firebase auto-initializes from GoogleService-Info.plist / google-services.json
  // We use the web SDK for auth, but React Native Firebase for Firestore
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// Export auth (using web SDK for both platforms)
export const auth = getAuth(app);

// Initialize Firestore based on platform
let db: any = null;
let storage: any = null;

// Function to initialize Firestore
const initializeFirestore = () => {
  if (db) {
    return db; // Already initialized
  }

  try {
    if (Platform.OS === 'web') {
      // Web: Use web Firebase SDK
      const { getFirestore } = require("firebase/firestore");
      db = getFirestore(app);
      console.log('Firestore initialized for web');
    } else {
      // Native: Use React Native Firebase
      // React Native Firebase auto-initializes from GoogleService-Info.plist / google-services.json
      try {
        const firestoreModule = require('@react-native-firebase/firestore');
        // Use firestore() which gets the default app's Firestore instance
        db = firestoreModule.default();
        console.log('Firestore initialized for native');
      } catch (nativeError: any) {
        console.warn('React Native Firebase not available, falling back to web SDK:', nativeError.message);
        // Fallback to web SDK if React Native Firebase isn't available
        const { getFirestore } = require("firebase/firestore");
        db = getFirestore(app);
        console.log('Firestore initialized using web SDK fallback on native');
      }
    }
  } catch (error: any) {
    console.error('Failed to initialize Firestore:', error);
    console.error('Error details:', error.message, error.stack);
    
    // For web, try importing at top level as fallback
    if (Platform.OS === 'web') {
      try {
        const { getFirestore } = require("firebase/firestore");
        db = getFirestore(app);
        console.log('Firestore initialized for web (fallback)');
      } catch (e: any) {
        console.error('Firestore initialization failed (fallback):', e);
        console.error('Fallback error details:', e.message, e.stack);
      }
    }
  }

  return db;
};

const initializeStorage = () => {
  if (storage) {
    return storage;
  }

  try {
    if (Platform.OS === 'web') {
      const { getStorage } = require('firebase/storage');
      storage = getStorage(app);
      console.log('Storage initialized for web');
    } else {
      try {
        const storageModule = require('@react-native-firebase/storage');
        storage = storageModule.default();
        console.log('Storage initialized for native');
      } catch (nativeError: any) {
        console.warn('React Native Firebase storage not available, falling back to web SDK:', nativeError.message);
        const { getStorage } = require('firebase/storage');
        storage = getStorage(app);
        console.log('Storage initialized using web SDK fallback on native');
      }
    }
  } catch (error: any) {
    console.error('Failed to initialize Storage:', error);
    console.error('Error details:', error.message, error.stack);
  }

  return storage;
};

// Initialize immediately
db = initializeFirestore();
storage = initializeStorage();

// Export Firestore instance and initialization function
export { db, initializeFirestore, storage, initializeStorage };
export default app;
