import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { memberFixture } from './memberFixtures.js';

describe('membership verification HTTP API', () => {
  let fixture: Awaited<ReturnType<typeof memberFixture>>;
  beforeEach(async () => {
    fixture = await memberFixture();
  });
  afterEach(async () => {
    await fixture.cleanup();
  });

  it('mounts the endpoint and returns only validity for a paid member', async () => {
    await fixture.replacePaid('sr_code\n24-90001\n');
    const response = await request(app)
      .post('/members/verify')
      .send({ srCode: '24-90001' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ isValid: true });
  });

  it('rejects blank input before reading an unavailable source', async () => {
    vi.stubEnv('MEMBER_DATA_SOURCE', 'unavailable');
    const response = await request(app)
      .post('/members/verify')
      .send({ srCode: '   ' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'INVALID_SR_CODE' });
  });

  it.each([
    {},
    { srCode: null },
    { srCode: 2490001 },
    { srCode: [] },
    { srCode: 'x'.repeat(129) },
  ])('rejects invalid JSON fields %j', async (input) => {
    const response = await request(app).post('/members/verify').send(input);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'INVALID_SR_CODE' });
  });

  it.each(['24-90001', '99-99999'])(
    'returns normal not valid for unpaid/unknown %s',
    async (srCode) => {
      const response = await request(app)
        .post('/members/verify')
        .send({ srCode });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ isValid: false });
    }
  );

  it('handles surrounding spaces and discloses no member information', async () => {
    await fixture.replacePaid('sr_code\n 24-90001 \n');
    const response = await request(app)
      .post('/members/verify')
      .send({ srCode: ' 24-90001 ' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ isValid: true });
  });

  it('returns sanitized 503 when source access fails', async () => {
    vi.stubEnv(
      'MEMBERS_CSV_PATH',
      fixture.membersPath + '.missing-private-path'
    );
    const response = await request(app)
      .post('/members/verify')
      .send({ srCode: '24-90001' });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'MEMBER_SOURCE_UNAVAILABLE' });
  });

  it('prevents caching membership responses', async () => {
    const response = await request(app)
      .post('/members/verify')
      .send({ srCode: '24-90001' });
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
