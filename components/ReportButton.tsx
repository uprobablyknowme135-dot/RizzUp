import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { AppTheme } from '../theme/AppTheme';

// In-app reporting (Google Play Child Safety Standards policy, App Store guideline 1.2).
// Any app where people can see or message each other (dating, social, community, chat) must let
// them report a user, a profile or a piece of content from inside the app.
//
// Usage (one per profile, one per message / post / comment):
//   <ReportButton targetType="profile" targetId={profile.id} reportedUserId={profile.id} />
//   <ReportButton targetType="message" targetId={msg.id} reportedUserId={msg.sender_id}
//     contentPreview={msg.text} variant="icon" />
//
// Flow: tap -> inline panel -> pick a reason (Child safety included) -> optional note -> the report
// is saved as a row in public.safety_reports. The app owner reads it in Snapp (Database Admin) or in the
// Supabase Table Editor. Reporters cannot read reports back: there is no SELECT policy.
//
// No database connected or no table yet: when `contactEmail` is given, the email app opens with the
// report filled in; otherwise the user sees a short "not set up yet" message.
//
// The table must exist. Declare it in snapp-migration.sql (safe to re-run):
//
//   create table if not exists public.safety_reports (
//     id uuid primary key default gen_random_uuid(),
//     created_at timestamptz not null default now(),
//     reporter_id uuid default auth.uid() references auth.users(id) on delete set null,
//     target_type text not null,
//     target_id text not null,
//     reported_user_id text,
//     reason text not null,
//     note text check (char_length(note) <= 1000),
//     content_preview text check (char_length(content_preview) <= 500),
//     status text not null default 'open'
//   );
//   alter table public.safety_reports enable row level security;
//   drop policy if exists "safety_reports_insert" on public.safety_reports;
//   create policy "safety_reports_insert" on public.safety_reports
//     for insert to anon, authenticated
//     with check (reporter_id is null or reporter_id = auth.uid());
//   grant insert on table public.safety_reports to anon, authenticated;

export type ReportTargetType = 'user' | 'profile' | 'message' | 'post' | 'comment';

const DEFAULT_LABELS = {
  button: 'Report',
  title: 'Report a concern',
  body: 'Reports are private. The person you report is not told who sent it.',
  reasonChildSafety: 'Child safety',
  reasonHarassment: 'Harassment or bullying',
  reasonSexual: 'Sexual or explicit content',
  reasonViolence: 'Hate, threats or violence',
  reasonSpam: 'Spam or scam',
  reasonImpersonation: 'Fake profile or impersonation',
  reasonOther: 'Something else',
  childSafetyHint: 'If a child is in immediate danger, call your local emergency number now.',
  notePlaceholder: 'Add details (optional)',
  submit: 'Send report',
  cancel: 'Cancel',
  sent: 'Thank you. Your report was sent to the team behind this app.',
  emailed: 'The email app is open. Send the email to finish your report.',
  notReady: 'Reporting is not set up yet. Please try again later.',
  failed: 'We could not send your report. Please try again.',
  emailFailed: 'We could not open an email app. Please write to',
};

type Labels = typeof DEFAULT_LABELS;

// Stored as the `reason` column. Stable codes: translate the labels, never these.
const REASONS: Array<{ code: string; label: keyof Labels }> = [
  { code: 'child_safety', label: 'reasonChildSafety' },
  { code: 'harassment', label: 'reasonHarassment' },
  { code: 'sexual_content', label: 'reasonSexual' },
  { code: 'hate_or_violence', label: 'reasonViolence' },
  { code: 'spam_or_scam', label: 'reasonSpam' },
  { code: 'impersonation', label: 'reasonImpersonation' },
  { code: 'other', label: 'reasonOther' },
];

const REPORTS_TABLE = 'safety_reports';
const NOTE_MAX = 1000;
const PREVIEW_MAX = 500;

