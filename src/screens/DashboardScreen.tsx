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
import {getUserData, updateUserData} from '../services/userService';
import ShoeSizeModal from '../components/ShoeSizeModal';
import DashboardTabs from '../components/DashboardTabs';
import {getFunctions} from '../services/firebase';
import RNFS from 'react-native-fs';

// Use web-compatible versions on web
const AddItemOptions = require('../components/AddItemOptions').default;
const HamburgerMenu = require('../components/HamburgerMenu').default;

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
  const [showShoeSizeModal, setShowShoeSizeModal] = useState(false);
  const [shoeSize, setShoeSize] = useState('');
  const [showAddItemOptions, setShowAddItemOptions] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [shadowItems, setShadowItems] = useState<ShadowListItem[]>([]);
  const [inventoryRefreshToken, setInventoryRefreshToken] = useState(0);
  const triggerInventoryRefresh = useCallback(() => {
    setInventoryRefreshToken(prev => prev + 1);
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

  const handleExport = async () => {
    if (exporting) {
      return;
    }

    setExporting(true);
    try {
      const hasPermission = await requestAndroidPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission denied');
        setExporting(false);
        return;
      }

      if (!user?.uid) {
        Alert.alert('Error', 'User not authenticated');
        setExporting(false);
        return;
      }

      console.log('Exporting for user:', user.uid);

      const exportInventoryToExcel = getFunctions().httpsCallable('exportInventoryToExcel');
      const response = await exportInventoryToExcel({
        uid: user.uid,
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

  const handleFilter = () => {
    setShowFilterModal(true);
    Alert.alert(
      'Filter Options',
      'Filter by:',
      [
        {
          text: 'Brand',
          onPress: () => {
            Alert.alert('Filter', 'Filter by brand clicked');
            setShowFilterModal(false);
          },
        },
        {
          text: 'Size',
          onPress: () => {
            Alert.alert('Filter', 'Filter by size clicked');
            setShowFilterModal(false);
          },
        },
        {
          text: 'Color',
          onPress: () => {
            Alert.alert('Filter', 'Filter by color clicked');
            setShowFilterModal(false);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowFilterModal(false),
        },
      ],
    );
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {!showSearchBar ? (
          <>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowHamburgerMenu(true)}>
              <Icon name="menu" size={28} color="#000000" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={[styles.iconButton, styles.iconButtonSpacing]}
                onPress={handleSearchIconPress}>
                <Icon name="search" size={28} color="#000000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Icon name="notifications" size={28} color="#000000" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.searchBarContainer}>
            <TouchableOpacity 
              style={styles.closeSearchButton}
              onPress={handleSearchCancel}>
              <Icon name="arrow-back" size={28} color="#000000" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
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
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}>
                <Icon name="close" size={24} color="#666666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Body - Tabs */}
      <View style={styles.body}>
        <DashboardTabs
          searchQuery={searchQuery}
          shadowItems={shadowItems}
          onShadowDelete={handleShadowItemDelete}
          refreshToken={inventoryRefreshToken}
        />
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActionsContainer}>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.bottomButton,
              styles.exportButton,
              exporting && styles.disabledButton,
            ]}
            onPress={handleExport}
            disabled={exporting}>
            {exporting ? (
              <>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={[styles.bottomButtonText, styles.exportingText]}>
                  Exporting...
                </Text>
              </>
            ) : (
              <>
                <Icon name="file-download" size={24} color="#007AFF" />
                <Text style={styles.bottomButtonText}>Export</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomButton, styles.filterButton]}
            onPress={handleFilter}>
            <Icon name="filter-list" size={24} color="#007AFF" />
            <Text style={styles.bottomButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Add Item Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddItemOptions(true)}>
          <Icon name="add" size={32} color="#FFFFFF" style={styles.addButtonIcon} />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
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
    backgroundColor: '#F5F5F5',
    width: '100%',
  },
  bottomActions: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    minWidth: 100,
  },
  exportButton: {
    backgroundColor: '#E3F2FD',
  },
  filterButton: {
    backgroundColor: '#E3F2FD',
  },
  bottomButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exportingText: {
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    margin: 16,
    borderRadius: 12,
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
    backgroundColor: '#F5F5F5',
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
    color: '#000000',
  },
  clearSearchButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default DashboardScreen;