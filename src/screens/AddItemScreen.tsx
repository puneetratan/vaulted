import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import {saveInventoryItem} from '../services/inventoryService';
import {initializeStorage} from '../services/firebase';
import {useAuth} from '../contexts/AuthContext';

const AddItemScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [value, setValue] = useState('');
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [imageAsset, setImageAsset] = useState<{uri: string; name?: string; type?: string} | undefined>(undefined);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB limit

  const handleImagePicker = async () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.6,
        maxWidth: 800,
        maxHeight: 800,
      },
      async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const fileSize = asset.fileSize ?? 0;
          if (fileSize > MAX_IMAGE_BYTES) {
            Alert.alert(
              'Image Too Large',
              'Please select a smaller image (less than 8MB).',
            );
            return;
          }
          if (!asset.uri) {
            Alert.alert('Error', 'Unable to process image. Please try again.');
            return;
          }

          const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
          const type = asset.type ?? 'image/jpeg';

          setImageAsset({
            uri: asset.uri,
            name: fileName,
            type,
          });
          setImagePreview(asset.uri);
        }
      },
    );
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }
    if (!brand.trim()) {
      Alert.alert('Error', 'Please enter brand');
      return;
    }
    if (!size.trim()) {
      Alert.alert('Error', 'Please enter size');
      return;
    }
    if (!value.trim() || isNaN(parseFloat(value))) {
      Alert.alert('Error', 'Please enter a valid value');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add items');
      return;
    }

    setLoading(true);

    try {
      let uploadedImageUrl: string | undefined;

      if (imageAsset) {
        try {
          const storageInstance = initializeStorage();
          if (!storageInstance) {
            throw new Error('Storage not initialized');
          }

          const timestamp = Date.now();
          const fileName = imageAsset.name ?? `image_${timestamp}.jpg`;
          const storagePath = `inventory/${user.uid}/${timestamp}_${fileName}`;

          if (Platform.OS === 'web') {
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const response = await fetch(imageAsset.uri);
            const blob = await response.blob();
            const storageRef = ref(storageInstance, storagePath);
            await uploadBytes(storageRef, blob, {
              contentType: imageAsset.type ?? 'image/jpeg',
            });
            uploadedImageUrl = await getDownloadURL(storageRef);
          } else {
            if (storageInstance.ref) {
              const storageRef = storageInstance.ref(storagePath);
              let fileUri = imageAsset.uri;
              if (Platform.OS === 'ios' && fileUri.startsWith('file://')) {
                fileUri = fileUri.replace('file://', '');
              }
              await storageRef.putFile(fileUri, {
                contentType: imageAsset.type ?? 'image/jpeg',
              });
              uploadedImageUrl = await storageRef.getDownloadURL();
            } else {
              const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
              const response = await fetch(imageAsset.uri);
              const blob = await response.blob();
              const storageRef = ref(storageInstance, storagePath);
              await uploadBytes(storageRef, blob, {
                contentType: imageAsset.type ?? 'image/jpeg',
              });
              uploadedImageUrl = await getDownloadURL(storageRef);
            }
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          const errorMessage =
            uploadError?.code === 'storage/unauthorized'
              ? 'You do not have permission to upload images. Please check your Storage security rules.'
              : uploadError?.message || 'Failed to upload image. Please try again.';
          Alert.alert('Error', errorMessage);
          setLoading(false);
          return;
        }
      }

      const itemData = {
        name: name.trim(),
        brand: brand.trim(),
        size: size.trim(),
        color: color.trim() || undefined,
        value: parseFloat(value),
        imageUrl: uploadedImageUrl || undefined,
        barcode: barcode.trim() || undefined,
        userId: user.uid,
      };

      // Save to Firestore
      await saveInventoryItem(itemData);

      Alert.alert(
        'Success',
        'Item added successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setName('');
              setBrand('');
              setSize('');
              setColor('');
              setValue('');
              setImagePreview(undefined);
              setImageAsset(undefined);
              setBarcode('');
              // Navigate back
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('Error saving item:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save item. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Item Manually</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Picker */}
        <View style={styles.imageSection}>
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={handleImagePicker}>
            {imagePreview ? (
              <Image source={{uri: imagePreview}} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="add-photo-alternate" size={48} color="#CCCCCC" />
                <Text style={styles.imagePlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {imagePreview && (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => {
                setImagePreview(undefined);
                setImageAsset(undefined);
              }}>
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter brand"
              value={brand}
              onChangeText={setBrand}
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Size *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter size"
              value={size}
              onChangeText={setSize}
              placeholderTextColor="#999999"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter color"
              value={color}
              onChangeText={setColor}
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Value (Cost) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter value"
              value={value}
              onChangeText={setValue}
              placeholderTextColor="#999999"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter barcode (optional)"
              value={barcode}
              onChangeText={setBarcode}
              placeholderTextColor="#999999"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Item</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  imagePicker: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#CCCCCC',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});

export default AddItemScreen;

