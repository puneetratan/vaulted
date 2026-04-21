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
  silhouettes: string[];
  sizes: string[];
  sources: string[];
  colors: string[];
  priceRange: string | null;
  quantity: string | null;
  releaseYear: string | null;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  availableBrands?: string[];
  availableSilhouettes?: string[];
  availableSizes?: string[];
  availableColors: string[];
  availableYears?: string[];
  currentFilters?: FilterOptions;
}

type FilterSection = 'main' | 'brand' | 'silhouette' | 'size' | 'source' | 'color' | 'price' | 'quantity' | 'releaseYear';

const QUANTITY_OPTIONS = ['1', '2', '3', '4', '5+'];

const FilterModal = ({
  visible,
  onClose,
  onApply,
  availableBrands = [],
  availableSilhouettes = [],
  availableSizes = [],
  availableColors,
  availableYears = [],
  currentFilters,
}: FilterModalProps) => {
  const insets = useSafeAreaInsets();
  const [currentSection, setCurrentSection] = useState<FilterSection>('main');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(currentFilters?.brands || []);
  const [selectedSilhouettes, setSelectedSilhouettes] = useState<string[]>(currentFilters?.silhouettes || []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(currentFilters?.sizes || []);
  const [selectedSources, setSelectedSources] = useState<string[]>(currentFilters?.sources || []);
  const [selectedColors, setSelectedColors] = useState<string[]>(currentFilters?.colors || []);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(currentFilters?.priceRange || null);
  const [selectedQuantity, setSelectedQuantity] = useState<string | null>(currentFilters?.quantity || null);
  const [selectedReleaseYear, setSelectedReleaseYear] = useState<string | null>(currentFilters?.releaseYear || null);

  useEffect(() => {
    if (currentFilters) {
      setSelectedBrands(currentFilters.brands || []);
      setSelectedSilhouettes(currentFilters.silhouettes || []);
      setSelectedSizes(currentFilters.sizes || []);
      setSelectedSources(currentFilters.sources || []);
      setSelectedColors(currentFilters.colors || []);
      setSelectedPriceRange(currentFilters.priceRange || null);
      setSelectedQuantity(currentFilters.quantity || null);
      setSelectedReleaseYear(currentFilters.releaseYear || null);
    }
  }, [currentFilters]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  };

  const handleApply = () => {
    onApply({
      brands: selectedBrands,
      silhouettes: selectedSilhouettes,
      sizes: selectedSizes,
      sources: selectedSources,
      colors: selectedColors,
      priceRange: selectedPriceRange,
      quantity: selectedQuantity,
      releaseYear: selectedReleaseYear,
    });
    onClose();
  };

  const handleClearAll = () => {
    const cleared: FilterOptions = {
      brands: [],
      silhouettes: [],
      sizes: [],
      sources: [],
      colors: [],
      priceRange: null,
      quantity: null,
      releaseYear: null,
    };
    onApply(cleared);
    onClose();
  };

  const hasActiveFilters = useMemo(() => {
    return (
      selectedBrands.length > 0 ||
      selectedSilhouettes.length > 0 ||
      selectedSizes.length > 0 ||
      selectedSources.length > 0 ||
      selectedColors.length > 0 ||
      selectedPriceRange !== null ||
      selectedQuantity !== null ||
      selectedReleaseYear !== null
    );
  }, [selectedBrands, selectedSilhouettes, selectedSizes, selectedSources, selectedColors, selectedPriceRange, selectedQuantity, selectedReleaseYear]);

  const renderCheckboxList = (
    items: string[],
    selected: string[],
    onToggle: (v: string) => void,
    emptyMsg: string,
  ) => (
    <FlatList
      data={items}
      keyExtractor={item => item}
      renderItem={({item}) => {
        const isSelected = selected.includes(item);
        return (
          <TouchableOpacity style={styles.checkboxItem} onPress={() => onToggle(item)}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>{item}</Text>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>{emptyMsg}</Text>}
    />
  );

  const renderSubScreen = (
    title: string,
    content: React.ReactNode,
  ) => (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentSection('main')}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerRowTitle}>{title}</Text>
        <View style={styles.placeholder} />
      </View>
      {content}
    </View>
  );

  const renderMainScreen = () => (
    <View style={styles.content}>
      {[
        {id: 'brand', label: 'Brand', badge: selectedBrands.length},
        {id: 'silhouette', label: 'Silhouette', badge: selectedSilhouettes.length},
        {id: 'size', label: 'Size', badge: selectedSizes.length},
        {id: 'quantity', label: 'Quantity', badge: selectedQuantity ? 1 : 0},
        {id: 'color', label: 'Color', badge: selectedColors.length},
        {id: 'price', label: 'Retail Value', badge: selectedPriceRange ? 1 : 0},
        {id: 'releaseYear', label: 'Release Date Year', badge: selectedReleaseYear ? 1 : 0},
        {id: 'source', label: 'Source', badge: selectedSources.length},
      ].map(opt => (
        <TouchableOpacity
          key={opt.id}
          style={styles.filterOption}
          onPress={() => setCurrentSection(opt.id as FilterSection)}>
          <View style={styles.filterOptionContent}>
            <Text style={styles.filterOptionText}>{opt.label}</Text>
            {opt.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{opt.badge}</Text>
              </View>
            )}
          </View>
          <Icon name="chevron-right" size={24} color="#666666" />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'brand':
        return renderSubScreen('Select Brand', renderCheckboxList(availableBrands, selectedBrands, v => toggle(selectedBrands, setSelectedBrands, v), 'No brands available'));
      case 'silhouette':
        return renderSubScreen('Select Silhouette', renderCheckboxList(availableSilhouettes, selectedSilhouettes, v => toggle(selectedSilhouettes, setSelectedSilhouettes, v), 'No silhouettes available'));
      case 'size':
        return renderSubScreen('Select Size', renderCheckboxList(availableSizes, selectedSizes, v => toggle(selectedSizes, setSelectedSizes, v), 'No sizes available'));
      case 'color':
        return renderSubScreen('Select Color', renderCheckboxList(availableColors, selectedColors, v => toggle(selectedColors, setSelectedColors, v), 'No colors available'));
      case 'source':
        return renderSubScreen('Select Source', renderCheckboxList(['ai', 'manual', 'barcode'], selectedSources, v => toggle(selectedSources, setSelectedSources, v), ''));
      case 'quantity':
        return renderSubScreen('Select Quantity', (
          <View>
            {QUANTITY_OPTIONS.map(q => {
              const isSelected = selectedQuantity === q;
              return (
                <TouchableOpacity key={q} style={styles.checkboxItem} onPress={() => setSelectedQuantity(prev => prev === q ? null : q)}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>{q}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ));
      case 'price':
        return renderSubScreen('Select Retail Value', (
          <View>
            {['Less than $50', 'Between $50-$100', 'Above $100'].map(range => {
              const isSelected = selectedPriceRange === range;
              return (
                <TouchableOpacity key={range} style={styles.checkboxItem} onPress={() => setSelectedPriceRange(prev => prev === range ? null : range)}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>{range}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ));
      case 'releaseYear':
        return renderSubScreen('Select Release Year', renderCheckboxList(availableYears, selectedReleaseYear ? [selectedReleaseYear] : [], v => setSelectedReleaseYear(prev => prev === v ? null : v), 'No release years available'));
      default:
        return renderMainScreen();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, {paddingTop: insets.top + 16}]}>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {renderContent()}
        </ScrollView>

        <View style={styles.footer}>
          {hasActiveFilters && (
            <TouchableOpacity style={[styles.footerButton, styles.clearButton]} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.footerButton, styles.applyButton]} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000000'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {fontSize: 20, fontWeight: 'bold', color: '#FFFFFF'},
  scrollView: {flex: 1},
  content: {padding: 16},
  headerRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 4},
  backButton: {padding: 4, marginRight: 8, marginLeft: -4},
  headerRowTitle: {flex: 1, fontSize: 18, fontWeight: '600', color: '#FFFFFF'},
  placeholder: {width: 24},
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  filterOptionContent: {flexDirection: 'row', alignItems: 'center', flex: 1},
  filterOptionText: {fontSize: 16, color: '#FFFFFF'},
  badge: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666666',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {backgroundColor: '#34C759', borderColor: '#34C759'},
  checkboxLabel: {fontSize: 16, color: '#FFFFFF'},
  emptyText: {fontSize: 14, color: '#999999', textAlign: 'center', marginTop: 24},
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    backgroundColor: '#000000',
  },
  footerButton: {flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  clearButton: {backgroundColor: '#2C2C2E', marginRight: 12},
  clearButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  applyButton: {backgroundColor: '#34C759'},
  applyButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});

export default FilterModal;
