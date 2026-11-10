import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import {
  _seedVoucher,
  _resetVoucherStore,
} from '../services/redemptionService.js';

// ---------------------------------------------------------------------------
// NOTE ON AUTH:
// authMiddleware and requireRole are both pass-through stubs in this codebase.
// Until real Firebase Auth is wired up, all requests pass auth/role checks.
//
// When real auth middleware is implemented, update the first two tests to:
//   - Send no token → expect 401
//   - Send wrong-role token → expect 403
// ---------------------------------------------------------------------------

const VALIDATE = '/partner/validate';
const APPLY = '/partner/apply';

function futureDate(daysFromNow = 365): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

function pastDate(daysAgo = 1): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

describe('Partner Redemption API', () => {
  beforeEach(() => {
    _resetVoucherStore();

    // Seed standard test vouchers
    _seedVoucher({
      id: 'v1',
      code: 'NEXCAFE-001',
      status: 'active',
      partnerName: 'NexCafe',
      reward: 'Free Latte',
      expiresAt: futureDate(),
    });
    _seedVoucher({
      id: 'v2',
      code: 'BEANB-001',
      status: 'active',
      partnerName: 'BeanBrew',
      reward: '10% Off Any Drink',
      expiresAt: futureDate(),
    });
    _seedVoucher({
      id: 'v3',
      code: 'USED-001',
      status: 'used',
      partnerName: 'NexCafe',
      reward: 'Free Latte',
    });
    _seedVoucher({
      id: 'v4',
      code: 'EXP-001',
      status: 'active',
      partnerName: 'NexCafe',
      reward: 'Free Latte',
      expiresAt: pastDate(),
    });
  });

  // -------------------------------------------------------------------------
  // Auth stubs (TODO: update when real auth is wired)
  // -------------------------------------------------------------------------

  it('TODO: no token → 401 (currently pass-through, 400 for missing body)', async () => {
    const res = await request(app).post(VALIDATE).send({});
    expect([400, 401]).toContain(res.status);
  });

  it('TODO: wrong role → 403 (currently pass-through, reaches handler)', async () => {
    const res = await request(app)
      .post(VALIDATE)
      .send({ code: 'NEXCAFE-001', partner: 'NexCafe' });
    expect([200, 403]).toContain(res.status);
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  it('POST /partner/validate → 400 when code is missing', async () => {
    const res = await request(app).post(VALIDATE).send({ partner: 'NexCafe' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /partner/validate → 400 when partner is missing', async () => {
    const res = await request(app).post(VALIDATE).send({ code: 'NEXCAFE-001' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /partner/apply → 400 when code is missing', async () => {
    const res = await request(app).post(APPLY).send({ partner: 'NexCafe' });
    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Validate: Business logic
  // -------------------------------------------------------------------------

  it('validate active voucher → { valid: true, reason: "ok", reward: ... }', async () => {
    const res = await request(app)
      .post(VALIDATE)
      .send({ code: 'NEXCAFE-001', partner: 'NexCafe' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.reason).toBe('ok');
    expect(res.body.reward).toBe('Free Latte');
    expect(res.body).not.toHaveProperty('memberId');
    expect(res.body).not.toHaveProperty('studentId');
    expect(res.body).not.toHaveProperty('email');
  });

  it('validate unknown code → not_found', async () => {
    const res = await request(app)
      .post(VALIDATE)
      .send({ code: 'DOES-NOT-EXIST', partner: 'NexCafe' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBe('not_found');
  });

  it('validate wrong partner → wrong_partner', async () => {
    const res = await request(app)
      .post(VALIDATE)
      .send({ code: 'NEXCAFE-001', partner: 'WrongCafe' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBe('wrong_partner');
  });

  it('validate expired voucher → expired', async () => {
    const res = await request(app)
      .post(VALIDATE)
      .send({ code: 'EXP-001', partner: 'NexCafe' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBe('expired');
  });

  it('validate used voucher → already_used', async () => {
    const res = await request(app)
      .post(VALIDATE)
      .send({ code: 'USED-001', partner: 'NexCafe' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBe('already_used');
  });

  // -------------------------------------------------------------------------
  // Apply: Business logic
  // -------------------------------------------------------------------------

  it('apply once → succeeds, returns reward', async () => {
    const res = await request(app)
      .post(APPLY)
      .send({ code: 'NEXCAFE-001', partner: 'NexCafe' });

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(true);
    expect(res.body.reward).toBe('Free Latte');
  });

  it('apply twice → second returns { applied: false, reason: "already_used" }', async () => {
    // First apply
    const first = await request(app)
      .post(APPLY)
      .send({ code: 'NEXCAFE-001', partner: 'NexCafe' });
    expect(first.body.applied).toBe(true);

    // Second apply
    const second = await request(app)
      .post(APPLY)
      .send({ code: 'NEXCAFE-001', partner: 'NexCafe' });
    expect(second.status).toBe(200);
    expect(second.body.applied).toBe(false);
    expect(second.body.reason).toBe('already_used');
  });

  it('apply wrong partner → fails, voucher stays active', async () => {
    const res = await request(app)
      .post(APPLY)
      .send({ code: 'NEXCAFE-001', partner: 'WrongCafe' });

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
    expect(res.body.reason).toBe('wrong_partner');

    // Voucher should still be valid for the correct partner
    const validate = await request(app)
      .post(VALIDATE)
      .send({ code: 'NEXCAFE-001', partner: 'NexCafe' });
    expect(validate.body.valid).toBe(true);
  });

  it('apply expired voucher → fails', async () => {
    const res = await request(app)
      .post(APPLY)
      .send({ code: 'EXP-001', partner: 'NexCafe' });

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
    expect(res.body.reason).toBe('expired');
  });

  it('two simultaneous applies → exactly one succeeds', async () => {
    // Fire two requests at the same time
    const [r1, r2] = await Promise.all([
      request(app).post(APPLY).send({ code: 'BEANB-001', partner: 'BeanBrew' }),
      request(app).post(APPLY).send({ code: 'BEANB-001', partner: 'BeanBrew' }),
    ]);

    const successes = [r1, r2].filter((r) => r.body.applied === true);
    const failures = [r1, r2].filter((r) => r.body.applied === false);

    // In single-process node, the in-memory check is synchronous so exactly one succeeds.
    // In a real PostgreSQL environment, the atomic UPDATE ensures the same guarantee.
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].body.reason).toBe('already_used');
  });
});
