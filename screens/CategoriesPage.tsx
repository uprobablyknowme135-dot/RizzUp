import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  AuroraBackground,
  GlassFinish,
  LineCard,
  ModeToggle,
  PressableScale,
  glow,
  neonText,
} from '../components/NeonUI';
import { useAppTheme } from '../contexts/ThemeContext';
import {
  CATEGORIES,
  RIZZ_LINES,
  RizzCategory,
  getCategory,
  linesForCategory,
} from '../data/rizzLines';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72);

const CategoryTile = ({
  category,
  index,
  onPress,
}: {
  category: RizzCategory;
  index: number;
  onPress: () => void;
}) => {
  const { theme, isDark } = useAppTheme();
  const enter = useRef(new Animated.Value(0)).current;
  const count = linesForCategory(category.id).length;

  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 460,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, index]);

  return (
    <Animated.View
      style={[
        styles.tileSlot,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        },
      ]}
    >
      <PressableScale onPress={onPress} label={`${category.name}, ${count} lines`} scaleTo={0.95}>
        <View
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.glass.panel,
              borderColor: category.accent + '59',
            },
            glow(category.accent, isDark, 0.8),
          ]}
        >
          <GlassFinish tint={category.accent} radius={19} />

          <View>
            <View
              style={[
                styles.tileEmojiWrap,
                { backgroundColor: category.accent + '1F', borderColor: category.accent + '4D' },
              ]}
            >
              <Text style={styles.tileEmoji}>{category.emoji}</Text>
            </View>
            <Text style={[styles.tileName, { color: theme.colors.text }]} numberOfLines={2}>
              {category.name}
            </Text>
            <Text style={[styles.tileTagline, { color: theme.colors.textMuted }]} numberOfLines={2}>
              {category.tagline}
            </Text>
          </View>

          <View style={styles.tileFooter}>
            <Text
              style={[
                styles.tileCount,
                { color: category.accent },
                neonText(category.accent, isDark, 8),
              ]}
            >
              {count} lines
            </Text>
            <Ionicons name="arrow-forward" size={14} color={category.accent} />
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const CategoriesPage = () => {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [active, setActive] = useState<RizzCategory | null>(null);
  const [query, setQuery] = useState('');
  const intro = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const trimmedQuery = query.trim().toLowerCase();
  const results = trimmedQuery
    ? RIZZ_LINES.filter((line) => {
        const category = getCategory(line.categoryId);
        return (
          line.text.toLowerCase().includes(trimmedQuery) ||
          (category?.name.toLowerCase().includes(trimmedQuery) ?? false)
        );
      })
    : [];
  const visibleResults = results.slice(0, 60);

  useEffect(() => {
    const animation = Animated.timing(intro, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [intro]);

  const openSheet = (category: RizzCategory) => {
    setActive(category);
    sheetY.setValue(SHEET_HEIGHT);
    Animated.spring(sheetY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 6,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetY, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setActive(null));
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <AuroraBackground />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: intro,
                transform: [
                  { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  { color: theme.colors.text },
                  neonText(theme.colors.primary, isDark, 20),
                ]}
              >
                Categories
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Pick a vibe, steal a line.
              </Text>
            </View>
            <ModeToggle />
          </Animated.View>

          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.glass.light,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={17} color={theme.colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search lines or vibes"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.searchInput, { color: theme.colors.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Search rizz lines"
            />
            {query.length > 0 && (
              <PressableScale onPress={() => setQuery('')} label="Clear search">
                <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
              </PressableScale>
            )}
          </View>

          {trimmedQuery ? (
            <View style={styles.results}>
              <Text style={[styles.resultsLabel, { color: theme.colors.textMuted }]}>
                {results.length === 1 ? '1 line found' : `${results.length} lines found`}
              </Text>
              {visibleResults.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No lines found. Try another word.
                </Text>
              ) : (
                visibleResults.map((line, index) => (
                  <LineCard key={line.id} line={line} index={index} />
                ))
              )}
              {results.length > visibleResults.length && (
                <Text style={[styles.resultsLabel, { color: theme.colors.textMuted }]}>
                  Showing the first {visibleResults.length}. Keep typing to narrow it down.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.grid}>
              {CATEGORIES.map((category, index) => (
                <CategoryTile
                  key={category.id}
                  category={category}
                  index={index}
                  onPress={() => openSheet(category)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {active && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableWithoutFeedback onPress={closeSheet} accessibilityLabel="Close">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              {
                height: SHEET_HEIGHT,
                backgroundColor: theme.colors.glass.panel,
                borderColor: active.accent + '66',
                paddingBottom: insets.bottom + 16,
                transform: [{ translateY: sheetY }],
              },
              glow(active.accent, isDark, 1.1),
            ]}
          >
            <GlassFinish tint={active.accent} radius={27} rim={false} />

            <View style={[styles.sheetHandle, { backgroundColor: active.accent + '66' }]} />

            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.sheetEmojiWrap,
                  { backgroundColor: active.accent + '1F', borderColor: active.accent + '4D' },
                ]}
              >
                <Text style={styles.sheetEmoji}>{active.emoji}</Text>
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                  {active.name}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: theme.colors.textMuted }]}>
                  {linesForCategory(active.id).length} lines ready to send
                </Text>
              </View>
              <PressableScale onPress={closeSheet} label="Close">
                <View
                  style={[
                    styles.sheetClose,
                    {
                      backgroundColor: theme.colors.glass.light,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                </View>
              </PressableScale>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetList}
            >
              {linesForCategory(active.id).map((line, index) => (
                <LineCard key={line.id} line={line} index={index} />
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
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
    paddingBottom: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 20,
    marginBottom: 18,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  results: {
    paddingHorizontal: 20,
  },
  resultsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  tileSlot: {
    width: '48%',
    marginBottom: 14,
  },
  tile: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 172,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tileEmojiWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileEmoji: {
    fontSize: 22,
  },
  tileName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tileTagline: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 3,
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  tileCount: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    paddingTop: 10,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetEmoji: {
    fontSize: 23,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});

export default CategoriesPage;
