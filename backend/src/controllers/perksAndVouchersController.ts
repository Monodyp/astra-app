import { Request, Response } from 'express';
import { z } from 'zod';
import {
  validateVoucher,
  applyVoucher,
} from '../services/redemptionService.js';

// ---------------------------------------------------------------------------
// Existing stub handlers (kept as-is)
// ---------------------------------------------------------------------------

// TODO(AI/Backend): Return active partner perks available for redemption
export async function getPerksStub(
  _req: Request,
  res: Response
): Promise<void> {
  res.status(501).json({ error: 'GET /perks not implemented', perks: [] });
}

// TODO(AI/Backend): Deduct points and issue voucher for specified perk
export async function redeemPerkStub(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  void id;
  res
    .status(501)
    .json({ error: 'POST /perks/:id/redeem not implemented', voucher: null });
}

// TODO(AI/Backend): Return list of vouchers claimed by current member
export async function getVouchersMeStub(
  _req: Request,
  res: Response
): Promise<void> {
  res
    .status(501)
    .json({ error: 'GET /vouchers/me not implemented', vouchers: [] });
}

// TODO(AI/Backend): Return details, QR token, and status for single voucher
export async function getVoucherByIdStub(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;
  void id;
  res
    .status(501)
    .json({ error: 'GET /vouchers/:id not implemented', voucher: null });
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
