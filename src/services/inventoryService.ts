import { Platform } from "react-native";
import { getFirestore, getStorage, getAuth } from "./firebase";

export interface InventoryItem {
  id?: string;
  name: string;
  brand: string;
  size: string;
  quantity?: number;
  color?: string;
  value: number;
  retailValue?: number;
  silhouette?: string;
  styleId?: string;
  releaseDate?: string;
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
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('User must be authenticated to save inventory items');
    }

    // Try to initialize Firestore if it's not already initialized
    const firestoreDb = getFirestore();
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

    const quantityValue = Number(cleanItem.quantity ?? 1);
    cleanItem.quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? Math.floor(quantityValue) : 1;

    if (cleanItem.retailValue !== undefined) {
      const retailValueNum = Number(cleanItem.retailValue);
      cleanItem.retailValue = Number.isFinite(retailValueNum) ? retailValueNum : undefined;
    }

    if (cleanItem.value === undefined && cleanItem.retailValue !== undefined) {
      cleanItem.value = cleanItem.retailValue;
    } else if (cleanItem.value !== undefined) {
      const valueNum = Number(cleanItem.value);
      cleanItem.value = Number.isFinite(valueNum) ? valueNum : 0;
      if (cleanItem.retailValue === undefined) {
        cleanItem.retailValue = cleanItem.value;
      }
    }

    if (cleanItem.styleId) {
      cleanItem.styleId = String(cleanItem.styleId).trim();
    }

    if (cleanItem.silhouette) {
      cleanItem.silhouette = String(cleanItem.silhouette).trim();
    }

    if (cleanItem.releaseDate) {
      cleanItem.releaseDate = String(cleanItem.releaseDate).trim();
    }

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
  const {limit = 10, startAfter: startAfterDoc} = options;

  try {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('User must be authenticated to get inventory items');
    }

    // Try to initialize Firestore if it's not already initialized
    const firestoreDb = getFirestore();
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
        quantity: doc.data()?.quantity ?? 1,
        retailValue: doc.data()?.retailValue ?? doc.data()?.value ?? 0,
        value: doc.data()?.value ?? doc.data()?.retailValue ?? 0,
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
        quantity: doc.data()?.quantity ?? 1,
        retailValue: doc.data()?.retailValue ?? doc.data()?.value ?? 0,
        value: doc.data()?.value ?? doc.data()?.retailValue ?? 0,
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

// Update existing inventory item
export const updateInventoryItem = async (
  itemId: string,
  updates: Partial<Omit<InventoryItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
): Promise<void> => {
  try {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('User must be authenticated to update inventory items');
    }

    if (!itemId) {
      throw new Error('A valid item identifier is required to update inventory items');
    }

    const firestoreDb = getFirestore();
    if (!firestoreDb) {
      throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
    }

    const isWebSDK = !firestoreDb.collection || typeof firestoreDb.collection !== 'function';

    const cleanUpdates: any = {};
    Object.keys(updates).forEach((key) => {
      const value = updates[key as keyof typeof updates];
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });

    if (cleanUpdates.quantity !== undefined) {
      const parsedQuantity = Number(cleanUpdates.quantity);
      cleanUpdates.quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0
        ? Math.floor(parsedQuantity)
        : 1;
    }

    if (cleanUpdates.retailValue !== undefined) {
      const parsedRetail = Number(cleanUpdates.retailValue);
      cleanUpdates.retailValue = Number.isFinite(parsedRetail) ? parsedRetail : undefined;
    }

    if (cleanUpdates.value !== undefined) {
      const parsedValue = Number(cleanUpdates.value);
      cleanUpdates.value = Number.isFinite(parsedValue) ? parsedValue : 0;
      if (cleanUpdates.retailValue === undefined) {
        cleanUpdates.retailValue = cleanUpdates.value;
      }
    } else if (cleanUpdates.retailValue !== undefined && cleanUpdates.value === undefined) {
      cleanUpdates.value = cleanUpdates.retailValue;
    }

    if (cleanUpdates.styleId !== undefined && cleanUpdates.styleId !== null) {
      const trimmed = String(cleanUpdates.styleId).trim();
      cleanUpdates.styleId = trimmed.length ? trimmed : undefined;
    }

    if (cleanUpdates.silhouette !== undefined && cleanUpdates.silhouette !== null) {
      const trimmed = String(cleanUpdates.silhouette).trim();
      cleanUpdates.silhouette = trimmed.length ? trimmed : undefined;
    }

    if (cleanUpdates.releaseDate !== undefined && cleanUpdates.releaseDate !== null) {
      const trimmed = String(cleanUpdates.releaseDate).trim();
      cleanUpdates.releaseDate = trimmed.length ? trimmed : undefined;
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return;
    }

    const serverTimestampWeb = () => require('firebase/firestore').serverTimestamp();
    const serverTimestampNative = () => require('@react-native-firebase/firestore').default.FieldValue.serverTimestamp();

    cleanUpdates.updatedAt = isWebSDK ? serverTimestampWeb() : serverTimestampNative();

    if (isWebSDK) {
      const { doc, updateDoc } = require('firebase/firestore');
      const itemRef = doc(firestoreDb, 'inventory', itemId);
      await updateDoc(itemRef, cleanUpdates);
    } else {
      await firestoreDb.collection('inventory').doc(itemId).update(cleanUpdates);
    }
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    throw new Error(`Failed to update inventory item: ${error.message}`);
  }
};

// Delete inventory item and optional image from Firebase
export const deleteInventoryItem = async (itemId: string, imageUrl?: string): Promise<void> => {
  try {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete inventory items');
    }

    const firestoreDb = getFirestore();
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
        const storageInstance = getStorage();
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

