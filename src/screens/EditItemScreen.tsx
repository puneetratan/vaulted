import React, {useEffect, useMemo, useState, useCallback} from 'react';
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
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import {updateInventoryItem} from '../services/inventoryService';
import {getStorage} from '../services/firebase';
import {useAuth} from '../contexts/AuthContext';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';

interface ShoeItem {
  id: string;
  name: string;
  brand: string;
  silhouette: string;
  styleId: string;
  size: string;
  color: string;
  cost: number;
  retailValue?: number;
  quantity?: number;
  releaseDate?: string;
  imageUrl?: string;
  notes?: string;
}

type RouteParams = {
  item: ShoeItem;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

interface ImageAsset {
  uri: string;
  name?: string;
  type?: string;
  fileSize?: number;
}

const EditItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{params: RouteParams}, 'params'>>();
  const {user} = useAuth();
  
  const item = route.params?.item;
  
  const [name, setName] = useState(item?.name || '');
  const [brand, setBrand] = useState(item?.brand || '');
  const [size, setSize] = useState(item?.size || '');
  const [color, setColor] = useState(item?.color || '');
  const [cost, setCost] = useState(item?.cost.toString() || '');
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');
  const [imageAsset, setImageAsset] = useState<ImageAsset | null>(null);
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1');
  const [silhouette, setSilhouette] = useState(item?.silhouette || '');
  const [styleId, setStyleId] = useState(item?.styleId || '');
  const [retailValue, setRetailValue] = useState(
    item?.retailValue !== undefined
      ? item.retailValue.toString()
      : item?.cost.toString() || ''
  );
  const [releaseDate, setReleaseDate] = useState(item?.releaseDate || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [releaseDatePickerVisible, setReleaseDatePickerVisible] = useState(false);
  const [releaseDatePickerValue, setReleaseDatePickerValue] = useState<Date | null>(
    item?.releaseDate ? new Date(item.releaseDate) : null,
  );

  useEffect(() => {
    if (item) {
      setName(item.name);
      setBrand(item.brand);
      setSize(item.size);
      setColor(item.color);
      setCost(item.cost.toString());
      setImageUrl(item.imageUrl || '');
      setImageAsset(null);
      setQuantity(item.quantity?.toString() || '1');
      setSilhouette(item.silhouette || '');
      setStyleId(item.styleId || '');
      setRetailValue(
        item.retailValue !== undefined
          ? item.retailValue.toString()
          : item.cost.toString()
      );
      setReleaseDate(item.releaseDate || '');
      setReleaseDatePickerValue(item.releaseDate ? new Date(item.releaseDate) : null);
      setNotes(item.notes || '');
    }
  }, [item]);

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

  const handleSubmit = async () => {
    if (!item?.id) {
      Alert.alert('Error', 'Unable to determine which item to update.');
      return;
    }

    // Validate inputs
    if (
      !name.trim() ||
      !brand.trim() ||
      !silhouette.trim() ||
      !styleId.trim() ||
      !size.trim() ||
      !color.trim() ||
      !cost.trim() ||
      !retailValue.trim() ||
      !releaseDate.trim() ||
      !quantity.trim()
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert('Error', 'Please enter a valid cost');
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    if (Number.isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const retailValueNum = parseFloat(retailValue);
    if (Number.isNaN(retailValueNum) || retailValueNum < 0) {
      Alert.alert('Error', 'Please enter a valid retail value');
      return;
    }

    const releaseDateTrimmed = releaseDate.trim();
    const releaseDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!releaseDateRegex.test(releaseDateTrimmed)) {
      Alert.alert('Error', 'Release date must be in YYYY-MM-DD format');
      return;
    }

    if (imageAsset && !user?.uid) {
      Alert.alert('Error', 'You must be logged in to update item images.');
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl = item?.imageUrl ?? undefined;

      if (imageAsset && user?.uid) {
        const storageInstance = getStorage();
        if (!storageInstance) {
          throw new Error('Storage not initialized');
        }

        const timestamp = Date.now();
        const fileName = imageAsset.name ?? `image_${timestamp}.jpg`;
        const storagePath = `inventory/${user.uid}/${item.id}_${timestamp}_${fileName}`;

        if (Platform.OS === 'web') {
          const {ref, uploadBytes, getDownloadURL} = await import('firebase/storage');
          const response = await fetch(imageAsset.uri);
          const blob = await response.blob();
          const storageRef = ref(storageInstance, storagePath);
          await uploadBytes(storageRef, blob, {
            contentType: imageAsset.type ?? 'image/jpeg',
          });
          finalImageUrl = await getDownloadURL(storageRef);
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
            finalImageUrl = await storageRef.getDownloadURL();
          } else {
            const {ref, uploadBytes, getDownloadURL} = await import('firebase/storage');
            const response = await fetch(imageAsset.uri);
            const blob = await response.blob();
            const storageRef = ref(storageInstance, storagePath);
            await uploadBytes(storageRef, blob, {
              contentType: imageAsset.type ?? 'image/jpeg',
            });
            finalImageUrl = await getDownloadURL(storageRef);
          }
        }
      } else if (!imageAsset) {
        finalImageUrl = imageUrl?.trim() ? imageUrl.trim() : undefined;
      }

      const payload = {
        name: name.trim(),
        brand: brand.trim(),
        silhouette: silhouette.trim(),
        styleId: styleId.trim(),
        size: size.trim(),
        color: color.trim(),
        value: costNum,
        retailValue: retailValueNum,
        releaseDate: releaseDateTrimmed,
        quantity: quantityNum,
        imageUrl: finalImageUrl,
        notes: notes.trim() || undefined,
      };

      await updateInventoryItem(item.id, payload);
      setImageAsset(null);
      if (finalImageUrl) {
        setImageUrl(finalImageUrl);
      }
      Alert.alert('Success', 'Item updated successfully', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      console.error('Error updating item:', error);
      const message = error?.message || 'Failed to update item. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Here you would typically delete the item from your data store
            Alert.alert('Success', 'Item deleted successfully', [
              {text: 'OK', onPress: () => navigation.goBack()},
            ]);
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleImageSelection = useCallback((response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }
    if (response.errorMessage) {
      Alert.alert('Error', response.errorMessage);
      return;
    }
    const asset = response?.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Error', 'Unable to process image. Please try again.');
      return;
    }
    const fileSize = asset.fileSize ?? 0;
    if (fileSize > MAX_IMAGE_BYTES) {
      Alert.alert('Image Too Large', 'Please select a smaller image (less than 8MB).');
      return;
    }

    const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
    const type = asset.type ?? 'image/jpeg';

    setImageAsset({
      uri: asset.uri,
      name: fileName,
      type,
      fileSize,
    });
    setImageUrl(asset.uri);
  }, []);

  const handleEditImage = () => {
    Alert.alert(
      'Change Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => {
            const options: CameraOptions = {
              mediaType: 'photo',
              quality: 0.8,
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Icon name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Item</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Item Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{uri: imageUrl}} style={styles.image} />
          ) : (
            <View style={styles.placeholderImageContainer}>
              <Icon name="photo" size={80} color="#CCCCCC" />
              <Text style={styles.placeholderImageText}>No Image</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.editImageButton}
            onPress={handleEditImage}>
            <Icon name="edit" size={20} color="#FFFFFF" />
            <Text style={styles.editImageButtonText}>Edit Image</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter shoe name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Brand</Text>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="Enter brand"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Silhouette</Text>
            <TextInput
              style={styles.input}
              value={silhouette}
              onChangeText={setSilhouette}
              placeholder="Enter silhouette"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Style ID</Text>
            <TextInput
              style={styles.input}
              value={styleId}
              onChangeText={setStyleId}
              placeholder="Enter style ID"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Size</Text>
            <TextInput
              style={styles.input}
              value={size}
              onChangeText={setSize}
              placeholder="Enter size"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Quantity</Text>
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
                          return <Picker.Item label={value} value={value} key={value} />;
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
                    return <Picker.Item label={value} value={value} key={value} />;
                  })}
                </Picker>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              value={color}
              onChangeText={setColor}
              placeholder="Enter color"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Cost</Text>
            <TextInput
              style={styles.input}
              value={cost}
              onChangeText={setCost}
              placeholder="Enter cost"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Retail Value</Text>
            <TextInput
              style={styles.input}
              value={retailValue}
              onChangeText={setRetailValue}
              placeholder="Enter retail value"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Release Date</Text>
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

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter notes (optional)"
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton, submitting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={submitting}>
          <Icon name="delete" size={24} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton, submitting && styles.buttonDisabled]}
          onPress={handleCancel}
          disabled={submitting}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
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
    width: 44,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    position: 'relative',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  placeholderImageContainer: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderImageText: {
    color: '#999999',
    fontSize: 14,
    marginTop: 8,
  },
  editImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  editImageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    height: 48,
    color: '#000000',
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
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditItemScreen;

