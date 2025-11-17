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
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import {useAuth} from '../contexts/AuthContext';
import {getUserData, updateUserData} from '../services/userService';
import {getStorage, getAuth} from '../services/firebase';
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
            const options: CameraOptions = {
              mediaType: 'photo',
              quality: 0.8,
              maxWidth: 1024,
              maxHeight: 1024,
            };
            launchCamera(options, (response: ImagePickerResponse) => {
              handleImageSelection(response);
            });
          },
        },
        {
          text: 'Photo Library',
          onPress: () => {
            const options: ImageLibraryOptions = {
              mediaType: 'photo',
              quality: 0.8,
              maxWidth: 1024,
              maxHeight: 1024,
            };
            launchImageLibrary(options, (response: ImagePickerResponse) => {
              handleImageSelection(response);
            });
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  const handleImageSelection = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }

    if (response.errorMessage) {
      Alert.alert('Error', response.errorMessage);
      return;
    }

    if (response.assets && response.assets.length > 0) {
      const asset = response.assets[0];
      if (asset.uri) {
        uploadProfileImage({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || asset.uri.split('/').pop(),
        });
      }
    }
  };

  const uploadProfileImage = async (imageAsset: {uri: string; type?: string; name?: string}) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    setUploadingImage(true);

    try {
      const storageInstance = getStorage();
      if (!storageInstance) {
        throw new Error('Storage not initialized');
      }

      const timestamp = Date.now();
      const fileName = imageAsset.name ?? `avatar_${timestamp}.jpg`;
      const storagePath = `profile/${user.uid}/avatar_${timestamp}_${fileName}`;

      let uploadedImageUrl: string;

      // if (Platform.OS === 'web') {
      //   // Use web SDK for web platform
      //   const {ref, uploadBytes, getDownloadURL} = await import('firebase/storage');
      //   const response = await fetch(imageAsset.uri);
      //   const blob = await response.blob();
      //   const storageRef = ref(storageInstance, storagePath);
      //   await uploadBytes(storageRef, blob, {
      //     contentType: imageAsset.type ?? 'image/jpeg',
      //   });
      //   uploadedImageUrl = await getDownloadURL(storageRef);
      // } else {
        // Use React Native Firebase for mobile platforms
        if (!storageInstance.ref) {
          throw new Error('Storage instance missing ref API. Please check Firebase Storage configuration.');
        }

        const storageRef = storageInstance.ref(storagePath);
        let fileUri = imageAsset.uri;
        if (Platform.OS === 'ios' && fileUri.startsWith('file://')) {
          fileUri = fileUri.replace('file://', '');
        }
        await storageRef.putFile(fileUri, {
          contentType: imageAsset.type ?? 'image/jpeg',
        });
        uploadedImageUrl = await storageRef.getDownloadURL();
      // }

      // Update Firebase Auth profile using React Native Firebase
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      if (currentUser) {
        await currentUser.updateProfile({
          photoURL: uploadedImageUrl,
        });
        // Reload user to get updated photoURL - this will trigger onAuthStateChanged
        // which will update the user object in AuthContext
        await currentUser.reload();
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
                <Icon name="account-circle" size={100} color="#007AFF" />
              )}
              {!uploadingImage && photoURL && (
                <TouchableOpacity
                  onPress={handleImagePicker}
                  style={styles.cameraIconOverlay}
                  activeOpacity={0.8}>
                  <Icon name="camera-alt" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {!uploadingImage && !photoURL && (
                <TouchableOpacity
                  onPress={handleImagePicker}
                  style={styles.cameraIconOverlay}
                  activeOpacity={0.8}>
                  <Icon name="camera-alt" size={24} color="#FFFFFF" />
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
            <Icon name="close" size={30} color="#FFFFFF" />
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
  avatarTouchable: {
    marginBottom: 16,
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
    zIndex: 1,
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
  },
  imageViewerImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  changePhotoButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
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


