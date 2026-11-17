import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const QR_PURPOSE = 'astra-member-id';
const QR_VERSION = 1;
const CONTROL_NUMBER_PATTERN = /^ASTR1D-(\d{4})$/;

export interface MemberQrPayload {
  v: typeof QR_VERSION;
  typ: typeof QR_PURPOSE;
  ref: string;
  iat: number;
  exp: number;
  jti: string;
}

export class InvalidQrTokenError extends Error {
  constructor() {
    super('Invalid or expired QR token');
    this.name = 'InvalidQrTokenError';
  }
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(unsignedToken: string): string {
  return createHmac('sha256', env.QR_SIGNING_SECRET)
    .update(unsignedToken)
    .digest('base64url');
}

function memberReference(memberId: string): string {
  return createHash('sha256')
    .update(memberId.trim().toUpperCase())
    .digest('base64url');
}

function isMemberQrPayload(value: unknown): value is MemberQrPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  return (
    payload.v === QR_VERSION &&
    payload.typ === QR_PURPOSE &&
    typeof payload.ref === 'string' &&
    payload.ref.length > 0 &&
    typeof payload.iat === 'number' &&
    Number.isInteger(payload.iat) &&
    typeof payload.exp === 'number' &&
    Number.isInteger(payload.exp) &&
    typeof payload.jti === 'string' &&
    payload.jti.length > 0 &&
    payload.exp > now &&
    payload.iat <= now &&
    payload.exp - payload.iat === env.QR_TOKEN_TTL_SECONDS
  );
}

export async function generateMemberQrToken(memberId: string): Promise<string> {
  const controlNumber = memberId.trim().toUpperCase();
  const controlNumberMatch = CONTROL_NUMBER_PATTERN.exec(controlNumber);
  if (!controlNumberMatch || Number(controlNumberMatch[1]) < 1) {
    throw new TypeError('memberId must match ASTR1D-0001 or higher');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: MemberQrPayload = {
    v: QR_VERSION,
    typ: QR_PURPOSE,
    ref: memberReference(controlNumber),
    iat: now,
    exp: now + env.QR_TOKEN_TTL_SECONDS,
    jti: randomUUID(),
  };
  const encodedPayload = encode(JSON.stringify(payload));
  const unsignedToken = `${encodedPayload}.${sign(encodedPayload)}`;
  return unsignedToken;
}

export async function verifyQrToken(token: string): Promise<MemberQrPayload> {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new InvalidQrTokenError();
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    throw new InvalidQrTokenError();
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );
  } catch {
    throw new InvalidQrTokenError();
  }

  if (!isMemberQrPayload(payload)) {
    throw new InvalidQrTokenError();
  }

  return payload;
}
