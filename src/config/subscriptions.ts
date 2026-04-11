import {Platform} from 'react-native';

// ---------------------------------------------------------------------------
// Product IDs — must match what you configure in:
//   iOS:     App Store Connect → Subscriptions
//   Android: Google Play Console → Subscriptions
// ---------------------------------------------------------------------------
export const PRODUCT_IDS = {
  monthly: Platform.select({
    ios: 'vaulted_premium_monthly',
    android: 'vaulted_premium_monthly',
  }) as string,
  annual: Platform.select({
    ios: 'vaulted_premium_annual',
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
