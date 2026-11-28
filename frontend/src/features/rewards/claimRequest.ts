import { DataError, portalData, type ClaimResult } from '../../data/index.js';

export const CLAIM_TIMEOUT_MS = 30_000;

export function beginClaim(perkId: string, idempotencyKey: string) {
  const controller = new AbortController();
  let finished = false;
  let rejectCancellation: (reason: unknown) => void = () => {};
  const cancellation = new Promise<never>((_, reject) => { rejectCancellation = reject; });
  const cancel = () => {
    if (finished) return;
    rejectCancellation(new DataError('unavailable', 'The claim could not be confirmed. Retry with the same claim key.'));
    controller.abort();
  };
  const timer = window.setTimeout(cancel, CLAIM_TIMEOUT_MS);
  const result = (async (): Promise<ClaimResult> => {
    try {
      return await Promise.race([
        portalData.claimPerk(perkId, { idempotencyKey, signal: controller.signal }),
        cancellation,
      ]);
    } finally {
      finished = true;
      window.clearTimeout(timer);
    }
  })();
  return { result, cancel };
}
