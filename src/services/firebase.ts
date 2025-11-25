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
// ✅ Get existing app or initialize default one (no config needed for native)
app = getApps().length ? getApp() : initializeApp(firebaseConfig);
// ✅ Modular API instances
const authInstance = rnGetAuth(app);
const dbInstance = rnGetFirestore(app);
const storageInstance = rnGetStorage(app);
const functionsInstance = rnGetFunctions(app);

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export const functions = functionsInstance;

export const getAuth = () => authInstance;
export const getFirestore = () => dbInstance;
export const getStorage = () => storageInstance;
export const getFunctions = () => functionsInstance;

// ✅ Optional emulator setup
if (__DEV__) {
  try {
    connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
    console.log('[Firebase] Connected to Functions emulator');
  } catch (err) {
    console.warn('[Firebase] Emulator connection failed:', err);
  }
}

export default app;
