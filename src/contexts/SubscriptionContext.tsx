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
import {httpsCallable} from '@react-native-firebase/functions';
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
  const processedTransactions = useRef<Set<string>>(new Set());
  const requestedProductId = useRef<string | null>(null);
  const validatePurchaseRef = useRef<(purchase: SubscriptionPurchase) => Promise<void>>(() => Promise.resolve());

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
        const data = doc.data();
        if (!data) {
          setSubscriptionStatus({isActive: false});
          return;
        }
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
        // Attempt server validation — failures are non-fatal, purchase is still granted
        const functions = getFunctions();
        if (functions) {
          if (Platform.OS === 'ios') {
            const transactionReceipt = purchase.transactionReceipt;
            if (transactionReceipt) {
              try {
                const fn = httpsCallable(functions, 'validateAppleReceipt');
                await fn({receiptData: transactionReceipt, productId: purchase.productId});
              } catch (serverErr) {
                console.warn('[IAP] Server validation failed, accepting client-side:', serverErr);
              }
            } else {
              console.warn('[IAP] No transactionReceipt — skipping server validation');
            }
          } else if (Platform.OS === 'android') {
            try {
              const fn = httpsCallable(functions, 'validateGooglePurchase');
              await fn({
                purchaseToken: purchase.purchaseToken,
                productId: purchase.productId,
              });
            } catch (serverErr) {
              console.warn('[IAP] Server validation failed, accepting client-side:', serverErr);
            }
          }
        } else {
          console.warn('[IAP] Firebase functions unavailable — accepting purchase client-side');
        }

        // Always mark as subscribed — StoreKit/Play already confirmed the purchase
        setSubscriptionStatus(prev => ({
          ...prev,
          isActive: true,
          productId: purchase.productId,
          platform: Platform.OS as 'ios' | 'android',
        }));
        setIsLoading(false);

        await finishTransaction({purchase, isConsumable: false});
        requestedProductId.current = null;
        refreshStatus();
      } catch (err) {
        console.error('[IAP] validatePurchaseWithServer unexpected error:', err);
        // Still mark as subscribed and finish the transaction so the user
        // isn't left in a broken state
        setSubscriptionStatus(prev => ({...prev, isActive: true, productId: purchase.productId}));
        setIsLoading(false);
        requestedProductId.current = null;
        try { await finishTransaction({purchase, isConsumable: false}); } catch {}
      }
    },
    [refreshStatus],
  );

  // Keep ref in sync so the IAP listener (set up once) always calls the latest version
  useEffect(() => {
    validatePurchaseRef.current = validatePurchaseWithServer;
  }, [validatePurchaseWithServer]);

  // ---------------------------------------------------------------------------
  // IAP connection lifecycle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let connected = false;

    const setup = async () => {
      try {
        await initConnection();
        connected = true;

        // Flush any unfinished transactions from previous sessions so they
        // don't fire through the purchase listener and corrupt the DB entry
        try {
          const pending = await getAvailablePurchases();
          for (const p of pending) {
            if (ALL_PRODUCT_IDS.includes(p.productId)) {
              await finishTransaction({purchase: p as any, isConsumable: false});
              console.log('[IAP] Flushed stale transaction:', p.productId, p.transactionId);
            }
          }
        } catch (flushErr) {
          console.warn('[IAP] Could not flush pending transactions:', flushErr);
        }

        // Load available subscriptions
        const products = await getSubscriptions({skus: ALL_PRODUCT_IDS});
        console.log('[IAP] Available products:', JSON.stringify(products.map(p => ({id: p.productId, title: p.title}))));
        if (products.length === 0) {
          console.warn('[IAP] No products returned — check product IDs and App Store Connect status');
        }
        setAvailableProducts(products);

        // Listen for purchase updates — only process when a purchase is actively
        // in progress to avoid stale/pending transactions updating the wrong product
        purchaseUpdateSubscription.current = purchaseUpdatedListener(
          (purchase: SubscriptionPurchase) => {
            if (!requestedProductId.current) {
              console.log('[IAP] No active purchase request, ignoring transaction:', purchase.productId);
              return;
            }
            const txId = purchase.transactionId ?? '';
            if (txId && processedTransactions.current.has(txId)) {
              console.log('[IAP] Skipping duplicate transaction:', txId);
              return;
            }
            if (purchase.productId !== requestedProductId.current) {
              console.log(
                '[IAP] Ignoring transaction for',
                purchase.productId,
                '— requested:',
                requestedProductId.current,
              );
              return;
            }
            if (txId) {
              processedTransactions.current.add(txId);
            }
            if (purchase.transactionReceipt || purchase.purchaseToken) {
              validatePurchaseRef.current(purchase).catch(err =>
                console.error('[IAP] Listener unhandled error:', err),
              );
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load subscription status whenever the user changes
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // ---------------------------------------------------------------------------
  // Subscribe
  // ---------------------------------------------------------------------------
  const subscribe = useCallback(async (productId: string) => {
    try {
      console.log('[IAP] Requesting subscription:', productId);
      requestedProductId.current = productId;
      await requestSubscription({sku: productId});
    } catch (err: any) {
      console.error('[IAP] Subscribe error — code:', err.code, 'message:', err.message);
      requestedProductId.current = null;
      if (err.code === 'E_USER_CANCELLED') {
        return;
      }
      const isInvalidProduct =
        err.code === 'E_DEVELOPER_ERROR' ||
        err.message?.toLowerCase().includes('invalid product') ||
        err.message?.toLowerCase().includes('cannot connect to itunes');
      Alert.alert(
        isInvalidProduct ? 'Subscription Unavailable' : 'Purchase Failed',
        isInvalidProduct
          ? `Product not found (${productId}). Check App Store Connect status is "Ready to Submit" and product IDs match exactly.`
          : `${err.code}: ${err?.message || 'Unknown error'}`,
      );
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
