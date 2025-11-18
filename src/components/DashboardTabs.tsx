import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, FlatList} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getInventoryItemsPage, InventoryItem, deleteInventoryItem} from '../services/inventoryService';

type DashboardTabsNavigationProp = StackNavigationProp<RootStackParamList>;

type TabType = 'Total Pairs' | 'Brands' | 'Total Value';
type ShadowStatus = 'processing' | 'complete' | 'error';

interface ShoeItem {
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
  isShadow?: boolean;
  shadowStatus?: ShadowStatus;
  condition?: string;
  notes?: string;
  errorMessage?: string;
}

interface DashboardTabsProps {
  searchQuery?: string;
  shadowItems?: ShoeItem[];
  onShadowDelete?: (id: string) => void;
  refreshToken?: number;
}

const DashboardTabs = ({
  searchQuery = '',
  shadowItems = [],
  onShadowDelete,
  refreshToken = 0,
}: DashboardTabsProps) => {
  const navigation = useNavigation<DashboardTabsNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>('Total Pairs');
  const [allShoes, setAllShoes] = useState<ShoeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const tabs: TabType[] = ['Total Pairs', 'Brands', 'Total Value'];
  const PAGE_SIZE = 20;

  const normalizedShadowItems = useMemo(
    () =>
      (shadowItems ?? []).map((item, index) => ({
        ...item,
        id: item.id ?? `shadow-${index}`,
        isShadow: true,
        quantity: item.quantity ?? 1,
        cost: typeof item.cost === 'number' ? item.cost : 0,
        retailValue: typeof item.retailValue === 'number' ? item.retailValue : 0,
        brand: item.brand ?? 'Processing...',
        name: item.name ?? `Analyzing item ${index + 1}`,
        silhouette: item.silhouette ?? 'Processing',
        styleId: item.styleId ?? 'Pending',
        size: item.size ?? 'N/A',
        color: item.color ?? 'N/A',
        shadowStatus: item.shadowStatus ?? 'processing',
      })),
    [shadowItems],
  );

  const combinedShoes = useMemo(
    () => [...normalizedShadowItems, ...allShoes],
    [normalizedShadowItems, allShoes],
  );

  const mapInventoryToShoe = (items: InventoryItem[]): ShoeItem[] =>
    items.map((item, index) => {
      const parsedQuantity = typeof item.quantity === 'number'
        ? item.quantity
        : Number(item.quantity);

      const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.floor(parsedQuantity) : 1;
      const value = typeof item.value === 'number' ? item.value : Number(item.value) || 0;
      const retail = typeof item.retailValue === 'number'
        ? item.retailValue
        : Number(item.retailValue ?? value) || value;

      return {
        id: item.id ?? `${index}`,
        name: item.name ?? 'Unnamed Item',
        brand: item.brand ?? 'Unknown Brand',
        silhouette: item.silhouette ?? 'Unknown',
        styleId: item.styleId ?? 'N/A',
        size: item.size?.toString() ?? 'N/A',
        color: item.color ?? 'Unknown',
        cost: value,
        retailValue: retail,
        releaseDate: item.releaseDate ?? undefined,
        quantity,
        imageUrl: item.imageUrl,
      };
    });

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {items, lastDoc: fetchedLastDoc} = await getInventoryItemsPage({limit: PAGE_SIZE});
      const mapped = mapInventoryToShoe(items);
      setAllShoes(mapped);
      setLastDoc(fetchedLastDoc);
      setHasMore(items.length === PAGE_SIZE && Boolean(fetchedLastDoc));
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      const message = err?.message || 'Failed to load collection. Please try again.';
      setError(message);
      setAllShoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [fetchInventory]),
  );

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory, refreshToken]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchInventory();
    } finally {
      setRefreshing(false);
    }
  }, [fetchInventory]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) {
      return;
    }

    setLoadingMore(true);
    try {
      const {items, lastDoc: fetchedLastDoc} = await getInventoryItemsPage({
        limit: PAGE_SIZE,
        startAfter: lastDoc,
      });
      const mapped = mapInventoryToShoe(items);
      setAllShoes(prev => [...prev, ...mapped]);
      setLastDoc(fetchedLastDoc);
      setHasMore(items.length === PAGE_SIZE && Boolean(fetchedLastDoc));
    } catch (err: any) {
      console.error('Error loading more inventory:', err);
      const message = err?.message || 'Failed to load more items. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter shoes based on search query
  const filteredInventoryShoes = useMemo(() => {
    if (!searchQuery.trim()) {
      return allShoes;
    }
    const query = searchQuery.toLowerCase();
    return allShoes.filter(
      (shoe) =>
        shoe.name.toLowerCase().includes(query) ||
        shoe.brand.toLowerCase().includes(query) ||
        shoe.color.toLowerCase().includes(query) ||
        shoe.size.toLowerCase().includes(query),
    );
  }, [allShoes, searchQuery]);

  const filteredDisplayShoes = useMemo(() => {
    if (!searchQuery.trim()) {
      return combinedShoes;
    }
    const query = searchQuery.toLowerCase();
    return combinedShoes.filter((shoe) => {
      const fields = [shoe.name, shoe.brand, shoe.color, shoe.size];
      return fields.some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(query),
      );
    });
  }, [combinedShoes, searchQuery]);

  const shadowCount = normalizedShadowItems.length;
  const shadowProcessingCount = useMemo(
    () => normalizedShadowItems.filter((item) => item.shadowStatus === 'processing').length,
    [normalizedShadowItems],
  );

  // Calculate counts for tabs
  const uniqueBrands = useMemo(() => [...new Set(allShoes.map((shoe) => shoe.brand))], [allShoes]);
  const totalValue = useMemo(
    () => allShoes.reduce((sum, shoe) => sum + (Number(shoe.cost) || 0), 0),
    [allShoes],
  );

  const renderLoadingState = () => (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.stateContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchInventory}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    if (loading) {
      return renderLoadingState();
    }

    if (error) {
      return renderErrorState();
    }

    const confirmDelete = (shoe: ShoeItem) => {
      if (!shoe.id) {
        Alert.alert('Error', 'Unable to delete item without a valid identifier.');
        return;
      }

      Alert.alert(
        'Delete Item',
        `Are you sure you want to delete "${shoe.name}"?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeletingId(shoe.id as string);
                await deleteInventoryItem(shoe.id as string, shoe.imageUrl);
                await fetchInventory();
              } catch (deleteError: any) {
                const message = deleteError?.message || 'Failed to delete item. Please try again.';
                Alert.alert('Error', message);
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
        {cancelable: true},
      );
    };

    const renderShoeItem = ({item: shoe}: {item: ShoeItem}) => {
      const isShadow = Boolean(shoe.isShadow);
      const isProcessing = isShadow && shoe.shadowStatus === 'processing';
      const hasError = isShadow && shoe.shadowStatus === 'error';
      const displayRetail =
        typeof shoe.retailValue === 'number' && shoe.retailValue > 0
          ? shoe.retailValue.toFixed(2)
          : '--';
      const quantityLabel = isShadow
        ? isProcessing
          ? 'Analyzing'
          : hasError
            ? 'Error'
            : `Qty: ${shoe.quantity ?? 1}`
        : `Qty: ${shoe.quantity}`;

      return (
        <TouchableOpacity
          style={[styles.shoeCard, isShadow && styles.shadowCard]}
          disabled={isShadow}
          activeOpacity={isShadow ? 1 : 0.7}
          onPress={() => {
            if (!isShadow) {
              navigation.navigate('EditItem', {item: shoe});
            }
          }}>
          {shoe.imageUrl && (!isShadow || (isShadow && !isProcessing)) ? (
            <Image source={{uri: shoe.imageUrl}} style={styles.shoeThumbnail} />
          ) : (
            <View style={[styles.shoeThumbnail, styles.shoeThumbnailPlaceholder]}>
              {isProcessing ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Icon name="image" size={32} color="#CCCCCC" />
              )}
            </View>
          )}
          <View style={styles.shoeInfo}>
            <View style={styles.shadowHeaderRow}>
              <View style={styles.shoeNameContainer}>
                <Text style={styles.shoeName}  numberOfLines={1} ellipsizeMode="tail">
                  {shoe.name}
                </Text>
              </View>
              {isShadow && (
                <View style={styles.shadowBadge}>
                  <Text style={styles.shadowBadgeText}>
                    {isProcessing ? 'Analyzing' : hasError ? 'Failed' : 'AI'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.shoeBrand}>{shoe.brand}</Text>
            <View style={styles.shoeMetaRow}>
              <View
                style={[
                  styles.quantityBadge,
                  isShadow && styles.shadowQuantityBadge,
                  hasError && styles.shadowQuantityBadgeError,
                ]}>
                <Text
                  style={[
                    styles.quantityBadgeText,
                    isShadow && styles.shadowQuantityBadgeText,
                    hasError && styles.shadowStatusError,
                  ]}>
                  {quantityLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.shoeCost}>
              ${displayRetail}
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            {isShadow ? (
              <View style={styles.shadowStatusContainer}>
                {isProcessing && (
                  <ActivityIndicator size="small" color="#007AFF" style={styles.shadowStatusSpinner} />
                )}
                <Text
                  style={[
                    styles.shadowStatusText,
                    hasError && styles.shadowStatusError,
                  ]}>
                  {isProcessing
                    ? 'Analyzing...'
                    : hasError
                      ? shoe.errorMessage || 'Analysis failed'
                      : 'AI result'}
                </Text>
                <TouchableOpacity
                  style={styles.shadowDeleteButton}
                  onPress={() => onShadowDelete?.(shoe.id)}
                  accessibilityLabel={`Remove ${shoe.name}`}>
                  <Icon name="close" size={16} color="#666666" />
                </TouchableOpacity>
              </View>
            ) : deletingId === shoe.id ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(shoe)}
                  accessibilityLabel={`Delete ${shoe.name}`}>
                  <Icon name="delete" size={24} color="#FF3B30" />
                </TouchableOpacity>
                <Icon name="arrow-forward" size={24} color="#666666" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    };

    const renderEmptyComponent = () => (
      <View style={styles.emptyState}>
        <Text style={styles.tabContentValue}>0</Text>
        <Text style={styles.tabContentSubtitle}>
          No items added yet
        </Text>
      </View>
    );

    const renderListFooter = () => {
      if (!hasMore || searchQuery.trim()) {
        return null;
      }
      return (
        <View style={styles.listFooter}>
          {loadingMore && <ActivityIndicator color="#007AFF" />}
        </View>
      );
    };

    const handleEndReached = () => {
      if (hasMore && !loadingMore && !searchQuery.trim()) {
        loadMore();
      }
    };

    switch (activeTab) {
      case 'Total Pairs':
        return (
          <FlatList
            data={filteredDisplayShoes}
            keyExtractor={(shoe, index) => shoe.id?.toString() ?? `${shoe.name}-${shoe.size}-${index}`}
            ListHeaderComponent={
              <View style={styles.totalPairsHeader}>
                <Text style={styles.tabContentTitle}>
                  Total Pairs: {filteredInventoryShoes.length}
                </Text>
                {shadowCount > 0 && (
                  <Text style={styles.shadowInfoText}>
                    AI items: {shadowCount}
                    {shadowProcessingCount > 0
                      ? ` (${shadowProcessingCount} analyzing)`
                      : ' (ready)'}
                  </Text>
                )}
              </View>
            }
            renderItem={renderShoeItem}
            ListEmptyComponent={renderEmptyComponent}
            contentContainerStyle={styles.scrollContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderListFooter}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'Brands':
        const brandCounts = uniqueBrands.map(brand => ({
          brand,
          count: allShoes.filter(shoe => shoe.brand === brand).length
        }));
        
        return (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}>
            <Text style={styles.tabContentTitle}>Brands: {uniqueBrands.length}</Text>
            {brandCounts.length > 0 ? (
              brandCounts.map((item, index) => (
                <TouchableOpacity key={index} style={styles.brandCard}>
                  <View style={styles.brandInfo}>
                    <Text style={styles.brandName}>{item.brand}</Text>
                    <Text style={styles.brandCount}>{item.count} items</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.tabContentValue}>0</Text>
                <Text style={styles.tabContentSubtitle}>
                  No brands added yet
                </Text>
              </View>
            )}
          </ScrollView>
        );
      case 'Total Value':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabContentTitle}>Total Value</Text>
            <Text style={styles.tabContentValue}>${totalValue}</Text>
            <Text style={styles.tabContentSubtitle}>
              {allShoes.length > 0 ? `${allShoes.length} items` : 'No items added yet'}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          let tabLabel: string = tab;
          if (tab === 'Total Pairs') {
            tabLabel = shadowCount > 0
              ? `${tab} (${allShoes.length} +${shadowCount} AI)`
              : `${tab} (${allShoes.length})`;
          } else if (tab === 'Brands') {
            tabLabel = `${tab} (${uniqueBrands.length})`;
          } else if (tab === 'Total Value') {
            tabLabel = `${tab} ($${totalValue})`;
          }
          
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}>
                {tabLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>{renderTabContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  tabContentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  tabContentValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  tabContentSubtitle: {
    fontSize: 16,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shadowCard: {
    borderWidth: 1,
    borderColor: '#D0E2FF',
    backgroundColor: '#F5F9FF',
  },
  shoeThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  shoeThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  shadowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  shadowBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  shadowBadgeText: {
    fontSize: 12,
    color: '#0A5FD9',
    fontWeight: '600',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    flexDirection: 'row',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginRight: 12,
    padding: 4,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadMoreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoeNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  shoeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
    maxWidth: 240, // Approximately 30 characters at 14px font size
  },
  shoeBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  shoeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  shoeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  shoeDetailText: {
    fontSize: 13,
    color: '#666666',
    marginRight: 12,
    marginBottom: 4,
  },
  quantityBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
    // marginLeft: 30,
    alignSelf: 'flex-start',
  },
  quantityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  shadowQuantityBadge: {
    backgroundColor: '#DCEBFF',
  },
  shadowQuantityBadgeText: {
    color: '#0A5FD9',
  },
  shadowQuantityBadgeError: {
    backgroundColor: '#FDECEA',
  },
  shoeCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
  },
  shadowStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 110,
  },
  shadowStatusSpinner: {
    marginRight: 6,
  },
  shadowStatusText: {
    fontSize: 12,
    color: '#0A5FD9',
    fontWeight: '600',
  },
  shadowStatusError: {
    color: '#D7263D',
  },
  shadowDeleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  brandCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  brandCount: {
    fontSize: 14,
    color: '#666666',
  },
  totalPairsHeader: {
    marginBottom: 12,
  },
  shadowInfoText: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
});

export default DashboardTabs;


