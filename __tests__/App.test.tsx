/**
 * @format
 */

import 'react-native';
import React from 'react';
import {render} from '@testing-library/react-native';
import App from '../src/App';

// Mock navigation and gesture handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    GestureHandlerRootView: ({children}) => <View>{children}</View>,
    Swipeable: 'Swipeable',
    DrawerLayout: 'DrawerLayout',
    State: {},
    ScrollView: 'ScrollView',
    Slider: 'Slider',
    Switch: 'Switch',
    TextInput: 'TextInput',
    ToolbarAndroid: 'ToolbarAndroid',
    ViewPagerAndroid: 'ViewPagerAndroid',
    DrawerLayoutAndroid: 'DrawerLayoutAndroid',
    WebView: 'WebView',
    NativeViewGestureHandler: 'NativeViewGestureHandler',
    TapGestureHandler: 'TapGestureHandler',
    FlingGestureHandler: 'FlingGestureHandler',
    ForceTouchGestureHandler: 'ForceTouchGestureHandler',
    LongPressGestureHandler: 'LongPressGestureHandler',
    PanGestureHandler: 'PanGestureHandler',
    PinchGestureHandler: 'PinchGestureHandler',
    RotationGestureHandler: 'RotationGestureHandler',
    RawButton: 'RawButton',
    BaseButton: 'BaseButton',
    BorderlessButton: 'BorderlessButton',
    FlatList: 'FlatList',
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
  },
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    SafeAreaProvider: ({children}) => <View>{children}</View>,
    SafeAreaView: ({children}) => <View>{children}</View>,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  };
});

describe('App', () => {
  it('renders without crashing', () => {
    const {UNSAFE_root} = render(<App />);
    expect(UNSAFE_root).toBeDefined();
  });
});

