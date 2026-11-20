import { Request, Response } from 'express';
import { z } from 'zod';
import { firebaseAdmin } from '../lib/firebase.js';
import {
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

// TODO(AI/Backend): Fetch authenticated member profile from Firebase/DataConnect
export async function getAuthMeStub(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'GET /auth/me not implemented', member: null });
}

// TODO(AI/Backend): Return member digital ID card payload and QR signed token
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
