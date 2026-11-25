import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { env } from '../config/env.js';
import { userFromDecodedToken } from '../lib/authUser.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { testUserMiddleware } from './testUser.js';
import { isOfficerSrCode } from '../services/officerSource.js';

const BEARER = /^Bearer\s+(\S+)\s*$/i;

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
  return userFromDecodedToken(token);
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Test-user mechanism is only available in test mode and only when no
  // Authorization header is sent. Assumes testUserMiddleware is synchronous.
  if (env.NODE_ENV === 'test' && req.header('authorization') === undefined) {
    testUserMiddleware(req, res, () => undefined);
    if (res.headersSent) return;
    if (req.user) {
      next();
      return;
    }
  }

  const match = BEARER.exec(req.header('authorization') ?? '');
  if (!match) {
    unauthorized(res);
    return;
  }

  // Only token verification failures are authentication failures.
  let decoded: DecodedIdToken;
  try {
    decoded = await firebaseAdmin.auth().verifyIdToken(match[1]);
  } catch {
    unauthorized(res);
    return;
  }

  const user = userFromDecodedToken(decoded);

  // Officer lookup failures must not log users out. Keep the token's role
  // and log the error.
  if (user.role !== 'officer') {
    try {
      if (await isOfficerSrCode(user.srCode)) user.role = 'officer';
    } catch (err) {
      console.error('Officer lookup failed:', err);
    }
  }

  req.user = user;
  next();
}