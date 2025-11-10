import React, {useState, useMemo, useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getInventoryItemsPage, InventoryItem, deleteInventoryItem} from '../services/inventoryService';

type DashboardTabsNavigationProp = StackNavigationProp<RootStackParamList>;

type TabType = 'Total Pairs' | 'Brands' | 'Total Value';

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
}

interface DashboardTabsProps {
  searchQuery?: string;
}

const DashboardTabs = ({searchQuery = ''}: DashboardTabsProps) => {
  const navigation = useNavigation<DashboardTabsNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>('Total Pairs');
  const [allShoes, setAllShoes] = useState<ShoeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const tabs: TabType[] = ['Total Pairs', 'Brands', 'Total Value'];
const PAGE_SIZE = 20;

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
  const filteredShoes = useMemo(() => {
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

    switch (activeTab) {
      case 'Total Pairs':
        return (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}>
            <Text style={styles.tabContentTitle}>Total Pairs: {filteredShoes.length}</Text>
            {filteredShoes.length > 0 ? (
              filteredShoes.map((shoe) => (
                <TouchableOpacity 
                  key={shoe.id} 
                  style={styles.shoeCard}
                  onPress={() => navigation.navigate('EditItem', {item: shoe})}>
                  {shoe.imageUrl ? (
                    <Image
                      source={{uri: shoe.imageUrl}}
                      style={styles.shoeThumbnail}
                    />
                  ) : (
                    <View style={[styles.shoeThumbnail, styles.shoeThumbnailPlaceholder]}>
                      <Icon name="image" size={32} color="#CCCCCC" />
                    </View>
                  )}
                  <View style={styles.shoeInfo}>
                    <Text style={styles.shoeName}>{shoe.name}</Text>
                    <Text style={styles.shoeBrand}>{shoe.brand}</Text>
                    <View style={styles.shoeMetaRow}>
                      <View style={styles.shoeDetails}>
                        <Text style={styles.shoeDetailText}>Silhouette: {shoe.silhouette}</Text>
                        <Text style={styles.shoeDetailText}>Style ID: {shoe.styleId}</Text>
                        <Text style={styles.shoeDetailText}>Size: {shoe.size}</Text>
                        <Text style={styles.shoeDetailText}>Color: {shoe.color}</Text>
                        {shoe.releaseDate ? (
                          <Text style={styles.shoeDetailText}>Release: {shoe.releaseDate}</Text>
                        ) : null}
                      </View>
                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityBadgeText}>Qty: {shoe.quantity}</Text>
                      </View>
                    </View>
                    <Text style={styles.shoeCost}>
                      Retail: $
                      {typeof shoe.retailValue === 'number'
                        ? shoe.retailValue.toFixed(2)
                        : '--'}
                    </Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    {deletingId === shoe.id ? (
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
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.tabContentValue}>0</Text>
                <Text style={styles.tabContentSubtitle}>
                  No items added yet
                </Text>
              </View>
            )}
            {hasMore && filteredShoes.length > 0 && !searchQuery.trim() && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
                accessibilityLabel="Load more items">
                {loadingMore ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loadMoreButtonText}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
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
            tabLabel = `${tab} (${allShoes.length})`;
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
  shoeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
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
  shoeCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
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
});

export default DashboardTabs;


