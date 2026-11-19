import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { memberFixture } from './memberFixtures.js';
import { router } from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { testUserMiddleware } from '../middleware/testUser.js';
import { ledgerRepository, resetLedgerRepository } from '../repositories/ledgerRepository.js';
import { resetPerkRepository, seedPerks, type Perk } from '../repositories/perkRepository.js';
import { resetVoucherRepository } from '../repositories/voucherRepository.js';
import {
  injectRedemptionFailure,
  resetRedemptionUnitOfWork,
} from '../repositories/redemptionUnitOfWork.js';

const member1 = { uid: 'member-1', srCode: '24-90001', role: 'member' };
const member2 = { uid: 'member-2', srCode: '24-90002', role: 'member' };

function asUser(user = member1): string {
  return JSON.stringify(user);
}

const testApp = express();
testApp.use(express.json());
testApp.use(testUserMiddleware);
testApp.use('/', router);
testApp.use(errorHandler);

const perks: Perk[] = [
  {
    id: 'perk-100',
    partnerName: 'NexCafe',
    title: 'Free Coffee',
    pointsCost: 100,
    isActive: true,
    stock: 10,
    validityDays: 30,
    instructions: 'Present at NexCafe.',
  },
  {
    id: 'perk-inactive',
    partnerName: 'NexCafe',
    title: 'Inactive',
    pointsCost: 100,
    isActive: false,
    stock: 10,
    validityDays: 30,
    instructions: 'Inactive perk.',
  },
  {
    id: 'perk-empty',
    partnerName: 'NexCafe',
    title: 'Sold Out',
    pointsCost: 100,
    isActive: true,
    stock: 0,
    validityDays: 30,
    instructions: 'Sold out.',
  },
  {
    id: 'perk-future',
    partnerName: 'NexCafe',
    title: 'Future Perk',
    pointsCost: 100,
    isActive: true,
    stock: 10,
    availableFrom: new Date(Date.now() + 86_400_000),
    validityDays: 30,
    instructions: 'Not available yet.',
  },
];

describe('Redemption API', () => {
  let fixture: Awaited<ReturnType<typeof memberFixture>>;

  beforeEach(async () => {
    fixture = await memberFixture(
      'sr_code,full_name\n24-90001,Member One\n24-90002,Member Two\n',
      'sr_code\n24-90001\n24-90002\n'
    );
    resetLedgerRepository();
    resetPerkRepository();
    resetVoucherRepository();
    resetRedemptionUnitOfWork();
    seedPerks(perks);
  });

  afterEach(async () => {
    resetLedgerRepository();
    resetPerkRepository();
    resetVoucherRepository();
    resetRedemptionUnitOfWork();
    await fixture.cleanup();
  });

  async function grant(memberId: string, amount: number, referenceId: string): Promise<void> {
    await ledgerRepository.create({
      id: referenceId,
      memberId,
      amount,
      reason: 'Test grant',
      type: 'grant',
      referenceId,
      createdBy: 'test-officer',
    });
  }

  it('redeems 500 points to 400 points with a -100 ledger entry and voucher', async () => {
    await grant(member1.srCode, 500, 'grant-500');
    const response = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'redeem-success' });

    expect(response.status).toBe(201);
    expect(response.body.voucher.memberId).toBe(member1.srCode);
    expect(response.body.voucher.code).toMatch(/^[A-Z0-9]{16}$/);
    expect(await ledgerRepository.getBalance(member1.srCode)).toBe(400);

    const history = await ledgerRepository.listByMember(member1.srCode);
    expect(history.some((entry) => entry.type === 'redemption' && entry.amount === -100)).toBe(true);
  });

  it('rejects insufficient points', async () => {
    await grant(member1.srCode, 99, 'grant-99');
    const response = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'insufficient' });
    expect(response.status).toBe(409);
  });

  it('rejects inactive perks', async () => {
    await grant(member1.srCode, 500, 'grant-inactive');
    const response = await request(testApp)
      .post('/perks/perk-inactive/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'inactive' });
    expect(response.status).toBe(404);
  });

  it('rejects out-of-stock perks', async () => {
    await grant(member1.srCode, 500, 'grant-stock');
    const response = await request(testApp)
      .post('/perks/perk-empty/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'stock' });
    expect(response.status).toBe(409);
  });

  it('rejects perks outside their availability window', async () => {
    await grant(member1.srCode, 500, 'grant-window');
    const response = await request(testApp)
      .post('/perks/perk-future/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'window' });
    expect(response.status).toBe(404);
  });

  it('returns 200 with the stored voucher on replay', async () => {
    await grant(member1.srCode, 500, 'grant-replay');
    const first = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'same-key' });
    const replay = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'same-key' });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body.voucher.id).toBe(first.body.voucher.id);
    expect(await ledgerRepository.getBalance(member1.srCode)).toBe(400);
  });

  it('rejects a reused key for a different perk with 422', async () => {
    await grant(member1.srCode, 500, 'grant-key-conflict');
    seedPerks([{
      id: 'perk-200',
      partnerName: 'NexCafe',
      title: 'Second Perk',
      pointsCost: 100,
      isActive: true,
      stock: 10,
      validityDays: 30,
      instructions: 'Second perk.',
    }]);

    const first = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'shared-key' });
    const conflict = await request(testApp)
      .post('/perks/perk-200/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'shared-key' });

    expect(first.status).toBe(201);
    expect(conflict.status).toBe(422);
  });

  it('allows exactly one concurrent redemption for a member with one balance', async () => {
    await grant(member1.srCode, 100, 'grant-concurrent');
    const [first, second] = await Promise.all([
      request(testApp)
        .post('/perks/perk-100/redeem')
        .set('x-test-user', asUser())
        .send({ idempotencyKey: 'concurrent-a' }),
      request(testApp)
        .post('/perks/perk-100/redeem')
        .set('x-test-user', asUser())
        .send({ idempotencyKey: 'concurrent-b' }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
  });

  it('rolls back redemption writes when a failure is injected', async () => {
    await grant(member1.srCode, 500, 'grant-rollback');
    injectRedemptionFailure(new Error('Injected transaction failure'));

    const response = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'rollback-key' });

    expect(response.status).toBe(500);
    expect(await ledgerRepository.getBalance(member1.srCode)).toBe(500);
    expect((await ledgerRepository.listByMember(member1.srCode)).length).toBe(1);
  });

  it('returns 404 for another member voucher', async () => {
    await grant(member1.srCode, 500, 'grant-owner');
    const redeemed = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'owner-key' });
    expect(redeemed.status).toBe(201);

    const response = await request(testApp)
      .get(`/vouchers/${redeemed.body.voucher.id}`)
      .set('x-test-user', asUser(member2));
    expect(response.status).toBe(404);
  });

  it('preserves the ledger replay invariant', async () => {
    await grant(member1.srCode, 500, 'grant-invariant');
    await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'invariant-key' });
    await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({ idempotencyKey: 'invariant-key' });

    const entries = await ledgerRepository.listByMember(member1.srCode);
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(400);
    expect(entries.filter((entry) => entry.type === 'redemption')).toHaveLength(1);
  });

  it('rejects missing idempotencyKey with 400', async () => {
    await grant(member1.srCode, 500, 'grant-missing-key');
    const response = await request(testApp)
      .post('/perks/perk-100/redeem')
      .set('x-test-user', asUser())
      .send({});
    expect(response.status).toBe(400);
  });
});
