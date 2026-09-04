import { createContext, ReactNode, useEffect, useState } from 'react';
import { getTheme, ThemeName } from './theme';
import { ThemeProvider } from 'styled-components';

const DEFAULT_THEME_NAME = 'light';
const THEME_LOCALSTORAGE_KEY = 'petMediSearchTheme';

interface Props {
  themeName: ThemeName;
  toggleTheme: () => void;
}

export const state = {
  themeName: DEFAULT_THEME_NAME as ThemeName,
  toggleTheme: () => {},
};

export const ThemeContext = createContext<Props>(state);

export const PetMediThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME_NAME);

  const toggleTheme = () => {
    setThemeName(themeName === 'light' ? 'dark' : 'light');
    localStorage.setItem(
      THEME_LOCALSTORAGE_KEY,
      themeName === 'light' ? 'dark' : 'light'
    );
  };

  useEffect(() => {
    const savedThemeName = localStorage.getItem(
      THEME_LOCALSTORAGE_KEY
    ) as ThemeName;
    setThemeName(savedThemeName || DEFAULT_THEME_NAME);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeName, toggleTheme }}>
      <ThemeProvider theme={getTheme(themeName)}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
