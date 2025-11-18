import {Platform} from 'react-native';
import {getFirestore} from './firebase';

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
    const firestoreDb = getFirestore();
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
    const firestoreDb = getFirestore();
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
    const firestoreDb = getFirestore();
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

/**
 * Delete all inventory items for a user
 */
export const deleteAllUserInventory = async (uid: string): Promise<void> => {
  try {
    const firestoreDb = getFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    if (isWebSDK) {
      // Web SDK API
      const { collection, query, where, getDocs, deleteDoc, doc } = require("firebase/firestore");
      const inventoryRef = collection(firestoreDb, "inventory");
      const q = query(inventoryRef, where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map((docSnapshot: any) => {
        return deleteDoc(doc(firestoreDb, "inventory", docSnapshot.id));
      });
      
      await Promise.all(deletePromises);
    } else {
      // React Native Firebase API
      const inventorySnapshot = await firestoreDb
        .collection("inventory")
        .where("userId", "==", uid)
        .get();
      
      const deletePromises = inventorySnapshot.docs.map((docSnapshot: any) => {
        return docSnapshot.ref.delete();
      });
      
      await Promise.all(deletePromises);
    }
  } catch (error: any) {
    console.error('Error deleting user inventory:', error);
    throw new Error(`Failed to delete user inventory: ${error.message}`);
  }
};

/**
 * Delete user account and all associated data
 */
export const deleteUserAccount = async (uid: string, photoURL?: string | null): Promise<void> => {
  try {
    const firestoreDb = getFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    // 1. Delete all inventory items
    try {
      await deleteAllUserInventory(uid);
    } catch (error: any) {
      console.warn('Error deleting inventory items (continuing):', error);
    }

    // 2. Delete profile image from Storage if it exists
    if (photoURL) {
      try {
        const { getStorage } = require('./firebase');
        const storageInstance = getStorage();
        if (storageInstance) {
          if (Platform.OS === 'web') {
            const { ref, deleteObject } = require('firebase/storage');
            const storage = storageInstance;
            // Extract the path from the full URL
            const urlParts = photoURL.split('/');
            const pathIndex = urlParts.findIndex(part => part === 'profile');
            if (pathIndex !== -1) {
              const storagePath = urlParts.slice(pathIndex).join('/');
              const storageRef = ref(storage, storagePath);
              await deleteObject(storageRef);
            }
          } else {
            if (storageInstance.ref) {
              const storageRef = storageInstance.refFromURL
                ? storageInstance.refFromURL(photoURL)
                : storageInstance.ref(photoURL);
              await storageRef.delete();
            }
          }
        }
      } catch (storageError: any) {
        console.warn('Error deleting profile image (continuing):', storageError);
      }
    }

    // 3. Delete user profile document from Firestore
    if (isWebSDK) {
      const { doc, deleteDoc } = require("firebase/firestore");
      const userRef = doc(firestoreDb, USERS_COLLECTION, uid);
      await deleteDoc(userRef);
    } else {
      await firestoreDb.collection(USERS_COLLECTION).doc(uid).delete();
    }

    // 4. Delete Firebase Auth account (this should be done in the component after calling this function)
    // because we need the current user to be authenticated to delete the account
  } catch (error: any) {
    console.error('Error deleting user account:', error);
    throw new Error(`Failed to delete user account: ${error.message}`);
  }
};

