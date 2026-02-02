import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, FlatList} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getInventoryItemsPage, InventoryItem, deleteInventoryItem} from '../services/inventoryService';
import {FilterOptions} from './FilterModal';
import {useTheme} from '../contexts/ThemeContext';

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
  source?: string;
  errorMessage?: string;
}

interface DashboardTabsProps {
  searchQuery?: string;
  shadowItems?: ShoeItem[];
  onShadowDelete?: (id: string) => void;
  refreshToken?: number;
  filters?: FilterOptions | null;
  onAvailableFiltersChange?: (brands: string[], colors: string[]) => void;
}

const DashboardTabs = ({
  searchQuery = '',
  shadowItems = [],
  onShadowDelete,
  refreshToken = 0,
  filters = null,
  onAvailableFiltersChange,
}: DashboardTabsProps) => {
  const navigation = useNavigation<DashboardTabsNavigationProp>();
  const {colors} = useTheme();
  const [allShoes, setAllShoes] = useState<ShoeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('All');

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
        source: item.source,
        notes: item.notes,
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

  // Extract available brands and colors for filter options
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    allShoes.forEach(shoe => {
      if (shoe.brand && shoe.brand.trim() !== '' && shoe.brand.toLowerCase() !== 'unknown brand') {
        brands.add(shoe.brand);
      }
    });
    return Array.from(brands).sort();
  }, [allShoes]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    allShoes.forEach(shoe => {
      if (shoe.color && shoe.color.trim() !== '' && shoe.color.toLowerCase() !== 'unknown') {
        colors.add(shoe.color);
      }
    });
    return Array.from(colors).sort();
  }, [allShoes]);

  // Notify parent of available filter options
  useEffect(() => {
    if (onAvailableFiltersChange) {
      onAvailableFiltersChange(availableBrands, availableColors);
    }
  }, [availableBrands, availableColors, onAvailableFiltersChange]);

  // Apply filters to shoes
  const applyFilters = useCallback((shoes: ShoeItem[]) => {
    if (!filters) {
      return shoes;
    }

    return shoes.filter((shoe) => {
      // Brand filter
      if (filters.brands.length > 0 && !filters.brands.includes(shoe.brand)) {
        return false;
      }

      // Source filter
      if (filters.sources.length > 0) {
        const shoeSource = shoe.source || 'manual';
        const sourceMatch = filters.sources.includes(shoeSource);
        if (!sourceMatch) {
          return false;
        }
      }

      // Color filter
      if (filters.colors.length > 0 && !filters.colors.includes(shoe.color)) {
        return false;
      }

      // Price filter
      if (filters.priceRange) {
        const price = shoe.retailValue || shoe.cost || 0;
        switch (filters.priceRange) {
          case 'Less than $50':
            if (price >= 50) return false;
            break;
          case 'Between $50-$100':
            if (price < 50 || price > 100) return false;
            break;
          case 'Above $100':
            if (price <= 100) return false;
            break;
        }
      }

      return true;
    });
  }, [filters]);

  // Get available brands for filter buttons
  const availableBrandsForFilter = useMemo(() => {
    const brands = new Set<string>();
    allShoes.forEach(shoe => {
      if (shoe.brand && shoe.brand.trim() !== '' && shoe.brand.toLowerCase() !== 'unknown brand') {
        brands.add(shoe.brand);
      }
    });
    // Common brands to show
    const commonBrands = ['Nike', 'Adidas', 'Converse', 'Puma'];
    const result = ['All', ...commonBrands.filter(b => brands.has(b))];
    // Add other brands
    Array.from(brands).forEach(b => {
      if (!commonBrands.includes(b) && !result.includes(b)) {
        result.push(b);
      }
    });
    return result;
  }, [allShoes]);

  // Filter shoes based on search query and brand filter
  const filteredInventoryShoes = useMemo(() => {
    let result = allShoes;
    
    // Apply brand filter
    if (selectedBrand !== 'All') {
      result = result.filter(shoe => shoe.brand === selectedBrand);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (shoe) =>
          shoe.name.toLowerCase().includes(query) ||
          shoe.brand.toLowerCase().includes(query) ||
          shoe.color.toLowerCase().includes(query) ||
          shoe.size.toLowerCase().includes(query),
      );
    }

    // Apply filters
    result = applyFilters(result);
    
    return result;
  }, [allShoes, searchQuery, selectedBrand, applyFilters]);

  const filteredDisplayShoes = useMemo(() => {
    let result = combinedShoes;
    
    // Apply brand filter
    if (selectedBrand !== 'All') {
      result = result.filter(shoe => shoe.brand === selectedBrand);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((shoe) => {
        const fields = [shoe.name, shoe.brand, shoe.color, shoe.size];
        return fields.some(
          (field) => typeof field === 'string' && field.toLowerCase().includes(query),
        );
      });
    }

    // Apply filters
    result = applyFilters(result);
    
    return result;
  }, [combinedShoes, searchQuery, selectedBrand, applyFilters]);

  const shadowCount = normalizedShadowItems.length;
  const shadowProcessingCount = useMemo(
    () => normalizedShadowItems.filter((item) => item.shadowStatus === 'processing').length,
    [normalizedShadowItems],
  );

  // Calculate counts for summary cards
  const uniqueBrands = useMemo(() => [...new Set(allShoes.map((shoe) => shoe.brand))], [allShoes]);
  const totalPairs = useMemo(() => allShoes.reduce((sum, shoe) => sum + (shoe.quantity || 1), 0), [allShoes]);
  const totalValue = useMemo(
    () => allShoes.reduce((sum, shoe) => sum + (Number(shoe.retailValue || shoe.cost) || 0), 0),
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
      const componentStyles = styles(colors);
      const isShadow = Boolean(shoe.isShadow);
      const isProcessing = isShadow && shoe.shadowStatus === 'processing';
      const hasError = isShadow && shoe.shadowStatus === 'error';
      const displayRetail =
        typeof shoe.retailValue === 'number' && shoe.retailValue > 0
          ? Math.round(shoe.retailValue).toString()
          : '--';

      return (
        <TouchableOpacity
          style={[componentStyles.shoeCard, isShadow && componentStyles.shadowCard]}
          disabled={isShadow}
          activeOpacity={isShadow ? 1 : 0.7}
          onPress={() => {
            if (!isShadow) {
              navigation.navigate('EditItem', {item: shoe});
            }
          }}>
          {!isShadow && (
            <View style={componentStyles.sourceIconOverlay}>
              {shoe.source === 'ai' ? (
                <Icon name="auto-awesome" size={14} color="#FFFFFF" />
              ) : shoe.source === 'barcode' ? (
                <Icon name="qr-code-scanner" size={14} color="#FFFFFF" />
              ) : (
                <Icon name="edit" size={14} color="#FFFFFF" />
              )}
            </View>
          )}
          <View style={componentStyles.imageContainer}>
            {shoe.imageUrl && (!isShadow || (isShadow && !isProcessing)) ? (
              <Image source={{uri: shoe.imageUrl}} style={componentStyles.shoeThumbnail} />
            ) : (
              <View style={[componentStyles.shoeThumbnail, componentStyles.shoeThumbnailPlaceholder]}>
                {isProcessing ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Icon name="image" size={32} color={colors.textSecondary} />
                )}
              </View>
            )}
          </View>
          <View style={componentStyles.shoeInfo}>
            <View style={componentStyles.shadowHeaderRow}>
              <View style={componentStyles.shoeNameContainer}>
                <Text style={[componentStyles.shoeName, {color: colors.text}]}  numberOfLines={1} ellipsizeMode="tail">
                  {shoe.silhouette && 
                   typeof shoe.silhouette === 'string' &&
                   shoe.silhouette.trim() !== '' && 
                   shoe.silhouette.trim().toLowerCase() !== 'unknown' && 
                   shoe.silhouette.trim().toLowerCase() !== 'n/a'
                    ? shoe.silhouette
                    : shoe.name}
                </Text>
              </View>
              {isShadow && (
                <View style={componentStyles.shadowBadge}>
                  <Text style={componentStyles.shadowBadgeText}>
                    {isProcessing ? 'Analyzing' : hasError ? 'Failed' : 'AI'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[componentStyles.shoeBrand, {color: colors.primary}]}>{shoe.brand}</Text>
            <Text style={[componentStyles.shoeDetails, {color: colors.textSecondary}]}>
              Size {shoe.size} | {shoe.color} | ${displayRetail}
            </Text>
          </View>
          <View style={componentStyles.arrowContainer}>
            {isShadow ? (
              <View style={componentStyles.shadowStatusContainer}>
                {isProcessing && (
                  <ActivityIndicator size="small" color={colors.primary} style={componentStyles.shadowStatusSpinner} />
                )}
                <Text
                  style={[
                    componentStyles.shadowStatusText,
                    {color: hasError ? colors.error : colors.primary},
                  ]}>
                  {isProcessing
                    ? 'Analyzing...'
                    : hasError
                      ? shoe.errorMessage || 'Analysis failed'
                      : 'AI result'}
                </Text>
                <TouchableOpacity
                  style={componentStyles.shadowDeleteButton}
                  onPress={() => onShadowDelete?.(shoe.id)}
                  accessibilityLabel={`Remove ${shoe.name}`}>
                  <Icon name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : deletingId === shoe.id ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
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

    return (
      <FlatList
        data={filteredDisplayShoes}
        keyExtractor={(shoe, index) => shoe.id?.toString() ?? `${shoe.name}-${shoe.size}-${index}`}
        ListHeaderComponent={() => {
          const componentStyles = styles(colors);
          return (
          <>
            {/* Summary Statistics Cards */}
            <View style={componentStyles.summaryCardsContainer}>
              <View style={componentStyles.summaryCard}>
                <Text style={componentStyles.summaryCardValue}>{totalPairs}</Text>
                <Text style={componentStyles.summaryCardLabel}>Total Pairs</Text>
              </View>
              <View style={componentStyles.summaryCard}>
                <Text style={componentStyles.summaryCardValue}>{uniqueBrands.length}</Text>
                <Text style={componentStyles.summaryCardLabel}>Brands</Text>
              </View>
              <View style={componentStyles.summaryCard}>
                <Text style={componentStyles.summaryCardValue}>
                  ${Math.round(totalValue).toLocaleString()}
                </Text>
                <Text style={componentStyles.summaryCardLabel}>Total Value</Text>
              </View>
            </View>

            {/* Brand Filter Buttons */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={componentStyles.brandFilterContainer}
              contentContainerStyle={componentStyles.brandFilterContent}>
              {availableBrandsForFilter.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={[
                    componentStyles.brandFilterButton,
                    selectedBrand === brand && componentStyles.brandFilterButtonActive,
                  ]}
                  onPress={() => setSelectedBrand(brand)}>
                  <Text
                    style={[
                      componentStyles.brandFilterButtonText,
                      selectedBrand === brand && componentStyles.brandFilterButtonTextActive,
                    ]}>
                    {brand === 'Nike' ? 'Airforce' : brand}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
          );
        }}
        renderItem={renderShoeItem}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={componentStyles.scrollContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderListFooter}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const componentStyles = styles(colors);

  return (
    <View style={componentStyles.container}>
      {/* Content */}
      <View style={componentStyles.contentContainer}>{renderTabContent()}</View>
    </View>
  );
};

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    opacity: 0.7,
  },
  brandFilterContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  brandFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  brandFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  brandFilterButtonActive: {
    backgroundColor: colors.success,
  },
  brandFilterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  brandFilterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  tabContentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  tabContentValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  tabContentSubtitle: {
    fontSize: 16,
    color: colors.text,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  shoeCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shadowCard: {
    borderWidth: 1,
    borderColor: '#D0E2FF',
    backgroundColor: '#F5F9FF',
  },
  imageContainer: {
    position: 'relative',
  },
  shoeThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  shoeThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceIconOverlay: {
    position: 'absolute',
    top: 0,
    right: 8,
    backgroundColor: '#000000',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
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
    marginBottom: 4,
    maxWidth: 240, // Approximately 30 characters at 14px font size
  },
  shoeBrand: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  shoeDetails: {
    fontSize: 14,
    marginTop: 4,
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
  totalPairsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  sourceLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  legendIconContainer: {
    backgroundColor: '#000000',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
    marginLeft: 4,
  },
  shadowInfoText: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
});

export default DashboardTabs;


