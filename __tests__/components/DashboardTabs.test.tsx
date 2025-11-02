import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
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

describe('DashboardTabs', () => {
  it('renders all three tabs', () => {
    const {getAllByText} = render(<DashboardTabs />);
    expect(getAllByText(/Total Pairs/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Brands/i).length).toBeGreaterThan(0);
    expect(getAllByText(/Total Value/i).length).toBeGreaterThan(0);
  });

  it('displays shoe items in Total Pairs tab', () => {
    const {getByText} = render(<DashboardTabs />);
    expect(getByText(/Adidas/i)).toBeTruthy();
    expect(getByText(/Classic Leather/i)).toBeTruthy();
  });

  it('switches to Brands tab when clicked', () => {
    const {getByText} = render(<DashboardTabs />);
    const brandsTab = getByText(/Brands/i);
    
    fireEvent.press(brandsTab);
    
    expect(getByText(/Brands:/i)).toBeTruthy();
  });

  it('switches to Total Value tab when clicked', () => {
    const {getAllByText} = render(<DashboardTabs />);
    const totalValueTab = getAllByText(/Total Value/i)[0];
    
    fireEvent.press(totalValueTab);
    
    expect(getAllByText(/Total Value/i).length).toBeGreaterThan(0);
  });

  it('displays correct brand count in tab label', () => {
    const {getByText} = render(<DashboardTabs />);
    expect(getByText(/Brands \(\d+\)/i)).toBeTruthy();
  });

  it('displays correct item count in tab label', () => {
    const {getByText} = render(<DashboardTabs />);
    expect(getByText(/Total Pairs \(\d+\)/i)).toBeTruthy();
  });
});

