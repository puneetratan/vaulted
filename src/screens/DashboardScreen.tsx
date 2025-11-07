import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../contexts/AuthContext';
import {getUserData, updateUserData} from '../services/userService';
import ShoeSizeModal from '../components/ShoeSizeModal';
import DashboardTabs from '../components/DashboardTabs';
// Use web-compatible versions on web
const AddItemOptions = Platform.OS === 'web'
  ? require('../components/AddItemOptions.web').default
  : require('../components/AddItemOptions').default;
const HamburgerMenu = Platform.OS === 'web'
  ? require('../components/HamburgerMenu.web').default
  : require('../components/HamburgerMenu').default;

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

  const handleExport = () => {
    setShowExportModal(true);
    Alert.alert(
      'Export Options',
      'Choose export format:',
      [
        {
          text: 'CSV',
          onPress: () => {
            Alert.alert('Success', 'Data exported to CSV');
            setShowExportModal(false);
          },
        },
        {
          text: 'PDF',
          onPress: () => {
            Alert.alert('Success', 'Data exported to PDF');
            setShowExportModal(false);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowExportModal(false),
        },
      ],
    );
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
        <DashboardTabs searchQuery={searchQuery} />
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActionsContainer}>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.bottomButton, styles.exportButton]}
            onPress={handleExport}>
            <Icon name="file-download" size={24} color="#007AFF" />
            <Text style={styles.bottomButtonText}>Export</Text>
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
});

export default DashboardScreen;

