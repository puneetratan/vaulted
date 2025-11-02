import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import SplashScreen from '../../src/screens/SplashScreen';

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

// Mock setTimeout
jest.useFakeTimers();

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const {getByText} = render(<SplashScreen />);
    expect(getByText('Vault')).toBeTruthy();
  });

  it('displays logo text', () => {
    const {getByText} = render(<SplashScreen />);
    expect(getByText('Vault')).toBeTruthy();
  });

  it('auto-navigates after 2 seconds', async () => {
    render(<SplashScreen />);
    
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Login');
    });
  });
});

