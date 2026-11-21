import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { userFromDecodedToken } from '../lib/authUser.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { testUserMiddleware } from './testUser.js';

function unauthorized(res: Response): void {
  res.status(401).json({ error: 'Authentication required' });
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
    req.user = userFromDecodedToken(decoded);
    next();
  } catch {
    unauthorized(res);
  }
}