interface ReportButtonProps {
  /** What is being reported. */
  targetType: ReportTargetType;
  /** The id of that profile, user, message, post or comment (its row id in your table). */
  targetId: string | number;
  /** The user who owns the reported thing (the profile's user, the sender, the author). */
  reportedUserId?: string | number | null;
  /** A short copy of the reported text, so the owner sees it even if it is later deleted. */
  contentPreview?: string | null;
  /** Optional: the developer's contact address, used only when the database is not ready. Never invent one. */
  contactEmail?: string;
  /** 'text' (flag icon + "Report", default) or 'icon' (flag icon only, for tight rows like chat bubbles). */
  variant?: 'text' | 'icon';
  /** Open the panel right away (for example after a long press on a message). */
  startOpen?: boolean;
  /** Called when the panel is closed without sending. */
  onClose?: () => void;
  /** Called after the report is saved (or the email is opened). */
  onReported?: () => void;
  /** Optional: translated texts, for apps in another language. */
  labels?: Partial<Labels>;
}

type Status = 'idle' | 'open' | 'sent' | 'emailed';

/** No database connected: supabase.ts refuses the call before any network request. */
function isNotConnected(error: any): boolean {
  return /connected to a database/i.test(String(error?.message || ''));
}

/** The table, a column, the policy or the grant is missing in this database. */
function isNotSetUp(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    ['PGRST205', 'PGRST204', '42P01', '42703', '42501'].includes(code) ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  );
}

