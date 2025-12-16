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

// Lazy initialization function
const initializeFirebase = () => {
  if (!app) {
    try {
      // ✅ Get existing app or initialize default one (no config needed for native)
      app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      
      // ✅ Initialize modular API instances only once
      if (!authInstance) {
        authInstance = rnGetAuth(app);
      }
      // Firestore is initialized lazily via getFirestore() to avoid DataStore issues during auth
      // Don't initialize it here - only initialize when explicitly requested
      if (!storageInstance) {
        storageInstance = rnGetStorage(app);
      }
      if (!functionsInstance) {
        try {
          functionsInstance = rnGetFunctions(app);
        } catch (functionsError) {
          console.warn('[Firebase] Functions initialization failed (non-critical):', functionsError);
          // Don't crash if Functions fail to initialize
          functionsInstance = null;
        }
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }
  return app;
};

// Initialize on first import, but delay Firestore operations slightly
// to avoid race conditions with thread pool initialization
let initializationPromise: Promise<void> | null = null;

const ensureInitialized = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      initializeFirebase();
      // Small delay to ensure Firestore thread pool is ready
      await new Promise(resolve => setTimeout(resolve, 50));
    })();
  }
  return initializationPromise;
};

// Initialize on first import
initializeFirebase();

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export const functions = functionsInstance;

export const getAuth = () => {
  if (!authInstance) {
    initializeFirebase();
  }
  return authInstance;
};

export const getFirestore = () => {
  if (!app) {
    initializeFirebase();
  }
  if (!dbInstance) {
    try {
      dbInstance = rnGetFirestore(app);
      // Enable offline persistence for better reliability
      if (dbInstance && dbInstance.enableNetwork) {
        dbInstance.enableNetwork().catch(() => {
          // Ignore if already enabled or network errors
        });
      }
    } catch (e) {
      console.error('[Firebase] Firestore initialization error:', e);
      throw e;
    }
  }
  return dbInstance;
};

export const getStorage = () => {
  if (!storageInstance) {
    initializeFirebase();
  }
  return storageInstance;
};

export const getFunctions = () => {
  try {
    if (!functionsInstance) {
      initializeFirebase();
    }
    return functionsInstance;
  } catch (error) {
    console.warn('[Firebase] Functions not available:', error);
    return null; // Return null instead of crashing
  }
};

// ✅ Optional emulator setup - only if explicitly enabled
// Commented out to avoid connection issues if emulator isn't running
// if (__DEV__ && process.env.ENABLE_FUNCTIONS_EMULATOR === 'true') {
//   try {
//     if (functionsInstance) {
//       connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
//       console.log('[Firebase] Connected to Functions emulator');
//     }
//   } catch (err) {
//     console.warn('[Firebase] Emulator connection failed:', err);
//   }
// }

// Helper function to safely execute Firestore operations with error handling
export const safeFirestoreOperation = async <T>(
  operation: () => Promise<T>,
  retries = 1
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Check if it's a RejectedExecutionException (thread pool terminated)
    const errorMessage = error?.message || '';
    const isRejectedExecution = 
      errorMessage.includes('RejectedExecutionException') ||
      errorMessage.includes('rejected from') ||
      errorMessage.includes('Terminated');
    
    if (isRejectedExecution && retries > 0) {
      console.warn('[Firebase] Firestore thread pool error, re-initializing...', error);
      // Re-initialize Firestore
      try {
        dbInstance = null;
        initializeFirebase();
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 100));
        return await safeFirestoreOperation(operation, retries - 1);
      } catch (retryError) {
        console.error('[Firebase] Failed to re-initialize Firestore:', retryError);
        throw error; // Throw original error
      }
    }
    throw error;
  }
};

export default app;
