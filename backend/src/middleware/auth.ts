import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { testUserMiddleware } from './testUser.js';

function unauthorized(res: Response): void {
  res.status(401).json({ error: 'Authentication required' });
}

export function normalizeClaimedSrCode(claims: {
  srCode?: unknown;
  sr_code?: unknown;
}): string | null {
  const claimed =
    typeof claims.srCode === 'string'
      ? claims.srCode
      : typeof claims.sr_code === 'string'
        ? claims.sr_code
        : null;
  if (!claimed?.trim()) return null;
  return claimed.trim().toUpperCase();
}

export function normalizeFirebaseUser(token: DecodedIdToken) {
  const claims = token as DecodedIdToken & {
    srCode?: unknown;
    sr_code?: unknown;
    role?: unknown;
  };

  return {
    uid: token.uid,
    // UID is never used as a roster identifier. A missing claim is explicit.
    srCode: normalizeClaimedSrCode(claims),
    role:
      typeof claims.role === 'string'
        ? claims.role.trim().toLowerCase()
        : 'member',
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Keep the repository's explicit test-user mechanism available only in test
  // mode; it can never be used by a production request.
  if (env.NODE_ENV === 'test' && req.header('authorization') === undefined) {
    testUserMiddleware(req, res, () => undefined);
    if (req.user) {
      next();
      return;
    }
  }

  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    unauthorized(res);
    return;
  }

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    req.user = normalizeFirebaseUser(decoded);
    next();
  } catch {
    unauthorized(res);
  }
}