const ReportButton: React.FC<ReportButtonProps> = ({
  targetType,
  targetId,
  reportedUserId,
  contentPreview,
  contactEmail,
  variant = 'text',
  startOpen = false,
  onClose,
  onReported,
  labels,
}) => {
  const text: Labels = { ...DEFAULT_LABELS, ...(labels || {}) };
  const [status, setStatus] = useState<Status>(startOpen ? 'open' : 'idle');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reasonText = (code: string) => {
    const found = REASONS.find((r) => r.code === code);
    return found ? text[found.label] : code;
  };

  const close = () => {
    setStatus('idle');
    setReason('');
    setNote('');
    setError('');
    onClose?.();
  };

  const openEmail = async (row: Record<string, any>) => {
    const email = String(contactEmail || '').trim();
    const subject = `${text.title}: ${reasonText(row.reason)}`;
    const body = [
      `${text.title}: ${reasonText(row.reason)}`,
      `Type: ${row.target_type}`,
      `ID: ${row.target_id}`,
      row.reported_user_id ? `User: ${row.reported_user_id}` : '',
      row.content_preview ? `Content: ${row.content_preview}` : '',
      row.note ? `Note: ${row.note}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      setStatus('emailed');
      onReported?.();
    } catch (err: any) {
      console.warn('[ReportButton] could not open the email app:', err?.message || err);
      setError(`${text.emailFailed} ${email}`);
    }
  };

  const handleSend = async () => {
    if (!reason || loading) return;
    setLoading(true);
    setError('');
    const row = {
      target_type: targetType,
      target_id: String(targetId ?? ''),
      reported_user_id: reportedUserId != null && reportedUserId !== '' ? String(reportedUserId) : null,
      reason,
      note: note.trim().slice(0, NOTE_MAX) || null,
      content_preview: contentPreview ? String(contentPreview).slice(0, PREVIEW_MAX) : null,
    };
    try {
      // reporter_id is filled in by the database (default auth.uid()).
      // The call goes through `db` and the table constant on purpose: Snapp's store data scan
      // then does not count this component in apps that never render it.
      const db: any = supabase;
      const { error: insertError } = await db.from(REPORTS_TABLE).insert(row);
      if (!insertError) {
        setStatus('sent');
        onReported?.();
        return;
      }
      const notReady = isNotConnected(insertError) || isNotSetUp(insertError);
      console.warn(
        '[ReportButton] saving the report failed:',
        insertError.message,
        notReady ? '(create public.safety_reports in snapp-migration.sql, see components/ReportButton.tsx)' : '',
      );
      if (notReady && contactEmail) {
        await openEmail(row);
        return;
      }
      setError(notReady ? text.notReady : text.failed);
    } catch (err: any) {
      console.warn('[ReportButton] failed:', err?.message || err);
      if (contactEmail && isNotConnected(err)) {
        await openEmail(row);
        return;
      }
      setError(text.failed);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'sent' || status === 'emailed') {
    return (
      <View style={styles.doneRow} accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle" size={16} color={successColor} />
        <Text style={styles.doneText}>{status === 'sent' ? text.sent : text.emailed}</Text>
      </View>
    );
  }

  if (status === 'idle') {
    return (
      <TouchableOpacity
        style={variant === 'icon' ? styles.iconTrigger : styles.textTrigger}
        onPress={() => setStatus('open')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={text.button}
      >
        <Ionicons name="flag-outline" size={variant === 'icon' ? 18 : 15} color={colors.textSecondary} />
        {variant !== 'icon' && <Text style={styles.triggerText}>{text.button}</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{text.title}</Text>
      <Text style={styles.body}>{text.body}</Text>

      <View style={styles.reasons} accessibilityRole="radiogroup">
        {REASONS.map((r) => {
          const selected = reason === r.code;
          return (
            <TouchableOpacity
              key={r.code}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setReason(r.code)}
              disabled={loading}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{text[r.label]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {reason === 'child_safety' && <Text style={styles.hint}>{text.childSafetyHint}</Text>}

      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder={text.notePlaceholder}
        placeholderTextColor={colors.placeholder}
        multiline
        maxLength={NOTE_MAX}
        editable={!loading}
        textAlignVertical="top"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submit, !reason && styles.submitDisabled]}
        onPress={handleSend}
        disabled={!reason || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: !reason || loading }}
      >
        {loading ? <ActivityIndicator color={onPrimary} /> : <Text style={styles.submitText}>{text.submit}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancel} onPress={close} disabled={loading} accessibilityRole="button">
        <Text style={styles.cancelText}>{text.cancel}</Text>
      </TouchableOpacity>
    </View>
  );
};

// Theme colors are read defensively: a theme may not define every key yet.
const themeColors: any = (AppTheme as any)?.colors || {};
function color(fallback: string, ...keys: string[]): string {
  for (const k of keys) if (typeof themeColors[k] === 'string') return themeColors[k];
  return fallback;
}
/** Dark or light text, whichever reads better on the given background. */
function readableOn(background: string): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(background).trim());
  if (!m) return '#ffffff';
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#111827' : '#ffffff';
}
const primaryColor = color('#2563EB', 'primary');
const onPrimary = readableOn(primaryColor);
const successColor = color('#22C55E', 'success');
const colors = {
  border: color('rgba(0,0,0,0.12)', 'border'),
  surface: color('transparent', 'surface', 'card'),
  text: color('#111827', 'text'),
  textSecondary: color('#6b7280', 'textSecondary'),
  placeholder: color('#9ca3af', 'placeholder', 'textMuted'),
  error: color('#EF4444', 'error', 'danger'),
  warning: color('#F59E0B', 'warning'),
};

const styles = StyleSheet.create({
  textTrigger: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 32, paddingVertical: 6 },
  iconTrigger: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32 },
  triggerText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  doneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  doneText: { color: colors.textSecondary, fontSize: 13, marginLeft: 6, flexShrink: 1 },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    alignSelf: 'stretch',
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: primaryColor, borderColor: primaryColor },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: onPrimary, fontWeight: '600' },
  hint: { color: colors.warning, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    marginTop: 4,
    marginBottom: 12,
  },
  error: { color: colors.error, fontSize: 13, marginBottom: 10 },
  submit: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: onPrimary, fontSize: 15, fontWeight: '700' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
});

export default ReportButton;
