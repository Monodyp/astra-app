import { describe, expect, it, vi } from 'vitest';
import * as sources from '../services/memberSources.js';
import { createMemberService } from '../services/members.js';

describe('read-only Google Sheets member source', () => {
  const base = {
    membersSheetId: 'member-sheet',
    paidSheetId: 'paid-sheet',
    membersRange: 'Members!A1:B',
    paidRange: 'Paid!A1:A',
    email: 'demo@example.invalid',
    privateKey: 'line-one\\nline-two',
  };
  it('matches membership from configured sheet ranges and header labels', async () => {
    const request = vi.fn(async (options: { url: string }) => ({
      data: {
        values: options.url.includes('/member-sheet/')
          ? [
              ['Student Code', 'Student Name'],
              [' 24-00009 ', ' Demo Member '],
            ]
          : [['Paid Student'], ['24-00009']],
      },
    }));
    const source = sources.createGoogleSheetsMemberSource({
      membersSheetId: 'member-sheet',
      paidSheetId: 'paid-sheet',
      membersRange: 'Members 2026!A1:B',
      paidRange: 'Paid!A1:A',
      membersSrColumn: 'Student Code',
      membersNameColumn: 'Student Name',
      paidSrColumn: 'Paid Student',
      email: 'demo@example.invalid',
      privateKey: 'fake-key',
      createRequester: () => request,
    });
    await expect(
      createMemberService(source).verifyMembership(' 24-00009 ')
    ).resolves.toEqual({ isValid: true });
  });

  it('uses read-only credentials and bounded GET requests at the Google boundary', async () => {
    const request = vi.fn(async () => ({ data: { values: [['sr_code']] } }));
    const createRequester = vi.fn(() => request);
    const source = sources.createGoogleSheetsMemberSource({
      ...base,
      createRequester,
    });
    await expect(source.read()).resolves.toEqual({
      members: [],
      paidSrCodes: [],
    });
    expect(createRequester).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'demo@example.invalid',
        key: 'line-one\nline-two',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        transporterOptions: {
          timeout: 10_000,
          retry: false,
          retryConfig: { retry: 0 },
        },
      })
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://sheets.googleapis.com/v4/spreadsheets/member-sheet/values/Members!A1%3AB',
        method: 'GET',
        timeout: 10_000,
        retry: false,
        params: {
          majorDimension: 'ROWS',
          valueRenderOption: 'FORMATTED_VALUE',
        },
      })
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    {},
    { values: [] },
    { values: [['other']] },
    { values: [['sr_code'], [2490001]] },
    { values: 'broken' },
  ])('rejects malformed upstream data %j', async (data) => {
    const source = sources.createGoogleSheetsMemberSource({
      ...base,
      createRequester: () => async () => ({ data }),
    });
    await expect(source.read()).rejects.toThrow(/^MEMBER_SOURCE_UNAVAILABLE$/);
  });

  it.each([
    'permission denied: private document',
    'timeout',
    'credential private-key error',
  ])('sanitizes upstream failures: %s', async (message) => {
    const source = sources.createGoogleSheetsMemberSource({
      ...base,
      createRequester: () => async () => {
        throw new Error(message);
      },
    });
    await expect(source.read()).rejects.toThrow(/^MEMBER_SOURCE_UNAVAILABLE$/);
  });

  it('accepts short rows when only the optional name is absent', async () => {
    const source = sources.createGoogleSheetsMemberSource({
      ...base,
      createRequester: () => async () => ({
        data: { values: [['sr_code', 'full_name'], ['24-90001']] },
      }),
    });
    await expect(source.read()).resolves.toEqual({
      members: [{ srCode: '24-90001', fullName: null }],
      paidSrCodes: ['24-90001'],
    });
  });
});
