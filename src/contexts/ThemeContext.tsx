import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  secondary: string;
  error: string;
  success: string;
  card: string;
  input: string;
  inputBorder: string;
  header: string;
  footer: string;
}

const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceSecondary: '#E5E5E7',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  primary: '#007AFF',
  secondary: '#474747',
  error: '#FF3B30',
  success: '#34C759',
  card: '#FFFFFF',
  input: '#FFFFFF',
  inputBorder: '#E0E0E0',
  header: '#FFFFFF',
  footer: '#FFFFFF',
};

const darkTheme: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#999999',
  border: '#2C2C2E',
  primary: '#34C759',
  secondary: '#474747',
  error: '#FF3B30',
  success: '#34C759',
  card: '#2C2C2E',
  input: '#2C2C2E',
  inputBorder: '#2C2C2E',
  header: '#000000',
  footer: '#000000',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkTheme,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const THEME_STORAGE_KEY = '@vault_app_theme';

export const ThemeProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [loading, setLoading] = useState(true);

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  // Save theme to storage when it changes
  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  if (loading) {
    // Return default dark theme while loading
    return (
      <ThemeContext.Provider
        value={{
          theme: 'dark',
          colors: darkTheme,
          toggleTheme,
          setTheme,
        }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        setTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};
