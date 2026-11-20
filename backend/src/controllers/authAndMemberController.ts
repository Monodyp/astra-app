import { Request, Response } from 'express';
import { z } from 'zod';
import { firebaseAdmin } from '../lib/firebase.js';
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
    const claims = decoded as typeof decoded & {
      srCode?: unknown;
      sr_code?: unknown;
      role?: unknown;
    };

    res.status(200).json({
      user: {
        uid: decoded.uid,
        srCode:
          typeof claims.srCode === 'string'
            ? claims.srCode
            : typeof claims.sr_code === 'string'
              ? claims.sr_code
              : decoded.uid,
        role: typeof claims.role === 'string' ? claims.role : 'member',
      },
    });
  } catch {
    res.status(401).json({ error: 'Invalid Firebase ID token' });
  }
}

export async function getAuthMeStub(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const members = getConfiguredMemberService();
    const member = await members.findMember(req.user.srCode);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.status(200).json({
      member: {
        uid: req.user.uid,
        srCode: member.srCode,
        fullName: member.fullName,
        isPaid: await members.isPaid(member.srCode),
        role: req.user.role,
      },
    });
  } catch {
    res.status(503).json({ error: 'Member source unavailable' });
  }
}

export async function getMemberIdCardStub(_req: Request, res: Response): Promise<void> {
  res.status(501).json({
    error: 'GET /members/me/id not implemented',
    card: { studentId: 'S-STUB', fullName: 'Stub Member', isPaid: false, qrToken: '' },
  });
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
