import {Platform} from 'react-native';
import * as RNIap from 'react-native-iap';
import * as AndroidBilling from './androidBilling';

/**
 * Unified in-app-purchase surface: iOS goes through react-native-iap/StoreKit
 * unchanged; Android goes through the custom Play Billing 8.0.0 module in
 * ./androidBilling (see that file for why). SubscriptionContext.tsx imports
 * everything from here instead of 'react-native-iap' directly so the two
 * platforms can diverge without duplicating its purchase-flow logic.
 */

export type {
  Subscription,
  SubscriptionPurchase,
  PurchaseError,
} from 'react-native-iap';

const impl = Platform.OS === 'android' ? AndroidBilling : RNIap;

export const initConnection = impl.initConnection;
export const endConnection = impl.endConnection;
export const getSubscriptions = impl.getSubscriptions;
export const requestSubscription = impl.requestSubscription;
export const purchaseUpdatedListener = impl.purchaseUpdatedListener;
export const purchaseErrorListener = impl.purchaseErrorListener;
export const getAvailablePurchases = impl.getAvailablePurchases;
export const finishTransaction = impl.finishTransaction;

export const IapIosSk2 = RNIap.IapIosSk2;
