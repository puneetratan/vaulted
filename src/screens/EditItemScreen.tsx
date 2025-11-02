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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ImagePicker from 'react-native-image-picker';

interface ShoeItem {
  id: string;
  name: string;
  brand: string;
  size: string;
  color: string;
  cost: number;
  imageUrl?: string;
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
  const [size, setSize] = useState(item?.size || '');
  const [color, setColor] = useState(item?.color || '');
  const [cost, setCost] = useState(item?.cost.toString() || '');
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setBrand(item.brand);
      setSize(item.size);
      setColor(item.color);
      setCost(item.cost.toString());
      setImageUrl(item.imageUrl || '');
    }
  }, [item]);

  const handleSubmit = () => {
    // Validate inputs
    if (!name.trim() || !brand.trim() || !size.trim() || !color.trim() || !cost.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert('Error', 'Please enter a valid cost');
      return;
    }

    // Here you would typically update the item in your data store
    Alert.alert('Success', 'Item updated successfully', [
      {text: 'OK', onPress: () => navigation.goBack()},
    ]);
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

  const handleEditImage = () => {
    Alert.alert(
      'Change Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => {
            ImagePicker.launchCamera(
              {
                mediaType: 'photo',
                quality: 0.8,
              },
              (response) => {
                if (response.uri) {
                  setImageUrl(response.uri);
                }
              },
            );
          },
        },
        {
          text: 'Photo Library',
          onPress: () => {
            ImagePicker.launchImageLibrary(
              {
                mediaType: 'photo',
                quality: 0.8,
              },
              (response) => {
                if (response.uri) {
                  setImageUrl(response.uri);
                }
              },
            );
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
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}>
          <Icon name="delete" size={24} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Save Changes</Text>
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

