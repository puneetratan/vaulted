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

interface AddItemOptionsProps {
  visible: boolean;
  onClose: () => void;
  onAddManually?: () => void;
}

const AddItemOptions = ({visible, onClose, onAddManually}: AddItemOptionsProps) => {
  const handleBarcodeReader = () => {
    onClose();
    Alert.alert(
      'Barcode Reader',
      'Barcode scanner is available on mobile devices only',
      [{text: 'OK'}],
    );
  };

  const handleXLSImport = async () => {
    onClose();
    // Web implementation - use HTML5 file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xls,.xlsx,.csv';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        Alert.alert('XLS Import', `File selected: ${file.name}`, [{text: 'OK'}]);
        // TODO: Process the XLS file
      }
    };
    input.click();
  };

  const handleImageUpload = () => {
    onClose();
    // Web implementation - use HTML5 file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          Alert.alert(
            'Image Selected',
            `Image: ${file.name}`,
            [{text: 'OK'}],
          );
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
      icon: '✏️',
      onPress: handleAddManually,
      color: '#5856D6',
    },
    {
      id: 'barcode',
      title: 'Barcode Reader',
      icon: '🔍',
      onPress: handleBarcodeReader,
      color: '#007AFF',
    },
    {
      id: 'xls',
      title: 'XLS Import',
      icon: '📊',
      onPress: handleXLSImport,
      color: '#34C759',
    },
    {
      id: 'image',
      title: 'Image Upload',
      icon: '📷',
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
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.option, index < options.length - 1 && styles.optionSpacing]}
                onPress={option.onPress}>
                <View style={[styles.iconContainer, {backgroundColor: `${option.color}15`}]}>
                  <Text style={styles.iconEmoji}>{option.icon}</Text>
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
  closeText: {
    fontSize: 24,
    color: '#000000',
  },
  optionsContainer: {},
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
  iconEmoji: {
    fontSize: 24,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});

export default AddItemOptions;


