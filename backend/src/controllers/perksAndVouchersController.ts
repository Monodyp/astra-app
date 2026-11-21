import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import {
  validateVoucher,
  applyVoucher,
} from '../services/redemptionService.js';
import { perkRepository } from '../repositories/perkRepository.js';
import { voucherRepository } from '../repositories/voucherRepository.js';
import {
  redeemPerk,
  RedemptionError,
} from '../services/redemptionTransactionService.js';
import { normalizeSrCode } from '../services/members.js';

// ---------------------------------------------------------------------------
// Member perk and voucher handlers
// ---------------------------------------------------------------------------

export async function getPerks(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const perks = await perkRepository.listActive();
    res.status(200).json({ perks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load perks' });
  }
}

export async function redeemPerkHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.user.srCode) {
    res.status(409).json({ error: 'MEMBER_LINK_REQUIRED', code: 'MEMBER_LINK_REQUIRED' });
    return;
  }
  const parsed = z.object({
    idempotencyKey: z.string().trim().min(1).max(100),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  try {
    const result = await redeemPerk({
      memberId: req.user.srCode,
      perkId: req.params.id,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    res.status(result.replay ? 200 : 201).json({ voucher: result.voucher });
  } catch (error) {
    if (error instanceof RedemptionError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }
    next(error);
  }
}

export async function getVouchersMe(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.user.srCode) {
    res.status(409).json({ error: 'MEMBER_LINK_REQUIRED', code: 'MEMBER_LINK_REQUIRED' });
    return;
  }
  try {
    const vouchers = await voucherRepository.listByMember(normalizeSrCode(req.user.srCode));
    res.status(200).json({ vouchers });
  } catch {
    res.status(500).json({ error: 'Failed to load vouchers' });
  }
}

export async function getVoucherById(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.user.srCode) {
    res.status(409).json({ error: 'MEMBER_LINK_REQUIRED', code: 'MEMBER_LINK_REQUIRED' });
    return;
  }
  try {
    const voucher = await voucherRepository.getById(req.params.id);
    if (!voucher || normalizeSrCode(voucher.memberId ?? '') !== normalizeSrCode(req.user.srCode)) {
      res.status(404).json({ error: 'Voucher not found' });
      return;
    }
    res.status(200).json({ voucher });
  } catch {
    res.status(500).json({ error: 'Failed to load voucher' });
  }
}

// ---------------------------------------------------------------------------
// Partner Redemption handlers
// ---------------------------------------------------------------------------

const voucherInputSchema = z.object({
  code: z.string().min(1, 'code is required'),
  partner: z.string().min(1, 'partner is required'),
});

/**
 * POST /api/partner/validate
 * Role: partner | admin
 *
 * Body: { code: string, partner: string }
 *
 * Returns HTTP 200 with validation result (business failures are 200).
 * Returns HTTP 400 for malformed input.
 * NEVER returns member personal data.
 */
export async function validateVoucherHandler(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = voucherInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { code, partner } = parsed.data;
  const result = await validateVoucher(code, partner);
  res.status(200).json(result);
}

/**
 * POST /api/partner/apply
 * Role: partner | admin
 *
 * Body: { code: string, partner: string }
 *
 * Marks the voucher as used. Returns HTTP 200 with apply result.
 * Returns HTTP 400 for malformed input.
 */
export async function applyVoucherHandler(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = voucherInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { code, partner } = parsed.data;
  const result = await applyVoucher(code, partner);
  res.status(200).json(result);
}
