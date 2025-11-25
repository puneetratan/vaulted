import React, {useState, useEffect} from 'react';
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
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {updateInventoryItem} from '../services/inventoryService';
import {Picker} from '@react-native-picker/picker';

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

const EditItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{params: RouteParams}, 'params'>>();
  
  const item = route.params?.item;
  
  const [name, setName] = useState(item?.name || '');
  const [brand, setBrand] = useState(item?.brand || '');
  const [silhouette, setSilhouette] = useState(item?.silhouette || '');
  const [styleId, setStyleId] = useState(item?.styleId || '');
  const [size, setSize] = useState(item?.size || '');
  const [color, setColor] = useState(item?.color || '');
  const [cost, setCost] = useState(item?.cost.toString() || '');
  const [retailValue, setRetailValue] = useState(
    item?.retailValue !== undefined
      ? item.retailValue.toString()
      : item?.cost.toString() || ''
  );
  const [releaseDate, setReleaseDate] = useState(item?.releaseDate || '');
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1');
  const [notes, setNotes] = useState(item?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setBrand(item.brand);
      setSilhouette(item.silhouette);
      setStyleId(item.styleId);
      setSize(item.size);
      setColor(item.color);
      setCost(item.cost.toString());
      setRetailValue(
        item.retailValue !== undefined
          ? item.retailValue.toString()
          : item.cost.toString()
      );
      setReleaseDate(item.releaseDate || '');
      setImageUrl(item.imageUrl || '');
      setQuantity(item.quantity?.toString() || '1');
      setNotes(item.notes || '');
    }
  }, [item]);

  const handleSubmit = () => {
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
      imageUrl: imageUrl?.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);

    updateInventoryItem(item.id, payload)
      .then(() => {
        Alert.alert('Success', 'Item updated successfully', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      })
      .catch((error: any) => {
        const message = error?.message || 'Failed to update item. Please try again.';
        Alert.alert('Error', message);
      })
      .finally(() => setSubmitting(false));
  };


  const handleCancel = () => {
    navigation.goBack();
  };

  const handleEditImage = () => {
    // For web, create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <View style={styles.container}>
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
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={quantity}
              onValueChange={value => setQuantity(String(value))}
              style={styles.picker}
              itemStyle={styles.pickerItem}>
              {Array.from({length: 20}, (_, index) => {
                const value = String(index + 1);
                return <Picker.Item label={value} value={value} key={value} />;
              })}
            </Picker>
          </View>
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
          <TextInput
            style={styles.input}
            type="date"
            value={releaseDate}
            onChangeText={setReleaseDate}
            onChange={event => setReleaseDate(event.nativeEvent.text)}
            placeholder="Enter release date"
          />
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
    </View>
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
    backgroundColor: '#474747',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditItemScreen;

