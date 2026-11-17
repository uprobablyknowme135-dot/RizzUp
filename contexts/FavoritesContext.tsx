import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoritesContextValue {
  /** Line ids, most recently saved first. */
  favorites: string[];
  isFavorite: (lineId: string) => boolean;
  toggleFavorite: (lineId: string) => void;
  clearFavorites: () => void;
  hydrated: boolean;
}

const STORAGE_KEY = '@rizzup/favorites';

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
  clearFavorites: () => {},
  hydrated: false,
});

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const favoritesRef = useRef<string[]>([]);
  const touched = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (touched.current || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((id) => typeof id === 'string');
          favoritesRef.current = clean;
          setFavorites(clean);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // Every mutation writes through immediately: storage is always in sync and
  // there is no effect that could race the initial read.
  const commit = useCallback((next: string[]) => {
    touched.current = true;
    favoritesRef.current = next;
    setFavorites(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const toggleFavorite = useCallback(
    (lineId: string) => {
      const current = favoritesRef.current;
      commit(current.includes(lineId) ? current.filter((id) => id !== lineId) : [lineId, ...current]);
    },
    [commit]
  );

  const clearFavorites = useCallback(() => commit([]), [commit]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite: (lineId: string) => favorites.includes(lineId),
      toggleFavorite,
      clearFavorites,
      hydrated,
    }),
    [favorites, toggleFavorite, clearFavorites, hydrated]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => useContext(FavoritesContext);
