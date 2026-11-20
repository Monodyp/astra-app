import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetStore,
  _seedMember,
  resolveCheckInIdentity,
} from '../services/attendanceService.js';
import { generateMemberQrToken } from '../services/qrService.js';

describe('attendance identity resolution', () => {
  beforeEach(() => {
    _resetStore();
  });

  it('resolves a verified QR token to the seeded member', async () => {
    _seedMember('ASTR1D-0002');
    const token = await generateMemberQrToken('ASTR1D-0002');

    await expect(resolveCheckInIdentity({ qrToken: token })).resolves.toBe(
      'ASTR1D-0002'
    );
  });

  it('returns no identity when a valid token belongs to an unknown member', async () => {
    const token = await generateMemberQrToken('ASTR1D-0003');

    await expect(resolveCheckInIdentity({ qrToken: token })).resolves.toBe('');
  });
});
