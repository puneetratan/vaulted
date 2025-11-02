import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen.web';

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

jest.useFakeTimers();

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const {getByText} = render(<LoginScreen />);
    expect(getByText(/sign in with google/i)).toBeTruthy();
  });

  it('displays Google Sign-In button', () => {
    const {getByText} = render(<LoginScreen />);
    expect(getByText(/sign in with google/i)).toBeTruthy();
  });

  it('navigates to Dashboard on Google Sign-In', async () => {
    const {getByText} = render(<LoginScreen />);
    const googleButton = getByText(/sign in with google/i);
    
    fireEvent.press(googleButton);
    
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Dashboard');
    });
  });
});

