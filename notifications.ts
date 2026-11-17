import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * 🔔 NOTIFICATIONS: SNAPP NOTIFICATIONS HELPER
 *
 * Two kinds, both through this file only (never import 'expo-notifications' anywhere else):
 *
 * 1. REMINDERS (local): scheduled on the phone, no account, no server.
 *      scheduleDailyReminder('water', 9, 0, 'Time to drink water', 'Tap to log a glass')
 *      cancelReminder('water')
 *
 * 2. PUSH (from a server, works with the app closed): new messages, alerts, announcements.
 *      enablePushNotifications(currentUserId)   // after the user turns notifications on / signs in
 *      notifyUser(otherUserId, 'New message', 'Ayse: are we still on for 6?')
 *      subscribeToTopic('news')                 // groups the owner can send to ("news", "offers", a city)
 *      disablePushNotifications()
 *    Snapp delivers them. The owner connects Google once on the Publish page (Android) and Snapp sets
 *    up iPhone push with the Apple account used for publishing. The owner can also send to every user,
 *    a topic or one user, now or later, from Snapp (app Settings > Notifications). Never ask the user for
 *    Firebase keys, google-services.json or APNs keys.
 *
 * Rules (App Store and Google Play):
 *   - The app must work fully without notifications. Ask for permission only when the user turns
 *     notifications on (a switch in Settings or a clear "Remind me" button), never on first launch.
 *   - Always offer a way to turn them off again.
 *
 * In the Snapp preview: reminders show as real notifications; push is simulated (notifyUser shows the
 * notification on this phone, nothing is sent).
 */

const PUSH_API = 'https://snappai.co/api/push/v1';

/** Set by Snapp when the app is published (app.json extra.snappAppId). */
const APP_ID: string = (Constants?.expoConfig?.extra as any)?.snappAppId || '';

/** True inside the Snapp preview: push is simulated there. */
export const isPreviewNotifications: boolean = !!(Notifications as any).__snappPreview;

let configured = false;
let deviceToken: string | null = null;

/** Show notifications while the app is open too, and create the Android channel. Safe to call often. */
export async function setupNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) as any,
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  } catch {
    /* notifications stay off; the app keeps working */
  }
}

/** Ask for permission (shows the system prompt once). true = allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await setupNotifications();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return !!asked.granted;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- reminders (local)

/** A reminder every day at hour:minute (24h). Same id again replaces it. */
export async function scheduleDailyReminder(id: string, hour: number, minute: number, title: string, body: string): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  try {
    await cancelReminder(id);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'default' } as any,
    });
    return true;
  } catch {
    return false;
  }
}

/** One reminder at a date. */
export async function scheduleReminderAt(id: string, date: Date, title: string, body: string): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  try {
    await cancelReminder(id);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'default' } as any,
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* nothing scheduled */
  }
}

// ---------------------------------------------------------------- push (from Snapp)

async function post(path: string, body: Record<string, unknown>): Promise<any> {
  const resp = await fetch(`${PUSH_API}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return resp.json().catch(() => ({}));
}

/**
 * Turn push on for this device. Pass the signed-in user's id so notifyUser(thatId, ...) reaches them;
 * call again after sign-in. Returns false when the user said no.
 */
export async function enablePushNotifications(userId?: string | null): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  if (isPreviewNotifications || !APP_ID) return true;
  try {
    deviceToken = String((await Notifications.getDevicePushTokenAsync()).data);
    await post('register', { appId: APP_ID, token: deviceToken, platform: Platform.OS, userId: userId ?? null });
    return true;
  } catch {
    return false;
  }
}

export async function disablePushNotifications(): Promise<void> {
  if (isPreviewNotifications || !APP_ID || !deviceToken) return;
  await post('unregister', { appId: APP_ID, token: deviceToken }).catch(() => {});
  deviceToken = null;
}

/**
 * Notify another user of this app (e.g. "new message"). Works once this device enabled push. Limited to a few
 * dozen per hour per device. In the preview the notification shows on this phone instead.
 */
export async function notifyUser(toUserId: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  if (isPreviewNotifications || !APP_ID) {
    try {
      await Notifications.scheduleNotificationAsync({ content: { title, body, data, sound: true }, trigger: null });
      return true;
    } catch {
      return false;
    }
  }
  if (!deviceToken) return false;
  try {
    const r = await post('notify-user', { appId: APP_ID, fromToken: deviceToken, toUserId, title, body, data });
    return !!r?.success;
  } catch {
    return false;
  }
}

/** Join a topic (lowercase letters, digits, - and _). The owner sends to a topic from Snapp. Needs enablePushNotifications first. */
export async function subscribeToTopic(topic: string): Promise<boolean> {
  if (isPreviewNotifications || !APP_ID) return true;
  if (!deviceToken) return false;
  try {
    const r = await post('topics', { appId: APP_ID, token: deviceToken, topic, subscribe: true });
    return !!r?.success;
  } catch {
    return false;
  }
}

export async function unsubscribeFromTopic(topic: string): Promise<boolean> {
  if (isPreviewNotifications || !APP_ID || !deviceToken) return true;
  try {
    const r = await post('topics', { appId: APP_ID, token: deviceToken, topic, subscribe: false });
    return !!r?.success;
  } catch {
    return false;
  }
}

/** Run handler when the user taps a notification (data = what was sent). Returns an unsubscribe function. */
export function onNotificationTap(handler: (data: Record<string, any>) => void): () => void {
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => handler((r?.notification?.request?.content?.data as any) || {}));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
