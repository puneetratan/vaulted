import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Platform, PermissionsAndroid} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {getUserData, updateUserData} from '../services/userService';
import ShoeSizeModal from '../components/ShoeSizeModal';
import DashboardTabs from '../components/DashboardTabs';
import FilterModal, {FilterOptions} from '../components/FilterModal';
import {getFunctions} from '../services/firebase';
import RNFS from 'react-native-fs';
import AddItemOptions from '../components/AddItemOptions';
import HamburgerMenu from '../components/HamburgerMenu';

type ShadowStatus = 'processing' | 'complete' | 'error';

type ImageAnalysisResult = {
  name?: string;
  brand?: string;
  model?: string;
  color?: string;
  releaseDate?: string;
  retailValue?: string | number;
  styleId?: string;
  silhouette?: string;
  condition?: string;
  flaws?: string;
  size?: string | number;
  quantity?: number;
  imageUrl?: string;
};

interface ShadowListItem {
  id: string;
  name: string;
  brand: string;
  silhouette: string;
  styleId: string;
  size: string;
  color: string;
  cost: number;
  retailValue: number;
  releaseDate?: string;
  quantity: number;
  imageUrl?: string;
  isShadow: true;
  shadowStatus: ShadowStatus;
  condition?: string;
  notes?: string;
  errorMessage?: string;
}

