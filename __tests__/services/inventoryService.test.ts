import { saveInventoryItem, getInventoryItems, getInventoryItemsPage, deleteInventoryItem } from '../../src/services/inventoryService';
import { auth, initializeFirestore, initializeStorage } from '../../src/services/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => ({})),
  startAfter: jest.fn(),
  limit: jest.fn(() => ({})),
}));

describe('inventoryService', () => {
  const mockDb = { collection: undefined }; // Web SDK - no collection method

  beforeEach(() => {
    jest.clearAllMocks();
    (initializeFirestore as jest.Mock).mockReturnValue(mockDb);
    (auth.currentUser as any) = {
      uid: 'test-uid',
      email: 'test@example.com',
    };
    (initializeStorage as jest.Mock).mockReturnValue({});

    const firestoreModule = require('firebase/firestore');
    firestoreModule.query.mockImplementation(() => ({}));
    firestoreModule.startAfter.mockReturnValue({});
    firestoreModule.limit.mockReturnValue({});
  });

  describe('saveInventoryItem', () => {
    it('should save inventory item to Firestore', async () => {
      (addDoc as jest.Mock).mockResolvedValue({
        id: 'new-item-id',
      });
      
      const itemData = {
        name: 'Test Shoe',
        brand: 'Nike',
        size: '10',
        value: 100,
        userId: 'test-uid',
      };
      
      const result = await saveInventoryItem(itemData);
      expect(result).toBe('new-item-id');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should remove undefined fields before saving', async () => {
      (addDoc as jest.Mock).mockResolvedValue({
        id: 'new-item-id',
      });
      
      const itemData = {
        name: 'Test Shoe',
        brand: 'Nike',
        size: '10',
        color: undefined,
        barcode: undefined,
        value: 100,
        userId: 'test-uid',
      };
      
      await saveInventoryItem(itemData);
      
      const callArgs = (addDoc as jest.Mock).mock.calls[0];
      const savedData = callArgs[1];
      expect(savedData).not.toHaveProperty('color');
      expect(savedData).not.toHaveProperty('barcode');
      expect(savedData).toHaveProperty('name', 'Test Shoe');
      expect(savedData).toHaveProperty('userId', 'test-uid');
    });

    it('should throw error if user is not authenticated', async () => {
      (auth.currentUser as any) = null;
      
      const itemData = {
        name: 'Test Shoe',
        brand: 'Nike',
        size: '10',
        value: 100,
        userId: 'test-uid',
      };
      
      await expect(saveInventoryItem(itemData)).rejects.toThrow('User must be authenticated');
    });
  });

  describe('getInventoryItems', () => {
    it('should get inventory items for current user', async () => {
      const mockDocs = [
        {
          id: 'item-1',
          data: () => ({
            name: 'Shoe 1',
            brand: 'Nike',
            size: '10',
            value: 100,
            userId: 'test-uid',
            createdAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'item-2',
          data: () => ({
            name: 'Shoe 2',
            brand: 'Adidas',
            size: '11',
            value: 150,
            userId: 'test-uid',
            createdAt: { toDate: () => new Date() },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
      });
      
      const result = await getInventoryItems();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Shoe 1');
      expect(result[1].name).toBe('Shoe 2');
    });

    it('should throw error if user is not authenticated', async () => {
      (auth.currentUser as any) = null;
      
      await expect(getInventoryItems()).rejects.toThrow('User must be authenticated');
    });
  });

  describe('getInventoryItemsPage', () => {
    it('should return items and last document snapshot', async () => {
      const mockDocs = [
        {
          id: 'item-1',
          data: () => ({
            name: 'Shoe 1',
            brand: 'Nike',
            size: '10',
            value: 100,
            userId: 'test-uid',
            createdAt: { toDate: () => new Date() },
          }),
        },
        {
          id: 'item-2',
          data: () => ({
            name: 'Shoe 2',
            brand: 'Adidas',
            size: '11',
            value: 150,
            userId: 'test-uid',
            createdAt: { toDate: () => new Date() },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
      });

      const result = await getInventoryItemsPage({limit: 1});
      expect(result.items).toHaveLength(2);
      expect(result.lastDoc).toBe(mockDocs[mockDocs.length - 1]);
    });

    it('should include startAfter constraint when cursor provided', async () => {
      const startAfterMock = require('firebase/firestore').startAfter as jest.Mock;
      const queryMock = require('firebase/firestore').query as jest.Mock;

      const mockDocs: any[] = [];
      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      await getInventoryItemsPage({limit: 2, startAfter: {id: 'cursor'}});

      expect(startAfterMock).toHaveBeenCalled();
      expect(queryMock).toHaveBeenCalled();
    });
  });

  describe('deleteInventoryItem', () => {
    it('should delete Firestore document using web SDK', async () => {
      const mockDocRef = {};
      (doc as jest.Mock).mockReturnValue(mockDocRef);

      await deleteInventoryItem('item-1');

      expect(doc).toHaveBeenCalledWith(mockDb, 'inventory', 'item-1');
      expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should delete image from storage when imageUrl provided', async () => {
      const mockDocRef = {};
      (doc as jest.Mock).mockReturnValue(mockDocRef);

      await deleteInventoryItem('item-1', 'https://example.com/image.jpg');

      expect(deleteDoc).toHaveBeenCalled();
      expect(ref).toHaveBeenCalled();
      expect(deleteObject).toHaveBeenCalled();
    });

    it('should throw error if user is not authenticated', async () => {
      (auth.currentUser as any) = null;

      await expect(deleteInventoryItem('item-1')).rejects.toThrow('User must be authenticated');
    });
  });
});

