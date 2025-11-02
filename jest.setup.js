import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const {View, Text} = require('react-native');
  
  return {
    createStackNavigator: () => ({
      Navigator: ({children}) => <View>{children}</View>,
      Screen: ({children}) => <View>{children}</View>,
    }),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  
  return {
    SafeAreaProvider: ({children}) => <View>{children}</View>,
    SafeAreaView: ({children}) => <View>{children}</View>,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  };
});

// Mock react-native-screens
jest.mock('react-native-screens', () => {
  const React = require('react');
  const {View} = require('react-native');
  
  return {
    enableScreens: jest.fn(),
    screensEnabled: () => true,
    NativeStackView: ({children}) => <View>{children}</View>,
    createNativeStackNavigator: () => ({
      Navigator: ({children}) => <View>{children}</View>,
      Screen: ({children}) => <View>{children}</View>,
    }),
  };
});

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn().mockResolvedValue(false),
    getCurrentUser: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

// Mock @invertase/react-native-apple-authentication
jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    isSupported: false,
  },
  AppleButton: 'AppleButton',
  AppleAuthRequestOperation: {
    LOGIN: 'LOGIN',
  },
  AppleAuthRequestScope: {
    EMAIL: 'EMAIL',
    FULL_NAME: 'FULL_NAME',
  },
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  const {Text} = require('react-native');
  
  return props => <Text testID={props.name}>{props.name}</Text>;
});

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  types: {
    allFiles: 'allFiles',
  },
}));

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevices: jest.fn().mockReturnValue({}),
  useCameraDevice: jest.fn().mockReturnValue(null),
  useFrameProcessor: jest.fn(),
}));

// Mock react-native-barcode-mask
jest.mock('react-native-barcode-mask', () => ({
  BarcodeMask: 'BarcodeMask',
}));

