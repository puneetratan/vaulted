import {Platform} from 'react-native';

// ---------------------------------------------------------------------------
// Product IDs — must match what you configure in:
//   iOS:     App Store Connect → Subscriptions
//   Android: Google Play Console → Subscriptions
//
// iOS product identifiers must be unique across your ENTIRE App Store Connect
// account, not just within one app — unlike Android, where Play Console scopes
// them per package name, so com.vault.dev and com.vaultedapp can each safely
// use the same IDs. The dev app (com.vaulted.dev) already has
// vaulted_premium_monthly/_annual created, so the prod app (com.vaultedapp)
// needs its own distinct set. Create these in App Store Connect under the
// prod app before testing prod IAP on iOS.
// ---------------------------------------------------------------------------
export const PRODUCT_IDS = {
  monthly: Platform.select({
    ios: __DEV__ ? 'vaulted_premium_monthly' : 'vaulted_premium_monthly_prod',
    android: 'vaulted_premium_monthly',
  }) as string,
  annual: Platform.select({
    ios: __DEV__ ? 'vaulted_premium_annual' : 'vaulted_premium_annual_prod',
    android: 'vaulted_premium_annual',
  }) as string,
};

export const ALL_PRODUCT_IDS: string[] = [
  PRODUCT_IDS.monthly,
  PRODUCT_IDS.annual,
];

// ---------------------------------------------------------------------------
// Free tier limits
// ---------------------------------------------------------------------------
export const FREE_TIER_ITEM_LIMIT = 10;

// ---------------------------------------------------------------------------
// UI pricing strings — update to match your App Store / Play Console prices
// ---------------------------------------------------------------------------
export const PRICING = {
  monthly: {
    productId: PRODUCT_IDS.monthly,
    label: 'Monthly',
    price: '$9.99',
    period: '/month',
    savings: null as string | null,
  },
  annual: {
    productId: PRODUCT_IDS.annual,
    label: 'Annual',
    price: '$79.99',
    period: '/year',
    savings: 'Save 33%',
  },
};
