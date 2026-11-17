import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useScore } from '../contexts/ScoreContext';
import { getCategory, RizzLine } from '../data/rizzLines';

/** Neon halo: iOS gets a coloured blur, Android a matching elevation. */
export const glow = (color: string, isDark: boolean, strength = 1) => ({
  shadowColor: color,
  shadowOpacity: (isDark ? 0.62 : 0.26) * strength,
  shadowRadius: 18 * strength,
  shadowOffset: { width: 0, height: 7 },
  elevation: Math.round(9 * strength),
});

/** Neon-tube glow for headings and accent labels — dark mode only. */
export const neonText = (color: string, isDark: boolean, radius = 14) =>
  isDark
    ? {
        textShadowColor: color,
        textShadowRadius: radius,
        textShadowOffset: { width: 0, height: 0 },
      }
    : null;

/**
 * Liquid-glass finish: a specular top edge, a sheen across the upper half, an
 * optional accent wash and an inner neon rim. Render it as the FIRST child of
 * a card that has `overflow: 'hidden'` — every later sibling paints on top.
 * `tint` (and every accent passed in) must be a plain 6-digit hex.
 */
export const GlassFinish = ({
  tint,
  radius = 21,
  rim = true,
}: {
  tint?: string;
  radius?: number;
  rim?: boolean;
}) => {
  const { theme } = useAppTheme();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.sheen, { backgroundColor: theme.colors.glass.sheen }]} />
      {tint ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint + '12' }]} />
      ) : null}
      {rim ? (
        <View
          style={[
            styles.innerRim,
            { borderRadius: radius, borderColor: tint ? tint + '3D' : theme.colors.glass.inner },
          ]}
        />
      ) : null}
      <View style={[styles.specular, { backgroundColor: theme.colors.glass.specular }]} />
    </View>
  );
};

/** Slow-drifting neon blobs behind every screen. */
export const AuroraBackground = () => {
  const { theme, isDark } = useAppTheme();
  const drift1 = useRef(new Animated.Value(0)).current;
  const drift2 = useRef(new Animated.Value(0)).current;
  const drift3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

    const loops = [pulse(drift1, 6500), pulse(drift2, 9000), pulse(drift3, 11500)];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [drift1, drift2, drift3]);

  const float = (value: Animated.Value, x: number, y: number, scale: number) => ({
    transform: [
      { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) },
    ],
  });

  const blobOpacity = isDark ? 0.26 : 0.18;

  return (
    <View style={styles.aurora} pointerEvents="none">
      <Animated.View
        style={[
          styles.blob,
          { top: -110, left: -90, backgroundColor: theme.colors.primary, opacity: blobOpacity },
          float(drift1, 34, 46, 1.18),
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          { top: 210, right: -120, backgroundColor: theme.colors.secondary, opacity: blobOpacity },
          float(drift2, -40, 60, 1.12),
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          { bottom: -140, left: -50, backgroundColor: theme.colors.accent, opacity: blobOpacity * 0.9 },
          float(drift3, 46, -52, 1.2),
        ]}
      />
    </View>
  );
};

/** Translucent glass panel with a neon edge. */
export const GlassCard = ({
  children,
  style,
  borderColor,
  tint,
  glowStrength = 0,
  radius,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  tint?: string;
  glowStrength?: number;
  radius?: number;
}) => {
  const { theme, isDark } = useAppTheme();
  const edge = borderColor || theme.colors.border;
  const corner = radius ?? theme.borderRadius.xl;

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.glass.panel,
          borderWidth: 1.5,
          borderColor: edge,
          borderRadius: corner,
          overflow: 'hidden',
        },
        glowStrength > 0 ? glow(edge, isDark, glowStrength) : theme.elevation.sm,
        style,
      ]}
    >
      <GlassFinish tint={tint} radius={corner - 3} />
      {children}
    </View>
  );
};

/** Press feedback wrapper — springs down on press, springs back on release. */
export const PressableScale = ({
  onPress,
  children,
  style,
  label,
  disabled = false,
  scaleTo = 0.96,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  label?: string;
  disabled?: boolean;
  scaleTo?: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableWithoutFeedback
        onPress={onPress}
        onPressIn={() => spring(scaleTo)}
        onPressOut={() => spring(1)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View>{children}</View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

/** Sun/moon switch that spins while the palette swaps. */
export const ModeToggle = () => {
  const { theme, isDark, toggle } = useAppTheme();
  const spin = useRef(new Animated.Value(0)).current;

  const onPress = () => {
    Animated.timing(spin, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => spin.setValue(0));
    toggle();
  };

  return (
    <PressableScale onPress={onPress} label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <Animated.View
        style={[
          styles.modeToggle,
          {
            backgroundColor: theme.colors.glass.medium,
            borderColor: isDark ? theme.colors.secondary + '66' : theme.colors.primary + '55',
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
            ],
          },
          glow(isDark ? theme.colors.secondary : theme.colors.primary, isDark, 0.6),
        ]}
      >
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={18}
          color={isDark ? theme.colors.secondary : theme.colors.primary}
        />
      </Animated.View>
    </PressableScale>
  );
};

/** A saved / browsable rizz line with copy + favorite actions. */
export const LineCard = ({ line, index = 0 }: { line: RizzLine; index?: number }) => {
  const { theme, isDark } = useAppTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { registerCopy } = useScore();
  const category = getCategory(line.categoryId);
  const accent = category?.accent || theme.colors.primary;
  const saved = isFavorite(line.id);

  const [copied, setCopied] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index, 8) * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [enter, index]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(line.text);
    } catch {
      return;
    }
    registerCopy();
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        ],
      }}
    >
      <GlassCard
        borderColor={accent + '4D'}
        tint={accent}
        style={styles.lineCard}
        glowStrength={0.75}
      >
        <View style={styles.lineHeader}>
          <View style={[styles.badge, { backgroundColor: accent + '1F', borderColor: accent + '4D' }]}>
            <Text style={styles.badgeEmoji}>{category?.emoji || '✨'}</Text>
            <Text style={[styles.badgeText, { color: accent }, neonText(accent, isDark, 8)]}>
              {category?.name || 'Rizz'}
            </Text>
          </View>
          <PressableScale
            onPress={() => toggleFavorite(line.id)}
            label={saved ? 'Remove from favorites' : 'Save to favorites'}
          >
            <View
              style={[
                styles.iconButton,
                {
                  backgroundColor: saved ? accent + '26' : theme.colors.glass.light,
                  borderColor: saved ? accent + '66' : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={18}
                color={saved ? accent : theme.colors.textSecondary}
              />
            </View>
          </PressableScale>
        </View>

        <Text style={[styles.lineText, { color: theme.colors.text }]}>{line.text}</Text>

        <View style={styles.lineFooter}>
          <PressableScale onPress={handleCopy} label="Copy line">
            <View
              style={[
                styles.copyButton,
                {
                  backgroundColor: copied ? theme.colors.success + '26' : theme.colors.glass.light,
                  borderColor: copied ? theme.colors.success + '66' : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={15}
                color={copied ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.copyLabel,
                  { color: copied ? theme.colors.success : theme.colors.textSecondary },
                ]}
              >
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </View>
          </PressableScale>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  aurora: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  innerRim: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    borderRadius: 1,
  },
  modeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineCard: {
    padding: 16,
    marginBottom: 12,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 13,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  lineFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
  },
  copyLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
