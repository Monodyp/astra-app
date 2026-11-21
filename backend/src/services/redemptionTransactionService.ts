import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { normalizeSrCode } from './members.js';
import {
  redemptionUnitOfWork,
  type RedemptionsIdempotencyRecord,
} from '../repositories/redemptionUnitOfWork.js';
import { getConfiguredMemberService } from '../config/members.js';

export class RedemptionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string = 'REDEMPTION_ERROR'
  ) {
    super(message);
    this.name = 'RedemptionError';
  }
}

export interface RedeemPerkInput {
  memberId: string;
  perkId: string;
  idempotencyKey: string;
}

export interface RedeemPerkResult {
  voucher: Awaited<ReturnType<typeof redemptionUnitOfWork.runInTransaction>>;
  replay: boolean;
}

export async function redeemPerk(input: RedeemPerkInput): Promise<{ voucher: any; replay: boolean }> {
  const memberId = normalizeSrCode(input.memberId);
  const memberService = getConfiguredMemberService();
  const membership = await memberService.verifyMembership(memberId);
  if (!membership.isValid) {
    throw new RedemptionError('Unknown or unpaid member', 404, 'MEMBER_NOT_ELIGIBLE');
  }
  return redemptionUnitOfWork.runInTransaction(async (tx) => {
    const existing = await tx.idempotency.get(memberId, input.idempotencyKey);
    if (existing) {
      if (existing.perkId !== input.perkId) {
        throw new RedemptionError('Idempotency key was already used for a different perk', 422);
      }
      const voucher = await tx.vouchers.getById(existing.voucherId);
      if (!voucher) {
        throw new RedemptionError('Stored voucher not found', 404);
      }
      return { voucher, replay: true };
    }

    const perk = await tx.perks.getById(input.perkId);
    if (!perk) throw new RedemptionError('Perk not available', 404);
    if (!perk.isActive) throw new RedemptionError('Perk is inactive', 404);

    const now = new Date();
    if (perk.availableFrom && new Date(perk.availableFrom) > now) {
      throw new RedemptionError('Perk is not available yet', 404);
    }
    if (perk.availableUntil && new Date(perk.availableUntil) < now) {
      throw new RedemptionError('Perk is outside its availability window', 404);
    }

    if (perk.stock !== null && perk.stock <= 0) {
      throw new RedemptionError('Perk is out of stock', 409);
    }

    const entries = await tx.ledger.listByMember(memberId);
    const balance = entries.reduce((sum, entry) => sum + entry.amount, 0);
    if (balance < perk.pointsCost) {
      throw new RedemptionError('Insufficient points', 409);
    }

    const lock = await tx.lock.get(memberId);
    const nextLock = { version: (lock?.version ?? 0) + 1 };
    await tx.lock.set(memberId, nextLock);

    if (!(await tx.perks.decrementStock(perk.id))) {
      throw new RedemptionError('Perk is out of stock', 409);
    }

    const voucherId = randomUUID();
    const code = randomBytes(8).toString('hex').toUpperCase();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + perk.validityDays);

    const voucher = await tx.vouchers.create({
      id: voucherId,
      code,
      status: 'active',
      partnerName: perk.partnerName,
      reward: perk.title,
      expiresAt,
      memberId,
      perkId: perk.id,
      pointsCost: perk.pointsCost,
      instructions: perk.instructions,
      createdAt: now,
      idempotencyKey: input.idempotencyKey,
    });

    await tx.ledger.create({
      id: createHash('sha256')
        .update(`${memberId}|redemption|${voucherId}`)
        .digest('hex'),
      memberId,
      amount: -perk.pointsCost,
      reason: `Redeemed ${perk.title}`,
      type: 'redemption',
      referenceId: voucherId,
      createdBy: memberId,
      createdAt: now,
    });

    const record: RedemptionsIdempotencyRecord = {
      memberId,
      perkId: perk.id,
      voucherId,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
    };
    await tx.idempotency.set(memberId, input.idempotencyKey, record);

    return { voucher, replay: false };
  });
}
