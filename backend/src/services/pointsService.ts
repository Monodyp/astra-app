import { createHash } from 'node:crypto';
import { getConfiguredMemberService } from '../config/members.js';
import {
  type LedgerEntry,
  type LedgerEntryType,
  ledgerRepository,
} from '../repositories/ledgerRepository.js';
import { normalizeSrCode } from './members.js';

export class PointsServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'PointsServiceError';
  }
}

export async function getMemberPoints(memberId: string): Promise<number> {
  return ledgerRepository.getBalance(normalizeSrCode(memberId));
}

export async function getPointsHistory(memberId: string): Promise<LedgerEntry[]> {
  return ledgerRepository.listByMember(normalizeSrCode(memberId));
}

export interface GrantPointsInput {
  memberId: string;
  amount: number;
  reason: string;
  officerId: string;
  referenceId?: string;
  idempotencyKey: string;
}

function entryId(memberId: string, type: LedgerEntryType, referenceId: string): string {
  return createHash('sha256')
    .update(`${normalizeSrCode(memberId)}|${type}|${referenceId}`)
    .digest('hex');
}

export async function grantPoints(input: GrantPointsInput): Promise<LedgerEntry> {
  const memberId = normalizeSrCode(input.memberId);
  const memberService = getConfiguredMemberService();
  const membership = await memberService.verifyMembership(memberId);
  if (!membership.isValid) {
    throw new PointsServiceError('Unknown or unpaid member', 404);
  }

  const referenceId = input.referenceId ?? input.idempotencyKey;
  return ledgerRepository.create({
    id: entryId(memberId, 'grant', referenceId),
    memberId,
    amount: input.amount,
    reason: input.reason,
    type: 'grant',
    referenceId,
    createdBy: input.officerId,
  });
}
