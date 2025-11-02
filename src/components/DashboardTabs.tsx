import React, {useState, useMemo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {RootStackParamList} from '../navigation/AppNavigator';

type DashboardTabsNavigationProp = StackNavigationProp<RootStackParamList>;

type TabType = 'Total Pairs' | 'Brands' | 'Total Value';

interface ShoeItem {
  id: string;
  name: string;
  brand: string;
  size: string;
  color: string;
  cost: number;
  imageUrl?: string;
}

interface DashboardTabsProps {
  searchQuery?: string;
}

const DashboardTabs = ({searchQuery = ''}: DashboardTabsProps) => {
  const navigation = useNavigation<DashboardTabsNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>('Total Pairs');

  const tabs: TabType[] = ['Total Pairs', 'Brands', 'Total Value'];

  // Generate 20 items with diverse data
  const generateShoeData = (): ShoeItem[] => {
    const brands = ['Nike', 'Adidas', 'Vans', 'Reebok', 'Converse', 'Puma', 'New Balance', 'Jordan'];
    const colors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Gray', 'Black/White', 'Blue/White', 'Red/Black', 'White/Red'];
    const sizes = ['8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'];
    const models = [
      'Air Max 270', 'Classic Leather', 'Old Skool', 'Ultraboost 22', 'Chuck Taylor',
      'Air Force 1', 'Suede Classic', '574 Core', 'Retro High', 'Superstar',
      'Stan Smith', 'Authentic', 'Club C 85', 'RS-X', 'Escape Runner',
      'Walker', 'Pro Court', 'Revel 6', 'Dad Shoe', 'Platform'
    ];
    
    // Valid Unsplash image IDs for shoes
    const imageIds = [
      '1542291026-7eec264c27ff', '1606107557195-0e29a4b5b4aa', '1604671801908-6f0c6a092c05',
      '1605348532760-6753d2c43329', '1549298916-b41d501d3772', '1608236191388-9c7c5e5b72b8',
      '1607522370275-f1427063fcf7', '1602815527108-5c6fef8c3d7b', '1595950653106-6c9ebd714d08',
      '1600185365483-26bc2900c82d', '1600269453521-4a236da879ba', '1576678446592-edbb24e2e2ab',
      '1601115650525-41cc1c55e19f', '1600697950031-3e081082a1e8', '1606423808113-87a8f7407b79',
      '1608175172376-782ec2a13917', '1608266828342-d606988de2fd', '1602879933467-156a5c0f7af5',
      '1605552738196-d188665e1a22', '1605818739254-5d5f4c5f7c0e'
    ];
    
    const shoes: ShoeItem[] = [];
    for (let i = 1; i <= 20; i++) {
      const brand = brands[i % brands.length];
      const model = models[i % models.length];
      shoes.push({
        id: i.toString(),
        name: model,
        brand,
        size: sizes[i % sizes.length],
        color: colors[i % colors.length],
        cost: 60 + (i * 7) + Math.floor(i / 3) * 10,
        imageUrl: `https://images.unsplash.com/photo-${imageIds[i - 1]}?w=200&h=200&fit=crop`,
      });
    }
    return shoes;
  };

  const [allShoes] = useState<ShoeItem[]>(generateShoeData());

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
  const uniqueBrands = [...new Set(allShoes.map((shoe) => shoe.brand))];
  const totalValue = allShoes.reduce((sum, shoe) => sum + shoe.cost, 0);

  const renderTabContent = () => {
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
                  <Image
                    source={{uri: shoe.imageUrl}}
                    style={styles.shoeThumbnail}
                  />
                  <View style={styles.shoeInfo}>
                    <Text style={styles.shoeName}>{shoe.name}</Text>
                    <Text style={styles.shoeBrand}>{shoe.brand}</Text>
                    <View style={styles.shoeDetails}>
                      <Text style={styles.shoeDetailText}>Size: {shoe.size}</Text>
                      <Text style={styles.shoeDetailText}>Color: {shoe.color}</Text>
                      <Text style={styles.shoeCost}>${shoe.cost}</Text>
                    </View>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Icon name="arrow-forward" size={24} color="#666666" />
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
  shoeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  shoeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  shoeDetailText: {
    fontSize: 13,
    color: '#666666',
    marginRight: 12,
    marginBottom: 4,
  },
  shoeCost: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 4,
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


