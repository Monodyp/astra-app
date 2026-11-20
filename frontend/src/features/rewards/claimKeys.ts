import { newIdempotencyKey } from '../../lib/idempotency.js';

const unsettled = new Map<string, string>();

export function claimKeyFor(perkId: string): string {
  let key = unsettled.get(perkId);
  if (!key) {
    key = newIdempotencyKey();
    unsettled.set(perkId, key);
  }
  return key;
}

export function settleClaim(perkId: string): void {
  unsettled.delete(perkId);
}
