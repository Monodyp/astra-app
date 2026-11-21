import { Request, Response } from 'express';
import { z } from 'zod';
import { firebaseAdmin } from '../lib/firebase.js';
import { userFromDecodedToken } from '../lib/authUser.js';
import { getConfiguredMemberService } from '../config/members.js';
import {
  generateMemberQrToken,
  InvalidQrTokenError,
  verifyQrToken,
} from '../services/qrService.js';

const loginSchema = z.object({
  idToken: z.string().trim().min(1, 'Firebase ID token is required'),
});

export async function loginStub(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid login request',
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(parsed.data.idToken);
    const user = userFromDecodedToken(decoded);

    res.status(200).json({
      user: {
        uid: user.uid,
        srCode: user.srCode,
        role: user.role,
      },
    });
  } catch {
    res.status(401).json({ error: 'Invalid Firebase ID token' });
  }
}

interface ResolvedMemberAccount {
  srCode: string;
  fullName: string | null;
  isPaid: boolean;
  controlNumber?: string | null;
  membershipId?: string | null;
}

async function resolveMemberAccount(
  user: NonNullable<Request['user']>
): Promise<ResolvedMemberAccount | null> {
  if (!user.srCode) {
    return null;
  }
  const members = getConfiguredMemberService();
  const member = await members.findMember(user.srCode);
  const hasResolvedSrCode = user.srCode !== user.uid;
  if (!member && !hasResolvedSrCode) {
    return null;
  }

  return {
    srCode: member?.srCode ?? user.srCode,
    fullName: member?.fullName ?? user.displayName ?? null,
    isPaid: member ? await members.isPaid(member.srCode) : false,
    controlNumber: member?.controlNumber ?? null,
    membershipId: member?.membershipId ?? null,
  };
}

export async function getAuthMeStub(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const account = await resolveMemberAccount(req.user);
    if (!account) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.status(200).json({
      member: {
        uid: req.user.uid,
        srCode: account.srCode,
        fullName: account.fullName,
        isPaid: account.isPaid,
        role: req.user.role,
      },
    });
  } catch {
    res.status(503).json({ error: 'Member source unavailable' });
  }
}

export async function getMemberIdCardStub(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const account = await resolveMemberAccount(req.user);
    if (!account) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
      }).status(404).json({ error: 'Member not found' });
      return;
    }

    const qrIdentifier =
      account.controlNumber ?? account.membershipId ?? account.srCode;
    const qrToken = account.isPaid
      ? await generateMemberQrToken(qrIdentifier)
      : '';

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
    }).status(200).json({
      card: {
        studentId: account.srCode,
        fullName: account.fullName,
        isPaid: account.isPaid,
        qrToken,
      },
    });
  } catch (error) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
    });
    if (error instanceof TypeError) {
      res.status(400).json({ error: 'Member ID cannot generate a QR token' });
      return;
    }
    res.status(503).json({ error: 'Member source unavailable' });
  }
}

export async function verifyTokenStub(req: Request, res: Response): Promise<void> {
  const { token } = req.params;
  try {
    await verifyQrToken(token);
    res.set('Cache-Control', 'no-store').json({ isValid: true });
  } catch (error) {
    if (!(error instanceof InvalidQrTokenError)) {
      throw error;
    }
    res.set('Cache-Control', 'no-store').json({ isValid: false });
  }
}
