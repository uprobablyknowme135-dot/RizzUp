import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  AuroraBackground,
  GlassCard,
  GlassFinish,
  ModeToggle,
  glow,
  neonText,
} from '../components/NeonUI';
import { useAppTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useScore } from '../contexts/ScoreContext';

const GAUGE_SIZE = 216;
const GAUGE_THICKNESS = 16;

// Sample global board — the real one needs a backend.
const LEADERBOARD = [
  { name: 'VelvetTongue', score: 96 },
  { name: 'NeoRizzler', score: 91 },
  { name: 'MidnightMuse', score: 84 },
  { name: 'CharmZilla', score: 77 },
  { name: 'SmoothSensei', score: 69 },
  { name: 'PixelPoet', score: 61 },
  { name: 'LunaLush', score: 52 },
  { name: 'RizzWizard', score: 43 },
  { name: 'QuietStorm', score: 34 },
];

const MEDALS = ['#FFD75E', '#D8DCE6', '#E0955A'];

const getTier = (score: number, colors: any) => {
  if (score >= 90) return { label: 'Certified Menace', color: colors.warning };
  if (score >= 70) return { label: 'Rizz Lord', color: colors.accent };
  if (score >= 45) return { label: 'Smooth Operator', color: colors.primary };
  if (score >= 20) return { label: 'Rising Rizzler', color: colors.secondary };
  return { label: 'Rookie', color: colors.info };
};

/**
 * Neon circular gauge, drawn with two clipped half-rings: each half is a ring
 * whose top+right borders are lit, rotated and masked by its half of the
 * circle. Only RN views — no drawing library needed.
 */
const ScoreGauge = ({
  score,
  accent,
  trackColor,
}: {
  score: number;
  accent: string;
  trackColor: string;
}) => {
  const { theme, isDark } = useAppTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const listener = anim.addListener(({ value }) => setShown(Math.round(value * 100)));
    const run = Animated.timing(anim, {
      toValue: score / 100,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    return () => {
      run.stop();
      anim.removeListener(listener);
    };
  }, [anim, score]);

  const rightRotate = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-135deg', '45deg', '45deg'],
  });
  const leftRotate = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-135deg', '45deg', '225deg'],
  });
  const leftOpacity = anim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <View style={styles.gaugeWrap}>
      <View
        pointerEvents="none"
        style={[styles.gaugeHalo, { backgroundColor: accent }, glow(accent, isDark, 1.35)]}
      />
      <View style={styles.gauge}>
        <View style={[styles.gaugeRing, { borderColor: trackColor }]} />
        <View style={styles.clipRight}>
          <Animated.View
            style={[
              styles.gaugeRing,
              styles.arcRight,
              {
                borderTopColor: accent,
                borderRightColor: accent,
                transform: [{ rotate: rightRotate }],
              },
            ]}
          />
        </View>
        <View style={styles.clipLeft}>
          <Animated.View
            style={[
              styles.gaugeRing,
              {
                borderTopColor: accent,
                borderRightColor: accent,
                opacity: leftOpacity,
                transform: [{ rotate: leftRotate }],
              },
            ]}
          />
        </View>
        <View style={styles.gaugeCenter}>
          <Text
            style={[
              styles.gaugeScore,
              { color: theme.colors.text },
              neonText(accent, isDark, 18),
            ]}
          >
            {shown}
          </Text>
          <Text style={[styles.gaugeLabel, { color: theme.colors.textMuted }]}>RIZZ SCORE</Text>
        </View>
      </View>
    </View>
  );
};

