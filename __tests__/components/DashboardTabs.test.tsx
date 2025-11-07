import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Alert} from 'react-native';
import DashboardTabs from '../../src/components/DashboardTabs';

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

jest.mock('../../src/services/inventoryService', () => ({
  getInventoryItemsPage: jest.fn(),
  deleteInventoryItem: jest.fn(),
}));

describe('DashboardTabs', () => {
  const {getInventoryItemsPage, deleteInventoryItem} = require('../../src/services/inventoryService');

  const mockInventory = [
    {
      id: '1',
      name: 'Air Max 270',
      brand: 'Nike',
      size: '10',
      color: 'Black',
      value: 150,
      imageUrl: 'https://example.com/image1.jpg',
    },
    {
      id: '2',
      name: 'Classic Leather',
      brand: 'Adidas',
      size: '9',
      color: 'White',
      value: 120,
      imageUrl: 'https://example.com/image2.jpg',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getInventoryItemsPage.mockResolvedValue({
      items: mockInventory,
      lastDoc: null,
    });
    deleteInventoryItem.mockResolvedValue(undefined);
  });

  const mockAlert = () => {
    const alertMock = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find(btn => btn.style === 'destructive');
        deleteButton?.onPress?.();
      });
    return () => {
      alertMock.mockRestore();
    };
  };

  it('renders all three tabs', async () => {
    const {getAllByText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(getAllByText(/Total Pairs/i).length).toBeGreaterThan(0);
      expect(getAllByText(/Brands/i).length).toBeGreaterThan(0);
      expect(getAllByText(/Total Value/i).length).toBeGreaterThan(0);
    });
    expect(getInventoryItemsPage).toHaveBeenCalledWith({limit: 20});
  });

  it('displays shoe items in Total Pairs tab', async () => {
    const {getByText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(getByText(/Classic Leather/i)).toBeTruthy();
      expect(getByText(/Adidas/i)).toBeTruthy();
    });
  });

  it('switches to Brands tab when clicked', async () => {
    const {getByText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(getByText(/Total Pairs \(2\)/i)).toBeTruthy();
    });
    const brandsTab = getByText(/Brands/i);

    fireEvent.press(brandsTab);

    await waitFor(() => {
      expect(getByText(/Brands: 2/i)).toBeTruthy();
    });
  });

  it('switches to Total Value tab when clicked', async () => {
    const {getAllByText, getByText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(getAllByText(/Total Value/i).length).toBeGreaterThan(0);
    });
    const totalValueTab = getAllByText(/Total Value/i)[0];

    fireEvent.press(totalValueTab);

    await waitFor(() => {
      expect(getByText(/Total Value/i)).toBeTruthy();
    });
  });

  it('displays correct brand count in tab label', async () => {
    const {getByText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(getByText('Brands (2)')).toBeTruthy();
    });
  });

  it('displays correct item count in tab label', async () => {
    const {getByText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(getByText('Total Pairs (2)')).toBeTruthy();
    });
  });

  it('does not show load more button when fewer than page size', async () => {
    const {queryByText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(queryByText(/Load More/i)).toBeNull();
    });
  });

  it('deletes an item when delete is confirmed', async () => {
    const restoreAlert = mockAlert();
    const {getAllByLabelText} = render(<DashboardTabs />);
    await waitFor(() => {
      expect(getAllByLabelText('Delete Air Max 270')[0]).toBeTruthy();
    });

    const deleteButtonElement = getAllByLabelText('Delete Air Max 270')[0];
    fireEvent.press(deleteButtonElement);

    await waitFor(() => {
      expect(deleteInventoryItem).toHaveBeenCalledWith('1', 'https://example.com/image1.jpg');
    });
    expect(getInventoryItemsPage).toHaveBeenCalledTimes(2);

    restoreAlert();
  });
});

