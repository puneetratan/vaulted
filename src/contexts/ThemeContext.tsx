import React, {createContext, useContext, ReactNode} from 'react';

export type ThemeMode = 'dark';

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

/** Default dark theme - app uses dark theme only, no switching. */
export const darkTheme: ThemeColors = {
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
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: darkTheme,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context ?? {theme: 'dark' as ThemeMode, colors: darkTheme};
};

export const ThemeProvider: React.FC<{children: ReactNode}> = ({children}) => (
  <ThemeContext.Provider value={{theme: 'dark', colors: darkTheme}}>
    {children}
  </ThemeContext.Provider>
);
