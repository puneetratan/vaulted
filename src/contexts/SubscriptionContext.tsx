import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {Platform, Alert} from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
  finishTransaction,
  Subscription,
  SubscriptionPurchase,
  PurchaseError,
} from 'react-native-iap';
import {useAuth} from './AuthContext';
import {getFunctions, getFirestore} from '../services/firebase';
import {ALL_PRODUCT_IDS} from '../config/subscriptions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionStatus {
  isActive: boolean;
  productId?: string;
  expiresAt?: Date;
  platform?: 'ios' | 'android';
}

interface SubscriptionContextValue {
  isSubscribed: boolean;
  isLoading: boolean;
  subscriptionStatus: SubscriptionStatus;
  availableProducts: Subscription[];
  subscribe: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isSubscribed: false,
  isLoading: true,
  subscriptionStatus: {isActive: false},
  availableProducts: [],
  subscribe: async () => {},
  restorePurchases: async () => {},
  refreshStatus: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const SubscriptionProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const {user} = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>({isActive: false});
  const [availableProducts, setAvailableProducts] = useState<Subscription[]>(
    [],
  );
  const purchaseUpdateSubscription = useRef<any>(null);
  const purchaseErrorSubscription = useRef<any>(null);

  // ---------------------------------------------------------------------------
  // Read subscription status from Firestore
  // ---------------------------------------------------------------------------
  const refreshStatus = useCallback(async () => {
    if (!user?.uid) {
      setSubscriptionStatus({isActive: false});
      setIsLoading(false);
      return;
    }
    try {
      const db = getFirestore();
      if (!db) {
        setIsLoading(false);
        return;
      }
      const doc = await db
        .collection('subscriptions')
        .doc(user.uid)
        .get();

      if (doc.exists) {
        const data = doc.data()!;
        const expiresAt: Date | undefined = data.expiresAt?.toDate();
        const isActive =
          data.isActive === true &&
          (expiresAt ? expiresAt > new Date() : false);
        setSubscriptionStatus({
          isActive,
          productId: data.productId,
          expiresAt,
          platform: data.platform,
        });
      } else {
        setSubscriptionStatus({isActive: false});
      }
    } catch (err) {
      console.warn('Failed to read subscription status:', err);
      setSubscriptionStatus({isActive: false});
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // ---------------------------------------------------------------------------
  // Validate purchase with our Firebase function, then refresh Firestore status
  // ---------------------------------------------------------------------------
  const validatePurchaseWithServer = useCallback(
    async (purchase: SubscriptionPurchase) => {
      try {
        const functions = getFunctions();
        if (!functions) return;

        if (Platform.OS === 'ios') {
          const transactionReceipt = purchase.transactionReceipt;
          if (!transactionReceipt) return;
          const fn = functions.httpsCallable('validateAppleReceipt');
          await fn({receiptData: transactionReceipt});
        } else if (Platform.OS === 'android') {
          const fn = functions.httpsCallable('validateGooglePurchase');
          await fn({
            purchaseToken: purchase.purchaseToken,
            productId: purchase.productId,
          });
        }

        await finishTransaction({purchase, isConsumable: false});
        await refreshStatus();
      } catch (err) {
        console.error('Server validation failed:', err);
        // Still finish the transaction to prevent it from re-firing
        try {
          await finishTransaction({purchase, isConsumable: false});
        } catch {}
      }
    },
    [refreshStatus],
  );

  // ---------------------------------------------------------------------------
  // IAP connection lifecycle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let connected = false;

    const setup = async () => {
      try {
        await initConnection();
        connected = true;

        // Load available subscriptions
        const products = await getSubscriptions({skus: ALL_PRODUCT_IDS});
        setAvailableProducts(products);

        // Listen for purchase updates
        purchaseUpdateSubscription.current = purchaseUpdatedListener(
          async (purchase: SubscriptionPurchase) => {
            if (purchase.transactionReceipt || purchase.purchaseToken) {
              await validatePurchaseWithServer(purchase);
            }
          },
        );

        // Listen for purchase errors
        purchaseErrorSubscription.current = purchaseErrorListener(
          (error: PurchaseError) => {
            if (error.code !== 'E_USER_CANCELLED') {
              Alert.alert(
                'Purchase Error',
                error.message || 'An error occurred during purchase.',
              );
            }
          },
        );
      } catch (err) {
        console.warn('IAP setup failed:', err);
      }
    };

    setup();

    return () => {
      purchaseUpdateSubscription.current?.remove();
      purchaseErrorSubscription.current?.remove();
      if (connected) {
        endConnection();
      }
    };
  }, [validatePurchaseWithServer]);

  // Load subscription status whenever the user changes
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // ---------------------------------------------------------------------------
  // Subscribe
  // ---------------------------------------------------------------------------
  const subscribe = useCallback(async (productId: string) => {
    try {
      await requestSubscription({sku: productId});
      // Purchase result is handled by purchaseUpdatedListener above
    } catch (err: any) {
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Subscription Failed',
          err?.message || 'Unable to complete the purchase. Please try again.',
        );
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Restore Purchases
  // ---------------------------------------------------------------------------
  const restorePurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      const purchases = await getAvailablePurchases();
      if (purchases.length === 0) {
        Alert.alert(
          'No Purchases Found',
          'No previous subscriptions were found for this Apple ID / Google account.',
        );
        return;
      }
      // Process the most recent subscription purchase
      const subscriptionPurchase = purchases.find(p =>
        ALL_PRODUCT_IDS.includes(p.productId),
      ) as SubscriptionPurchase | undefined;

      if (subscriptionPurchase) {
        await validatePurchaseWithServer(subscriptionPurchase);
      } else {
        Alert.alert(
          'No Subscription Found',
          'No active Vaulted subscription found to restore.',
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Restore Failed',
        err?.message || 'Could not restore purchases. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [validatePurchaseWithServer]);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed: subscriptionStatus.isActive,
        isLoading,
        subscriptionStatus,
        availableProducts,
        subscribe,
        restorePurchases,
        refreshStatus,
      }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
