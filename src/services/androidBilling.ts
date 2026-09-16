import {NativeEventEmitter, NativeModules} from 'react-native';

/**
 * Android-only Play Billing Library 8.0.0 bridge (see
 * android/app/src/main/java/com/vaultedapp/billing), standing in for
 * react-native-iap's Android implementation — that library only supports
 * Billing 8+ via a Nitro Modules rewrite that requires React Native's New
 * Architecture, which this app doesn't run. Import this only through
 * '../services/iap', never directly, so iOS keeps using react-native-iap.
 *
 * Function shapes intentionally mirror react-native-iap's so
 * SubscriptionContext.tsx needs no logic changes beyond the import source.
 */

const {VaultedBilling} = NativeModules;
const emitter = new NativeEventEmitter(VaultedBilling);

export const initConnection = (): Promise<boolean> => VaultedBilling.initConnection();

export const endConnection = (): Promise<boolean> => VaultedBilling.endConnection();

export const getSubscriptions = ({skus}: {skus: string[]}): Promise<any[]> =>
  VaultedBilling.getSubscriptions(skus);

export const requestSubscription = (request: {
  sku: string;
  subscriptionOffers?: {sku: string; offerToken: string}[];
}): Promise<undefined> => {
  const offerToken = request.subscriptionOffers?.[0]?.offerToken;
  if (!offerToken) {
    return Promise.reject(
      Object.assign(new Error(`No offer token provided for ${request.sku}`), {
        code: 'E_DEVELOPER_ERROR',
      }),
    );
  }
  return VaultedBilling.requestSubscription(request.sku, offerToken);
};

export const purchaseUpdatedListener = (callback: (purchase: any) => void) =>
  emitter.addListener('purchase-updated', callback);

export const purchaseErrorListener = (callback: (error: any) => void) =>
  emitter.addListener('purchase-error', callback);

export const getAvailablePurchases = (): Promise<any[]> =>
  VaultedBilling.getAvailablePurchases();

export const finishTransaction = ({
  purchase,
}: {
  purchase: {purchaseToken?: string};
  isConsumable?: boolean;
}): Promise<boolean> => {
  if (!purchase.purchaseToken) {
    return Promise.resolve(true);
  }
  return VaultedBilling.finishTransaction(purchase.purchaseToken);
};
