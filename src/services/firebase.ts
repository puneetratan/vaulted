import appModule, { getApps, getApp, initializeApp } from '@react-native-firebase/app';
import type { ReactNativeFirebase } from '@react-native-firebase/app';
import { getAuth as rnGetAuth } from '@react-native-firebase/auth';
import { getFirestore as rnGetFirestore } from '@react-native-firebase/firestore';
import { getStorage as rnGetStorage } from '@react-native-firebase/storage';
import { getFunctions as rnGetFunctions, connectFunctionsEmulator } from '@react-native-firebase/functions';
import { Platform } from "react-native";

console.log('=========Platform=========', Platform.OS);
const firebaseConfig = {
  apiKey: "AIzaSyBZuRY5RIdwCG7TmI81u8tOmX5-dG8h1IM",
  authDomain: "dev-vaultapp.firebaseapp.com",
  projectId: "dev-vaultapp",
  storageBucket: "dev-vaultapp.firebasestorage.app",
  messagingSenderId: "872715867979",
  appId: "1:872715867979:ios:5a876d48f392bdf0db7ace",
  measurementId: "G-PNKEGHHYSF",
  databaseURL: "https://dev-vaultapp-default-rtdb.firebaseio.com",
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
