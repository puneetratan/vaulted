import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {useSubscription} from '../contexts/SubscriptionContext';
import {useTheme} from '../contexts/ThemeContext';
import {PRICING, FREE_TIER_ITEM_LIMIT} from '../config/subscriptions';
import {RootStackParamList} from '../navigation/AppNavigator';

type PaywallRouteProp = RouteProp<RootStackParamList, 'Paywall'>;
type PaywallNavProp = StackNavigationProp<RootStackParamList, 'Paywall'>;

const FEATURES = [
  {icon: 'all-inclusive', text: 'Unlimited items in your vault'},
  {icon: 'unarchive', text: 'Export inventory to Excel'},
  {icon: 'photo-camera', text: 'AI-powered photo analysis'},
  {icon: 'bar-chart', text: 'Full collection analytics'},
  {icon: 'cloud-done', text: 'Cloud sync across devices'},
];

const PaywallScreen = () => {
  const navigation = useNavigation<PaywallNavProp>();
  const route = useRoute<PaywallRouteProp>();
  const {colors} = useTheme();
  const {subscribe, restorePurchases, isLoading, isSubscribed} =
    useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>(
    'annual',
  );
  const [purchasing, setPurchasing] = useState(false);

  const reason = route.params?.reason ?? 'limit';

  // When subscription is confirmed, close loader and go back
  React.useEffect(() => {
    if (isSubscribed && !isLoading) {
      setPurchasing(false);
      const t = setTimeout(() => navigation.goBack(), 300);
      return () => clearTimeout(t);
    }
  }, [isSubscribed, isLoading, navigation]);

  const handleSubscribe = async () => {
    setPurchasing(true);
    // Safety timeout — never spin forever
    const timeout = setTimeout(() => setPurchasing(false), 30000);
    try {
      const plan = PRICING[selectedPlan];
      await subscribe(plan.productId);
      // purchasing stays true — closed by the isSubscribed effect above
    } catch {
      setPurchasing(false);
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      await restorePurchases();
    } finally {
      setPurchasing(false);
    }
  };

  const headerMessage =
    reason === 'export'
      ? 'Export requires a Vaulted Premium subscription.'
      : `Free accounts are limited to ${FREE_TIER_ITEM_LIMIT} items.`;

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: colors.background}]}
      edges={['top', 'bottom']}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}>
        <Icon name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Icon name="workspace-premium" size={48} color="#FFD700" />
          </View>
          <Text style={[styles.heroTitle, {color: colors.text}]}>
            Vaulted Premium
          </Text>
          <Text style={[styles.heroSubtitle, {color: colors.textSecondary}]}>
            {headerMessage}
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIconWrapper}>
                <Icon name={f.icon} size={22} color="#007AFF" />
              </View>
              <Text style={[styles.featureText, {color: colors.text}]}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>
          {(['annual', 'monthly'] as const).map(key => {
            const plan = PRICING[key];
            const selected = selectedPlan === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.planCard,
                  {
                    borderColor: selected ? '#007AFF' : colors.border,
                    backgroundColor: selected
                      ? 'rgba(0,122,255,0.08)'
                      : colors.card,
                  },
                ]}
                onPress={() => setSelectedPlan(key)}>
                <View style={styles.planLeft}>
                  <Text style={[styles.planLabel, {color: colors.text}]}>
                    {plan.label}
                  </Text>
                  {plan.savings && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{plan.savings}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.planPrice, {color: colors.text}]}>
                  {plan.price}
                  <Text style={[styles.planPeriod, {color: colors.textSecondary}]}>
                    {plan.period}
                  </Text>
                </Text>
                {selected && (
                  <Icon
                    name="check-circle"
                    size={22}
                    color="#007AFF"
                    style={styles.planCheck}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Subscribe CTA */}
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            (purchasing || isLoading) && styles.disabledButton,
          ]}
          onPress={handleSubscribe}
          disabled={purchasing || isLoading}>
          {purchasing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Subscribe {selectedPlan === 'annual' ? 'Annually' : 'Monthly'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={purchasing || isLoading}>
          <Text style={[styles.restoreText, {color: colors.textSecondary}]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={[styles.legal, {color: colors.textSecondary}]}>
          Subscription automatically renews unless cancelled at least 24 hours
          before the end of the current period. Manage or cancel in your
          App Store / Google Play account settings.
        </Text>
      </ScrollView>

      {/* Full-screen loading overlay during purchase */}
      <Modal visible={purchasing} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>Processing Purchase</Text>
            <Text style={styles.loadingSubtitle}>
              Please wait while we activate your subscription…
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,215,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  features: {
    marginBottom: 28,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  plans: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#34C759',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
    marginRight: 8,
  },
  savingsText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '400',
  },
  planCheck: {
    marginLeft: 10,
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legal: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
    minWidth: 240,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PaywallScreen;
