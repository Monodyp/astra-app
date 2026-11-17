import { Request, Response } from 'express';
import {
  InvalidQrTokenError,
  verifyQrToken,
} from '../services/qrService.js';

// TODO(AI/Backend): Implement login validation and return JWT/session token
export async function loginStub(_req: Request, res: Response): Promise<void> {
  res.status(501).json({ error: 'POST /auth/login not implemented', user: null });
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
