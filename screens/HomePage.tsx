import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  AuroraBackground,
  GlassFinish,
  ModeToggle,
  PressableScale,
  glow,
  neonText,
} from '../components/NeonUI';
import { useAppTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useScore } from '../contexts/ScoreContext';
import {
  ALL_CATEGORY_ID,
  CATEGORIES,
  RIZZ_LINES,
  RizzLine,
  getCategory,
  linesForCategory,
} from '../data/rizzLines';

const CategoryChip = ({
  label,
  emoji,
  accent,
  active,
  onPress,
}: {
  label: string;
  emoji: string;
  accent: string;
  active: boolean;
  onPress: () => void;
}) => {
  const { theme, isDark } = useAppTheme();

  return (
    <PressableScale onPress={onPress} label={label} scaleTo={0.94} style={styles.chipSlot}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? accent : theme.colors.glass.panel,
            borderColor: active ? accent : theme.colors.border,
          },
          active ? glow(accent, isDark, 0.9) : null,
        ]}
      >
        <GlassFinish tint={active ? accent : undefined} radius={16} />
        <Text style={styles.chipEmoji}>{emoji}</Text>
        <Text
          numberOfLines={1}
          style={[
            styles.chipLabel,
            { color: active ? theme.colors.black : theme.colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
};

const StatPill = ({ icon, value, label }: { icon: any; value: string; label: string }) => {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.statPill,
        { backgroundColor: theme.colors.glass.panel, borderColor: theme.colors.border },
      ]}
    >
      <Ionicons name={icon} size={14} color={theme.colors.primary} />
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const HomePage = () => {
  const { theme, isDark } = useAppTheme();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { registerGenerate, registerCopy } = useScore();

  const [categoryId, setCategoryId] = useState(ALL_CATEGORY_ID);
  const [current, setCurrent] = useState<RizzLine>(RIZZ_LINES[0]);
  const [shuffling, setShuffling] = useState(false);
  const [copied, setCopied] = useState(false);

  const intro = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const shuffleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = useMemo(() => linesForCategory(categoryId), [categoryId]);
  const category = getCategory(current.categoryId);
  const accent = category?.accent || theme.colors.primary;
  const saved = isFavorite(current.id);

  useEffect(() => {
    const entrance = Animated.timing(intro, {
      toValue: 1,
      duration: 950,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    entrance.start();
    pulse.start();

    return () => {
      entrance.stop();
      pulse.stop();
      if (shuffleTimer.current) clearInterval(shuffleTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [intro, halo]);

  // Switching vibe jumps straight to a line from that vibe.
  useEffect(() => {
    const options = linesForCategory(categoryId);
    setCurrent(options[Math.floor(Math.random() * options.length)] || RIZZ_LINES[0]);
  }, [categoryId]);

  const handleGenerate = () => {
    if (shuffling) return;
    registerGenerate();
    const options = pool.length ? pool : RIZZ_LINES;
    setShuffling(true);
    let ticks = 0;
    if (shuffleTimer.current) clearInterval(shuffleTimer.current);
    shuffleTimer.current = setInterval(() => {
      setCurrent(options[Math.floor(Math.random() * options.length)]);
      ticks += 1;
      if (ticks >= 9) {
        if (shuffleTimer.current) {
          clearInterval(shuffleTimer.current);
          shuffleTimer.current = null;
        }
        setShuffling(false);
      }
    }, 70);
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(current.text);
    } catch {
      return;
    }
    registerCopy();
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: current.text });
    } catch {
      // user dismissed the sheet
    }
  };

  const fadeIn = (from: number, to: number) =>
    intro.interpolate({ inputRange: [from, to], outputRange: [0, 1] });
  const riseIn = (from: number, to: number, distance: number) =>
    intro.interpolate({ inputRange: [from, to], outputRange: [distance, 0] });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <AuroraBackground />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeIn(0, 0.3), transform: [{ translateY: riseIn(0, 0.3, -14) }] },
            ]}
          >
            <View style={styles.headerText}>
              <Text style={[styles.brand, {
  color: theme.colors.text
}, neonText(theme.colors.primary, isDark, 20), {
  padding: 14
}, {
  padding: 5,
  fontSize: 44
}, {
  fontSize: 30
}]}>
                RizzUp
              </Text>
              <Text style={[styles.brandSub, {
  color: theme.colors.textSecondary
}, {
  fontSize: 16,
  padding: 0,
  borderRadius: 0
}]}>
                Your wingman, upgraded.
              </Text>
            </View>
            <ModeToggle />
          </Animated.View>

          <Animated.View style={{ opacity: fadeIn(0.1, 0.45) }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipScroll, {
  padding: 7,
  borderRadius: 0
}]} contentContainerStyle={styles.chipRow}>
              <CategoryChip
                label="All"
                emoji="✨"
                accent={theme.colors.primary}
                active={categoryId === ALL_CATEGORY_ID}
                onPress={() => setCategoryId(ALL_CATEGORY_ID)}
              />
              {CATEGORIES.map((item) => (
                <CategoryChip
                  key={item.id}
                  label={item.name}
                  emoji={item.emoji}
                  accent={item.accent}
                  active={categoryId === item.id}
                  onPress={() => setCategoryId(item.id)}
                />
              ))}
            </ScrollView>
          </Animated.View>

          <Animated.View
            style={[
              styles.cardWrap,
              { opacity: fadeIn(0.2, 0.65), transform: [{ translateY: riseIn(0.2, 0.65, 26) }] },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                {
                  backgroundColor: accent,
                  opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.4] }),
                },
              ]}
            />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.colors.glass.panel, borderColor: accent + '66' },
                glow(accent, isDark, 1.15),
              ]}
            >
              <GlassFinish tint={accent} radius={25} />

              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.cardBadge,
                    { backgroundColor: accent + '1F', borderColor: accent + '4D' },
                  ]}
                >
                  <Text style={styles.cardBadgeEmoji}>{category?.emoji || '✨'}</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cardBadgeText,
                      { color: accent },
                      neonText(accent, isDark, 10),
                    ]}
                  >
                    {(category?.name || 'Rizz').toUpperCase()}
                  </Text>
                </View>
                <PressableScale
                  onPress={() => toggleFavorite(current.id)}
                  label={saved ? 'Remove from favorites' : 'Save to favorites'}
                >
                  <View
                    style={[
                      styles.heartButton,
                      {
                        backgroundColor: saved ? accent + '26' : theme.colors.glass.light,
                        borderColor: saved ? accent + '66' : theme.colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={saved ? 'heart' : 'heart-outline'}
                      size={20}
                      color={saved ? accent : theme.colors.textMuted}
                    />
                  </View>
                </PressableScale>
              </View>

              <View style={styles.lineWrap}>
                <Text style={[styles.quoteMark, { color: accent }]}>"</Text>
                <Text style={[styles.lineText, { color: theme.colors.text }]}>{current.text}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

              <View style={styles.cardActions}>
                <PressableScale onPress={handleCopy} style={styles.actionSlot} label="Copy line">
                  <View
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: copied
                          ? theme.colors.success + '26'
                          : theme.colors.glass.medium,
                        borderColor: copied ? theme.colors.success + '66' : theme.colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={copied ? 'checkmark-circle' : 'copy-outline'}
                      size={17}
                      color={copied ? theme.colors.success : theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.actionLabel,
                        { color: copied ? theme.colors.success : theme.colors.text },
                      ]}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Text>
                  </View>
                </PressableScale>

                <PressableScale onPress={handleShare} style={styles.actionSlot} label="Share line">
                  <View
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: theme.colors.glass.medium,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Ionicons name="share-social-outline" size={17} color={theme.colors.text} />
                    <Text style={[styles.actionLabel, { color: theme.colors.text }]}>Share</Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.ctaWrap,
              { opacity: fadeIn(0.45, 0.95), transform: [{ translateY: riseIn(0.45, 0.95, 20) }] },
            ]}
          >
            <PressableScale onPress={handleGenerate} label="Generate a new rizz line" scaleTo={0.97}>
              <View
                style={[
                  styles.cta,
                  { backgroundColor: theme.colors.primary, borderColor: theme.colors.secondary + '80' },
                  glow(theme.colors.primary, isDark, 1.4),
                ]}
              >
                <GlassFinish tint={theme.colors.white} radius={19} rim={false} />
                <Ionicons
                  name={shuffling ? 'sync' : 'sparkles'}
                  size={20}
                  color={theme.colors.white}
                />
                <Text
                  style={[
                    styles.ctaLabel,
                    { color: theme.colors.white },
                    neonText(theme.colors.white, isDark, 12),
                  ]}
                >
                  {shuffling ? 'Working it...' : 'Generate Rizz'}
                </Text>
              </View>
            </PressableScale>
          </Animated.View>

          <Animated.View style={[styles.statsRow, { opacity: fadeIn(0.6, 1) }]}>
            <StatPill icon="albums-outline" value={`${RIZZ_LINES.length}`} label="lines" />
            <StatPill icon="grid-outline" value={`${CATEGORIES.length}`} label="vibes" />
            <StatPill icon="heart" value={`${favorites.length}`} label="saved" />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  chipScroll: {
    flexGrow: 0,
    height: 64,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    alignItems: 'center',
    gap: 10,
  },
  chipSlot: {
    flexShrink: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardWrap: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  halo: {
    position: 'absolute',
    top: 19,
    left: 17,
    right: 17,
    bottom: -3,
    borderRadius: 30,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 22,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 6,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: 1,
  },
  cardBadgeEmoji: {
    fontSize: 13,
  },
  cardBadgeText: {
    flexShrink: 1,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineWrap: {
    minHeight: 168,
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 18,
  },
  quoteMark: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 44,
    opacity: 0.5,
    marginBottom: -6,
  },
  lineText: {
    fontSize: 21,
    lineHeight: 31,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionSlot: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ctaWrap: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HomePage;