const DashboardScreen = () => {
  const navigation = useNavigation();
  const {logout, user} = useAuth();
  const {colors} = useTheme();
  const [showShoeSizeModal, setShowShoeSizeModal] = useState(false);
  const [shoeSize, setShoeSize] = useState('');
  const [showAddItemOptions, setShowAddItemOptions] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEmailPromptModal, setShowEmailPromptModal] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [shadowItems, setShadowItems] = useState<ShadowListItem[]>([]);
  const [inventoryRefreshToken, setInventoryRefreshToken] = useState(0);
  const [activeFilters, setActiveFilters] = useState<FilterOptions | null>(null);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [isCollectionEmpty, setIsCollectionEmpty] = useState<boolean>(true);
  const triggerInventoryRefresh = useCallback(() => {
    setInventoryRefreshToken(prev => prev + 1);
  }, []);

  const handleAvailableFiltersChange = useCallback((brands: string[], colors: string[]) => {
    setAvailableBrands(brands);
    setAvailableColors(colors);
  }, []);

  const handleItemCountChange = useCallback((count: number) => {
    setIsCollectionEmpty(count === 0);
  }, []);


  // Check if user has shoe size saved when component loads
  useEffect(() => {
    const checkShoeSize = async () => {
      if (user?.uid) {
        try {
          const userData = await getUserData(user.uid);
          if (!userData?.shoeSize) {
            setShowShoeSizeModal(true);
          }
        } catch (error) {
          console.error('Error checking shoe size:', error);
        }
      }
    };

    checkShoeSize();
  }, [user]);

  const handleShoeSizeSubmit = async () => {
    if (shoeSize.trim() === '') {
      Alert.alert('Error', 'Please enter your shoe size');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      await updateUserData(user.uid, { shoeSize: shoeSize.trim() });
      setShowShoeSizeModal(false);
      Alert.alert('Success', 'Shoe size saved successfully!');
    } catch (error: any) {
      console.error('Error saving shoe size:', error);
      Alert.alert('Error', 'Failed to save shoe size. Please try again.');
    }
  };

  async function requestAndroidPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'App needs access to your storage to save Excel files',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  const parseNumericValue = (value: any): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const mapMetadataToShadow = useCallback((
    metadata: ImageAnalysisResult,
    fallbackIndex: number,
  ): Partial<ShadowListItem> => {
    const name = metadata?.name || metadata?.model || `AI Item ${fallbackIndex + 1}`;
    const brand = metadata?.brand || 'Unknown Brand';
    const silhouette = metadata?.silhouette || metadata?.model || 'Unknown';
    const styleId = metadata?.styleId || 'N/A';
    const size = metadata?.size ? String(metadata.size) : 'N/A';
    const color = metadata?.color || 'Unknown';
    const releaseDate = metadata?.releaseDate;
    const retailValue = parseNumericValue(metadata?.retailValue);
    const quantityValue = Number(metadata?.quantity);
    const quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? Math.round(quantityValue) : 1;

    return {
      name,
      brand,
      silhouette,
      styleId,
      size,
      color,
      releaseDate,
      retailValue,
      cost: retailValue,
      quantity,
      imageUrl: metadata?.imageUrl,
      condition: metadata?.condition,
      notes: metadata?.flaws,
    };
  }, [parseNumericValue]);

  const handleImageAnalysisStart = useCallback((count: number) => {
    if (!count) {
      return;
    }
    const timestamp = Date.now();
    setShadowItems(prev => [
      ...prev,
      ...Array.from({length: count}, (_, index) => ({
        id: `shadow-${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        name: `Analyzing item ${prev.length + index + 1}`,
        brand: 'Processing...',
        silhouette: 'Processing',
        styleId: 'Processing',
        size: 'N/A',
        color: 'N/A',
        cost: 0,
        retailValue: 0,
        quantity: 1,
        isShadow: true as const,
        shadowStatus: 'processing' as ShadowStatus,
      })),
    ]);
  }, []);

  const handleImageAnalysisComplete = useCallback((results: ImageAnalysisResult[]) => {
    if (!Array.isArray(results) || results.length === 0) {
      setShadowItems(prev => prev.filter(item => item.shadowStatus !== 'processing'));
      return;
    }

    const processedIds: string[] = [];
    setShadowItems(prev => {
      const updated = [...prev];
      let resultIndex = 0;

      for (let i = 0; i < updated.length && resultIndex < results.length; i += 1) {
        if (updated[i].shadowStatus !== 'processing') {
          continue;
        }
        const placeholderId = updated[i].id;
        const mapped = mapMetadataToShadow(results[resultIndex], resultIndex);
        updated[i] = {
          ...updated[i],
          ...mapped,
          shadowStatus: 'complete',
          isShadow: true as const,
        };
        resultIndex += 1;
        processedIds.push(placeholderId);
      }

      return updated;
    });
    triggerInventoryRefresh();
    if (processedIds.length > 0) {
      setTimeout(() => {
        setShadowItems(prev => prev.filter(item => !processedIds.includes(item.id)));
      }, 1500);
    }
  }, [mapMetadataToShadow, triggerInventoryRefresh]);

  const handleImageAnalysisError = useCallback((message?: string) => {
    setShadowItems(prev => prev.filter(item => item.shadowStatus !== 'processing'));
    if (message) {
      Alert.alert('Analysis Error', message);
    }
  }, []);

  const handleShadowItemDelete = useCallback((id: string) => {
    setShadowItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const isAppleRelayEmail = (email: string | null | undefined): boolean => {
    return !!email && email.endsWith('@privaterelay.appleid.com');
  };

  const handleExport = async () => {
    if (exporting) {
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // If user has a relay email, ask for a real email before exporting
    if (isAppleRelayEmail(user?.email) || !user?.email) {
      setExportEmail('');
      setShowEmailPromptModal(true);
      return;
    }

    await executeExport();
  };

  const executeExport = async (overrideEmail?: string) => {
    setExporting(true);
    try {
      const hasPermission = await requestAndroidPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission denied');
        return;
      }

      console.log('Exporting for user:', user.uid);

      const functions = getFunctions();
      if (!functions) {
        Alert.alert('Error', 'Cloud Functions are not available. Please check your Firebase configuration.');
        return;
      }
      const exportInventoryToExcel = functions.httpsCallable('exportInventoryToExcel');
      const response = await exportInventoryToExcel({
        uid: user.uid,
        ...(overrideEmail ? {overrideEmail} : {}),
      });

      const payload = response.data as {
        fileName?: string;
        fileData?: string;
        success?: boolean;
        message?: string;
      };

      if (payload?.fileName && payload?.fileData) {
        const path =
          Platform.OS === 'ios'
            ? `${RNFS.DocumentDirectoryPath}/${payload.fileName}`
            : `${RNFS.DownloadDirectoryPath}/${payload.fileName}`;

        await RNFS.writeFile(path, payload.fileData, 'base64');

        console.log('Excel saved at:', path);
        Alert.alert('Export Complete', `Exported to:\n${path}`);
      } else if (payload?.success) {
        Alert.alert(
          'Export Complete',
          payload.message ?? 'Your export has been sent to your email.'
        );
      } else {
        console.warn('Unexpected export payload:', payload);
        throw new Error('Unexpected export response. Please try again later.');
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      Alert.alert('Export Failed', err?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleEmailPromptSubmit = async () => {
    const trimmed = exportEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setShowEmailPromptModal(false);
    await executeExport(trimmed);
  };

  const handleFilter = () => {
    setShowFilterModal(true);
  };

  const handleFilterApply = (filters: FilterOptions) => {
    setActiveFilters(filters);
    setShowFilterModal(false);
  };

  const handleFilterClear = () => {
    setActiveFilters(null);
  };

  const handleSearchIconPress = () => {
    setShowSearchBar(!showSearchBar);
    if (!showSearchBar) {
      setSearchQuery('');
    }
  };

  const handleSearchCancel = () => {
    setShowSearchBar(false);
    setSearchQuery('');
  };

  const handleMenuItemPress = (itemId: string) => {
    switch (itemId) {
      case 'profile':
        navigation.navigate('Profile');
        break;
      case 'privacy':
        navigation.navigate('PrivacyPolicy');
        break;
      case 'terms':
        navigation.navigate('Terms');
        break;
      case 'report':
        Alert.alert('Report a Problem', 'Please contact support at support@vaulted.com');
        break;
      case 'signout':
        Alert.alert(
          'Sign Out',
          'Are you sure you want to sign out?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                try {
                  await logout();
                  // Navigation is handled automatically by AppNavigator based on auth state
                } catch (error) {
                  Alert.alert('Error', 'Failed to sign out. Please try again.');
                }
              },
            },
          ],
        );
        break;
      default:
        break;
    }
  };

  const componentStyles = styles(colors);

  return (
    <SafeAreaView style={componentStyles.container} edges={['top']}>
      {/* Header */}
      <View style={componentStyles.header}>
        {!showSearchBar ? (
          <>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowHamburgerMenu(true)}>
              <Icon name="menu" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[componentStyles.headerTitle, {color: colors.text}]}>My Vault</Text>
            <View style={componentStyles.headerRight}>
              <TouchableOpacity style={componentStyles.notificationButton}>
                <Icon name="notifications" size={28} color={colors.text} />
                <View style={componentStyles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[componentStyles.iconButton, componentStyles.iconButtonSpacing]}
                onPress={handleSearchIconPress}>
                <Icon name="search" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={componentStyles.searchBarContainer}>
            <TouchableOpacity 
              style={componentStyles.closeSearchButton}
              onPress={handleSearchCancel}>
              <Icon name="arrow-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              style={[componentStyles.searchInput, {color: colors.text}]}
              placeholder="Search items..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              onSubmitEditing={() => {
                // Handle search submission
                console.log('Searching for:', searchQuery);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={componentStyles.clearSearchButton}
                onPress={() => setSearchQuery('')}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Body - Tabs */}
      <View style={componentStyles.body}>
        <DashboardTabs
          searchQuery={searchQuery}
          shadowItems={shadowItems}
          onShadowDelete={handleShadowItemDelete}
          refreshToken={inventoryRefreshToken}
          filters={activeFilters}
          onAvailableFiltersChange={handleAvailableFiltersChange}
          onItemCountChange={handleItemCountChange}
        />
      </View>

      {/* Bottom Footer Tabs */}
      <View style={componentStyles.bottomActionsContainer}>
        {/* Add Item Button */}
        <TouchableOpacity
          style={componentStyles.addButton}
          onPress={() => setShowAddItemOptions(true)}>
          <Icon name="camera-alt" size={24} color="#FFFFFF" style={componentStyles.addButtonIcon} />
          <Text style={componentStyles.addButtonText}>Add New Item</Text>
        </TouchableOpacity>

        {/* Footer Tabs - only show when collection has items */}
        {!isCollectionEmpty && (
          <View style={componentStyles.footerTabs}>
            <TouchableOpacity
              style={componentStyles.footerTab}
              onPress={handleExport}
              disabled={exporting}>
              {exporting ? (
                <>
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={[componentStyles.footerTabText, {color: colors.text}]}>Exporting...</Text>
                </>
              ) : (
                <>
                  <Icon name="unarchive" size={24} color={colors.text} />
                  <Text style={[componentStyles.footerTabText, {color: colors.text}]}>Export</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={componentStyles.footerTab}
              onPress={handleFilter}>
              <View style={componentStyles.footerTabContent}>
                {activeFilters && (
                  (activeFilters.brands.length > 0 ||
                   activeFilters.sources.length > 0 ||
                   activeFilters.colors.length > 0 ||
                   activeFilters.priceRange !== null) && (
                    <View style={componentStyles.filterBadge}>
                      <Icon name="check" size={10} color="#FFFFFF" />
                    </View>
                  )
                )}
                <Icon name="filter-list" size={24} color={colors.text} />
              </View>
              <Text style={[componentStyles.footerTabText, {color: colors.text}]}>Filter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Shoe Size Modal */}
      <ShoeSizeModal
        visible={showShoeSizeModal}
        shoeSize={shoeSize}
        onShoeSizeChange={setShoeSize}
        onSubmit={handleShoeSizeSubmit}
      />

      {/* Add Item Options Modal */}
      <AddItemOptions
        visible={showAddItemOptions}
        onClose={() => setShowAddItemOptions(false)}
        onAddManually={() => navigation.navigate('AddItem')}
        onImageAnalysisStart={handleImageAnalysisStart}
        onImageAnalysisComplete={handleImageAnalysisComplete}
        onImageAnalysisError={handleImageAnalysisError}
      />

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={showHamburgerMenu}
        onClose={() => setShowHamburgerMenu(false)}
        onMenuItemPress={handleMenuItemPress}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        availableBrands={availableBrands}
        availableColors={availableColors}
        currentFilters={activeFilters || undefined}
      />

      {/* Email Prompt Modal (shown when Apple Hide My Email is used) */}
      <Modal
        visible={showEmailPromptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailPromptModal(false)}>
        <View style={exportEmailStyles.overlay}>
          <View style={[exportEmailStyles.container, {backgroundColor: colors.card}]}>
            <Text style={[exportEmailStyles.title, {color: colors.text}]}>
              Enter Your Email
            </Text>
            <Text style={[exportEmailStyles.subtitle, {color: colors.textSecondary}]}>
              Your Apple account uses a private relay email. Please enter your real email to receive the export.
            </Text>
            <TextInput
              style={[exportEmailStyles.input, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={exportEmail}
              onChangeText={setExportEmail}
            />
            <View style={exportEmailStyles.buttons}>
              <TouchableOpacity
                style={[exportEmailStyles.button, exportEmailStyles.cancelButton, {borderColor: colors.border}]}
                onPress={() => setShowEmailPromptModal(false)}>
                <Text style={[exportEmailStyles.buttonText, {color: colors.text}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[exportEmailStyles.button, exportEmailStyles.submitButton]}
                onPress={handleEmailPromptSubmit}
                disabled={exporting}>
                {exporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[exportEmailStyles.buttonText, {color: '#fff'}]}>Send Export</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.header,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
    marginRight: 12,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  iconButton: {
    padding: 8,
  },
  iconButtonSpacing: {
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  bottomActionsContainer: {
    backgroundColor: colors.footer,
    width: '100%',
  },
  footerTabs: {
    flexDirection: 'row',
    backgroundColor: colors.footer,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    width: '100%',
    justifyContent: 'space-around',
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 60,
  },
  footerTabContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footerTabText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    margin: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  closeSearchButton: {
    padding: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 8,
  },
});

const exportEmailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DashboardScreen;