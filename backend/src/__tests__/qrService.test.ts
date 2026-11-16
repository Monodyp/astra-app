import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import {
  generateMemberQrToken,
  InvalidQrTokenError,
  verifyQrToken,
} from '../services/qrService.js';

describe('member QR payloads', () => {
  it('encodes only an opaque member reference and verifies its signature', async () => {
    const token = await generateMemberQrToken('24-90001');
    const [encodedPayload] = token.split('.');
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );

    expect(payload).toMatchObject({ v: 1, typ: 'astra-member-id' });
    expect(payload.ref).not.toContain('24-90001');
    expect(payload).not.toHaveProperty('fullName');
    expect(payload).not.toHaveProperty('isPaid');
    await expect(verifyQrToken(token)).resolves.toMatchObject(payload);
  });

  it('rejects a modified payload', async () => {
    const token = await generateMemberQrToken('24-90001');
    const [encodedPayload, signature] = token.split('.');
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );
    payload.ref = 'tampered';
    const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url'
    );

    await expect(
      verifyQrToken(`${modifiedPayload}.${signature}`)
    ).rejects.toBeInstanceOf(InvalidQrTokenError);
  });

  it('rejects malformed tokens', async () => {
    await expect(verifyQrToken('not-a-token')).rejects.toBeInstanceOf(
      InvalidQrTokenError
    );
  });

  it('verifies tokens without returning the encoded member reference', async () => {
    const token = await generateMemberQrToken('24-90001');
    const response = await request(app).get(`/verify/${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ isValid: true });
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
