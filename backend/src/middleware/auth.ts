import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { env } from '../config/env.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { testUserMiddleware } from './testUser.js';
import { isOfficerSrCode } from '../services/officerSource.js';

const BSU_EMAIL = /^([^@]+)@g\.batstate-u\.edu\.ph$/i;
const BEARER = /^Bearer\s+(\S+)\s*$/i;
const ROLES = ['member', 'officer'] as const;
type Role = (typeof ROLES)[number];

function unauthorized(res: Response): void {
  res.status(401).json({ error: 'Authentication required' });
}

function normalizeSrCode(value: string): string {
  return value.trim().toUpperCase();
}

function srCodeFromEmail(token: DecodedIdToken): string | null {
  if (!token.email_verified || !token.email) return null;
  const match = BSU_EMAIL.exec(token.email);
  return match ? normalizeSrCode(match[1]) : null;
}

function parseRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : 'member';
}

function userFromToken(token: DecodedIdToken) {
  const claims = token as DecodedIdToken & {
    srCode?: unknown;
    sr_code?: unknown;
    role?: unknown;
  };

  // A custom claim wins. Otherwise derive the SR code from a verified
  // school email, and fall back to UID for unlinked accounts.
  const claimSrCode =
    typeof claims.srCode === 'string'
      ? claims.srCode
      : typeof claims.sr_code === 'string'
        ? claims.sr_code
        : null;

  const srCode = claimSrCode
    ? normalizeSrCode(claimSrCode)
    : (srCodeFromEmail(token) ?? token.uid);

  return {
    uid: token.uid,
    srCode,
    role: parseRole(claims.role),
  };
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

  const user = userFromToken(decoded);

  // Officer lookup failures must not log users out. Fail closed to the
  // token's role and log the error.
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