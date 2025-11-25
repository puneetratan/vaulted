import React, {useEffect, useMemo, useState} from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import {saveInventoryItem} from '../services/inventoryService';
import {getStorage} from '../services/firebase';
import {useAuth} from '../contexts/AuthContext';
import {getUserData} from '../services/userService';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';

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
  const [releaseDatePickerVisible, setReleaseDatePickerVisible] = useState(false);
  const [releaseDatePickerValue, setReleaseDatePickerValue] = useState<Date | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [imageAsset, setImageAsset] = useState<{uri: string; name?: string; type?: string} | undefined>(undefined);
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);

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
        if (isActive && profile?.releaseDate) {
          setReleaseDate(profile.releaseDate);
        }
      } catch (profileError) {
        console.warn('Failed to load user profile for prefill:', profileError);
      }
    };

    loadUserProfile();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const formattedReleaseDate = useMemo(() => {
    if (releaseDate) {
      const date = new Date(releaseDate);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    }
    return 'Select date';
  }, [releaseDate]);

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

      if (imageAsset) {
        try {
          const storageInstance = getStorage();
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
        } catch (uploadError: any) {
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
              setImageAsset(undefined);
              setBarcode('');
              setNotes('');
              setQuantity('1');
              setReleaseDate('');
              setReleaseDatePickerValue(null);
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
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setQuantityModalVisible(true)}>
                  <Text style={styles.selectInputText}>{quantity}</Text>
                  <Icon name="arrow-drop-down" size={24} color="#666666" />
                </TouchableOpacity>
                <Modal
                  visible={quantityModalVisible}
                  animationType="slide"
                  transparent
                  onRequestClose={() => setQuantityModalVisible(false)}>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setQuantityModalVisible(false)}>
                          <Text style={styles.modalActionText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Quantity</Text>
                        <TouchableOpacity onPress={() => setQuantityModalVisible(false)}>
                          <Text style={styles.modalActionText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <Picker
                        selectedValue={quantity}
                        onValueChange={value => setQuantity(String(value))}
                        style={styles.modalPicker}
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
                </Modal>
              </>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={quantity}
                  onValueChange={value => setQuantity(String(value))}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  mode={Platform.OS === 'android' ? 'dropdown' : undefined}>
                  {Array.from({length: 20}, (_, index) => {
                    const value = String(index + 1);
                    return (
                      <Picker.Item label={value} value={value} key={value} />
                    );
                  })}
                </Picker>
              </View>
            )}
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
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => {
                    const initialDate = releaseDate
                      ? new Date(releaseDate)
                      : new Date();
                    setReleaseDatePickerValue(
                      Number.isNaN(initialDate.getTime()) ? new Date() : initialDate,
                    );
                    setReleaseDatePickerVisible(true);
                  }}>
                  <Text style={styles.selectInputText}>{formattedReleaseDate}</Text>
                  <Icon name="event" size={22} color="#666666" />
                </TouchableOpacity>
                <Modal
                  visible={releaseDatePickerVisible}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setReleaseDatePickerVisible(false)}>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setReleaseDatePickerVisible(false)}>
                          <Text style={styles.modalActionText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Release Date</Text>
                        <TouchableOpacity
                          onPress={() => {
                            if (releaseDatePickerValue) {
                              const isoDate = releaseDatePickerValue.toISOString().split('T')[0];
                              setReleaseDate(isoDate);
                            }
                            setReleaseDatePickerVisible(false);
                          }}>
                          <Text style={styles.modalActionText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={
                          releaseDatePickerValue ??
                          (releaseDate ? new Date(releaseDate) : new Date())
                        }
                        mode="date"
                        display="spinner"
                        onChange={(_: DateTimePickerEvent, selectedDate?: Date) => {
                          if (selectedDate) {
                            setReleaseDatePickerValue(selectedDate);
                          }
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              </>
            ) : (
              <Pressable
                style={styles.selectInput}
                onPress={() => {
                  const initialDate = releaseDate
                    ? new Date(releaseDate)
                    : new Date();
                  setReleaseDatePickerValue(
                    Number.isNaN(initialDate.getTime()) ? new Date() : initialDate,
                  );
                  setReleaseDatePickerVisible(true);
                }}>
                <Text style={styles.selectInputText}>{formattedReleaseDate}</Text>
                <Icon name="event" size={22} color="#666666" />
                {releaseDatePickerVisible && (
                  <DateTimePicker
                    value={
                      releaseDatePickerValue ??
                      (releaseDate ? new Date(releaseDate) : new Date())
                    }
                    mode="date"
                    display="calendar"
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (event.type === 'dismissed') {
                        setReleaseDatePickerVisible(false);
                        return;
                      }
                      if (selectedDate) {
                        const isoDate = selectedDate.toISOString().split('T')[0];
                        setReleaseDate(isoDate);
                        setReleaseDatePickerVisible(false);
                      }
                    }}
                  />
                )}
              </Pressable>
            )}
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
  selectInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 16,
    color: '#000000',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    height: 48,
  },
  picker: {
    color: '#000000',
    height: 48,
  },
  pickerItem: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalActionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalPicker: {
    height: 216,
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
    backgroundColor: '#474747',
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

