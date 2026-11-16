import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { JWT, type JWTOptions } from 'google-auth-library';
import { z } from 'zod';
import type { Member, MemberSource } from './members.js';
import { normalizeSrCode } from './members.js';

export interface CsvSourceOptions {
  membersPath: string;
  paidPath: string;
  membersSrColumn?: string;
  membersNameColumn?: string;
  paidSrColumn?: string;
}

export interface SheetsReadRequest {
  url: string;
  method: 'GET';
  timeout: number;
  retry: false;
  params: { majorDimension: 'ROWS'; valueRenderOption: 'FORMATTED_VALUE' };
}

export type SheetsRequester = (
  options: SheetsReadRequest
) => Promise<{ data: unknown }>;

export interface GoogleSheetsSourceOptions {
  membersSheetId: string;
  paidSheetId: string;
  membersRange: string;
  paidRange: string;
  email: string;
  privateKey: string;
  membersSrColumn?: string;
  membersNameColumn?: string;
  paidSrColumn?: string;
  createRequester?: (credentials: JWTOptions) => SheetsRequester;
}

export function createGoogleSheetsMemberSource(
  options: GoogleSheetsSourceOptions
): MemberSource {
  const valuesSchema = z.object({ values: z.array(z.array(z.string())) });
  return {
    async read() {
      try {
        const credentials: JWTOptions = {
          email: options.email,
          key: options.privateKey.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          transporterOptions: {
            timeout: 10_000,
            retry: false,
            retryConfig: { retry: 0 },
          },
        };
        const requester = options.createRequester
          ? options.createRequester(credentials)
          : (() => {
              const auth = new JWT(credentials);
              return (request: SheetsReadRequest) =>
                auth.request<unknown>(request);
            })();
        const readValues = async (sheetId: string, range: string) => {
          const response = await requester({
            url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`,
            method: 'GET',
            timeout: 10_000,
            retry: false,
            params: {
              majorDimension: 'ROWS',
              valueRenderOption: 'FORMATTED_VALUE',
            },
          });
          return valuesSchema.parse(response.data).values;
        };
        const [members, paid] = await Promise.all([
          readValues(options.membersSheetId, options.membersRange),
          readValues(options.paidSheetId, options.paidRange),
        ]);
        return snapshotFromRows(members, paid, options);
      } catch {
        throw new Error('MEMBER_SOURCE_UNAVAILABLE');
      }
    },
  };
}

function columnIndex(
  headers: readonly string[],
  column: string,
  required: boolean
): number {
  const matches = headers.flatMap((header, index) =>
    header.trim().toLowerCase() === column.trim().toLowerCase() ? [index] : []
  );
  if (matches.length > 1 || (required && matches.length !== 1)) {
    throw new Error('MEMBER_SOURCE_UNAVAILABLE');
  }
  return matches[0] ?? -1;
}

export function createCsvMemberSource(options: CsvSourceOptions): MemberSource {
  return {
    async read() {
      try {
        const [memberText, paidText] = await Promise.all([
          readFile(options.membersPath, 'utf8'),
          readFile(options.paidPath, 'utf8'),
        ]);
        const members = parse(memberText, {
          bom: true,
          skip_empty_lines: true,
          trim: true,
        }) as string[][];
        const paid = parse(paidText, {
          bom: true,
          skip_empty_lines: true,
          trim: true,
        }) as string[][];
        return snapshotFromRows(members, paid, options);
      } catch {
        throw new Error('MEMBER_SOURCE_UNAVAILABLE');
      }
    },
  };
}

function snapshotFromRows(
  members: string[][],
  paid: string[][],
  options: Pick<
    CsvSourceOptions,
    'membersSrColumn' | 'membersNameColumn' | 'paidSrColumn'
  >
) {
  const srIndex = columnIndex(
    members[0] ?? [],
    options.membersSrColumn ?? 'sr_code',
    true
  );
  const nameIndex = columnIndex(
    members[0] ?? [],
    options.membersNameColumn ?? 'full_name',
    false
  );
  const paidIndex = columnIndex(
    paid[0] ?? [],
    options.paidSrColumn ?? 'sr_code',
    true
  );
  const uniqueMembers = new Map<string, Member>();
  for (const row of members.slice(1)) {
    if (row.every((value) => !value.trim())) continue;
    const srCode = normalizeSrCode(row[srIndex]);
    if (!srCode) throw new Error('MEMBER_SOURCE_UNAVAILABLE');
    const fullName = row[nameIndex]?.trim() || null;
    if (
      uniqueMembers.has(srCode) &&
      uniqueMembers.get(srCode)?.fullName !== fullName
    ) {
      throw new Error('MEMBER_SOURCE_UNAVAILABLE');
    }
    uniqueMembers.set(srCode, { srCode, fullName });
  }
  const paidCodes = new Set<string>();
  for (const row of paid.slice(1)) {
    if (row.every((value) => !value.trim())) continue;
    const srCode = normalizeSrCode(row[paidIndex]);
    if (!srCode) throw new Error('MEMBER_SOURCE_UNAVAILABLE');
    paidCodes.add(srCode);
  }
  return {
    members: [...uniqueMembers.values()],
    paidSrCodes: [...paidCodes],
  };
}
