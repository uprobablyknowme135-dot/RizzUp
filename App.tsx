import React from 'react';
import { StatusBar } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useAppTheme } from './contexts/ThemeContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ScoreProvider } from './contexts/ScoreContext';
import HomePage from './screens/HomePage';
import CategoriesPage from './screens/CategoriesPage';
import FavoritesPage from './screens/FavoritesPage';
import RizzScorePage from './screens/RizzScorePage';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
  Rizz: { active: 'sparkles', inactive: 'sparkles-outline' },
  Vibes: { active: 'grid', inactive: 'grid-outline' },
  Saved: { active: 'heart', inactive: 'heart-outline' },
  Score: { active: 'trophy', inactive: 'trophy-outline' },
};

const TAB_LABELS: Record<string, string> = {
  Rizz: 'Rizz',
  Vibes: 'Vibes',
  Saved: 'Saved',
  Score: 'Score',
};

const RootNavigator = () => {
  const { theme, isDark } = useAppTheme();

  // Spread the built-in theme so React Navigation keeps its `fonts` object.
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.backgroundSecondary,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.secondary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.selection.active,
          tabBarInactiveTintColor: theme.colors.selection.inactive,
          tabBarLabel: TAB_LABELS[route.name] || route.name,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' as const },
          tabBarStyle: {
            backgroundColor: theme.colors.backgroundSecondary,
            borderTopColor: theme.colors.primary + '3D',
            borderTopWidth: 1,
            paddingTop: 8,
          },
          tabBarIcon: ({ focused, color }) => {
            const glyph = TAB_ICONS[route.name] || TAB_ICONS.Rizz;
            return (
              <Ionicons
                name={focused ? glyph.active : glyph.inactive}
                size={22}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Rizz" component={HomePage} />
        <Tab.Screen name="Vibes" component={CategoriesPage} />
        <Tab.Screen name="Saved" component={FavoritesPage} />
        <Tab.Screen name="Score" component={RizzScorePage} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <ScoreProvider>
          <RootNavigator />
        </ScoreProvider>
      </FavoritesProvider>
    </ThemeProvider>
  );
}
