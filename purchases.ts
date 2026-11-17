import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import * as keys from './keys';

/**
 * 💰 IN-APP PURCHASES (Google Play + App Store): SNAPP PURCHASES HELPER
 *
 * Sell subscriptions, one-time unlocks and consumables (coins, credits) inside the app.
 * Payments go through Apple and Google; the money is paid straight to the owner's own
 * developer account.
 *
 * How it works (owner does nothing in code):
 *   1. List what the app sells in PRODUCTS below (id, type, price in USD, title).
 *   2. Snapp creates these products in Google Play and the App Store when the app is
 *      published, and connects the purchase service. Its public keys are added to the app
 *      for you (REVENUECAT_IOS_KEY / REVENUECAT_ANDROID_KEY). Never write them by hand.
 *   3. In the Snapp preview purchases are SIMULATED: a test sheet opens, nothing is charged.
 *
 * Screens only use the functions below: getStoreItems(), buyProduct(), restorePurchases(),
 * hasEntitlement(), usePremium(). Never import 'react-native-purchases' anywhere else.
 */

export type ProductType = 'subscription' | 'one_time' | 'consumable';
export type SubscriptionPeriod = 'week' | 'month' | 'year';

export interface SnappProduct {
  /** Lowercase letters, numbers and underscores, starts with a letter. Never change it after publishing. */
  id: string;
  type: ProductType;
  /** Price in US dollars. Stores convert it for other countries. */
  price: number;
  /** Required for subscriptions. */
  period?: SubscriptionPeriod;
  title: string;
  description: string;
  /**
   * What the purchase unlocks, e.g. 'premium'. Subscriptions and one_time products need one;
   * consumables have none (the app grants coins itself after a successful buyProduct()).
   */
  entitlement?: string;
}

// SNAPP PRODUCTS: everything the app sells. Snapp reads this list to create the store products.
export const PRODUCTS: SnappProduct[] = [];

/**
 * Links a subscription paywall must show (App Store rule 3.1.2): Terms of Use and Privacy Policy.
 * privacy is empty until the app's store page exists; hide that link while it is empty.
 */
export const PURCHASE_LINKS = {
  terms: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  privacy: typeof (keys as any).SNAPP_PRIVACY_POLICY_URL === 'string' ? ((keys as any).SNAPP_PRIVACY_POLICY_URL as string) : '',
};

export interface StoreItem {
  id: string;
  type: ProductType;
  period?: SubscriptionPeriod;
  title: string;
  description: string;
  /** Localized price with currency, e.g. "$4.99" or "4,99 €". Show this, never a hardcoded price. */
  priceText: string;
}

export interface BuyResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
}

const RC: any = Purchases;
/** True inside the Snapp preview: purchases are simulated there. */
export const isPreviewPurchases: boolean = !!(RC && RC.__snappPreview);

function apiKey(): string {
  const all = keys as any;
  const key = Platform.OS === 'ios' ? all.REVENUECAT_IOS_KEY : all.REVENUECAT_ANDROID_KEY;
  return typeof key === 'string' && /^(appl_|goog_|test_)/.test(key) ? key : '';
}

let setup: Promise<boolean> | null = null;
let currentUserId: string | null = null;

/** Prepare purchases once. Every function below calls it, so screens never need to. */
export function initPurchases(): Promise<boolean> {
  if (!setup) {
    setup = (async () => {
      if (!RC) return false;
      if (isPreviewPurchases) {
        RC.__snappSetCatalog(PRODUCTS);
        return true;
      }
      const key = apiKey();
      if (!key) {
        console.warn('[purchases] Purchases are not set up yet. Snapp sets them up when the app is published.');
        return false;
      }
      RC.configure({ apiKey: key, appUserID: currentUserId || undefined });
      return true;
    })().catch((e) => {
      console.warn('[purchases] setup failed', e);
      setup = null;
      return false;
    });
  }
  return setup;
}

/** Can the app sell right now? false until Snapp has set purchases up for this build. */
export async function purchasesAvailable(): Promise<boolean> {
  return initPurchases();
}

/**
 * Link purchases to the signed-in user so they follow the account to other devices.
 * Call after sign-in with the user's id; call with null after sign-out.
 */
export async function identifyPurchaser(userId: string | null): Promise<void> {
  currentUserId = userId;
  if (!(await initPurchases())) return;
  try {
    if (userId) await RC.logIn(userId);
    else if (RC.isAnonymous && !(await RC.isAnonymous())) await RC.logOut();
  } catch (e) {
    console.warn('[purchases] identify failed', e);
  }
}

async function packages(): Promise<any[]> {
  if (!(await initPurchases())) return [];
  const offerings = await RC.getOfferings();
  return offerings?.current?.availablePackages || [];
}

/** The products the store will sell, with real localized prices, in PRODUCTS order. */
export async function getStoreItems(): Promise<StoreItem[]> {
  try {
    const pkgs = await packages();
    const items: StoreItem[] = [];
    for (const product of PRODUCTS) {
      const pkg = pkgs.find((p) => p.identifier === product.id);
      if (!pkg) continue;
      items.push({
        id: product.id,
        type: product.type,
        period: product.period,
        title: product.title,
        description: product.description,
        priceText: pkg.product?.priceString || '',
      });
    }
    return items;
  } catch (e) {
    console.warn('[purchases] could not load products', e);
    return [];
  }
}

/** Buy a product from PRODUCTS by id. Shows the store's own payment sheet. */
export async function buyProduct(id: string): Promise<BuyResult> {
  try {
    if (!(await initPurchases())) {
      return { ok: false, error: 'Purchases are not available yet. Please try again later.' };
    }
    const pkg = (await packages()).find((p) => p.identifier === id);
    if (!pkg) return { ok: false, error: 'This item is not available right now.' };
    await RC.purchasePackage(pkg);
    return { ok: true };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message || 'The purchase did not go through.' };
  }
}

/** Restore earlier purchases (required by Apple: show a "Restore purchases" button). */
export async function restorePurchases(): Promise<boolean> {
  try {
    if (!(await initPurchases())) return false;
    const info = await RC.restorePurchases();
    return Object.keys(info?.entitlements?.active || {}).length > 0;
  } catch (e) {
    console.warn('[purchases] restore failed', e);
    return false;
  }
}

/** Does the user own this entitlement right now (active subscription or one-time unlock)? */
export async function hasEntitlement(entitlement: string = 'premium'): Promise<boolean> {
  try {
    if (!(await initPurchases())) return false;
    const info = await RC.getCustomerInfo();
    return !!info?.entitlements?.active?.[entitlement];
  } catch {
    return false;
  }
}

/**
 * React hook: is the entitlement active? Updates by itself after a purchase or restore.
 * const { isPremium, loading } = usePremium();
 */
export function usePremium(entitlement: string = 'premium'): { isPremium: boolean; loading: boolean; refresh: () => void } {
  const [state, setState] = useState({ isPremium: false, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const listener = (info: any) => {
      if (alive) setState({ isPremium: !!info?.entitlements?.active?.[entitlement], loading: false });
    };
    hasEntitlement(entitlement).then((isPremium) => {
      if (alive) setState({ isPremium, loading: false });
    });
    initPurchases().then((ok) => {
      if (ok && alive && RC.addCustomerInfoUpdateListener) RC.addCustomerInfoUpdateListener(listener);
    });
    return () => {
      alive = false;
      if (RC && RC.removeCustomerInfoUpdateListener) RC.removeCustomerInfoUpdateListener(listener);
    };
  }, [entitlement, tick]);

  return { ...state, refresh: () => setTick((t: number) => t + 1) };
}
