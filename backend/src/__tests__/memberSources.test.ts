import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCsvMemberSource } from '../services/memberSources.js';
import { memberFixture } from './memberFixtures.js';

describe('CSV member source public reader', () => {
  let fixture: Awaited<ReturnType<typeof memberFixture>>;
  beforeEach(async () => {
    fixture = await memberFixture();
  });
  afterEach(async () => {
    await fixture.cleanup();
  });

  it('reads named columns, BOM, CRLF and a quoted multiline member name', async () => {
    await fixture.replaceMembers(
      '\uFEFF FULL_NAME , SR_CODE \r\n"Demo, ""Member""\n09",24-00009\r\n'
    );
    const source = createCsvMemberSource(fixture);
    await expect(source.read()).resolves.toEqual({
      members: [{ srCode: '24-00009', fullName: 'Demo, "Member"\n09' }],
      paidSrCodes: [],
    });
  });

  it('collapses identical projected member records with normalized codes', async () => {
    await fixture.replaceMembers(
      'sr_code,full_name,ignored\n demo-001 ,Demo Member,A\nDEMO-001,Demo Member,B\n'
    );
    await expect(createCsvMemberSource(fixture).read()).resolves.toEqual({
      members: [{ srCode: 'DEMO-001', fullName: 'Demo Member' }],
      paidSrCodes: [],
    });
  });

  it('normalizes and deduplicates the paid column by header name', async () => {
    await fixture.replacePaid(
      'note, SR_CODE \npaid, demo-001 \npaid,DEMO-001\n'
    );
    await expect(createCsvMemberSource(fixture).read()).resolves.toMatchObject({
      paidSrCodes: ['DEMO-001'],
    });
  });

  it('rejects a missing SR header as unavailable instead of an empty roster', async () => {
    await fixture.replaceMembers('other_header\n');
    await expect(createCsvMemberSource(fixture).read()).rejects.toThrow(
      'MEMBER_SOURCE_UNAVAILABLE'
    );
  });

  it('rejects conflicting names for one normalized SR code', async () => {
    await fixture.replaceMembers(
      'sr_code,full_name\n24-90001,Demo One\n24-90001,Demo Two\n'
    );
    await expect(createCsvMemberSource(fixture).read()).rejects.toThrow(
      'MEMBER_SOURCE_UNAVAILABLE'
    );
  });

  it('rejects a populated member row without an SR code', async () => {
    await fixture.replaceMembers('sr_code,full_name\n,Demo Missing Code\n');
    await expect(createCsvMemberSource(fixture).read()).rejects.toThrow(
      'MEMBER_SOURCE_UNAVAILABLE'
    );
  });

  it('sanitizes missing-file errors without disclosing local paths', async () => {
    const source = createCsvMemberSource({
      ...fixture,
      membersPath: fixture.membersPath + '.missing',
    });
    await expect(source.read()).rejects.toThrow(/^MEMBER_SOURCE_UNAVAILABLE$/);
  });

  it('rejects a populated paid row without an SR code', async () => {
    await fixture.replacePaid('sr_code,note\n,paid\n');
    await expect(createCsvMemberSource(fixture).read()).rejects.toThrow(
      'MEMBER_SOURCE_UNAVAILABLE'
    );
  });

  it.each([
    '',
    'sr_code,SR_CODE\n',
    'sr_code,full_name,FULL_NAME\n',
    'sr_code,full_name\n24-90001,"unfinished\n',
    'sr_code,full_name\n24-90001,Name,extra\n',
  ])('rejects malformed member data %j', async (text) => {
    await fixture.replaceMembers(text);
    await expect(createCsvMemberSource(fixture).read()).rejects.toThrow(
      /^MEMBER_SOURCE_UNAVAILABLE$/
    );
  });

  it('accepts header-only sources and ignores fully blank records', async () => {
    await fixture.replaceMembers('sr_code,full_name\n,\n');
    await fixture.replacePaid('sr_code,note\n,\n');
    await expect(createCsvMemberSource(fixture).read()).resolves.toEqual({
      members: [],
      paidSrCodes: [],
    });
  });

  it('ignores whitespace-only lines between CSV records', async () => {
    await fixture.replaceMembers(
      'sr_code,full_name\n   \n24-90001,Demo Member\n'
    );
    await expect(createCsvMemberSource(fixture).read()).resolves.toMatchObject({
      members: [{ srCode: '24-90001', fullName: 'Demo Member' }],
    });
  });
});
