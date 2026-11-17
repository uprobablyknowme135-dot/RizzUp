import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  AuroraBackground,
  GlassCard,
  GlassFinish,
  ModeToggle,
  PressableScale,
  glow,
  neonText,
} from '../components/NeonUI';
import { useAppTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useScore } from '../contexts/ScoreContext';
import { registerLine } from '../data/rizzLines';
import { proxyPost } from '../api-proxy';
import * as SnappKeys from '../keys';

const OPENAI_API_KEY = (SnappKeys as Record<string, string | undefined>).OPENAI_API_KEY;

const AI_CATEGORY_ID = 'ai';

const VIBES = ['Sweet', 'Sarcastic', 'Sporty', 'Artsy', 'Shy', 'Confident', 'Nerdy', 'Adventurous'];
const TONES = ['Smooth', 'Funny', 'Bold', 'Poetic', 'Wholesome'];

const SYSTEM_PROMPT =
  'You are a charismatic wingman who writes pickup lines and conversation starters. ' +
  'Reply with ONE line only, at most 22 words, no quotation marks, no emojis, no explanation. ' +
  'Keep it respectful, flattering and specific to the context you are given.';

interface GeneratedLine {
  id: string;
  text: string;
  name: string;
  vibe: string;
  tone: string;
}

const Chip = ({
  label,
  active,
  accent,
  onPress,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}) => {
  const { theme, isDark } = useAppTheme();

  return (
    <PressableScale onPress={onPress} label={label} scaleTo={0.94}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? accent : theme.colors.glass.panel,
            borderColor: active ? accent : theme.colors.border,
          },
          active ? glow(accent, isDark, 0.8) : null,
        ]}
      >
        <GlassFinish tint={active ? accent : undefined} radius={16} />
        <Text
          style={[
            styles.chipText,
            { color: active ? theme.colors.black : theme.colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
};

const LineActions = ({
  item,
  copied,
  onCopy,
}: {
  item: GeneratedLine;
  copied: boolean;
  onCopy: (item: GeneratedLine) => void;
}) => {
  const { theme } = useAppTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(item.id);

  return (
    <View style={styles.actionRow}>
      <PressableScale onPress={() => onCopy(item)} style={styles.actionSlot} label="Copy line">
        <View
          style={[
            styles.actionButton,
            {
              backgroundColor: copied ? theme.colors.success + '26' : theme.colors.glass.medium,
              borderColor: copied ? theme.colors.success + '66' : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={16}
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

      <PressableScale
        onPress={() => toggleFavorite(item.id)}
        style={styles.actionSlot}
        label={saved ? 'Remove from favorites' : 'Save to favorites'}
      >
        <View
          style={[
            styles.actionButton,
            {
              backgroundColor: saved ? theme.colors.accent + '26' : theme.colors.glass.medium,
              borderColor: saved ? theme.colors.accent + '66' : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={16}
            color={saved ? theme.colors.accent : theme.colors.text}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: saved ? theme.colors.accent : theme.colors.text },
            ]}
          >
            {saved ? 'Saved' : 'Save'}
          </Text>
        </View>
      </PressableScale>
    </View>
  );
};

const AIRizzPage = () => {
  const { theme, isDark } = useAppTheme();
  const { registerGenerate, registerCopy } = useScore();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [name, setName] = useState('');
  const [where, setWhere] = useState('');
  const [vibe, setVibe] = useState(VIBES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [result, setResult] = useState<GeneratedLine | null>(null);
  const [history, setHistory] = useState<GeneratedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const intro = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const resultY = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyMissing = !OPENAI_API_KEY;

  useEffect(() => {
    const entrance = Animated.timing(intro, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entrance.start();
    return () => {
      entrance.stop();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [intro]);

  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [loading, spin]);

  const handleGenerate = async () => {
    if (loading) return;
    if (keyMissing) {
      setError('AI Rizz is not switched on yet. Add your OpenAI API key in Settings, under Environment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const brief = [
        name.trim() ? `Their name is ${name.trim()}.` : '',
        where.trim() ? `We met at ${where.trim()}.` : '',
        vibe ? `Their personality reads as ${vibe.toLowerCase()}.` : '',
        tone ? `Tone: ${tone.toLowerCase()}.` : '',
        'Write one line I can open with.',
      ]
        .filter(Boolean)
        .join(' ');

      const data = await proxyPost<any>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          temperature: 0.9,
          max_tokens: 120,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: brief },
          ],
        },
        { Authorization: `Bearer ${OPENAI_API_KEY}` }
      );

      const text: string =
        data?.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || '';

      if (!text) {
        setError('The AI came back empty. Give it another try.');
        return;
      }

      const item: GeneratedLine = {
        id: `ai-${Date.now()}`,
        text,
        name: name.trim(),
        vibe,
        tone,
      };

      registerLine({ id: item.id, categoryId: AI_CATEGORY_ID, text });
      setResult(item);
      setHistory((prev) => [item, ...prev.filter((row) => row.text !== text)].slice(0, 12));
      registerGenerate();
      scrollRef.current?.scrollTo({ y: Math.max(0, resultY.current - 12), animated: true });
    } catch {
      setError('Could not reach the AI just now. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (item: GeneratedLine) => {
    try {
      await Clipboard.setStringAsync(item.text);
    } catch {
      return;
    }
    registerCopy();
    setCopiedId(item.id);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 1500);
  };

  const accent = theme.colors.primary;
  const rise = intro.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <AuroraBackground />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={[styles.header, { opacity: intro, transform: [{ translateY: rise }] }]}
          >
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  { color: theme.colors.text },
                  neonText(theme.colors.secondary, isDark, 20),
                ]}
              >
                AI Rizz
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Tell me about them. I will write the line.
              </Text>
            </View>
            <ModeToggle />
          </Animated.View>

          {keyMissing ? (
            <View style={styles.noticeWrap}>
              <GlassCard borderColor={theme.colors.warning + '66'} tint={theme.colors.warning}>
                <View style={styles.noticeInner}>
                  <Ionicons name="key-outline" size={20} color={theme.colors.warning} />
                  <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
                    Add your OpenAI API key in Settings, under Environment, to switch the generator
                    on. Everything else on this screen is ready.
                  </Text>
                </View>
              </GlassCard>
            </View>
          ) : null}

          <Animated.View style={[styles.formWrap, { opacity: intro }]}>
            <GlassCard borderColor={theme.colors.border}>
              <View style={styles.formInner}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Their name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Optional"
                  placeholderTextColor={theme.colors.placeholder}
                  autoCapitalize="words"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.glass.light,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                />

                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Where you met
                </Text>
                <TextInput
                  value={where}
                  onChangeText={setWhere}
                  placeholder="Coffee shop, gym, a party..."
                  placeholderTextColor={theme.colors.placeholder}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.glass.light,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                />

                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Their vibe
                </Text>
                <View style={styles.chipRow}>
                  {VIBES.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      accent={theme.colors.secondary}
                      active={vibe === option}
                      onPress={() => setVibe(option)}
                    />
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Tone
                </Text>
                <View style={styles.chipRow}>
                  {TONES.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      accent={accent}
                      active={tone === option}
                      onPress={() => setTone(option)}
                    />
                  ))}
                </View>

                <PressableScale
                  onPress={handleGenerate}
                  label="Generate an AI rizz line"
                  scaleTo={0.97}
                  style={styles.ctaSlot}
                >
                  <View
                    style={[
                      styles.cta,
                      {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.secondary + '80',
                        opacity: loading ? 0.75 : 1,
                      },
                      glow(theme.colors.primary, isDark, 1.4),
                    ]}
                  >
                    <GlassFinish tint={theme.colors.white} radius={19} rim={false} />
                    <Ionicons
                      name={loading ? 'sync' : 'color-wand'}
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
                      {loading ? 'Writing it...' : 'Generate'}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            </GlassCard>
          </Animated.View>

          <View
            style={styles.resultWrap}
            onLayout={(event) => {
              resultY.current = event.nativeEvent.layout.y;
            }}
          >
            {loading ? (
              <GlassCard borderColor={accent + '4D'} tint={accent}>
                <View style={styles.loadingInner}>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: spin.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons name="sparkles" size={26} color={accent} />
                  </Animated.View>
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    Reading the room...
                  </Text>
                </View>
              </GlassCard>
            ) : error ? (
              <GlassCard borderColor={theme.colors.error + '66'} tint={theme.colors.error}>
                <View style={styles.noticeInner}>
                  <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
                  <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
                    {error}
                  </Text>
                </View>
              </GlassCard>
            ) : result ? (
              <GlassCard
                borderColor={accent + '66'}
                tint={accent}
                glowStrength={1.15}
                radius={26}
              >
                <View style={styles.resultInner}>
                  <View
                    style={[
                      styles.resultBadge,
                      { backgroundColor: accent + '1F', borderColor: accent + '4D' },
                    ]}
                  >
                    <Ionicons name="color-wand" size={13} color={accent} />
                    <Text
                      style={[
                        styles.resultBadgeText,
                        { color: accent },
                        neonText(accent, isDark, 10),
                      ]}
                    >
                      {`${result.tone.toUpperCase()} · ${result.vibe.toUpperCase()}`}
                    </Text>
                  </View>

                  <Text style={[styles.resultText, { color: theme.colors.text }]}>
                    {result.text}
                  </Text>

                  {result.name ? (
                    <Text style={[styles.resultMeta, { color: theme.colors.textMuted }]}>
                      {`For ${result.name}`}
                    </Text>
                  ) : null}

                  <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                  <LineActions item={result} copied={copiedId === result.id} onCopy={handleCopy} />
                </View>
              </GlassCard>
            ) : (
              <GlassCard borderColor={theme.colors.border}>
                <View style={styles.noticeInner}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={accent} />
                  <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
                    Fill in what you know about them, pick a tone, and your custom line lands right
                    here.
                  </Text>
                </View>
              </GlassCard>
            )}
          </View>

          <View style={styles.historyWrap}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Recent generations
              </Text>
              {history.length > 0 ? (
                <PressableScale onPress={() => setHistory([])} label="Clear history">
                  <View
                    style={[
                      styles.clearButton,
                      {
                        backgroundColor: theme.colors.glass.light,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={15} color={theme.colors.textSecondary} />
                  </View>
                </PressableScale>
              ) : null}
            </View>

            {history.length === 0 ? (
              <View
                style={[
                  styles.emptyHistory,
                  {
                    backgroundColor: theme.colors.glass.panel,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
                <Text style={[styles.emptyHistoryText, { color: theme.colors.textMuted }]}>
                  Nothing yet. Your generated lines collect here for the session.
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor: theme.colors.glass.panel,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <GlassFinish radius={19} />
                  <Text style={[styles.historyText, { color: theme.colors.text }]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.historyMeta, { color: theme.colors.textMuted }]}>
                    {[item.name ? `For ${item.name}` : '', item.tone, item.vibe]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  <View style={styles.historyActions}>
                    <PressableScale
                      onPress={() => handleCopy(item)}
                      label="Copy line"
                      scaleTo={0.94}
                    >
                      <View
                        style={[
                          styles.iconButton,
                          {
                            backgroundColor:
                              copiedId === item.id
                                ? theme.colors.success + '26'
                                : theme.colors.glass.light,
                            borderColor:
                              copiedId === item.id
                                ? theme.colors.success + '66'
                                : theme.colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={copiedId === item.id ? 'checkmark' : 'copy-outline'}
                          size={15}
                          color={
                            copiedId === item.id
                              ? theme.colors.success
                              : theme.colors.textSecondary
                          }
                        />
                      </View>
                    </PressableScale>
                    <PressableScale
                      onPress={() => toggleFavorite(item.id)}
                      label="Save to favorites"
                      scaleTo={0.94}
                    >
                      <View
                        style={[
                          styles.iconButton,
                          {
                            backgroundColor: isFavorite(item.id)
                              ? theme.colors.accent + '26'
                              : theme.colors.glass.light,
                            borderColor: isFavorite(item.id)
                              ? theme.colors.accent + '66'
                              : theme.colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isFavorite(item.id) ? 'heart' : 'heart-outline'}
                          size={15}
                          color={
                            isFavorite(item.id)
                              ? theme.colors.accent
                              : theme.colors.textSecondary
                          }
                        />
                      </View>
                    </PressableScale>
                  </View>
                </View>
              ))
            )}
          </View>
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
  noticeWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  noticeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  formWrap: {
    paddingHorizontal: 20,
  },
  formInner: {
    padding: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ctaSlot: {
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: 21,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  resultWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  loadingInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  resultInner: {
    padding: 20,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '100%',
    gap: 6,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  resultBadgeText: {
    flexShrink: 1,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultText: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  resultMeta: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 10,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  actionRow: {
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
  historyWrap: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyHistoryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  historyCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  historyText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  historyMeta: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 8,
  },
  historyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AIRizzPage;
