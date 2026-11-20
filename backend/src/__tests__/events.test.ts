import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { _resetStore, _seedMember } from '../services/attendanceService.js';
import { generateMemberQrToken } from '../services/qrService.js';

describe('Event check-in API', () => {
  beforeEach(() => {
    _resetStore();
  });

  it('checks in a member from a valid QR token and awards points', async () => {
    _seedMember('ASTR1D-0001', 'Jane Doe');
    const qrToken = await generateMemberQrToken('ASTR1D-0001');

    const response = await request(app)
      .post('/events/event-001/checkin')
      .send({ qrToken });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      awarded: true,
      checkedIn: true,
    });
    expect(response.body.points).toBeGreaterThan(0);
  });

  it('rejects malformed QR tokens without recording attendance', async () => {
    _seedMember('ASTR1D-0001');

    const response = await request(app)
      .post('/events/event-001/checkin')
      .send({ qrToken: 'invalid-token' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid or expired QR token',
      checkedIn: false,
    });
  });

  it('returns a business failure for a duplicate check-in', async () => {
    _seedMember('ASTR1D-0001');
    const qrToken = await generateMemberQrToken('ASTR1D-0001');
    const first = await request(app)
      .post('/events/event-001/checkin')
      .send({ qrToken });
    const second = await request(app)
      .post('/events/event-001/checkin')
      .send({ qrToken });

    expect(first.body.awarded).toBe(true);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({
      awarded: false,
      checkedIn: false,
      reason: 'already_checked_in',
    });
  });

  it('requires a QR token', async () => {
    const response = await request(app)
      .post('/events/event-001/checkin')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid input');
  });
});
