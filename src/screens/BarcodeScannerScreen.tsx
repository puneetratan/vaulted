import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Camera, useCameraDevice, useCodeScanner, CameraPermissionStatus} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';

const BarcodeScannerScreen = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const device = useCameraDevice('back');

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      // First check current permission status
      const currentPermission = await Camera.getCameraPermissionStatus();
      
      if (currentPermission === 'granted') {
        setHasPermission(true);
        return;
      }

      // Request permission if not granted
      if (Platform.OS === 'android' && currentPermission === 'denied') {
        // On Android, request permission
        const permission = await Camera.requestCameraPermission();
        setHasPermission(permission === 'granted');
      } else {
        // For iOS or other cases
        const permission = await Camera.requestCameraPermission();
        setHasPermission(permission === 'granted');
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setHasPermission(false);
    }
  };

  const requestPermissionAgain = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
      
      if (permission === 'denied' && Platform.OS === 'android') {
        // On Android, if denied, offer to open settings
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission in app settings to use the barcode scanner.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    if (!barcode || barcode.trim() === '') {
      console.error('❌ Invalid barcode value:', barcode);
      Alert.alert('Error', 'Invalid barcode value. Please try scanning again.');
      setIsScanning(true);
      return;
    }
    
    console.log('📦 Navigating to AddItem with barcode:', barcode);
    // Navigate to AddItemScreen with the scanned barcode
    navigation.navigate('AddItem' as never, {barcode: barcode.trim()} as never);
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'qr', 'ean-13', 'code-39', 'code-93'],
    onCodeScanned: (codes) => {
      // Log all detected codes for debugging
      if (codes.length > 0) {
        console.log('🔍 Barcode scanner detected codes:', codes.length);
        codes.forEach((code, index) => {
          console.log(`  Code ${index + 1}:`, {
            value: code.value,
            type: code.type,
            frame: code.frame,
          });
        });
      }
      
      if (!isScanning || codes.length === 0) {
        return;
      }

      const code = codes[0];
      
      if (code?.value) {
        console.log('✅ Valid barcode detected! Value:', code.value, 'Type:', code.type);
        setIsScanning(false);
        
        // Navigate directly to AddItemScreen - it will handle fetching product details
        handleBarcodeScanned(code.value);
      } else {
        console.warn('⚠️ Code detected but no value:', code);
      }
    },
  });

  const handleManualEntry = () => {
    navigation.navigate('AddItem' as never, {} as never);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking camera permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="camera-alt" size={64} color="#999" />
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorText}>
            {Platform.OS === 'android'
              ? 'Please grant camera permission to use the barcode scanner. You can also enable it in your device settings.'
              : 'Please enable camera access in your device settings to use the barcode scanner.'}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={requestPermissionAgain}>
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => Linking.openSettings()}>
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Open Settings</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="camera-alt" size={64} color="#999" />
          <Text style={styles.errorTitle}>Camera Not Available</Text>
          <Text style={styles.errorText}>
            No camera device found on this device.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}>
          <Icon name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Barcode</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isScanning}
          codeScanner={codeScanner}
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          Position the barcode within the frame
        </Text>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={handleManualEntry}>
          <Icon name="keyboard" size={20} color="#007AFF" />
          <Text style={styles.manualButtonText}>Enter Manually</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#FFF',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 24,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  manualButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BarcodeScannerScreen;




