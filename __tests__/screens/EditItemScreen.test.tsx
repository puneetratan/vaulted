import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import EditItemScreen from '../../src/screens/EditItemScreen.web';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      item: {
        id: '1',
        name: 'Test Shoe',
        brand: 'Nike',
        size: '10',
        color: 'Black',
        cost: 150,
        imageUrl: 'https://example.com/shoe.jpg',
      },
    },
  }),
}));

jest.useFakeTimers();

describe('EditItemScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with item data', async () => {
    const {getByDisplayValue} = render(<EditItemScreen />);
    await waitFor(() => {
      expect(getByDisplayValue('Test Shoe')).toBeTruthy();
      expect(getByDisplayValue('Nike')).toBeTruthy();
      expect(getByDisplayValue('10')).toBeTruthy();
      expect(getByDisplayValue('Black')).toBeTruthy();
      expect(getByDisplayValue('150')).toBeTruthy();
    });
  });

  it('updates input fields', async () => {
    const {getByDisplayValue, queryByDisplayValue} = render(<EditItemScreen />);
    await waitFor(() => {
      expect(getByDisplayValue('Test Shoe')).toBeTruthy();
    });
    const nameInput = getByDisplayValue('Test Shoe');
    
    fireEvent.changeText(nameInput, 'Updated Shoe');
    
    await waitFor(() => {
      expect(queryByDisplayValue('Updated Shoe')).toBeTruthy();
    });
  });

  it('displays Cancel, Delete, and Save buttons', () => {
    const {getAllByText} = render(<EditItemScreen />);
    expect(getAllByText(/cancel/i).length).toBeGreaterThan(0);
    expect(getAllByText(/delete/i).length).toBeGreaterThan(0);
    expect(getAllByText(/save changes/i).length).toBeGreaterThan(0);
  });
});

