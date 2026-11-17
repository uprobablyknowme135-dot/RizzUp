// This file contains ONLY theme definitions - no imports, no logic
//
// RizzUp ships TWO palettes: the neon "midnight" dark theme (default) and a
// bright glass light theme. Both expose the exact same keys so screens can be
// written once against `useAppTheme()`.

const darkColors = {
  // Brand — neon violet + electric cyan
  primary: '#BF5FFF',
  primaryDark: '#8B2FD6',
  primaryLight: '#D9A6FF',
  secondary: '#00F0FF',
  accent: '#FF4DD2',
  // Backgrounds & surfaces
  background: '#08060F',
  backgroundSecondary: '#100B1E',
  surface: '#150F26',
  card: '#150F26',
  overlay: 'rgba(5,3,12,0.72)',
  // Text (flat strings)
  text: '#F6F2FF',
  textSecondary: '#B7AED6',
  textMuted: '#7B7396',
  textInverse: '#0B0714',
  // Lines & states
  border: 'rgba(191,95,255,0.24)',
  divider: 'rgba(255,255,255,0.08)',
  disabled: '#3B3452',
  placeholder: '#7B7396',
  // Status colors
  success: '#3DDC97',
  error: '#FF5C7A',
  danger: '#FF5C7A',
  warning: '#FFC24B',
  info: '#4DA6FF',
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  // Gradient presets (2+ color ARRAYS)
  gradient: {
    primary: ['#BF5FFF', '#00F0FF'],
    secondary: ['#FF4DD2', '#BF5FFF'],
    success: ['#3DDC97', '#00F0FF'],
    info: ['#4DA6FF', '#BF5FFF'],
    warning: ['#FFC24B', '#FF4DD2'],
    danger: ['#FF5C7A', '#BF5FFF'],
    dark: ['#08060F', '#100B1E'],
  },
  // Liquid-glass layers: a translucent panel plus the specular highlights,
  // sheen and inner rim that make the surface read as glass.
  glass: {
    light: 'rgba(255,255,255,0.07)',
    medium: 'rgba(255,255,255,0.13)',
    dark: 'rgba(0,0,0,0.28)',
    border: 'rgba(255,255,255,0.14)',
    panel: 'rgba(13,9,26,0.62)',
    specular: 'rgba(255,255,255,0.52)',
    sheen: 'rgba(255,255,255,0.09)',
    inner: 'rgba(255,255,255,0.07)',
  },
  // Tab bar / selection states
  selection: {
    active: '#BF5FFF',
    inactive: '#6E6688',
  },
};

// Same keys, brighter surfaces — typed against darkColors so a missing or
// extra key is a compile error.
const lightColors: typeof darkColors = {
  primary: '#9333EA',
  primaryDark: '#6B21A8',
  primaryLight: '#C084FC',
  secondary: '#00B4CC',
  accent: '#DB2777',
  background: '#F7F4FF',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  overlay: 'rgba(24,12,45,0.45)',
  text: '#1A1030',
  textSecondary: '#5B4E7E',
  textMuted: '#8A80A6',
  textInverse: '#FFFFFF',
  border: 'rgba(147,51,234,0.20)',
  divider: 'rgba(26,16,48,0.08)',
  disabled: '#CFC7E2',
  placeholder: '#8A80A6',
  success: '#0E9F6E',
  error: '#E11D48',
  danger: '#E11D48',
  warning: '#D97706',
  info: '#2563EB',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gradient: {
    primary: ['#9333EA', '#00B4CC'],
    secondary: ['#DB2777', '#9333EA'],
    success: ['#0E9F6E', '#00B4CC'],
    info: ['#2563EB', '#9333EA'],
    warning: ['#D97706', '#DB2777'],
    danger: ['#E11D48', '#9333EA'],
    dark: ['#F7F4FF', '#FFFFFF'],
  },
  glass: {
    light: 'rgba(255,255,255,0.70)',
    medium: 'rgba(255,255,255,0.88)',
    dark: 'rgba(26,16,48,0.06)',
    border: 'rgba(255,255,255,0.95)',
    panel: 'rgba(255,255,255,0.72)',
    specular: 'rgba(255,255,255,0.95)',
    sheen: 'rgba(255,255,255,0.55)',
    inner: 'rgba(147,51,234,0.14)',
  },
  selection: {
    active: '#9333EA',
    inactive: '#9A90B5',
  },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

// Modern elevation system (shadows & depth)
const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 18,
  },
};

const typography = {
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    regular: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    title: 20,
    heading: 24,
    display: 28,
    hero: 34,
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Alias for backward compatibility with generated code
const fontSizes = {
  small: 12,
  regular: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

const opacity = {
  disabled: 0.4,
  hover: 0.8,
  pressed: 0.6,
  overlay: 0.5,
};

const shared = { spacing, borderRadius, elevation, typography, fontSizes, animation, opacity };

export const Theme = { colors: darkColors, ...shared };

export const LightTheme: typeof Theme = { colors: lightColors, ...shared };

export type AppThemeType = typeof Theme;

// Backward-compatible alias
export const AppTheme = Theme;
