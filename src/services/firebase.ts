import appModule, { getApps, getApp, initializeApp } from '@react-native-firebase/app';
import type { ReactNativeFirebase } from '@react-native-firebase/app';
import { getAuth as rnGetAuth } from '@react-native-firebase/auth';
import { getFirestore as rnGetFirestore } from '@react-native-firebase/firestore';
import { getStorage as rnGetStorage } from '@react-native-firebase/storage';
import { getFunctions as rnGetFunctions, connectFunctionsEmulator } from '@react-native-firebase/functions';
import { Platform } from "react-native";
import firebaseConfigData from '../../firebaseConfig.json';


// Get platform-specific config
const platformConfig = Platform.OS === 'ios' ? firebaseConfigData.ios : firebaseConfigData.android;
const firebaseConfig = {
  apiKey: platformConfig.apiKey,
  authDomain: platformConfig.authDomain,
  projectId: platformConfig.projectId,
  storageBucket: platformConfig.storageBucket,
  messagingSenderId: platformConfig.messagingSenderId,
  appId: platformConfig.appId,
  measurementId: platformConfig.measurementId,
  databaseURL: platformConfig.databaseURL,
};


type FirebaseApp = ReactNativeFirebase.FirebaseApp;
let app: any;
let authInstance: any;
let dbInstance: any;
let storageInstance: any;
let functionsInstance: any;

// Initialize Firebase app
if (!app) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  // Initialize services
  authInstance = rnGetAuth(app);
  storageInstance = rnGetStorage(app);
  // Functions will be initialized lazily in getFunctions() to allow emulator connection
  // Firestore will be initialized lazily to avoid DataStore issues during auth
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

export const getAuth = () => {
  if (!authInstance) {
    if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = rnGetAuth(app);
  }
  return authInstance;
};

export const getFirestore = () => {
  if (!dbInstance) {
    if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    dbInstance = rnGetFirestore(app);
  }
  return dbInstance;
};

export const getStorage = () => {
  if (!storageInstance) {
    if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    storageInstance = rnGetStorage(app);
  }
  return storageInstance;
};

// ✅ Firebase Functions Configuration
// Set USE_EMULATOR to true only for local development with Firebase Emulator Suite
// For production/cloud deployment, keep this as false
const USE_EMULATOR = true; // Set to true to use local emulator, false to use cloud functions
// const EMULATOR_HOST = '127.0.0.1'; // Use your computer's IP (e.g., '192.168.1.100') for physical devices
const EMULATOR_HOST =
  Platform.OS === 'android'
    ? '10.0.2.2'   // Android emulator → host Mac
    : 'localhost'; // iOS simulator
const EMULATOR_PORT = 5001;



export const getFunctions = () => {
  if (!functionsInstance) {
    console.log('getFunctions() called.....');
    if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    functionsInstance = rnGetFunctions(app);
    
    // Connect to emulator only if explicitly enabled
    // IMPORTANT: This must happen immediately after creating the instance, before any calls
    if (USE_EMULATOR) {
      try {
        connectFunctionsEmulator(functionsInstance, EMULATOR_HOST, EMULATOR_PORT);
        console.log(`[Firebase] ✅ Connected to Functions emulator at ${EMULATOR_HOST}:${EMULATOR_PORT}`);
      } catch (err: any) {
        if (err.message?.includes('already been called')) {
          // Already connected, ignore
          console.log('[Firebase] Functions emulator already connected');
        } else {
          console.warn('[Firebase] Emulator connection failed:', err);
        }
      }
    } else {
      console.log('[Firebase] ✅ Using Cloud Functions (production)');
    }
  }
  return functionsInstance;
};

// Export functions - lazy initialization ensures emulator connection happens
export const functions = getFunctions();

export default app;
