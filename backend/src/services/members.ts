import { createHash } from 'node:crypto';

export interface Member {
  srCode: string;
  fullName: string | null;
  email?: string | null;
  membershipId?: string | null;
  controlNumber?: string | null;
  program?: string | null;
  yearLevel?: string | null;
}

export interface MemberSnapshot {
  members: readonly Member[];
  paidSrCodes: readonly string[];
}

export interface MemberSource {
  read(): Promise<MemberSnapshot>;
}

export interface MembershipResult {
  isValid: boolean;
}

export const MEMBER_SEARCH_LIMIT = 20;

export interface MemberSearchPage {
  members: (Member & { membershipStatus: 'verified' | 'unverified' })[];
  hasMore: boolean;
  limit: number;
}

export interface MemberService {
  findMember(srCode: string): Promise<Member | null>;
  findByControlNumber(controlNumber: string): Promise<Member | null>;
  findByQrReference(reference: string): Promise<Member | null>;
  searchMembers(query: string): Promise<Member[]>;
  searchMemberSummaries(query: string): Promise<MemberSearchPage>;
  isPaid(srCode: string): Promise<boolean>;
  verifyMembership(srCode: string): Promise<MembershipResult>;
}

export function normalizeSrCode(value: string): string {
  return value.trim().toUpperCase();
}

export function createMemberService(source: MemberSource): MemberService {
  return {
    async searchMemberSummaries(query) {
      const snapshot = await source.read();
      const needle = normalizeSrCode(query);
      const rank = (member: Member) => {
        const identifiers = [member.srCode, member.controlNumber, member.membershipId]
          .filter((value): value is string => typeof value === 'string')
          .map(normalizeSrCode);
        const fields = [...identifiers, member.fullName?.toUpperCase() ?? '', member.email?.toUpperCase() ?? ''];
        if (identifiers.includes(needle)) return 0;
        if (identifiers.some(value => value.startsWith(needle))) return 1;
        if (fields.some(value => value.startsWith(needle))) return 2;
        return fields.some(value => value.includes(needle)) ? 3 : 4;
      };
      const matches = snapshot.members
        .map(member => ({ member, rank: rank(member) }))
        .filter(match => match.rank < 4)
        .sort((a, b) => a.rank - b.rank || normalizeSrCode(a.member.srCode).localeCompare(normalizeSrCode(b.member.srCode)));
      const paid = new Set(snapshot.paidSrCodes.map(normalizeSrCode));
      return {
        members: matches.slice(0, MEMBER_SEARCH_LIMIT).map(({ member }) => ({
          ...member,
          membershipStatus: paid.has(normalizeSrCode(member.srCode)) ? 'verified' : 'unverified',
        })),
        hasMore: matches.length > MEMBER_SEARCH_LIMIT,
        limit: MEMBER_SEARCH_LIMIT,
      };
    },
    async searchMembers(query) {
      const needle = normalizeSrCode(query);
      const snapshot = await source.read();
      return snapshot.members.filter((member) => {
        const name = member.fullName?.toUpperCase() ?? '';
        const email = member.email?.toUpperCase() ?? '';
        return (
          normalizeSrCode(member.srCode).includes(needle) ||
          [member.membershipId, member.controlNumber].some(value => value && normalizeSrCode(value).includes(needle)) ||
          name.includes(needle) ||
          email.includes(needle)
        );
      });
    },
    async findMember(srCode) {
      return (
        (await source.read()).members.find(
          (member) => normalizeSrCode(member.srCode) === normalizeSrCode(srCode)
        ) ?? null
      );
    },
    async findByControlNumber(controlNumber) {
      const snapshot = await source.read();
      const normalized = normalizeSrCode(controlNumber);
      return (
        snapshot.members.find((member) =>
          [member.controlNumber, member.membershipId].some(
            (value) =>
              typeof value === 'string' &&
              normalizeSrCode(value) === normalized
          )
        ) ?? null
      );
    },
    async findByQrReference(reference) {
      const snapshot = await source.read();
      for (const member of snapshot.members) {
        for (const value of [member.controlNumber, member.membershipId]) {
          if (
            typeof value === 'string' &&
            createHash('sha256')
              .update(normalizeSrCode(value))
              .digest('base64url') === reference
          ) {
            return member;
          }
        }
      }
      return null;
    },
    async isPaid(srCode) {
      const code = normalizeSrCode(srCode);
      return (await source.read()).paidSrCodes.some(
        (paidCode) => normalizeSrCode(paidCode) === code
      );
    },
    async verifyMembership(srCode) {
      const snapshot = await source.read();
      const code = normalizeSrCode(srCode);
      return {
        isValid:
          snapshot.members.some(
            (member) => normalizeSrCode(member.srCode) === code
          ) &&
          snapshot.paidSrCodes.some(
            (paidCode) => normalizeSrCode(paidCode) === code
          ),
      };
    },
  };
}
