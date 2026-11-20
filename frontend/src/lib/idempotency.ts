import { isDataError } from '../data/index.js';

export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function isUncertainFailure(error: unknown): boolean {
  return !isDataError(error) || error.code === 'unavailable';
}
