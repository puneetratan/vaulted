import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import DashboardScreen from '../../src/screens/DashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    reset: jest.fn(),
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
  return () => null;
});

describe('DashboardScreen', () => {
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
});

