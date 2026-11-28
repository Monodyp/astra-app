import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { JWT } from 'google-auth-library';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { app } from '../app.js';
import { firebaseAdmin } from '../lib/firebase.js';
import { extractBatstateuSrCode, userFromDecodedToken } from '../lib/authUser.js';
import { memberFixture } from './memberFixtures.js';

function fakeDecodedToken(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
  return {
    aud: 'aa-26-512915',
    auth_time: 1000,
    exp: 9999999999,
    firebase: { identities: {}, sign_in_provider: 'google.com' },
    iat: 1000,
    iss: 'https://securetoken.google.com/aa-26-512915',
    sub: 'uid-1',
    uid: 'uid-1',
    ...overrides,
  };
}

describe('BatStateU email extraction and member auth endpoints', () => {
  let fixture: Awaited<ReturnType<typeof memberFixture>>;

  beforeEach(async () => {
    fixture = await memberFixture();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fixture.cleanup();
  });

  it('extracts SR code from verified @g.batstate-u.edu.ph email', () => {
    expect(extractBatstateuSrCode('24-02282@g.batstate-u.edu.ph', true)).toBe('24-02282');
    expect(extractBatstateuSrCode(' 24-02282@G.BATSTATE-U.EDU.PH ', true)).toBe('24-02282');
    expect(extractBatstateuSrCode('24-02282@g.batstate-u.edu.ph', false)).toBeNull();
    expect(extractBatstateuSrCode('user@gmail.com', true)).toBeNull();
  });

  it('prefers explicit srCode claim over BatStateU email and falls back to uid otherwise', () => {
    const fromClaim = userFromDecodedToken(
      fakeDecodedToken({
        uid: 'uid-1',
        email: '24-02282@g.batstate-u.edu.ph',
        email_verified: true,
        srCode: '24-99999',
        role: 'officer',
      })
    );
    expect(fromClaim.srCode).toBe('24-99999');
    expect(fromClaim.role).toBe('officer');

    const fromEmail = userFromDecodedToken(
      fakeDecodedToken({
        uid: 'uid-2',
        email: '24-02282@g.batstate-u.edu.ph',
        email_verified: true,
        name: 'Juan Dela Cruz',
      })
    );
    expect(fromEmail.srCode).toBe('24-02282');
    expect(fromEmail.displayName).toBe('Juan Dela Cruz');

    const fallback = userFromDecodedToken(
      fakeDecodedToken({
        uid: 'uid-3',
        email: 'personal@gmail.com',
        email_verified: true,
      })
    );
    expect(fallback.srCode).toBe('uid-3');
  });

  it('returns extracted srCode on POST /auth/login for @g.batstate-u.edu.ph token', async () => {
    vi.spyOn(firebaseAdmin.auth(), 'verifyIdToken').mockResolvedValue(
      fakeDecodedToken({
        uid: 'uid-batstateu',
        email: '24-02282@g.batstate-u.edu.ph',
        email_verified: true,
      })
    );

    const res = await request(app)
      .post('/auth/login')
      .send({ idToken: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: { uid: 'uid-batstateu', srCode: '24-02282', role: 'member' },
    });
  });

  it('marks a member in both roster and paid sheet as verified (isPaid: true)', async () => {
    await fixture.replaceMembers('sr_code,full_name\n24-02282,Juan Dela Cruz\n');
    await fixture.replacePaid('sr_code\n24-02282\n');

    vi.spyOn(firebaseAdmin.auth(), 'verifyIdToken').mockResolvedValue(
      fakeDecodedToken({
        uid: 'uid-paid',
        email: '24-02282@g.batstate-u.edu.ph',
        email_verified: true,
      })
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer paid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      member: {
        uid: 'uid-paid',
        srCode: '24-02282',
        fullName: 'Juan Dela Cruz',
        membershipId: null,
        controlNumber: null,
        program: null,
        yearLevel: null,
        email: '24-02282@g.batstate-u.edu.ph',
        isPaid: true,
        role: 'member',
      },
    });
  });

  it('lets an unpaid BatStateU member log in as unverified even if not yet on the sheet', async () => {
    await fixture.replaceMembers('sr_code,full_name\n24-90001,Someone Else\n');
    await fixture.replacePaid('sr_code\n24-90001\n');

    vi.spyOn(firebaseAdmin.auth(), 'verifyIdToken').mockResolvedValue(
      fakeDecodedToken({
        uid: 'uid-unpaid',
        email: '24-02282@g.batstate-u.edu.ph',
        email_verified: true,
        name: 'Juan Dela Cruz',
      })
    );

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer unpaid-token');

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({
      member: {
        uid: 'uid-unpaid',
        srCode: '24-02282',
        fullName: 'Juan Dela Cruz',
        membershipId: null,
        controlNumber: null,
        program: null,
        yearLevel: null,
        email: '24-02282@g.batstate-u.edu.ph',
        isPaid: false,
        role: 'member',
      },
    });

    const idRes = await request(app)
      .get('/members/me/id')
      .set('Authorization', 'Bearer unpaid-token');

    expect(idRes.status).toBe(200);
    expect(idRes.body).toEqual({
      card: {
        studentId: '24-02282',
        fullName: 'Juan Dela Cruz',
        membershipId: null,
        program: null,
        yearLevel: null,
        isPaid: false,
        qrToken: '',
        qrExpiresAt: null,
        qrStatus: 'inactive',
      },
    });
  });

  it('returns expiry for an assigned ID and keeps paid membership when provisioning is missing', async () => {
    await fixture.replaceMembers('sr_code,full_name,control_number\n24-02282,Juan Dela Cruz,ASTR1D-0042\n');
    await fixture.replacePaid('sr_code\n24-02282\n');
    vi.spyOn(firebaseAdmin.auth(), 'verifyIdToken').mockResolvedValue(fakeDecodedToken({ srCode: '24-02282', email_verified: true }));
    const issued = await request(app).get('/members/me/id').set('Authorization', 'Bearer paid-token');
    expect(issued.status).toBe(200);
    expect(issued.body.card).toMatchObject({ isPaid: true, qrStatus: 'ready' });
    expect(Date.parse(issued.body.card.qrExpiresAt)).toBeGreaterThan(Date.now());
    expect(issued.body.card.qrToken.split('.')).toHaveLength(2);
    await fixture.replaceMembers('sr_code,full_name\n24-02282,Juan Dela Cruz\n');
    const unprovisioned = await request(app).get('/members/me/id').set('Authorization', 'Bearer paid-token');
    expect(unprovisioned.status).toBe(200);
    expect(unprovisioned.body.card).toMatchObject({ isPaid: true, qrStatus: 'provisioning_required', qrToken: '', qrExpiresAt: null });
    expect(unprovisioned.headers['cache-control']).toContain('no-store');
  });

  it('rejects an unknown non-BatStateU account with 404 Member not found', async () => {
    vi.spyOn(firebaseAdmin.auth(), 'verifyIdToken').mockResolvedValue(
      fakeDecodedToken({
        uid: 'uid-random',
        email: 'outsider@gmail.com',
        email_verified: true,
      })
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer outsider-token');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Member not found' });
  });

  it('supports a single Google Sheet tab without separate PAID_SHEET_* env vars', async () => {
    for (const [key, value] of Object.entries({
      MEMBER_DATA_SOURCE: 'google-sheets',
      GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sheets@example.invalid',
      GOOGLE_PRIVATE_KEY: 'fake-key',
      MEMBERS_SHEET_ID: 'directory-sheet',
      MEMBERS_SHEET_RANGE: 'Members Tab!A1:D',
      MEMBERS_SR_COLUMN: 'SR Code',
      MEMBERS_NAME_COLUMN: 'Full Name',
    })) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv('PAID_SHEET_ID', '');
    vi.stubEnv('PAID_SHEET_RANGE', '');
    vi.stubEnv('PAID_SR_COLUMN', '');

    vi.spyOn(JWT.prototype, 'request').mockResolvedValue({
      data: {
        values: [
          ['Timestamp', 'Full Name', 'SR Code', 'Program'],
          ['2026-10-01', 'Maria Clara', '24-02282', 'BSCS'],
        ],
      },
    } as never);

    vi.spyOn(firebaseAdmin.auth(), 'verifyIdToken').mockResolvedValue(
      fakeDecodedToken({
        uid: 'uid-sheet',
        email: '24-02282@g.batstate-u.edu.ph',
        email_verified: true,
      })
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer sheet-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      member: {
        uid: 'uid-sheet',
        srCode: '24-02282',
        fullName: 'Maria Clara',
        membershipId: null,
        controlNumber: null,
        program: 'BSCS',
        yearLevel: null,
        email: '24-02282@g.batstate-u.edu.ph',
        isPaid: true,
        role: 'member',
      },
    });
  });
});
