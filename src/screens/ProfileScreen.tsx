import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../contexts/AuthContext';
import {getUserData, updateUserData} from '../services/userService';
import ShoeSizeModal from '../components/ShoeSizeModal';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();
  const [shoeSize, setShoeSize] = useState<string | undefined>(undefined);
  const [showShoeSizeModal, setShowShoeSizeModal] = useState(false);
  const [editShoeSize, setEditShoeSize] = useState('');
  
  // Get user information from Firebase Auth
  const displayName = user?.displayName || 'User';
  const email = user?.email || '';
  const photoURL = user?.photoURL || null;

  // Fetch user profile data including shoe size
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userData = await getUserData(user.uid);
          if (userData?.shoeSize) {
            setShoeSize(userData.shoeSize);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleEditShoeSize = () => {
    setEditShoeSize(shoeSize || '');
    setShowShoeSizeModal(true);
  };

  const handleShoeSizeSubmit = async () => {
    if (editShoeSize.trim() === '') {
      Alert.alert('Error', 'Please enter your shoe size');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      await updateUserData(user.uid, { shoeSize: editShoeSize.trim() });
      setShoeSize(editShoeSize.trim());
      setShowShoeSizeModal(false);
      Alert.alert('Success', 'Shoe size updated successfully!');
    } catch (error: any) {
      console.error('Error saving shoe size:', error);
      Alert.alert('Error', 'Failed to save shoe size. Please try again.');
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled automatically by AppNavigator when auth state changes
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {photoURL ? (
              <Image
                source={{uri: photoURL}}
                style={styles.avatarImage}
              />
            ) : (
              <Icon name="account-circle" size={100} color="#007AFF" />
            )}
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoRow}>
            <Icon name="person" size={20} color="#666666" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{displayName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="email" size={20} color="#666666" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="directions-walk" size={20} color="#666666" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Shoe Size</Text>
              <Text style={styles.infoValue}>{shoeSize || 'Not set'}</Text>
            </View>
            <TouchableOpacity
              onPress={handleEditShoeSize}
              style={styles.editButton}>
              <Icon name="edit" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          

          <TouchableOpacity style={styles.settingsItem}>
            <Icon name="lock" size={24} color="#007AFF" />
            <Text style={styles.settingsText}>Delete Account</Text>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <Icon name="notifications" size={24} color="#007AFF" />
            <Text style={styles.settingsText}>Notification Settings</Text>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingsItem, styles.logoutItem]}
            onPress={handleLogout}>
            <Icon name="logout" size={24} color="#FF3B30" />
            <Text style={[styles.settingsText, styles.logoutText]}>Logout</Text>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Shoe Size Edit Modal */}
      <ShoeSizeModal
        visible={showShoeSizeModal}
        shoeSize={editShoeSize}
        onShoeSizeChange={setEditShoeSize}
        onSubmit={handleShoeSizeSubmit}
      />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 16,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default ProfileScreen;


