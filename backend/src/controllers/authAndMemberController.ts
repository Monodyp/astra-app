import { Request, Response } from 'express';
import { z } from 'zod';
import { firebaseAdmin } from '../lib/firebase.js';
import { getConfiguredMemberService } from '../config/members.js';
import { normalizeFirebaseUser } from '../middleware/auth.js';
import {
  generateMemberQrTokenWithExpiry,
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
    const user = normalizeFirebaseUser(decoded);
    res.status(200).json({
      user,
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
    if (!req.user.srCode) {
      res.status(409).json({
        error: 'MEMBER_LINK_REQUIRED',
        code: 'MEMBER_LINK_REQUIRED',
      });
      return;
    }
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
        membershipId: member.membershipId ?? member.controlNumber ?? null,
        controlNumber: member.controlNumber ?? null,
        program: member.program ?? null,
        yearLevel: member.yearLevel ?? null,
        isPaid: await members.isPaid(member.srCode),
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
    const members = getConfiguredMemberService();
    if (!req.user.srCode) {
      res.set('Cache-Control', 'no-store').status(409).json({
        error: 'MEMBER_LINK_REQUIRED',
        code: 'MEMBER_LINK_REQUIRED',
      });
      return;
    }
    const member = await members.findMember(req.user.srCode);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const isPaid = await members.isPaid(member.srCode);
    const controlNumber = member.controlNumber ?? member.membershipId ?? null;
    let qrToken: string | null = null;
    let qrExpiresAt: string | null = null;

    if (isPaid && controlNumber) {
      try {
        const issued = await generateMemberQrTokenWithExpiry(controlNumber);
        qrToken = issued.qrToken;
        qrExpiresAt = issued.qrExpiresAt;
      } catch (error) {
        if (error instanceof TypeError) {
          res.set('Cache-Control', 'no-store').status(409).json({
            error: 'MEMBER_LINK_REQUIRED',
            code: 'MEMBER_LINK_REQUIRED',
          });
          return;
        }
        throw error;
      }
    }

    res.set('Cache-Control', 'no-store').status(200).json({
      card: {
        studentId: member.srCode,
        fullName: member.fullName,
        isPaid,
        membershipId: member.membershipId ?? controlNumber,
        program: member.program ?? null,
        yearLevel: member.yearLevel ?? null,
        qrToken,
        qrExpiresAt,
      },
    });
  } catch (error) {
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
