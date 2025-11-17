import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../contexts/AuthContext';
import {getUserData, updateUserData} from '../services/userService';
import {getStorage} from '../services/firebase';
import {getStorage as getWebStorage} from 'firebase/storage';
import {initializeApp, getApps} from 'firebase/app';
import {updateProfile, reload} from 'firebase/auth';
import ShoeSizeModal from '../components/ShoeSizeModal';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();
  const [shoeSize, setShoeSize] = useState<string | undefined>(undefined);
  const [showShoeSizeModal, setShowShoeSizeModal] = useState(false);
  const [editShoeSize, setEditShoeSize] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Get user information from Firebase Auth
  const displayName = user?.displayName || 'User';
  const email = user?.email || '';
  const photoURL = localPhotoURL || user?.photoURL || null;

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

  // Update local photo URL when user changes
  useEffect(() => {
    setLocalPhotoURL(user?.photoURL || null);
  }, [user?.photoURL]);

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

  const handleImagePicker = () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => {
            // Trigger camera input click
            if (cameraInputRef.current) {
              cameraInputRef.current.click();
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: () => {
            // Trigger file input click
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Alert.alert('Error', 'Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Alert.alert('Error', 'Image size must be less than 5MB.');
      return;
    }

    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }

    await uploadProfileImage(file);
  };

  const uploadProfileImage = async (file: File) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    setUploadingImage(true);

    try {
      // Initialize Firebase for web if not already initialized
      const firebaseConfig = {
        apiKey: "AIzaSyBZuRY5RIdwCG7TmI81u8tOmX5-dG8h1IM",
        authDomain: "dev-vaultapp.firebaseapp.com",
        projectId: "dev-vaultapp",
        storageBucket: "dev-vaultapp.firebasestorage.app",
        messagingSenderId: "872715867979",
        appId: "1:872715867979:ios:5a876d48f392bdf0db7ace",
        measurementId: "G-PNKEGHHYSF",
        databaseURL: "https://dev-vaultapp-default-rtdb.firebaseio.com",
      };

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const timestamp = Date.now();
      const fileName = file.name || `avatar_${timestamp}.jpg`;
      const storagePath = `profile/${user.uid}/avatar_${timestamp}_${fileName}`;

      // Use web SDK's getStorage for web platform
      const {ref, uploadBytes, getDownloadURL} = await import('firebase/storage');
      const storageInstance = getWebStorage(app);
      const storageRef = ref(storageInstance, storagePath);
      await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });
      const uploadedImageUrl = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      if (user) {
        await updateProfile(user, {
          photoURL: uploadedImageUrl,
        });
        // Reload user to get updated photoURL - this will trigger onAuthStateChanged
        // which will update the user object in AuthContext
        await reload(user);
      }

      // Update Firestore user document
      await updateUserData(user.uid, {photoURL: uploadedImageUrl});

      // Update local state immediately for better UX
      // The useEffect will also update it when user.photoURL changes after reload
      setLocalPhotoURL(uploadedImageUrl);

      Alert.alert('Success', 'Profile image updated successfully!');
    } catch (error: any) {
      console.error('Image upload error:', error);
      const errorMessage =
        error?.code === 'storage/unauthorized'
          ? 'You do not have permission to upload images. Please check your Storage security rules.'
          : error?.message || 'Failed to upload image. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Hidden file inputs for web */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{display: 'none'}}
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{display: 'none'}}
          onChange={handleFileChange}
        />

        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarTouchable}>
            <View style={styles.avatarContainer}>
              {uploadingImage ? (
                <View style={styles.avatarLoadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                </View>
              ) : photoURL ? (
                <TouchableOpacity
                  onPress={() => setShowImageViewer(true)}
                  activeOpacity={0.8}>
                  <Image
                    source={{uri: photoURL}}
                    style={styles.avatarImage}
                  />
                </TouchableOpacity>
              ) : (
                <Text style={styles.avatarEmoji}>👤</Text>
              )}
              {!uploadingImage && photoURL && (
                <TouchableOpacity
                  onPress={handleImagePicker}
                  style={styles.cameraIconOverlay}
                  activeOpacity={0.8}>
                  <Text style={styles.cameraIconText}>📷</Text>
                </TouchableOpacity>
              )}
              {!uploadingImage && !photoURL && (
                <TouchableOpacity
                  onPress={handleImagePicker}
                  style={styles.cameraIconOverlay}
                  activeOpacity={0.8}>
                  <Text style={styles.cameraIconText}>📷</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          <TouchableOpacity
            onPress={handleImagePicker}
            disabled={uploadingImage}
            style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>
              {uploadingImage ? 'Uploading...' : photoURL ? 'Change Photo' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{displayName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📧</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👟</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Shoe Size</Text>
              <Text style={styles.infoValue}>{shoeSize || 'Not set'}</Text>
            </View>
            <TouchableOpacity
              onPress={handleEditShoeSize}
              style={styles.editButton}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsIcon}>✏️</Text>
            <Text style={styles.settingsText}>Edit Profile</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsIcon}>🔒</Text>
            <Text style={styles.settingsText}>Change Password</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsIcon}>🔔</Text>
            <Text style={styles.settingsText}>Notification Settings</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingsItem, styles.logoutItem]}
            onPress={handleLogout}>
            <Text style={styles.settingsIcon}>🚪</Text>
            <Text style={[styles.settingsText, styles.logoutText]}>Logout</Text>
            <Text style={styles.chevron}>›</Text>
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

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}>
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setShowImageViewer(false)}
            activeOpacity={0.8}>
            <Text style={styles.imageViewerCloseText}>✕</Text>
          </TouchableOpacity>
          {photoURL && (
            <Image
              source={{uri: photoURL}}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  backText: {
    fontSize: 24,
    color: '#000000',
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
  avatarTouchable: {
    marginBottom: 16,
    cursor: 'pointer',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    position: 'relative',
    alignSelf: 'center',
  },
  avatarEmoji: {
    fontSize: 80,
    textAlign: 'center',
    lineHeight: 100,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
  },
  avatarLoadingContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderStyle: 'solid',
    zIndex: 1,
    cursor: 'pointer',
  },
  cameraIconText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  imageViewerCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  imageViewerImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  changePhotoButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    cursor: 'pointer',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
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
  settingsIcon: {
    fontSize: 24,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 16,
  },
  chevron: {
    fontSize: 20,
    color: '#CCCCCC',
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
  editIcon: {
    fontSize: 20,
  },
});

export default ProfileScreen;


