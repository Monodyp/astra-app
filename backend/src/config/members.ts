import './env.js';
import { z } from 'zod';
import { createMemberService } from '../services/members.js';
import {
  createCsvMemberSource,
  createGoogleSheetsMemberSource,
} from '../services/memberSources.js';

const text = z.string().trim().min(1);
const columns = {
  MEMBERS_SR_COLUMN: text.default('sr_code'),
  MEMBERS_NAME_COLUMN: text.default('full_name'),
  MEMBERS_MEMBERSHIP_COLUMN: text.default('membership_id'),
  MEMBERS_CONTROL_COLUMN: text.default('control_number'),
  MEMBERS_PROGRAM_COLUMN: text.default('program'),
  MEMBERS_YEAR_LEVEL_COLUMN: text.default('year_level'),
  MEMBERS_EMAIL_COLUMN: text.default('email'),
  PAID_SR_COLUMN: text.default('sr_code'),
};
const memberConfig = z.discriminatedUnion('MEMBER_DATA_SOURCE', [
  z.object({
    MEMBER_DATA_SOURCE: z.literal('csv'),
    MEMBERS_CSV_PATH: text,
    PAID_CSV_PATH: text,
    ...columns,
  }),
  z.object({
    MEMBER_DATA_SOURCE: z.literal('google-sheets'),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: text.email(),
    GOOGLE_PRIVATE_KEY: text,
    MEMBERS_SHEET_ID: text,
    PAID_SHEET_ID: text,
    MEMBERS_SHEET_RANGE: text,
    PAID_SHEET_RANGE: text,
    ...columns,
  }),
]);

// Read configuration lazily so unrelated backend routes can start without Sheets.
export function getConfiguredMemberService() {
  const result = memberConfig.safeParse(process.env);
  if (!result.success) throw new Error('MEMBER_SOURCE_UNAVAILABLE');
  const config = result.data;
  const columnOptions = {
    membersSrColumn: config.MEMBERS_SR_COLUMN,
    membersNameColumn: config.MEMBERS_NAME_COLUMN,
    membersMembershipColumn: config.MEMBERS_MEMBERSHIP_COLUMN,
    membersControlColumn: config.MEMBERS_CONTROL_COLUMN,
    membersProgramColumn: config.MEMBERS_PROGRAM_COLUMN,
    membersYearLevelColumn: config.MEMBERS_YEAR_LEVEL_COLUMN,
    membersEmailColumn: config.MEMBERS_EMAIL_COLUMN,
    paidSrColumn: config.PAID_SR_COLUMN,
  };
  if (config.MEMBER_DATA_SOURCE === 'google-sheets') {
    return createMemberService(
      createGoogleSheetsMemberSource({
        ...columnOptions,
        membersSheetId: config.MEMBERS_SHEET_ID,
        paidSheetId: config.PAID_SHEET_ID,
        membersRange: config.MEMBERS_SHEET_RANGE,
        paidRange: config.PAID_SHEET_RANGE,
        email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: config.GOOGLE_PRIVATE_KEY,
      })
    );
  }
  if (process.env.NODE_ENV === 'production')
    throw new Error('MEMBER_SOURCE_UNAVAILABLE');
  return createMemberService(
    createCsvMemberSource({
      ...columnOptions,
      membersPath: config.MEMBERS_CSV_PATH,
      paidPath: config.PAID_CSV_PATH,
    })
  );
}
