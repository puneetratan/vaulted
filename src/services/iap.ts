import {Platform} from 'react-native';
import * as RNIap from 'react-native-iap';

/**
 * Unified in-app-purchase surface: iOS goes through react-native-iap/StoreKit
 * unchanged; Android goes through the custom Play Billing 8.0.0 module in
 * ./androidBilling (see that file for why). SubscriptionContext.tsx imports
 * everything from here instead of 'react-native-iap' directly so the two
 * platforms can diverge without duplicating its purchase-flow logic.
 *
 * NOTE: ./androidBilling is loaded via a platform-conditional require(), not a
 * static import. A static `import * as AndroidBilling from './androidBilling'`
 * would execute unconditionally on both platforms (ES module imports always run
 * at load time, regardless of any later runtime ternary), which on iOS crashes
 * immediately: androidBilling.ts constructs `new NativeEventEmitter(VaultedBilling)`
 * at module scope, and VaultedBilling (the Android-only native module) is undefined
 * there -- "Invariant Violation: `new NativeEventEmitter()` requires a non-null
 * argument." require() genuinely defers evaluation, so androidBilling.ts's
 * module-scope code never runs on iOS.
 */

export type {
  Subscription,
  SubscriptionPurchase,
  PurchaseError,
} from 'react-native-iap';

const impl = Platform.OS === 'android' ? require('./androidBilling') : RNIap;

export const initConnection = impl.initConnection;
export const endConnection = impl.endConnection;
export const getSubscriptions = impl.getSubscriptions;
export const requestSubscription = impl.requestSubscription;
export const purchaseUpdatedListener = impl.purchaseUpdatedListener;
export const purchaseErrorListener = impl.purchaseErrorListener;
export const getAvailablePurchases = impl.getAvailablePurchases;
export const finishTransaction = impl.finishTransaction;

export const IapIosSk2 = RNIap.IapIosSk2;
