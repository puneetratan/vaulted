import React, {useState, useEffect, useMemo} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

export interface FilterOptions {
  brands: string[];
  sources: string[];
  colors: string[];
  priceRange: string | null;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  availableBrands: string[];
  availableColors: string[];
  currentFilters?: FilterOptions;
}

type FilterSection = 'main' | 'brand' | 'source' | 'color' | 'price';

const FilterModal = ({
  visible,
  onClose,
  onApply,
  availableBrands,
  availableColors,
  currentFilters,
}: FilterModalProps) => {
  const insets = useSafeAreaInsets();
  const [currentSection, setCurrentSection] = useState<FilterSection>('main');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    currentFilters?.brands || []
  );
  const [selectedSources, setSelectedSources] = useState<string[]>(
    currentFilters?.sources || []
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(
    currentFilters?.colors || []
  );
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(
    currentFilters?.priceRange || null
  );

  useEffect(() => {
    if (currentFilters) {
      setSelectedBrands(currentFilters.brands || []);
      setSelectedSources(currentFilters.sources || []);
      setSelectedColors(currentFilters.colors || []);
      setSelectedPriceRange(currentFilters.priceRange || null);
    }
  }, [currentFilters]);

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleColorToggle = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const handlePriceRangeSelect = (range: string) => {
    setSelectedPriceRange(prev => (prev === range ? null : range));
  };

  const handleApply = () => {
    onApply({
      brands: selectedBrands,
      sources: selectedSources,
      colors: selectedColors,
      priceRange: selectedPriceRange,
    });
    onClose();
  };

  const handleClearAll = () => {
    const clearedFilters = {
      brands: [],
      sources: [],
      colors: [],
      priceRange: null,
    };
    onApply(clearedFilters);
    onClose();
  };

  const hasActiveFilters = useMemo(() => {
    return (
      selectedBrands.length > 0 ||
      selectedSources.length > 0 ||
      selectedColors.length > 0 ||
      selectedPriceRange !== null
    );
  }, [selectedBrands, selectedSources, selectedColors, selectedPriceRange]);

  const renderMainScreen = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Filter Options</Text>
      
      <TouchableOpacity
        style={styles.filterOption}
        onPress={() => setCurrentSection('brand')}>
        <View style={styles.filterOptionContent}>
          <Text style={styles.filterOptionText}>Brand</Text>
          {selectedBrands.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedBrands.length}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={24} color="#666666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterOption}
        onPress={() => setCurrentSection('source')}>
        <View style={styles.filterOptionContent}>
          <Text style={styles.filterOptionText}>Source</Text>
          {selectedSources.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedSources.length}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={24} color="#666666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterOption}
        onPress={() => setCurrentSection('color')}>
        <View style={styles.filterOptionContent}>
          <Text style={styles.filterOptionText}>Color</Text>
          {selectedColors.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedColors.length}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-right" size={24} color="#666666" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterOption}
        onPress={() => setCurrentSection('price')}>
        <View style={styles.filterOptionContent}>
          <Text style={styles.filterOptionText}>Price</Text>
          {selectedPriceRange && (
            <Text style={styles.selectedPriceText}>{selectedPriceRange}</Text>
          )}
        </View>
        <Icon name="chevron-right" size={24} color="#666666" />
      </TouchableOpacity>
    </View>
  );

  const renderBrandScreen = () => (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentSection('main')}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Select Brands</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={availableBrands}
        keyExtractor={item => item}
        renderItem={({item}) => {
          const isSelected = selectedBrands.includes(item);
          return (
            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => handleBrandToggle(item)}>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}>
                {isSelected && (
                  <Icon name="check" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>{item}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No brands available</Text>
        }
      />
    </View>
  );

  const renderSourceScreen = () => (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentSection('main')}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Select Source</Text>
        <View style={styles.placeholder} />
      </View>

      <TouchableOpacity
        style={styles.checkboxItem}
        onPress={() => handleSourceToggle('ai')}>
        <View
          style={[
            styles.checkbox,
            selectedSources.includes('ai') && styles.checkboxSelected,
          ]}>
          {selectedSources.includes('ai') && (
            <Icon name="check" size={16} color="#FFFFFF" />
          )}
        </View>
        <Text style={styles.checkboxLabel}>AI</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.checkboxItem}
        onPress={() => handleSourceToggle('manual')}>
        <View
          style={[
            styles.checkbox,
            selectedSources.includes('manual') && styles.checkboxSelected,
          ]}>
          {selectedSources.includes('manual') && (
            <Icon name="check" size={16} color="#FFFFFF" />
          )}
        </View>
        <Text style={styles.checkboxLabel}>Manual</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.checkboxItem}
        onPress={() => handleSourceToggle('barcode')}>
        <View
          style={[
            styles.checkbox,
            selectedSources.includes('barcode') && styles.checkboxSelected,
          ]}>
          {selectedSources.includes('barcode') && (
            <Icon name="check" size={16} color="#FFFFFF" />
          )}
        </View>
        <Text style={styles.checkboxLabel}>Barcode</Text>
      </TouchableOpacity>
    </View>
  );

  const renderColorScreen = () => (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentSection('main')}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Select Colors</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={availableColors}
        keyExtractor={item => item}
        renderItem={({item}) => {
          const isSelected = selectedColors.includes(item);
          return (
            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => handleColorToggle(item)}>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}>
                {isSelected && (
                  <Icon name="check" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>{item}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No colors available</Text>
        }
      />
    </View>
  );

  const renderPriceScreen = () => (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentSection('main')}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Select Price Range</Text>
        <View style={styles.placeholder} />
      </View>

      {['Less than $50', 'Between $50-$100', 'Above $100'].map(range => {
        const isSelected = selectedPriceRange === range;
        return (
          <TouchableOpacity
            key={range}
            style={styles.checkboxItem}
            onPress={() => handlePriceRangeSelect(range)}>
            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}>
              {isSelected && (
                <Icon name="check" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{range}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'brand':
        return renderBrandScreen();
      case 'source':
        return renderSourceScreen();
      case 'color':
        return renderColorScreen();
      case 'price':
        return renderPriceScreen();
      default:
        return renderMainScreen();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, {paddingTop: insets.top + 16}]}>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {renderContent()}
        </ScrollView>

        <View style={styles.footer}>
          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.footerButton, styles.clearButton]}
              onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.footerButton, styles.applyButton]}
            onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  placeholder: {
    width: 24,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  badge: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedPriceText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000000',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 24,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  clearButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#474747',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FilterModal;

