import type {
  AdMob as AdMobType,
  AdOptions,
  RewardAdOptions,
} from '@capacitor-community/admob';

// Google test IDs - replace with real IDs for production
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

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
      initializeForTesting: true,
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
      adId: TEST_INTERSTITIAL_ID,
      isTesting: true,
    };
    await admob.prepareInterstitial(options);
    await admob.showInterstitial();
    lastInterstitialTime = Date.now();
  } catch (err) {
    console.warn('Interstitial ad failed:', err);
  }
}

export async function showRewarded(): Promise<boolean> {
  if (!admob || !isNativeApp()) return false;

  try {
    const { RewardAdPluginEvents } = await import('@capacitor-community/admob');

    const options: RewardAdOptions = {
      adId: TEST_REWARDED_ID,
      isTesting: true,
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
