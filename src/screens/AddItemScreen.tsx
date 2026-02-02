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
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import {saveInventoryItem} from '../services/inventoryService';
import {getStorage, getFunctions} from '../services/firebase';
import {useAuth} from '../contexts/AuthContext';
import {useTheme} from '../contexts/ThemeContext';
import {getUserData} from '../services/userService';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {RootStackParamList} from '../navigation/AppNavigator';

type AddItemScreenRouteProp = RouteProp<RootStackParamList, 'AddItem'>;
type AddItemScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddItem'>;

const AddItemScreen = () => {
  const navigation = useNavigation<AddItemScreenNavigationProp>();
  const route = useRoute<AddItemScreenRouteProp>();
  const {user} = useAuth();
  const {colors} = useTheme();
  
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

  // Fetch product details when barcode is received via route params
  useEffect(() => {
    const fetchProductDetails = async () => {
      const barcodeValue = route.params?.barcode;
      console.log('barcodeValue=====', barcodeValue);
      if (!barcodeValue) {
        return;
      }

      // Check if user is authenticated before calling the function
      if (!user?.uid) {
        console.warn('User not authenticated, cannot fetch product details');
        setBarcode(barcodeValue);
        Alert.alert(
          'Authentication Required',
          'Please make sure you are logged in to fetch product details.',
          [{text: 'OK'}]
        );
        return;
      }

      console.log('📦 Barcode received in AddItemScreen:', barcodeValue);
      setBarcode(barcodeValue);
      
      // Fetch product details from barcode
      setLoading(true);
      try {
        const functions = getFunctions();
        if (!functions) {
          console.warn('Firebase Functions not available');
          setLoading(false);
          return;
        }

        const lookupbarcode = functions.httpsCallable('lookupbarcode');

        console.log('📞 Calling Firebase Function: lookupbarcode with barcode:', barcodeValue);
        console.log(lookupbarcode);

        const result = await lookupbarcode({barcode: barcodeValue});
        const productInfo = result.data;
        
        if (productInfo && productInfo.success) {
          console.log('✅ Product details fetched:', productInfo);
          
          // Populate form fields with fetched data (only if fields are empty)
          if (productInfo.brand && !brand) {
            setBrand(productInfo.brand);
          }
          if (productInfo.styleId && !styleId) {
            setStyleId(productInfo.styleId);
          }
          if (productInfo.color && !color) {
            setColor(productInfo.color);
          }
          if (productInfo.name && !name) {
            setName(productInfo.name);
          }
          if (productInfo.imageUrl && !imagePreview) {
            // Image URL is already uploaded to Firebase Storage by the cloud function
            setImagePreview(productInfo.imageUrl);
          }
          if (productInfo.retailValue && !retailValue) {
            setRetailValue(String(productInfo.retailValue));
          }
          
          // Show success message
          Alert.alert(
            'Product Found! ✅',
            `${productInfo.name || 'Product'}\n${productInfo.brand ? `Brand: ${productInfo.brand}` : ''}\n\nFields have been auto-filled.`,
            [{text: 'OK'}]
          );
        } else {
          console.log('⚠️ No product details found for barcode');
          Alert.alert(
            'Barcode Scanned',
            `Barcode: ${barcodeValue}\n\nProduct details not found in database. Please enter details manually.`,
            [{text: 'OK'}]
          );
        }
      } catch (error: any) {
        console.error('Error fetching product details:', error);
        
        // Handle authentication errors specifically
        if (error.code === 'unauthenticated' || error.message?.includes('Unauthenticated')) {
          Alert.alert(
            'Authentication Error',
            'You need to be logged in to fetch product details. Please log in and try again.',
            [{text: 'OK'}]
          );
        } else {
          Alert.alert(
            'Barcode Scanned',
            `Barcode: ${barcodeValue}\n\nUnable to fetch product details. Please enter details manually.`,
            [{text: 'OK'}]
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.barcode, user?.uid]);

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

      // If imagePreview is set but imageAsset is not, it means the image was already uploaded (e.g., from barcode)
      // In this case, imagePreview contains the Firebase Storage URL from the cloud function
      if (!imageAsset && imagePreview && imagePreview.startsWith('https://')) {
        // Cloud function returns Firebase Storage URLs, so we can use it directly
        uploadedImageUrl = imagePreview;
        console.log('Using Firebase Storage URL from cloud function:', uploadedImageUrl);
      }

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

      // Determine source: 'barcode' if added via barcode scanner, otherwise 'manual'
      const itemSource = route.params?.barcode ? 'barcode' : 'manual';

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
        source: itemSource,
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

  const componentStyles = styles(colors);

  return (
    <SafeAreaView style={componentStyles.container} edges={['top']}>
      {/* Header */}
      <View style={componentStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={componentStyles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[componentStyles.headerTitle, {color: colors.text}]}>Add New Item</Text>
        <View style={componentStyles.placeholder} />
      </View>

      <ScrollView style={componentStyles.content} showsVerticalScrollIndicator={false}>
        {/* Image Picker */}
        <View style={componentStyles.imageSection}>
          <TouchableOpacity
            style={componentStyles.imagePicker}
            onPress={handleImagePicker}>
            {imagePreview ? (
              <Image source={{uri: imagePreview}} style={componentStyles.imagePreview} />
            ) : (
              <View style={componentStyles.imagePlaceholder}>
                <Icon name="add-photo-alternate" size={48} color={colors.textSecondary} />
                <Text style={[componentStyles.imagePlaceholderText, {color: colors.textSecondary}]}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {imagePreview && (
            <TouchableOpacity
              style={componentStyles.removeImageButton}
              onPress={() => {
                setImagePreview(undefined);
                setImageAsset(undefined);
              }}>
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View style={componentStyles.formSection}>
          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Item Name *</Text>
            <TextInput
              style={[componentStyles.input, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter item name"
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Brand *</Text>
            <TextInput
              style={[componentStyles.input, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter brand"
              value={brand}
              onChangeText={setBrand}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <View style={componentStyles.labelRow}>
              <Text style={[componentStyles.label, {color: colors.text}]}>Silhouette *</Text>
              <TouchableOpacity>
                <Icon name="info" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[componentStyles.input, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter silhouette"
              value={silhouette}
              onChangeText={setSilhouette}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <View style={componentStyles.labelRow}>
              <Text style={[componentStyles.label, {color: colors.text}]}>Style ID *</Text>
              <TouchableOpacity>
                <Icon name="info" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[componentStyles.input, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter style ID"
              value={styleId}
              onChangeText={setStyleId}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Size *</Text>
            <TextInput
              style={[componentStyles.input, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter size"
              value={size}
              onChangeText={setSize}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Quantity *</Text>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={[componentStyles.selectInput, {backgroundColor: colors.input, borderColor: colors.inputBorder}]}
                  onPress={() => setQuantityModalVisible(true)}>
                  <Text style={[componentStyles.selectInputText, {color: colors.text}]}>{quantity}</Text>
                  <Icon name="arrow-drop-down" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <Modal
                  visible={quantityModalVisible}
                  animationType="slide"
                  transparent
                  onRequestClose={() => setQuantityModalVisible(false)}>
                  <View style={componentStyles.modalOverlay}>
                    <View style={[componentStyles.modalContent, {backgroundColor: colors.surface}]}>
                      <View style={[componentStyles.modalHeader, {borderBottomColor: colors.border}]}>
                        <TouchableOpacity onPress={() => setQuantityModalVisible(false)}>
                          <Text style={[componentStyles.modalActionText, {color: colors.success}]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[componentStyles.modalTitle, {color: colors.text}]}>Select Quantity</Text>
                        <TouchableOpacity onPress={() => setQuantityModalVisible(false)}>
                          <Text style={[componentStyles.modalActionText, {color: colors.success}]}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <Picker
                        selectedValue={quantity}
                        onValueChange={value => setQuantity(String(value))}
                        style={[componentStyles.modalPicker, {backgroundColor: colors.surface}]}
                        itemStyle={componentStyles.pickerItem}>
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
              <View style={[componentStyles.pickerContainer, {backgroundColor: colors.input, borderColor: colors.inputBorder}]}>
                <Picker
                  selectedValue={quantity}
                  onValueChange={value => setQuantity(String(value))}
                  style={[componentStyles.picker, {color: colors.text}]}
                  itemStyle={componentStyles.pickerItem}
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

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Color</Text>
            <TextInput
              style={[componentStyles.input, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter color"
              value={color}
              onChangeText={setColor}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Cost *</Text>
            <View style={[componentStyles.costInputContainer, {backgroundColor: colors.input, borderColor: colors.inputBorder}]}>
              <Text style={[componentStyles.currencySymbol, {color: colors.text}]}>$</Text>
              <TextInput
                style={[componentStyles.costInput, {color: colors.text}]}
                placeholder="120.00"
                value={retailValue}
                onChangeText={setRetailValue}
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Release Date *</Text>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={[componentStyles.selectInput, {backgroundColor: colors.input, borderColor: colors.inputBorder}]}
                  onPress={() => {
                    const initialDate = releaseDate
                      ? new Date(releaseDate)
                      : new Date();
                    setReleaseDatePickerValue(
                      Number.isNaN(initialDate.getTime()) ? new Date() : initialDate,
                    );
                    setReleaseDatePickerVisible(true);
                  }}>
                  <Text style={[componentStyles.selectInputText, {color: colors.text}]}>{formattedReleaseDate}</Text>
                  <Icon name="event" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <Modal
                  visible={releaseDatePickerVisible}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setReleaseDatePickerVisible(false)}>
                  <View style={componentStyles.modalOverlay}>
                    <View style={[componentStyles.modalContent, {backgroundColor: colors.surface}]}>
                      <View style={[componentStyles.modalHeader, {borderBottomColor: colors.border}]}>
                        <TouchableOpacity onPress={() => setReleaseDatePickerVisible(false)}>
                          <Text style={[componentStyles.modalActionText, {color: colors.success}]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[componentStyles.modalTitle, {color: colors.text}]}>Release Date</Text>
                        <TouchableOpacity
                          onPress={() => {
                            if (releaseDatePickerValue) {
                              const isoDate = releaseDatePickerValue.toISOString().split('T')[0];
                              setReleaseDate(isoDate);
                            }
                            setReleaseDatePickerVisible(false);
                          }}>
                          <Text style={[componentStyles.modalActionText, {color: colors.success}]}>Done</Text>
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
                style={[componentStyles.selectInput, {backgroundColor: colors.input, borderColor: colors.inputBorder}]}
                onPress={() => {
                  const initialDate = releaseDate
                    ? new Date(releaseDate)
                    : new Date();
                  setReleaseDatePickerValue(
                    Number.isNaN(initialDate.getTime()) ? new Date() : initialDate,
                  );
                  setReleaseDatePickerVisible(true);
                }}>
                <Text style={[componentStyles.selectInputText, {color: colors.text}]}>{formattedReleaseDate}</Text>
                <Icon name="event" size={22} color={colors.textSecondary} />
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

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Barcode</Text>
            <TextInput
              style={[componentStyles.input, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter barcode (optional)"
              value={barcode}
              onChangeText={setBarcode}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={[componentStyles.label, {color: colors.text}]}>Notes</Text>
            <TextInput
              style={[componentStyles.input, componentStyles.textArea, {backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text}]}
              placeholder="Enter notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save and Cancel Buttons */}
      <View style={[componentStyles.footer, {backgroundColor: colors.footer, borderTopColor: colors.border}]}>
        <TouchableOpacity
          style={[componentStyles.saveButton, {backgroundColor: colors.success}, loading && componentStyles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={componentStyles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={componentStyles.removeButton} onPress={() => navigation.goBack()}>
          <Text style={[componentStyles.removeButtonText, {color: colors.text}]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.header,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    backgroundColor: colors.input,
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
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  costInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 16,
    marginRight: 8,
  },
  costInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  selectInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    height: 48,
  },
  picker: {
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
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalPicker: {
    height: 216,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  removeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  removeButtonText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default AddItemScreen;

