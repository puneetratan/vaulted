import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import DashboardScreen from '../../src/screens/DashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../src/components/DashboardTabs', () => {
  const React = require('react');
  const {View, Text} = require('react-native');
  return () => <View><Text>Dashboard Tabs</Text></View>;
});

jest.mock('../../src/components/HamburgerMenu.web', () => {
  const React = require('react');
  return () => null;
});

jest.mock('../../src/components/AddItemOptions.web', () => {
  const React = require('react');
  return () => null;
});

jest.mock('../../src/components/ShoeSizeModal', () => {
  const React = require('react');
  const {View, Text, TouchableOpacity} = require('react-native');
  return ({visible, shoeSize, onShoeSizeChange, onSubmit}: any) => 
    visible ? (
      <View testID="shoe-size-modal">
        <Text testID="modal-title">Enter Your Shoe Size</Text>
        <TouchableOpacity testID="submit-button" onPress={onSubmit}>
          <Text>Continue</Text>
        </TouchableOpacity>
      </View>
    ) : null;
});

jest.mock('../../src/services/userService', () => ({
  getUserData: jest.fn(),
  updateUserData: jest.fn(),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    },
    signOut: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('DashboardScreen', () => {
  const {getUserData, updateUserData} = require('../../src/services/userService');

  beforeEach(() => {
    jest.clearAllMocks();
    getUserData.mockResolvedValue({ shoeSize: '10' });
  });

  it('renders correctly', () => {
    const {getByText} = render(<DashboardScreen />);
    expect(getByText(/add item/i)).toBeTruthy();
  });

  it('displays Export and Filter buttons', () => {
    const {getAllByText} = render(<DashboardScreen />);
    expect(getAllByText(/export/i).length).toBeGreaterThan(0);
    expect(getAllByText(/filter/i).length).toBeGreaterThan(0);
  });

  it('displays Add Item button', () => {
    const {getByText} = render(<DashboardScreen />);
    expect(getByText(/add item/i)).toBeTruthy();
  });

  it('shows shoe size modal when user has no shoe size', async () => {
    getUserData.mockResolvedValue({ shoeSize: undefined });
    const {findByTestId} = render(<DashboardScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
  });

  it('does not show shoe size modal when user has shoe size', async () => {
    getUserData.mockResolvedValue({ shoeSize: '10' });
    const {queryByTestId} = render(<DashboardScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
    
    expect(queryByTestId('shoe-size-modal')).toBeNull();
  });
});

