import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { testUserMiddleware } from './testUser.js';

function unauthorized(res: Response): void {
  res.status(401).json({ error: 'Authentication required' });
}

function userFromToken(token: DecodedIdToken) {
  const claims = token as DecodedIdToken & {
    srCode?: unknown;
    sr_code?: unknown;
    role?: unknown;
  };

  return {
    uid: token.uid,
    // Firebase custom claims carry the member identifier. UID is a safe
    // fallback for accounts that have not yet been linked to a member row.
    srCode:
      typeof claims.srCode === 'string'
        ? claims.srCode
        : typeof claims.sr_code === 'string'
          ? claims.sr_code
          : token.uid,
    role: typeof claims.role === 'string' ? claims.role : 'member',
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
    req.user = userFromToken(decoded);
    next();
  } catch {
    unauthorized(res);
  }
}