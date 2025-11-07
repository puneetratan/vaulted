import { Platform } from "react-native";
import { db, initializeFirestore, initializeStorage } from "./firebase";
import { auth } from "./firebase";

export interface InventoryItem {
  id?: string;
  name: string;
  brand: string;
  size: string;
  color?: string;
  value: number;
  imageUrl?: string;
  barcode?: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

interface InventoryQueryOptions {
  limit?: number;
  startAfter?: any;
}

interface InventoryQueryResult {
  items: InventoryItem[];
  lastDoc: any | null;
}

// Save inventory item to Firestore
export const saveInventoryItem = async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to save inventory items');
    }

    // Try to initialize Firestore if it's not already initialized
    const firestoreDb = db || initializeFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    // Detect if we're using web SDK (no .collection method) or React Native Firebase (has .collection method)
    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    // Remove undefined fields as Firestore doesn't allow undefined values
    const cleanItem: any = {};
    Object.keys(item).forEach(key => {
      if (item[key as keyof typeof item] !== undefined) {
        cleanItem[key] = item[key as keyof typeof item];
      }
    });

    const itemData = {
      ...cleanItem,
      userId: user.uid,
      createdAt: isWebSDK 
        ? require('firebase/firestore').serverTimestamp()
        : require('@react-native-firebase/firestore').default.FieldValue.serverTimestamp(),
      updatedAt: isWebSDK 
        ? require('firebase/firestore').serverTimestamp()
        : require('@react-native-firebase/firestore').default.FieldValue.serverTimestamp(),
    };

    if (isWebSDK) {
      // Web SDK API
      const { collection, addDoc } = require("firebase/firestore");
      const docRef = await addDoc(collection(firestoreDb, "inventory"), itemData);
      return docRef.id;
    } else {
      // React Native Firebase API
      const docRef = await firestoreDb.collection("inventory").add(itemData);
      return docRef.id;
    }
  } catch (error: any) {
    console.error('Error saving inventory item:', error);
    throw new Error(`Failed to save inventory item: ${error.message}`);
  }
};

// Get inventory items for current user
export const getInventoryItemsPage = async (
  options: InventoryQueryOptions = {},
): Promise<InventoryQueryResult> => {
  const {limit = 20, startAfter: startAfterDoc} = options;

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to get inventory items');
    }

    // Try to initialize Firestore if it's not already initialized
    const firestoreDb = db || initializeFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    // Detect if we're using web SDK (no .collection method) or React Native Firebase (has .collection method)
    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    if (isWebSDK) {
      // Web SDK API
      const { collection, query, where, getDocs, orderBy, startAfter, limit: fbLimit } = require("firebase/firestore");
      let q = query(
        collection(firestoreDb, "inventory"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        fbLimit(limit)
      );

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as InventoryItem[];

      const lastDocSnapshot = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

      return {
        items,
        lastDoc: lastDocSnapshot,
      };
    } else {
      // React Native Firebase API
      let queryRef = firestoreDb
        .collection("inventory")
        .where("userId", "==", user.uid)
        .orderBy("createdAt", "desc")
        .limit(limit);

      if (startAfterDoc) {
        queryRef = queryRef.startAfter(startAfterDoc);
      }

      const querySnapshot = await queryRef.get();

      const items = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as InventoryItem[];

      const lastDocSnapshot = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

      return {
        items,
        lastDoc: lastDocSnapshot,
      };
    }
  } catch (error: any) {
    console.error('Error getting inventory items:', error);
    throw new Error(`Failed to get inventory items: ${error.message}`);
  }
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const {items} = await getInventoryItemsPage();
  return items;
};

// Delete inventory item and optional image from Firebase
export const deleteInventoryItem = async (itemId: string, imageUrl?: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete inventory items');
    }

    const firestoreDb = db || initializeFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    // Delete Firestore document
    if (isWebSDK) {
      const { doc, deleteDoc } = require('firebase/firestore');
      const itemRef = doc(firestoreDb, 'inventory', itemId);
      await deleteDoc(itemRef);
    } else {
      await firestoreDb.collection('inventory').doc(itemId).delete();
    }

    // Delete image from Storage if URL is provided
    if (imageUrl) {
      try {
        const storageInstance = initializeStorage();
        if (!storageInstance) {
          console.warn('Storage instance not initialized, skipping image deletion');
          return;
        }

        if (Platform.OS === 'web') {
          const { getStorage, ref, deleteObject } = require('firebase/storage');
          const storage = storageInstance || getStorage();
          const storageRef = ref(storage, imageUrl);
          await deleteObject(storageRef);
        } else {
          if (storageInstance.ref) {
            const storageRef = storageInstance.refFromURL
              ? storageInstance.refFromURL(imageUrl)
              : storageInstance.ref(imageUrl);
            await storageRef.delete();
          } else {
            const { getStorage, ref, deleteObject } = require('firebase/storage');
            const storage = storageInstance || getStorage();
            const storageRef = ref(storage, imageUrl);
            await deleteObject(storageRef);
          }
        }
      } catch (storageError) {
        console.warn('Failed to delete image from storage:', storageError);
      }
    }
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    throw new Error(`Failed to delete inventory item: ${error.message}`);
  }
};

