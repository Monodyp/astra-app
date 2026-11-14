import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMemberFromSheet,
  fetchPaidStatus,
} from '../services/memberSheetService.js';
import { memberFixture } from './memberFixtures.js';
import { createMemberService } from '../services/members.js';
import { createCsvMemberSource } from '../services/memberSources.js';
import { JWT } from 'google-auth-library';

describe('member lookup through the existing public service', () => {
  let fixture: Awaited<ReturnType<typeof memberFixture>>;
  beforeEach(async () => {
    fixture = await memberFixture();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await fixture.cleanup();
  });

  it('retrieves a registered member from an isolated CSV source', async () => {
    await expect(fetchMemberFromSheet('24-90001')).resolves.toEqual({
      srCode: '24-90001',
      fullName: 'Demo Member 01',
    });
  });

  it('matches surrounding spaces in source and request without losing zeros', async () => {
    await fixture.replaceMembers(
      'sr_code,full_name\n  24-00009  , Demo Member 09 \n'
    );
    await expect(fetchMemberFromSheet(' 24-00009 ')).resolves.toEqual({
      srCode: '24-00009',
      fullName: 'Demo Member 09',
    });
  });

  it('returns null for an unknown code without an exception', async () => {
    await expect(fetchMemberFromSheet('99-99999')).resolves.toBeNull();
  });

  it('normalizes letter case in artificial normalization fixtures', async () => {
    await fixture.replaceMembers('sr_code\n demo-001 \n');
    await expect(fetchMemberFromSheet(' DeMo-001 ')).resolves.toEqual({
      srCode: 'DEMO-001',
      fullName: null,
    });
  });

  it('verifies a member present in both sources', async () => {
    await fixture.replacePaid('sr_code\n24-90001\n');
    const service = createMemberService(createCsvMemberSource(fixture));
    await expect(service.verifyMembership('24-90001')).resolves.toEqual({
      isValid: true,
    });
  });

  it('preserves the existing paid-status function for internal callers', async () => {
    await fixture.replacePaid('sr_code\n 24-90001 \n');
    await expect(fetchPaidStatus(' 24-90001 ')).resolves.toBe(true);
  });

  it.each(['24-90001', '99-99999'])(
    'returns not valid for unpaid/unknown %s',
    async (code) => {
      const service = createMemberService(createCsvMemberSource(fixture));
      await expect(service.verifyMembership(code)).resolves.toEqual({
        isValid: false,
      });
      await expect(fetchPaidStatus(code)).resolves.toBe(false);
    }
  );

  it('does not create membership from a paid-only row', async () => {
    await fixture.replacePaid('sr_code\n99-99999\n');
    const service = createMemberService(createCsvMemberSource(fixture));
    await expect(service.verifyMembership('99-99999')).resolves.toEqual({
      isValid: false,
    });
  });

  it('does not infer eligibility or year level from an older enrollment prefix', async () => {
    await fixture.replaceMembers('sr_code\n19-00009\n26-00009\n');
    await fixture.replacePaid('sr_code\n19-00009\n26-00009\n');
    const service = createMemberService(createCsvMemberSource(fixture));
    await expect(service.verifyMembership('19-00009')).resolves.toEqual({
      isValid: true,
    });
    await expect(service.verifyMembership('26-00009')).resolves.toEqual({
      isValid: true,
    });
  });

  it('sees payment removal on the next check without stale cached success', async () => {
    await fixture.replacePaid('sr_code\n24-90001\n');
    const service = createMemberService(createCsvMemberSource(fixture));
    await expect(service.verifyMembership('24-90001')).resolves.toEqual({
      isValid: true,
    });
    await fixture.replacePaid('sr_code\n');
    await expect(service.verifyMembership('24-90001')).resolves.toEqual({
      isValid: false,
    });
  });

  it('refuses the sample CSV source in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(fetchMemberFromSheet('24-90001')).rejects.toThrow(
      'MEMBER_SOURCE_UNAVAILABLE'
    );
  });

  it.each(['', 'invalid', 'google-sheets'])(
    'fails closed for unconfigured source %j',
    async (source) => {
      vi.stubEnv('MEMBER_DATA_SOURCE', source);
      await expect(fetchMemberFromSheet('24-90001')).rejects.toThrow(
        /^MEMBER_SOURCE_UNAVAILABLE$/
      );
    }
  );

  it('looks up real-sheet header labels configured through the environment', async () => {
    vi.stubEnv('MEMBERS_SR_COLUMN', 'Student Code');
    vi.stubEnv('MEMBERS_NAME_COLUMN', 'Student Name');
    vi.stubEnv('PAID_SR_COLUMN', 'Paid Student');
    await fixture.replaceMembers(
      'Student Name,Student Code\nDemo Member,24-90001\n'
    );
    await fixture.replacePaid('Paid Student\n24-90001\n');
    await expect(fetchMemberFromSheet('24-90001')).resolves.toEqual({
      srCode: '24-90001',
      fullName: 'Demo Member',
    });
    await expect(fetchPaidStatus('24-90001')).resolves.toBe(true);
  });

  it('selects configured Google Sheets without falling back to local CSV', async () => {
    for (const [key, value] of Object.entries({
      MEMBER_DATA_SOURCE: 'google-sheets',
      GOOGLE_SERVICE_ACCOUNT_EMAIL: 'demo@example.invalid',
      GOOGLE_PRIVATE_KEY: 'fake-key',
      MEMBERS_SHEET_ID: 'demo-members',
      PAID_SHEET_ID: 'demo-paid',
      MEMBERS_SHEET_RANGE: 'Members!A1:B',
      PAID_SHEET_RANGE: 'Paid!A1:A',
    }))
      vi.stubEnv(key, value);
    const transport = vi
      .spyOn(JWT.prototype, 'request')
      .mockRejectedValue(new Error('private upstream error'));
    await expect(fetchMemberFromSheet('24-90001')).rejects.toThrow(
      /^MEMBER_SOURCE_UNAVAILABLE$/
    );
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        timeout: 10_000,
        retry: false,
        url: 'https://sheets.googleapis.com/v4/spreadsheets/demo-members/values/Members!A1%3AB',
      })
    );
  });
});
