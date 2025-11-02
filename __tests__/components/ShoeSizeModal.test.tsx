import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import ShoeSizeModal from '../../src/components/ShoeSizeModal';

describe('ShoeSizeModal', () => {
  const mockOnSubmit = jest.fn();
  const mockOnShoeSizeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible', () => {
    const {getByPlaceholderText} = render(
      <ShoeSizeModal
        visible={true}
        shoeSize=""
        onShoeSizeChange={mockOnShoeSizeChange}
        onSubmit={mockOnSubmit}
      />,
    );
    
    expect(getByPlaceholderText(/e.g., 10.5/i)).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const {queryByPlaceholderText} = render(
      <ShoeSizeModal
        visible={false}
        shoeSize=""
        onShoeSizeChange={mockOnShoeSizeChange}
        onSubmit={mockOnSubmit}
      />,
    );
    
    expect(queryByPlaceholderText(/e.g., 10.5/i)).toBeNull();
  });

  it('calls onShoeSizeChange when input changes', () => {
    const {getByPlaceholderText} = render(
      <ShoeSizeModal
        visible={true}
        shoeSize=""
        onShoeSizeChange={mockOnShoeSizeChange}
        onSubmit={mockOnSubmit}
      />,
    );
    
    const input = getByPlaceholderText(/e.g., 10.5/i);
    fireEvent.changeText(input, '10');
    
    expect(mockOnShoeSizeChange).toHaveBeenCalledWith('10');
  });

  it('calls onSubmit when continue button is pressed', () => {
    const {getByText} = render(
      <ShoeSizeModal
        visible={true}
        shoeSize="10"
        onShoeSizeChange={mockOnShoeSizeChange}
        onSubmit={mockOnSubmit}
      />,
    );
    
    const submitButton = getByText(/continue/i);
    fireEvent.press(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});

