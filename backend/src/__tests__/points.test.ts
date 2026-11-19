import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { memberFixture } from './memberFixtures.js';
import { router } from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { testUserMiddleware } from '../middleware/testUser.js';
import { env } from '../config/env.js';
import {
  ledgerRepository,
  resetLedgerRepository,
} from '../repositories/ledgerRepository.js';

const member = {
  uid: 'officer-1',
  srCode: '24-90001',
  role: 'officer',
};

function asUser(user = member) {
  return JSON.stringify(user);
}

const testApp = express();
testApp.use(express.json());
testApp.use(testUserMiddleware);
testApp.use('/', router);
testApp.use(errorHandler);

describe('Points Ledger API', () => {
  let fixture: Awaited<ReturnType<typeof memberFixture>>;

  beforeEach(async () => {
    fixture = await memberFixture(
      'sr_code,full_name\n24-90001,Demo Member 01\n24-90002,Unpaid Member\n24-90003,Demo Member 03\n',
      'sr_code\n24-90001\n24-90003\n'
    );
    resetLedgerRepository();
  });

  afterEach(async () => {
    resetLedgerRepository();
    await fixture.cleanup();
  });

  it('requires an authenticated user', async () => {
    const response = await request(testApp).get('/points/me');
    expect(response.status).toBe(401);
  });

  it('rejects non-officers with 403', async () => {
    const response = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser({ ...member, role: 'member' }))
      .send({ memberId: member.srCode, amount: 50, reason: 'Bonus' });
    expect(response.status).toBe(403);
  });

  it('rejects invalid grant bodies with 400', async () => {
    const response = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send({ memberId: member.srCode, amount: 0, reason: '' });
    expect(response.status).toBe(400);
  });

  it.each(['24-99999', '24-90002'])(
    'rejects unknown or unpaid members without a 500 (%s)',
    async (memberId) => {
      const response = await request(testApp)
        .post('/points/grant')
        .set('x-test-user', asUser())
        .send({ memberId, amount: 50, reason: 'Bonus', idempotencyKey: `unknown-${memberId}` });
      expect(response.status).toBe(404);
    }
  );

  it('rejects a missing idempotency key with 400', async () => {
    const response = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send({
        memberId: member.srCode,
        amount: 50,
        reason: 'Volunteer bonus',
      });
    expect(response.status).toBe(400);
  });

  it('creates a grant and returns 201', async () => {
    const response = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send({
        memberId: ` ${member.srCode.toLowerCase()} `,
        amount: 50,
        reason: 'Volunteer bonus',
        idempotencyKey: 'grant-1',
      });
    expect(response.status).toBe(201);
    expect(response.body.entry).toMatchObject({
      memberId: member.srCode,
      amount: 50,
      type: 'grant',
      referenceId: 'grant-1',
      createdBy: member.uid,
    });
  });

  it('blocks duplicate grants with 409', async () => {
    const body = {
      memberId: member.srCode,
      amount: 50,
      reason: 'Volunteer bonus',
      idempotencyKey: 'grant-duplicate',
    };
    const first = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send(body);
    const second = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it('allows the same idempotency key for two different members', async () => {
    const body = {
      amount: 50,
      reason: 'Volunteer bonus',
      idempotencyKey: 'shared-grant-key',
    };
    const first = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send({ ...body, memberId: member.srCode });
    const second = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send({ ...body, memberId: '24-90003' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it('uses referenceId instead of idempotencyKey when provided', async () => {
    const response = await request(testApp)
      .post('/points/grant')
      .set('x-test-user', asUser())
      .send({
        memberId: member.srCode,
        amount: 50,
        reason: 'Volunteer bonus',
        referenceId: 'external-reference',
        idempotencyKey: 'internal-key',
      });
    expect(response.status).toBe(201);
    expect(response.body.entry.referenceId).toBe('external-reference');
  });

  it('computes balance from the ledger and orders history newest-first', async () => {
    const entries = [
      { id: 'a', memberId: member.srCode, amount: 50, reason: 'A', type: 'grant' as const, referenceId: 'a', createdBy: 'x', createdAt: new Date('2026-01-01T00:00:00Z') },
      { id: 'b', memberId: member.srCode, amount: 20, reason: 'B', type: 'grant' as const, referenceId: 'b', createdBy: 'x', createdAt: new Date('2026-01-02T00:00:00Z') },
      { id: 'c', memberId: member.srCode, amount: -30, reason: 'C', type: 'adjustment' as const, referenceId: 'c', createdBy: 'x', createdAt: new Date('2026-01-03T00:00:00Z') },
    ];
    for (const entry of entries) await ledgerRepository.create(entry);

    const balance = await request(testApp)
      .get('/points/me')
      .set('x-test-user', asUser());
    const history = await request(testApp)
      .get('/points/me/history')
      .set('x-test-user', asUser());

    expect(balance.status).toBe(200);
    expect(balance.body.points).toBe(40);
    expect(history.status).toBe(200);
    expect(history.body.history.map((entry: { id: string }) => entry.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('accepts only positive integer amounts up to the configured maximum', async () => {
    for (const amount of [0, -1, 1.5, 1_000_001]) {
      const response = await request(testApp)
        .post('/points/grant')
        .set('x-test-user', asUser())
        .send({ memberId: member.srCode, amount, reason: 'Bonus' });
      expect(response.status).toBe(400);
    }
  });

  it('ignores x-test-user outside test mode', async () => {
    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'development';
    try {
      const response = await request(testApp)
        .get('/points/me')
        .set('x-test-user', asUser());
      expect(response.status).toBe(401);
    } finally {
      env.NODE_ENV = originalNodeEnv;
    }
  });
});
