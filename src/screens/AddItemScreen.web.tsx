import React, {useEffect, useState} from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {saveInventoryItem} from '../services/inventoryService';
import {getStorage} from '../services/firebase';
import {ref, uploadBytes, getDownloadURL} from 'firebase/storage';
import {useAuth} from '../contexts/AuthContext';
import {getUserData} from '../services/userService';
import {Picker} from '@react-native-picker/picker';

const AddItemScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [silhouette, setSilhouette] = useState('');
  const [styleId, setStyleId] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [color, setColor] = useState('');
  const [retailValue, setRetailValue] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [imageFile, setImageFile] = useState<{blob: Blob; name: string; type: string} | undefined>(undefined);
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    const loadUserProfile = async () => {
      if (!user?.uid) {
        return;
      }
      try {
        const profile = await getUserData(user.uid);
        if (isActive && !size && profile?.shoeSize) {
          setSize(String(profile.shoeSize));
        }
      } catch (profileError) {
        console.warn('Failed to load user profile for prefill (web):', profileError);
      }
    };

    loadUserProfile();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB limit
  const MAX_IMAGE_DIMENSION = 800;
  const IMAGE_QUALITY = 0.6;

  const resizeImage = (file: File): Promise<{dataUrl: string; blob: Blob; type: string}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let {width, height} = img;
          if (width > height) {
            if (width > MAX_IMAGE_DIMENSION) {
              height = (height * MAX_IMAGE_DIMENSION) / width;
              width = MAX_IMAGE_DIMENSION;
            }
          } else {
            if (height > MAX_IMAGE_DIMENSION) {
              width = (width * MAX_IMAGE_DIMENSION) / height;
              height = MAX_IMAGE_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type || 'image/jpeg';
          canvas.toBlob(
            blob => {
              if (!blob) {
                reject(new Error('Failed to process image'));
                return;
              }
              const dataUrl = canvas.toDataURL(mimeType, IMAGE_QUALITY);
              resolve({dataUrl, blob, type: mimeType});
            },
            mimeType,
            IMAGE_QUALITY,
          );
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImagePicker = () => {
    // Web implementation - use HTML5 file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        resizeImage(file)
          .then(({dataUrl, blob, type}) => {
            const byteSize = blob.size;
            if (byteSize > MAX_IMAGE_BYTES) {
              Alert.alert(
                'Image Too Large',
                'Please select a smaller image (less than 8MB).',
              );
              return;
            }
            const fileName = file.name || `image_${Date.now()}.jpg`;
            setImagePreview(dataUrl);
            setImageFile({blob, name: fileName, type});
          })
          .catch(() => {
            Alert.alert('Error', 'Failed to process image. Please try again.');
          });
      }
    };
    input.click();
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
    if (!silhouette.trim()) {
      Alert.alert('Error', 'Please enter silhouette');
      return;
    }
    if (!styleId.trim()) {
      Alert.alert('Error', 'Please enter style ID');
      return;
    }
    if (!size.trim()) {
      Alert.alert('Error', 'Please enter size');
      return;
    }
    if (!retailValue.trim() || isNaN(parseFloat(retailValue))) {
      Alert.alert('Error', 'Please enter a valid retail value');
      return;
    }
    if (!releaseDate.trim()) {
      Alert.alert('Error', 'Please enter release date');
      return;
    }

    const releaseDateTrimmed = releaseDate.trim();
    const releaseDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!releaseDateRegex.test(releaseDateTrimmed)) {
      Alert.alert('Error', 'Release date must be in YYYY-MM-DD format');
      return;
    }

    const quantityValue = parseInt(quantity, 10);
    if (!quantity || Number.isNaN(quantityValue) || quantityValue <= 0) {
      Alert.alert('Error', 'Please select a valid quantity');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add items');
      return;
    }

    setLoading(true);

    try {
      let uploadedImageUrl: string | undefined;

      if (imageFile) {
        try {
          const storageInstance = getStorage();
          if (!storageInstance) {
            throw new Error('Storage not initialized');
          }

          const timestamp = Date.now();
          const storagePath = `inventory/${user.uid}/${timestamp}_${imageFile.name}`;
          const storageRef = ref(storageInstance, storagePath);
          await uploadBytes(storageRef, imageFile.blob, {
            contentType: imageFile.type,
          });
          uploadedImageUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          setLoading(false);
          return;
        }
      }

      const itemData = {
        name: name.trim(),
        brand: brand.trim(),
        silhouette: silhouette.trim(),
        styleId: styleId.trim(),
        size: size.trim(),
        color: color.trim() || undefined,
        quantity: quantityValue,
        value: parseFloat(retailValue),
        retailValue: parseFloat(retailValue),
        releaseDate: releaseDateTrimmed,
        imageUrl: uploadedImageUrl || undefined,
        barcode: barcode.trim() || undefined,
        notes: notes.trim() || undefined,
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
              setSilhouette('');
              setStyleId('');
              setSize('');
              setColor('');
              setRetailValue('');
              setImagePreview(undefined);
              setImageFile(undefined);
              setBarcode('');
              setNotes('');
              setQuantity('1');
              setReleaseDate('');
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
                setImageFile(undefined);
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
            <Text style={styles.label}>Silhouette *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter silhouette"
              value={silhouette}
              onChangeText={setSilhouette}
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Style ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter style ID"
              value={styleId}
              onChangeText={setStyleId}
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
            <Text style={styles.label}>Quantity *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={quantity}
                onValueChange={value => setQuantity(String(value))}
                style={styles.picker}
                itemStyle={styles.pickerItem}>
                {Array.from({length: 20}, (_, index) => {
                  const value = String(index + 1);
                  return (
                    <Picker.Item label={value} value={value} key={value} />
                  );
                })}
              </Picker>
            </View>
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
            <Text style={styles.label}>Retail Value *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter retail value"
              value={retailValue}
              onChangeText={setRetailValue}
              placeholderTextColor="#999999"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Release Date *</Text>
            <TextInput
              style={styles.input}
              type="date"
              value={releaseDate}
              onChangeText={setReleaseDate}
              onChange={event => setReleaseDate(event.nativeEvent.text)}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 48,
    color: '#000000',
  },
  pickerItem: {
    fontSize: 16,
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

