import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuroraBackground, LineCard, ModeToggle, PressableScale, glow } from '../components/NeonUI';
import { useAppTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { getLine } from '../data/rizzLines';

const EmptyFavorites = ({ onBrowse }: { onBrowse: () => void }) => {
  const { theme, isDark } = useAppTheme();
  const beat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(beat, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [beat]);

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.emptyRing,
            {
              borderColor: theme.colors.primary,
              opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
              transform: [
                { scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: theme.colors.glass.light, borderColor: theme.colors.border },
            glow(theme.colors.primary, isDark, 1.1),
          ]}
        >
          <Ionicons name="heart-outline" size={38} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No saved rizz yet</Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        Tap the heart on any line and it lands right here, ready for the moment you need it.
      </Text>

      <PressableScale onPress={onBrowse} label="Browse categories" scaleTo={0.96}>
        <View
          style={[
            styles.emptyButton,
            { backgroundColor: theme.colors.primary },
            glow(theme.colors.primary, isDark, 1.3),
          ]}
        >
          <Ionicons name="grid-outline" size={18} color={theme.colors.white} />
          <Text style={[styles.emptyButtonLabel, { color: theme.colors.white }]}>
            Browse categories
          </Text>
        </View>
      </PressableScale>
    </View>
  );
};

const FavoritesPage = ({ navigation }: any) => {
  const { theme, isDark } = useAppTheme();
  const { favorites, clearFavorites, hydrated } = useFavorites();

  const intro = useRef(new Animated.Value(0)).current;

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

  const savedLines = favorites
    .map((id) => getLine(id))
    .filter((line): line is NonNullable<ReturnType<typeof getLine>> => Boolean(line));

  const confirmClear = () => {
    Alert.alert(
      'Clear all saved lines?',
      'Every line will be removed from your favorites.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: clearFavorites },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <AuroraBackground />

      <SafeAreaView style={styles.safe} edges={['top']}>
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
            <Text style={[styles.title, { color: theme.colors.text }]}>Saved</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {favorites.length === 1 ? '1 line in your pocket' : `${favorites.length} lines in your pocket`}
            </Text>
          </View>
          {favorites.length > 0 && (
            <PressableScale onPress={confirmClear} label="Clear all favorites">
              <View
                style={[
                  styles.clearButton,
                  { backgroundColor: theme.colors.glass.light, borderColor: theme.colors.border },
                ]}
              >
                <Ionicons name="trash-outline" size={17} color={theme.colors.textSecondary} />
              </View>
            </PressableScale>
          )}
          <ModeToggle />
        </Animated.View>

        {!hydrated ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
              Loading your lines...
            </Text>
          </View>
        ) : (
          <FlatList
            data={savedLines}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <LineCard line={item} index={index} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              savedLines.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={
              <EmptyFavorites onBrowse={() => navigation?.navigate?.('Vibes')} />
            }
          />
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
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
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  emptyIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 26,
    maxWidth: 300,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 54,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  emptyButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default FavoritesPage;
