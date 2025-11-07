import {Platform} from 'react-native';
import {db, initializeFirestore} from './firebase';
import {auth} from './firebase';

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'apple';
  shoeSize?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

const USERS_COLLECTION = 'user_profile';

/**
 * Get or create user document in Firestore
 */
export const getOrCreateUser = async (firebaseUser: any): Promise<UserData> => {
  try {
    // Try to initialize Firestore if it's not already initialized
    const firestoreDb = db || initializeFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    // Detect if we're using web SDK (no .collection method) or React Native Firebase (has .collection method)
    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    if (isWebSDK) {
      // Web SDK API
      const { doc, getDoc, setDoc, serverTimestamp } = require("firebase/firestore");
      const userRef = doc(firestoreDb, USERS_COLLECTION, firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      const userData: UserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        provider: firebaseUser.providerData[0]?.providerId === 'apple.com' ? 'apple' : 'google',
        shoeSize: userDoc.exists() ? userDoc.data()?.shoeSize : undefined,
        createdAt: userDoc.exists() && userDoc.data()?.createdAt 
          ? userDoc.data()?.createdAt.toDate() 
          : new Date(),
        lastLoginAt: new Date(),
      };

      await setDoc(userRef, {
        ...userData,
        createdAt: userDoc.exists() && userDoc.data()?.createdAt 
          ? userDoc.data()?.createdAt 
          : serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      }, { merge: true });

      return userData;
    } else {
      // React Native Firebase API
      const timestamp = require('@react-native-firebase/firestore').default.FieldValue.serverTimestamp();
      const userRef = firestoreDb.collection(USERS_COLLECTION).doc(firebaseUser.uid);
      const userDoc = await userRef.get();

      const userData: UserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        provider: firebaseUser.providerData[0]?.providerId === 'apple.com' ? 'apple' : 'google',
        shoeSize: userDoc.exists ? userDoc.data()?.shoeSize : undefined,
        createdAt: userDoc.exists && userDoc.data()?.createdAt 
          ? userDoc.data()?.createdAt.toDate() 
          : new Date(),
        lastLoginAt: new Date(),
      };

      await userRef.set({
        ...userData,
        createdAt: userDoc.exists && userDoc.data()?.createdAt 
          ? userDoc.data()?.createdAt 
          : timestamp,
        lastLoginAt: timestamp,
      }, { merge: true });

      return userData;
    }
  } catch (error: any) {
    console.error('Error getting or creating user:', error);
    throw new Error(`Failed to get or create user: ${error.message}`);
  }
};

/**
 * Get user data from Firestore
 */
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    // Try to initialize Firestore if it's not already initialized
    const firestoreDb = db || initializeFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    // Detect if we're using web SDK (no .collection method) or React Native Firebase (has .collection method)
    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    if (isWebSDK) {
      // Web SDK API
      const { doc, getDoc } = require("firebase/firestore");
      const userRef = doc(firestoreDb, USERS_COLLECTION, uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        uid: userDoc.id,
        email: data?.email || null,
        displayName: data?.displayName || null,
        photoURL: data?.photoURL || null,
        provider: data?.provider || 'google',
        shoeSize: data?.shoeSize || undefined,
        createdAt: data?.createdAt?.toDate() || new Date(),
        lastLoginAt: data?.lastLoginAt?.toDate() || new Date(),
      };
    } else {
      // React Native Firebase API
      const userDoc = await firestoreDb.collection(USERS_COLLECTION).doc(uid).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const data = userDoc.data();
      return {
        uid: userDoc.id,
        email: data?.email || null,
        displayName: data?.displayName || null,
        photoURL: data?.photoURL || null,
        provider: data?.provider || 'google',
        shoeSize: data?.shoeSize || undefined,
        createdAt: data?.createdAt?.toDate() || new Date(),
        lastLoginAt: data?.lastLoginAt?.toDate() || new Date(),
      };
    }
  } catch (error: any) {
    console.error('Error getting user data:', error);
    throw new Error(`Failed to get user data: ${error.message}`);
  }
};

/**
 * Update user data
 */
export const updateUserData = async (uid: string, updates: Partial<UserData>): Promise<void> => {
  try {
    // Try to initialize Firestore if it's not already initialized
    const firestoreDb = db || initializeFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    const updateData: any = {...updates};
    
    // Always ensure uid is included in the document data
    updateData.uid = uid;
    
    // Remove Date fields as they should be handled as Timestamps
    if ('createdAt' in updateData && updateData.createdAt instanceof Date) {
      delete updateData.createdAt; // Don't update createdAt
    }
    if ('lastLoginAt' in updateData && updateData.lastLoginAt instanceof Date) {
      delete updateData.lastLoginAt; // Don't update lastLoginAt directly
    }

    // Detect if we're using web SDK (no .collection method) or React Native Firebase (has .collection method)
    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    if (isWebSDK) {
      // Web SDK API - use setDoc with merge to create if doesn't exist, or update if it does
      const { doc, setDoc } = require("firebase/firestore");
      const userRef = doc(firestoreDb, USERS_COLLECTION, uid);
      await setDoc(userRef, updateData, { merge: true });
    } else {
      // React Native Firebase API - use set with merge to create if doesn't exist, or update if it does
      await firestoreDb.collection(USERS_COLLECTION).doc(uid).set(updateData, { merge: true });
    }
  } catch (error: any) {
    console.error('Error updating user data:', error);
    throw new Error(`Failed to update user data: ${error.message}`);
  }
};

