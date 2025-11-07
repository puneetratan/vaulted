import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import ProfileScreen from '../../src/screens/ProfileScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
    },
    logout: jest.fn(),
  }),
}));

jest.mock('../../src/services/userService', () => ({
  getUserData: jest.fn(),
  updateUserData: jest.fn(),
}));

jest.mock('../../src/components/ShoeSizeModal', () => {
  const React = require('react');
  const {View, Text, TouchableOpacity, TextInput} = require('react-native');
  return ({visible, shoeSize, onShoeSizeChange, onSubmit}: any) => 
    visible ? (
      <View testID="shoe-size-modal">
        <Text testID="modal-title">Enter Your Shoe Size</Text>
        <TextInput
          testID="shoe-size-input"
          value={shoeSize}
          onChangeText={onShoeSizeChange}
        />
        <TouchableOpacity testID="submit-button" onPress={onSubmit}>
          <Text>Continue</Text>
        </TouchableOpacity>
      </View>
    ) : null;
});

describe('ProfileScreen', () => {
  const {getUserData, updateUserData} = require('../../src/services/userService');

  beforeEach(() => {
    jest.clearAllMocks();
    getUserData.mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      shoeSize: '10',
    });
  });

  it('renders correctly', () => {
    const {getByText} = render(<ProfileScreen />);
    expect(getByText(/profile/i)).toBeTruthy();
  });

  it('displays user information', async () => {
    const {findByText} = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
    
    expect(await findByText(/test user/i)).toBeTruthy();
    expect(await findByText(/test@example.com/i)).toBeTruthy();
  });

  it('displays shoe size when available', async () => {
    const {findByText} = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
    
    expect(await findByText(/10/i)).toBeTruthy();
  });

  it('shows edit button next to shoe size', async () => {
    const {findByText} = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
    
    // The edit icon should be present (Icon with name="edit" renders as Text with testID="edit")
    const editIcon = await findByText('edit');
    expect(editIcon).toBeTruthy();
  });

  it('opens shoe size modal when edit button is clicked', async () => {
    const {findByText, queryByTestId, getByTestId} = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
    
    // Icon component renders as Text with testID matching the icon name
    const editIcon = getByTestId('edit');
    fireEvent.press(editIcon);
    
    await waitFor(() => {
      expect(queryByTestId('shoe-size-modal')).toBeTruthy();
    });
  });

  it('updates shoe size when modal is submitted', async () => {
    updateUserData.mockResolvedValue(undefined);
    
    const {findByTestId} = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
    
    const editButton = await findByTestId('edit');
    fireEvent.press(editButton);
    
    const input = await findByTestId('shoe-size-input');
    fireEvent.changeText(input, '10.5');
    
    const submitButton = await findByTestId('submit-button');
    fireEvent.press(submitButton);
    
    await waitFor(() => {
      expect(updateUserData).toHaveBeenCalledWith('test-uid', { shoeSize: '10.5' });
    });
  });

  it('displays "Not set" when shoe size is not available', async () => {
    getUserData.mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      shoeSize: undefined,
    });
    
    const {findByText} = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getUserData).toHaveBeenCalledWith('test-uid');
    });
    
    expect(await findByText(/not set/i)).toBeTruthy();
  });
});

