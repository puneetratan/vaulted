import { getUserData, updateUserData, getOrCreateUser } from '../../src/services/userService';
import { initializeFirestore } from '../../src/services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({})),
}));

describe('userService', () => {
  const mockDb = { collection: undefined }; // Web SDK - no collection method

  beforeEach(() => {
    jest.clearAllMocks();
    (initializeFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  describe('getUserData', () => {
    it('should return null when user document does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });
      
      const result = await getUserData('test-uid');
      expect(result).toBeNull();
      expect(doc).toHaveBeenCalledWith(mockDb, 'user_profile', 'test-uid');
    });

    it('should return user data with shoe size when document exists', async () => {
      const mockUserData = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        shoeSize: '10',
        provider: 'google',
        createdAt: { toDate: () => new Date() },
        lastLoginAt: { toDate: () => new Date() },
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'test-uid',
        data: () => mockUserData,
      });
      
      const result = await getUserData('test-uid');
      expect(result).toBeTruthy();
      expect(result?.uid).toBe('test-uid');
      expect(result?.shoeSize).toBe('10');
    });
  });

  describe('updateUserData', () => {
    it('should update user data with shoe size', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      
      await updateUserData('test-uid', { shoeSize: '10.5' });
      
      expect(setDoc).toHaveBeenCalled();
      const callArgs = (setDoc as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('shoeSize', '10.5');
      expect(callArgs[1]).toHaveProperty('uid', 'test-uid');
    });

    it('should remove undefined fields before updating', async () => {
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      
      await updateUserData('test-uid', { shoeSize: '10.5' });
      
      const callArgs = (setDoc as jest.Mock).mock.calls[0];
      const updateData = callArgs[1];
      expect(updateData).not.toHaveProperty('color');
      expect(updateData).toHaveProperty('shoeSize', '10.5');
    });
  });

  describe('getOrCreateUser', () => {
    it('should create user document if it does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });
      
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        providerData: [{ providerId: 'google.com' }],
      };
      
      const result = await getOrCreateUser(mockFirebaseUser);
      expect(result).toBeTruthy();
      expect(result.uid).toBe('test-uid');
      expect(setDoc).toHaveBeenCalled();
    });
  });
});

