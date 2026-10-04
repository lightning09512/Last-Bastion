// ─── Ad Wrapper ──────────────────────────────────────────────────
// Stub ad module. Easy to swap for CrazyGames/Poki SDK.

export type AdPlacement = 'rewarded_gold' | 'rewarded_revive' | 'rewarded_double_stars';

/** Show a rewarded ad. Returns true if the reward should be granted (stub always resolves true). */
export async function showRewardedAd(_placement: AdPlacement): Promise<boolean> {
  console.log(`[AdStub] Would show rewarded ad: ${_placement}`);
  // In production, integrate with SDK:
  // return new Promise(resolve => sdk.showRewardedAd({ ... }, resolve));
  return true;
}

/** Called at level start to optionally show an interstitial. */
export async function showInterstitial(): Promise<void> {
  console.log('[AdStub] Would show interstitial (disabled during gameplay)');
}

/** Initialize ad SDK. */
export function initAds(): void {
  console.log('[AdStub] Ad SDK would initialize here');
}
