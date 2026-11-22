import type { DecodedIdToken } from 'firebase-admin/auth';
import type { AuthenticatedUser } from '../middleware/testUser.js';
import { normalizeSrCode } from '../services/members.js';

const BATSTATEU_EMAIL_PATTERN = /^([a-z0-9-]+)@g\.batstate-u\.edu\.ph$/i;

export function extractBatstateuSrCode(
  email: unknown,
  emailVerified: unknown
): string | null {
  if (emailVerified !== true || typeof email !== 'string') {
    return null;
  }
  const match = BATSTATEU_EMAIL_PATTERN.exec(email.trim());
  return match ? normalizeSrCode(match[1]) : null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function userFromDecodedToken(token: DecodedIdToken): AuthenticatedUser {
  const claims = token as DecodedIdToken & {
    srCode?: unknown;
    sr_code?: unknown;
    role?: unknown;
    name?: unknown;
  };

  const srCode =
    nonEmptyString(claims.srCode) ??
    nonEmptyString(claims.sr_code) ??
    extractBatstateuSrCode(token.email, token.email_verified) ??
    token.uid;

  return {
    uid: token.uid,
    srCode,
    role: nonEmptyString(claims.role) ?? 'member',
    email: nonEmptyString(token.email) ?? undefined,
    displayName: nonEmptyString(claims.name) ?? undefined,
  };
}