const BadgeCard = ({
  title,
  desc,
  icon,
  accent,
  value,
  goal,
}: {
  title: string;
  desc: string;
  icon: any;
  accent: string;
  value: number;
  goal: number;
}) => {
  const { theme, isDark } = useAppTheme();
  const unlocked = value >= goal;
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const edge = unlocked ? accent : theme.colors.border;

  return (
    <View
      style={[
        styles.badgeCard,
        { backgroundColor: theme.colors.glass.panel, borderColor: edge },
        unlocked ? glow(accent, isDark, 0.7) : null,
      ]}
    >
      <GlassFinish tint={unlocked ? accent : undefined} radius={19} />
      <View
        style={[
          styles.badgeIcon,
          {
            backgroundColor: unlocked ? accent + '26' : theme.colors.glass.light,
            borderColor: edge,
          },
        ]}
      >
        <Ionicons
          name={unlocked ? icon : 'lock-closed'}
          size={20}
          color={unlocked ? accent : theme.colors.textMuted}
        />
      </View>
      <Text style={[styles.badgeTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.badgeDesc, { color: theme.colors.textMuted }]} numberOfLines={2}>
        {desc}
      </Text>
      <View style={[styles.badgeTrack, { backgroundColor: theme.colors.glass.light }]}>
        <View
          style={[
            styles.badgeFill,
            {
              width: `${pct}%`,
              backgroundColor: unlocked ? accent : theme.colors.disabled,
            },
          ]}
        />
      </View>
      <Text style={[styles.badgeProgress, { color: unlocked ? accent : theme.colors.textMuted }]}>
        {unlocked ? 'Unlocked' : `${Math.min(value, goal)}/${goal}`}
      </Text>
    </View>
  );
};

