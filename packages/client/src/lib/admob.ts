import type {
  AdMob as AdMobType,
  AdOptions,
  RewardAdOptions,
  BannerAdOptions,
} from '@capacitor-community/admob';

// Production Ad Unit IDs
const INTERSTITIAL_ID = 'ca-app-pub-9422968859330842/9870542118';
const BANNER_ID = 'ca-app-pub-9422968859330842/7244378774';
// Rewarded ID - placeholder until created in AdMob console
const REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
const REWARDED_IS_TEST = true; // Set to false when real rewarded ID is added

const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes
let lastInterstitialTime = 0;

let admob: typeof AdMobType | null = null;

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor;
}

export async function initializeAdMob(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { AdMob } = await import('@capacitor-community/admob');
    admob = AdMob;
    await admob.initialize({
      initializeForTesting: false,
    });
  } catch (err) {
    console.warn('AdMob initialization failed:', err);
  }
}

export async function showInterstitial(): Promise<void> {
  if (!admob || !isNativeApp()) return;

  const now = Date.now();
  if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) return;

  try {
    const options: AdOptions = {
      adId: INTERSTITIAL_ID,
      isTesting: false,
    };
    await admob.prepareInterstitial(options);
    await admob.showInterstitial();
    lastInterstitialTime = Date.now();
  } catch (err) {
    console.warn('Interstitial ad failed:', err);
  }
}

export async function showBanner(): Promise<void> {
  if (!admob || !isNativeApp()) return;

  try {
    const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
    const options: BannerAdOptions = {
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: false,
    };
    await admob.showBanner(options);
  } catch (err) {
    console.warn('Banner ad failed:', err);
  }
}

export async function hideBanner(): Promise<void> {
  if (!admob || !isNativeApp()) return;

  try {
    await admob.hideBanner();
  } catch (err) {
    console.warn('Hide banner failed:', err);
  }
}

export async function showRewarded(): Promise<boolean> {
  if (!admob || !isNativeApp()) return false;

  try {
    const { RewardAdPluginEvents } = await import('@capacitor-community/admob');

    const options: RewardAdOptions = {
      adId: REWARDED_ID,
      isTesting: REWARDED_IS_TEST,
    };
    await admob.prepareRewardVideoAd(options);

    return new Promise<boolean>((resolve) => {
      let rewarded = false;

      const rewardListener = admob!.addListener(
        RewardAdPluginEvents.Rewarded,
        () => { rewarded = true; }
      );

      const dismissListener = admob!.addListener(
        RewardAdPluginEvents.Dismissed,
        () => {
          rewardListener.then((l) => l.remove());
          dismissListener.then((l) => l.remove());
          resolve(rewarded);
        }
      );

      const failListener = admob!.addListener(
        RewardAdPluginEvents.FailedToLoad,
        () => {
          rewardListener.then((l) => l.remove());
          dismissListener.then((l) => l.remove());
          failListener.then((l) => l.remove());
          resolve(false);
        }
      );

      admob!.showRewardVideoAd();
    });
  } catch (err) {
    console.warn('Rewarded ad failed:', err);
    return false;
  }
}
