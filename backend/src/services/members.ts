export interface Member {
  srCode: string;
  fullName: string | null;
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

export interface MemberService {
  findMember(srCode: string): Promise<Member | null>;
  isPaid(srCode: string): Promise<boolean>;
  verifyMembership(srCode: string): Promise<MembershipResult>;
}

export function normalizeSrCode(value: string): string {
  return value.trim().toUpperCase();
}

export function createMemberService(source: MemberSource): MemberService {
  return {
    async findMember(srCode) {
      return (
        (await source.read()).members.find(
          (member) => normalizeSrCode(member.srCode) === normalizeSrCode(srCode)
        ) ?? null
      );
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
