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
import {useTheme} from '../contexts/ThemeContext';
import {getUserData, updateUserData, deleteUserAccount} from '../services/userService';
import {getStorage, getAuth} from '../services/firebase';
import ShoeSizeModal from '../components/ShoeSizeModal';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();
  const {colors} = useTheme();
  const [shoeSize, setShoeSize] = useState<string | undefined>(undefined);
  const [showShoeSizeModal, setShowShoeSizeModal] = useState(false);
  const [editShoeSize, setEditShoeSize] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data, including inventory items and profile information, will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all associated data. Are you absolutely sure?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    if (!user?.uid) {
                      Alert.alert('Error', 'User not authenticated');
                      return;
                    }

                    setDeletingAccount(true);
                    try {
                      // Delete all user data (inventory, profile, storage)
                      await deleteUserAccount(user.uid, photoURL);

                      // Delete Firebase Auth account
                      const authInstance = getAuth();
                      const currentUser = authInstance.currentUser;
                      if (currentUser) {
                        await currentUser.delete();
                      }

                      // Logout will happen automatically when auth state changes
                      Alert.alert(
                        'Account Deleted',
                        'Your account has been successfully deleted.',
                        [
                          {
                            text: 'OK',
                            onPress: async () => {
                              await logout();
                            },
                          },
                        ],
                      );
                    } catch (error: any) {
                      console.error('Error deleting account:', error);
                      let errorMessage = 'Failed to delete account. Please try again.';
                      
                      if (error?.code === 'auth/requires-recent-login') {
                        errorMessage = 'For security reasons, please sign out and sign back in before deleting your account.';
                      } else if (error?.message) {
                        errorMessage = error.message;
                      }
                      
                      Alert.alert('Error', errorMessage);
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
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
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, {backgroundColor: colors.header, borderBottomColor: colors.border}]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.text}]}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
        {/* Profile Avatar Section */}
        <View style={[styles.avatarSection, {backgroundColor: colors.surface}]}>
          <View style={styles.avatarTouchable}>
            <View style={[styles.avatarContainer, {backgroundColor: colors.surfaceSecondary}]}>
              {uploadingImage ? (
                <View style={[styles.avatarLoadingContainer, {backgroundColor: colors.surfaceSecondary}]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : photoURL ? (
                <TouchableOpacity
                  onPress={() => setShowImageViewer(true)}
                  activeOpacity={0.8}>
                  <Image
                    source={{uri: photoURL}}
                    style={[styles.avatarImage, {backgroundColor: colors.surfaceSecondary}]}
                  />
                </TouchableOpacity>
              ) : (
                <Icon name="account-circle" size={100} color={colors.primary} />
              )}
              {!uploadingImage && photoURL && (
                <TouchableOpacity
                  onPress={handleImagePicker}
                  style={[styles.cameraIconOverlay, {backgroundColor: colors.primary}]}
                  activeOpacity={0.8}>
                  <Icon name="camera-alt" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {!uploadingImage && !photoURL && (
                <TouchableOpacity
                  onPress={handleImagePicker}
                  style={[styles.cameraIconOverlay, {backgroundColor: colors.primary}]}
                  activeOpacity={0.8}>
                  <Icon name="camera-alt" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={[styles.userName, {color: colors.text}]}>{displayName}</Text>
          <Text style={[styles.userEmail, {color: colors.textSecondary}]}>{email}</Text>
          <TouchableOpacity
            onPress={handleImagePicker}
            disabled={uploadingImage}
            style={styles.changePhotoButton}>
            <Text style={[styles.changePhotoText, {color: colors.primary}]}>
              {uploadingImage ? 'Uploading...' : photoURL ? 'Change Photo' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Information */}
        <View style={[styles.section, {backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Personal Information</Text>
          
          <View style={[styles.infoRow, {borderBottomColor: colors.border}]}>
            <Icon name="person" size={20} color={colors.textSecondary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Full Name</Text>
              <Text style={[styles.infoValue, {color: colors.text}]}>{displayName}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, {borderBottomColor: colors.border}]}>
            <Icon name="email" size={20} color={colors.textSecondary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Email</Text>
              <Text style={[styles.infoValue, {color: colors.text}]}>{email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, {borderBottomColor: colors.border}]}>
            <Icon name="directions-walk" size={20} color={colors.textSecondary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Shoe Size</Text>
              <Text style={[styles.infoValue, {color: colors.text}]}>{shoeSize || 'Not set'}</Text>
            </View>
            <TouchableOpacity
              onPress={handleEditShoeSize}
              style={styles.editButton}>
              <Icon name="edit" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Settings */}
        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Account Settings</Text>
          
          <TouchableOpacity 
            style={[styles.settingsItem, {borderBottomColor: colors.border}]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}>
            {deletingAccount ? (
              <ActivityIndicator size="small" color={colors.error} style={styles.deleteAccountLoader} />
            ) : (
              <Icon name="delete-forever" size={24} color={colors.error} />
            )}
            <Text style={[styles.settingsText, styles.deleteAccountText, {color: colors.text, marginLeft: 16}]}>
              {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
            </Text>
            {!deletingAccount && <Icon name="chevron-right" size={24} color={colors.textSecondary} />}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsItem, {borderBottomColor: colors.border}]}>
            <Icon name="notifications" size={24} color={colors.primary} />
            <Text style={[styles.settingsText, {color: colors.text}]}>Notification Settings</Text>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={[styles.section, {backgroundColor: colors.surface}]}>
          <TouchableOpacity 
            style={[styles.settingsItem, styles.logoutItem]}
            onPress={handleLogout}>
            <Icon name="logout" size={24} color={colors.error} />
            <Text style={[styles.settingsText, styles.logoutText, {color: colors.error, marginLeft: 16}]}>Logout</Text>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
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
    position: 'relative',
    alignSelf: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarLoadingContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
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
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteAccountText: {
    fontWeight: '600',
  },
  deleteAccountLoader: {
    marginRight: 16,
  },
});

export default ProfileScreen;


