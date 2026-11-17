import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeType, LightTheme, Theme } from '../theme/AppTheme';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: AppThemeType;
  mode: ThemeMode;
  isDark: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = '@rizzup/theme-mode';

const ThemeContext = createContext<ThemeContextValue>({
  theme: Theme,
  mode: 'dark',
  isDark: true,
  toggle: () => {},
  setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemScheme === 'light' ? 'light' : 'dark');

  // Mirrors `mode` so toggle() never has to read stale state, and `touched`
  // makes sure a slow storage read cannot undo a tap the user already made.
  const modeRef = useRef<ThemeMode>(mode);
  const touched = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (touched.current) return;
        if (stored === 'light' || stored === 'dark') {
          modeRef.current = stored;
          setModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    touched.current = true;
    modeRef.current = next;
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setMode(modeRef.current === 'dark' ? 'light' : 'dark');
  }, [setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'dark' ? Theme : LightTheme,
      mode,
      isDark: mode === 'dark',
      toggle,
      setMode,
    }),
    [mode, toggle, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);
