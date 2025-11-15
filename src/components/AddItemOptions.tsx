import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import {getStorage, getFunctions} from '../services/firebase';
import {useAuth} from '../contexts/AuthContext';

interface AddItemOptionsProps {
  visible: boolean;
  onClose: () => void;
  onAddManually?: () => void;
}

const AddItemOptions = ({visible, onClose, onAddManually}: AddItemOptionsProps) => {
  const {user} = useAuth();

  const handleBarcodeReader = () => {
    onClose();
    Alert.alert(
      'Barcode Reader',
      'Barcode scanner functionality will be implemented here',
      [{text: 'OK'}],
    );
    // TODO: Implement barcode scanning
    // You can use react-native-vision-camera and react-native-barcode-mask
  };

  const handleXLSImport = async () => {
    try {
      onClose();
      const pickerResult = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.xls,
          DocumentPicker.types.xlsx,
          DocumentPicker.types.csv,
        ],
      });
      Alert.alert(
        'XLS Import',
        `File selected: ${pickerResult[0].name}`,
        [{text: 'OK'}],
      );
      // TODO: Process the XLS file
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        Alert.alert('Error', 'Failed to pick file');
      }
    }
  };

  const uploadImagesAndAnalyze = async (assets: Exclude<ImagePickerResponse['assets'], undefined>) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    const storageInstance = getStorage();
    if (!storageInstance) {
      Alert.alert('Error', 'Storage not initialized.');
      return;
    }

    const functions = getFunctions();
    const analyzeShoeMetadata = functions.httpsCallable('analyzeShoeMetadata');

    const selectedAssets = assets.slice(0, 10);
    const uploadedUris: string[] = [];

    for (const asset of selectedAssets) {
      if (!asset.uri) {
        continue;
      }

      const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
      const timestamp = Date.now();
      const storagePath = `openai/${user.uid}/${timestamp}_${fileName}`;

      try {
        if (!storageInstance.ref) {
          throw new Error('Storage instance missing ref API.');
        }

        const storageRef = storageInstance.ref(storagePath);
        let fileUri = asset.uri;
        if (Platform.OS === 'ios' && fileUri.startsWith('file://')) {
          fileUri = fileUri.replace('file://', '');
        }

        await storageRef.putFile(fileUri, {
          contentType: asset.type ?? 'image/jpeg',
        });

        const downloadUrl = await storageRef.getDownloadURL();
        uploadedUris.push(downloadUrl);
      } catch (uploadErr: any) {
        console.error('Image upload failed:', uploadErr);
        Alert.alert('Upload Error', uploadErr?.message || 'Failed to upload one of the images.');
        return;
      }
    }
    console.log('uploadedUris=====', uploadedUris);
    if (uploadedUris.length > 0) {
      try {
        await analyzeShoeMetadata({
          uid: user.uid,
          imageUris: uploadedUris,
        });
      } catch (fnErr: any) {
        console.warn('analyzeShoeMetadata failed for images', fnErr);
      }
    }

    if (uploadedUris.length > 0) {
      Alert.alert('Upload Complete', `${uploadedUris.length} image(s) uploaded and sent for analysis.`);
    }
  };

  const handleImageUpload = () => {
    onClose();
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 10,
      },
      async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        if (response.assets && response.assets.length > 0) {
          await uploadImagesAndAnalyze(response.assets);
        }
      },
    );
  };

  const handleAddManually = () => {
    onClose();
    if (onAddManually) {
      onAddManually();
    }
  };

  const options = [
    {
      id: 'manual',
      title: 'Add Manually',
      icon: 'edit',
      onPress: handleAddManually,
      color: '#5856D6',
    },
    {
      id: 'barcode',
      title: 'Barcode Reader',
      icon: 'qr-code-scanner',
      onPress: handleBarcodeReader,
      color: '#007AFF',
    },
    {
      id: 'image',
      title: 'Image Upload',
      icon: 'image',
      onPress: handleImageUpload,
      color: '#FF9500',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Item</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.option, index < options.length - 1 && styles.optionSpacing]}
                onPress={option.onPress}>
                <View style={[styles.iconContainer, {backgroundColor: `${option.color}15`}]}>
                  <Icon name={option.icon} size={32} color={option.color} />
                </View>
                <Text style={styles.optionText}>{option.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    // gap: 16, // Using marginBottom instead for better compatibility
  },
  optionSpacing: {
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});

export default AddItemOptions;