const RizzScorePage = () => {
  const { theme, isDark } = useAppTheme();
  const { favorites } = useFavorites();
  const { generated, copied, streak, bestStreak } = useScore();

  const score = Math.min(
    100,
    generated * 3 + copied * 5 + streak * 2 + favorites.length * 2
  );
  const tier = getTier(score, theme.colors);
  const accent = tier.color;

  const badges = useMemo(
    () => [
      {
        id: 'first',
        title: 'First Rizz',
        desc: 'Generate your first line',
        icon: 'sparkles',
        accent: theme.colors.primary,
        value: generated,
        goal: 1,
      },
      {
        id: 'copy',
        title: 'Copy Cat',
        desc: 'Copy 5 lines to the clipboard',
        icon: 'copy',
        accent: theme.colors.secondary,
        value: copied,
        goal: 5,
      },
      {
        id: 'smooth',
        title: 'Smooth Criminal',
        desc: 'Copy 15 lines like a pro',
        icon: 'glasses',
        accent: theme.colors.accent,
        value: copied,
        goal: 15,
      },
      {
        id: 'week',
        title: '7-Day Streak',
        desc: 'Rizz seven days in a row',
        icon: 'flame',
        accent: theme.colors.warning,
        value: streak,
        goal: 7,
      },
      {
        id: 'fifty',
        title: 'Half Century',
        desc: 'Push your score to 50',
        icon: 'trophy',
        accent: theme.colors.primaryLight,
        value: score,
        goal: 50,
      },
      {
        id: 'menace',
        title: 'Certified Menace',
        desc: 'Push your score to 90',
        icon: 'diamond',
        accent: theme.colors.accent,
        value: score,
        goal: 90,
      },
    ],
    [theme, generated, copied, streak, score]
  );

  const unlockedCount = badges.filter((badge) => badge.value >= badge.goal).length;

  const board = useMemo(() => {
    const rows = [
      ...LEADERBOARD.map((row) => ({ ...row, me: false })),
      { name: 'You', score, me: true },
    ];
    return rows.sort((a, b) => b.score - a.score);
  }, [score]);

  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.timing(intro, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [intro]);

  const rise = (from: number, to: number, distance: number) =>
    intro.interpolate({ inputRange: [from, to], outputRange: [distance, 0] });

  const streakDots = [0, 1, 2, 3, 4, 5, 6];

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
              { opacity: intro.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1] }) },
            ]}
          >
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.brand,
                  { color: theme.colors.text },
                  neonText(theme.colors.primary, isDark, 20),
                ]}
              >
                Rizz Score
              </Text>
              <Text style={[styles.brandSub, { color: theme.colors.textSecondary }]}>
                Your rizz, quantified.
              </Text>
            </View>
            <ModeToggle />
          </Animated.View>

          <Animated.View
            style={[
              styles.gaugeCardWrap,
              { opacity: intro.interpolate({ inputRange: [0.1, 0.5], outputRange: [0, 1] }) },
            ]}
          >
            <GlassCard borderColor={accent + '66'} tint={accent} glowStrength={1.1} radius={28}>
              <View style={styles.gaugeCardInner}>
                <ScoreGauge
                  score={score}
                  accent={accent}
                  trackColor={theme.colors.glass.medium}
                />
                <View
                  style={[
                    styles.tierPill,
                    { backgroundColor: accent + '1F', borderColor: accent + '4D' },
                  ]}
                >
                  <Ionicons name="ribbon" size={14} color={accent} />
                  <Text style={[styles.tierText, { color: accent }, neonText(accent, isDark, 10)]}>
                    {tier.label.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.tierHint, { color: theme.colors.textSecondary }]}>
                  {score >= 100
                    ? 'Maxed out. You are the rizz.'
                    : 'Generate and copy lines to push it higher.'}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View
            style={[
              styles.section,
              {
                opacity: intro.interpolate({ inputRange: [0.25, 0.65], outputRange: [0, 1] }),
                transform: [{ translateY: rise(0.25, 0.65, 22) }],
              },
            ]}
          >
            <GlassCard borderColor={theme.colors.warning + '4D'} tint={theme.colors.warning}>
              <View style={styles.streakInner}>
                <View
                  style={[
                    styles.streakIcon,
                    {
                      backgroundColor: theme.colors.warning + '26',
                      borderColor: theme.colors.warning + '66',
                    },
                    glow(theme.colors.warning, isDark, 0.7),
                  ]}
                >
                  <Ionicons name="flame" size={24} color={theme.colors.warning} />
                </View>
                <View style={styles.streakBody}>
                  <Text style={[styles.streakValue, { color: theme.colors.text }]}>
                    {streak} {streak === 1 ? 'day' : 'days'}
                  </Text>
                  <Text style={[styles.streakLabel, { color: theme.colors.textSecondary }]}>
                    {streak > 0
                      ? `Current streak · best ${bestStreak}`
                      : 'Generate a line today to start your streak'}
                  </Text>
                  <View style={styles.streakDots}>
                    {streakDots.map((dot) => (
                      <View
                        key={dot}
                        style={[
                          styles.streakDot,
                          {
                            backgroundColor:
                              dot < Math.min(streak, 7)
                                ? theme.colors.warning
                                : theme.colors.glass.light,
                            borderColor:
                              dot < Math.min(streak, 7)
                                ? theme.colors.warning
                                : theme.colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View
            style={[
              styles.statsRow,
              { opacity: intro.interpolate({ inputRange: [0.35, 0.75], outputRange: [0, 1] }) },
            ]}
          >
            {[
              { icon: 'sparkles', value: `${generated}`, label: 'generated' },
              { icon: 'copy-outline', value: `${copied}`, label: 'copied' },
              { icon: 'medal-outline', value: `${unlockedCount}/${badges.length}`, label: 'badges' },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.statPill,
                  { backgroundColor: theme.colors.glass.panel, borderColor: theme.colors.border },
                ]}
              >
                <Ionicons name={stat.icon as any} size={13} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View
            style={[
              styles.section,
              {
                opacity: intro.interpolate({ inputRange: [0.45, 0.85], outputRange: [0, 1] }),
                transform: [{ translateY: rise(0.45, 0.85, 20) }],
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Achievements</Text>
            <View style={styles.badgeGrid}>
              {badges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  title={badge.title}
                  desc={badge.desc}
                  icon={badge.icon}
                  accent={badge.accent}
                  value={badge.value}
                  goal={badge.goal}
                />
              ))}
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.section,
              {
                opacity: intro.interpolate({ inputRange: [0.55, 1], outputRange: [0, 1] }),
                transform: [{ translateY: rise(0.55, 1, 20) }],
              },
            ]}
          >
            <View style={styles.boardHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Global Leaderboard
              </Text>
              <View
                style={[
                  styles.boardPill,
                  { backgroundColor: theme.colors.glass.light, borderColor: theme.colors.border },
                ]}
              >
                <Ionicons name="earth" size={12} color={theme.colors.secondary} />
                <Text style={[styles.boardPillText, { color: theme.colors.textSecondary }]}>
                  Top 10
                </Text>
              </View>
            </View>

            <GlassCard borderColor={theme.colors.border}>
              <View style={styles.boardList}>
                {board.map((row, index) => {
                  const rank = index + 1;
                  const medal = rank <= 3 ? MEDALS[rank - 1] : null;
                  return (
                    <View
                      key={`${row.name}-${rank}`}
                      style={[
                        styles.boardRow,
                        index < board.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.divider,
                        },
                        row.me
                          ? {
                              backgroundColor: theme.colors.primary + '1A',
                              borderRadius: theme.borderRadius.md,
                            }
                          : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.rankBadge,
                          {
                            backgroundColor: medal ? medal + '26' : theme.colors.glass.light,
                            borderColor: medal || theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankText,
                            { color: medal || theme.colors.textSecondary },
                            medal ? neonText(medal, isDark, 8) : null,
                          ]}
                        >
                          {rank}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.boardName,
                          {
                            color: row.me ? theme.colors.primary : theme.colors.text,
                            fontWeight: row.me ? '800' : '600',
                          },
                        ]}
                      >
                        {row.name}
                      </Text>
                      {row.me ? (
                        <View
                          style={[
                            styles.youPill,
                            {
                              backgroundColor: theme.colors.primary + '26',
                              borderColor: theme.colors.primary + '66',
                            },
                          ]}
                        >
                          <Text style={[styles.youText, { color: theme.colors.primary }]}>
                            YOU
                          </Text>
                        </View>
                      ) : null}
                      <Text
                        style={[
                          styles.boardScore,
                          { color: theme.colors.textSecondary },
                          row.me ? neonText(theme.colors.primary, isDark, 10) : null,
                        ]}
                      >
                        {row.score}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
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
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
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
  gaugeCardWrap: {
    paddingHorizontal: 20,
  },
  gaugeCardInner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 18,
  },
  gaugeWrap: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeHalo: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: GAUGE_SIZE / 2,
    opacity: 0.16,
  },
  gauge: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: GAUGE_SIZE / 2,
    borderWidth: GAUGE_THICKNESS,
    borderColor: 'transparent',
  },
  clipRight: {
    position: 'absolute',
    top: 0,
    left: GAUGE_SIZE / 2,
    width: GAUGE_SIZE / 2,
    height: GAUGE_SIZE,
    overflow: 'hidden',
  },
  clipLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: GAUGE_SIZE / 2,
    height: GAUGE_SIZE,
    overflow: 'hidden',
  },
  arcRight: {
    left: -GAUGE_SIZE / 2,
  },
  gaugeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScore: {
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginTop: 2,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  tierHint: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  streakInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  streakIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBody: {
    flex: 1,
  },
  streakValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  streakLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  streakDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  streakDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 8,
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
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    flexBasis: '47%',
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 14,
    overflow: 'hidden',
  },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badgeDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 3,
    minHeight: 32,
  },
  badgeTrack: {
    height: 5,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  badgeFill: {
    height: 5,
    borderRadius: 3,
  },
  badgeProgress: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 7,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 14,
  },
  boardPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  boardList: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  boardName: {
    flex: 1,
    fontSize: 14,
  },
  youPill: {
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  boardScore: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'right',
  },
});

export default RizzScorePage;
