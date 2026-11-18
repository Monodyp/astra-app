import {
  DataError,
  type ActivityEntry,
  type AttendanceRecord,
  type CheckInInput,
  type CheckInResult,
  type CheckInStation,
  type ClaimResult,
  type DigitalId,
  type GrantPointsInput,
  type GrantPointsResult,
  type MemberOverview,
  type MemberSearchResult,
  type Perk,
  type PerkCatalog,
  type PerkCategory,
  type PortalDataSource,
  type ScanSample,
  type Session,
  type SignInInput,
  type SignInShortcut,
  type Voucher,
} from '../contracts.js';
import {
  DEMO_SCAN_SAMPLES,
  DEMO_SHORTCUTS,
  type DemoMember,
  type DemoRecords,
  type DemoVoucher,
} from './fixtures.js';
import { DemoStore, createTabStorage, type KeyValueStorage } from './store.js';

export interface DemoSourceOptions {
  storage?: KeyValueStorage;
  latencyMs?: number;
  now?: () => Date;
}

const CATEGORY_LABELS: Record<PerkCategory, string> = {
  discount: 'Discounts',
  merch: 'Merch / Collectibles',
  workshop: 'Partner Workshops',
  food: 'Food & Drink',
};

const RECENT_ACTIVITY_LIMIT = 5;
const SEARCH_RESULT_LIMIT = 6;
const MAX_GRANT = 1000;

const STATUS_LABELS: Record<ActivityEntry['kind'], string> = {
  points_granted: 'Points granted',
  event_checked_in: 'Checked in',
  voucher_claimed: 'Voucher claimed',
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function newestFirst(a: string, b: string): number {
  return Date.parse(b) - Date.parse(a);
}

function nextId(records: DemoRecords, prefix: string): string {
  records.sequence += 1;
  return `${prefix}-${records.sequence}`;
}

function balanceOf(records: DemoRecords, memberId: string): number {
  return records.ledger
    .filter((entry) => entry.memberId === memberId)
    .reduce((total, entry) => total + entry.delta, 0);
}

function findMember(records: DemoRecords, memberId: string): DemoMember {
  const member = records.members.find((item) => item.memberId === memberId);
  if (!member) {
    throw new DataError('not_found', 'That member record does not exist.');
  }
  return member;
}

function toSession(member: DemoMember): Session {
  return {
    user: {
      memberId: member.memberId,
      studentId: member.studentId,
      fullName: member.fullName,
      displayName: member.displayName,
      email: member.email,
      role: member.role,
      membershipStatus: member.duesPaid ? 'verified' : 'unverified',
    },
  };
}

function toSearchResult(
  records: DemoRecords,
  member: DemoMember
): MemberSearchResult {
  return {
    memberId: member.memberId,
    fullName: member.fullName,
    studentId: member.studentId,
    membershipStatus: member.duesPaid ? 'verified' : 'unverified',
    balance: balanceOf(records, member.memberId),
  };
}

export function createDemoDataSource(
  options: DemoSourceOptions = {}
): PortalDataSource & { reset(): void } {
  const store = new DemoStore(options.storage ?? createTabStorage());
  const latencyMs = options.latencyMs ?? 0;
  const now = options.now ?? (() => new Date());

  async function settle(): Promise<void> {
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
  }

  function currentMember(records: DemoRecords): DemoMember {
    const memberId = store.readSessionMemberId();
    const member = memberId
      ? records.members.find((item) => item.memberId === memberId)
      : undefined;
    if (!member) {
      throw new DataError('unauthenticated', 'Sign in to continue.');
    }
    return member;
  }

  function currentOfficer(records: DemoRecords): DemoMember {
    const member = currentMember(records);
    if (member.role !== 'officer') {
      throw new DataError('forbidden', 'Officer access is required.');
    }
    return member;
  }

  function voucherState(voucher: DemoVoucher): Voucher['state'] {
    if (voucher.redeemedAt) {
      return 'redeemed';
    }
    return new Date(voucher.expiresAt) < now() ? 'expired' : 'ready';
  }

  function toVoucher(records: DemoRecords, voucher: DemoVoucher): Voucher {
    const perk = records.perks.find((item) => item.id === voucher.perkId);
    if (!perk) {
      throw new DataError('not_found', 'That perk no longer exists.');
    }
    return {
      id: voucher.id,
      code: voucher.code,
      perkId: perk.id,
      perkName: perk.name,
      partner: perk.partner,
      category: perk.category,
      categoryLabel: CATEGORY_LABELS[perk.category],
      bannerLabel: perk.bannerLabel,
      title: `Voucher Claimed: ${perk.partner}`,
      state: voucherState(voucher),
      claimedAt: voucher.claimedAt,
      expiresAt: voucher.expiresAt,
      redeemedAt: voucher.redeemedAt,
      qrValue: voucher.qrToken,
      terms: [...perk.terms],
    };
  }

  function memberVouchers(records: DemoRecords, memberId: string): Voucher[] {
    return records.vouchers
      .filter((voucher) => voucher.memberId === memberId)
      .sort((a, b) => newestFirst(a.claimedAt, b.claimedAt))
      .map((voucher) => toVoucher(records, voucher));
  }

  function roster(records: DemoRecords, eventId: string): AttendanceRecord[] {
    return records.attendance
      .filter((item) => item.eventId === eventId)
      .sort((a, b) => newestFirst(a.checkedInAt, b.checkedInAt))
      .map((item) => {
        const member = findMember(records, item.memberId);
        return {
          id: item.id,
          memberName: member.fullName,
          studentId: member.studentId,
          pointsAwarded: item.pointsAwarded,
          checkedInAt: item.checkedInAt,
        };
      });
  }

  function toPerk(records: DemoRecords, memberId: string, id: string): Perk {
    const perk = records.perks.find((item) => item.id === id);
    if (!perk) {
      throw new DataError('not_found', 'That perk does not exist.');
    }
    const claimed = records.vouchers.filter(
      (voucher) => voucher.memberId === memberId && voucher.perkId === id
    ).length;
    return {
      id: perk.id,
      name: perk.name,
      partner: perk.partner,
      category: perk.category,
      categoryLabel: CATEGORY_LABELS[perk.category],
      eyebrow: perk.eyebrow,
      headline: perk.headline,
      subline: perk.subline,
      description: perk.description,
      cost: perk.cost,
      remainingStock: perk.stock,
      remainingClaims: Math.max(0, perk.claimLimit - claimed),
      featured: perk.featured,
    };
  }

  return {
    async restoreSession() {
      await settle();
      const memberId = store.readSessionMemberId();
      if (!memberId) {
        return null;
      }
      const records = store.read();
      const member = records.members.find((item) => item.memberId === memberId);
      if (!member) {
        store.clearSession();
        return null;
      }
      return toSession(member);
    },

    async listSignInShortcuts(): Promise<SignInShortcut[]> {
      await settle();
      const records = store.read();
      return DEMO_SHORTCUTS.map((shortcut) => ({
        id: shortcut.id,
        label: shortcut.label,
        description: shortcut.description,
        identifier: findMember(records, shortcut.memberId).studentId,
      }));
    },

    async signIn(input: SignInInput) {
      await settle();
      const records = store.read();
      let member: DemoMember | undefined;
      if (input.method === 'google') {
        throw new DataError(
          'unsupported',
          'Google sign-in is not available in the demo. Use a sample account.'
        );
      }
      if (input.method === 'shortcut') {
        const shortcut = DEMO_SHORTCUTS.find(
          (item) => item.id === input.shortcutId
        );
        member = shortcut ? findMember(records, shortcut.memberId) : undefined;
      } else {
        const identifier = input.identifier.trim().toLowerCase();
        if (!identifier || !input.password) {
          throw new DataError(
            'invalid_input',
            'Enter your student ID or email and your password.'
          );
        }
        member = records.members.find(
          (item) =>
            item.studentId.toLowerCase() === identifier ||
            item.email.toLowerCase() === identifier
        );
      }
      if (!member) {
        throw new DataError(
          'invalid_credentials',
          'No account matches that student ID or email.'
        );
      }
      store.writeSession(member.memberId);
      return toSession(member);
    },

    async signOut() {
      await settle();
      store.clearSession();
    },

    async getOverview(): Promise<MemberOverview> {
      await settle();
      const records = store.read();
      const member = currentMember(records);
      const entries = records.ledger
        .filter((entry) => entry.memberId === member.memberId)
        .sort((a, b) => newestFirst(a.occurredAt, b.occurredAt));
      const attended = records.attendance
        .filter((item) => item.memberId === member.memberId)
        .sort((a, b) => newestFirst(a.checkedInAt, b.checkedInAt));
      const lastEvent = attended[0]
        ? records.events.find((event) => event.id === attended[0].eventId)
        : undefined;
      const ready = memberVouchers(records, member.memberId).filter(
        (voucher) => voucher.state === 'ready'
      );
      return {
        member: {
          fullName: member.fullName,
          membershipId: member.memberId,
          studentId: member.studentId,
          program: member.program,
          membershipStatus: member.duesPaid ? 'verified' : 'unverified',
        },
        points: balanceOf(records, member.memberId),
        eventsAttended: attended.length,
        lastEventName: lastEvent?.name ?? null,
        activeVoucherCount: ready.length,
        activeVoucherHighlight: ready[0]?.perkName ?? null,
        recentActivity: entries
          .slice(0, RECENT_ACTIVITY_LIMIT)
          .map((entry) => ({
            id: entry.id,
            kind: entry.kind,
            title: entry.title,
            reference: entry.reference,
            statusLabel: STATUS_LABELS[entry.kind],
            pointsDelta: entry.delta,
            occurredAt: entry.occurredAt,
          })),
        activityCount: entries.length,
      };
    },

    async getDigitalId(): Promise<DigitalId> {
      await settle();
      const records = store.read();
      const member = currentMember(records);
      const verified = member.duesPaid;
      return {
        fullName: member.fullName,
        studentId: member.studentId,
        membershipId: member.memberId,
        program: member.program,
        yearLevel: member.yearLevel,
        roleLabel: verified
          ? member.role === 'officer'
            ? 'Officer'
            : 'Member'
          : 'Non-member',
        membershipStatus: verified ? 'verified' : 'unverified',
        qrValue: member.qrToken,
        statusNote: verified ? 'Annual dues paid' : 'Membership inactive',
      };
    },

    async listPerks(): Promise<PerkCatalog> {
      await settle();
      const records = store.read();
      const member = currentMember(records);
      return {
        perks: records.perks.map((perk) =>
          toPerk(records, member.memberId, perk.id)
        ),
        balance: balanceOf(records, member.memberId),
      };
    },

    async claimPerk(perkId: string): Promise<ClaimResult> {
      await settle();
      return store.update((records) => {
        const member = currentMember(records);
        const perk = toPerk(records, member.memberId, perkId);
        const balance = balanceOf(records, member.memberId);
        const decline = (
          reason: Extract<ClaimResult, { status: 'declined' }>['reason'],
          message: string
        ): ClaimResult => ({ status: 'declined', reason, message, balance });

        if (!member.duesPaid) {
          return decline(
            'membership_inactive',
            'Your membership is inactive. Pay your annual dues to claim perks.'
          );
        }
        if (perk.remainingStock <= 0) {
          return decline('out_of_stock', 'This perk is out of stock.');
        }
        if (perk.remainingClaims <= 0) {
          return decline(
            'claim_limit',
            'You have reached the claim limit for this perk.'
          );
        }
        if (balance < perk.cost) {
          return decline(
            'insufficient_points',
            `You need ${perk.cost - balance} more points to claim this perk.`
          );
        }

        const stored = records.perks.find((item) => item.id === perkId)!;
        const claimedAt = now();
        const expiresAt = new Date(
          claimedAt.getTime() + stored.validDays * 24 * 60 * 60 * 1000
        );
        const id = nextId(records, 'V');
        const serial = String(70000 + records.sequence);
        const voucher: DemoVoucher = {
          id,
          code: `ASTR-PRK-${serial}`,
          memberId: member.memberId,
          perkId,
          claimedAt: claimedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          redeemedAt: null,
          qrToken: `demo-voucher.v1.${serial}`,
        };
        stored.stock -= 1;
        records.vouchers.push(voucher);
        records.ledger.push({
          id: nextId(records, 'L'),
          memberId: member.memberId,
          delta: -stored.cost,
          kind: 'voucher_claimed',
          title: stored.name,
          reference: voucher.code,
          occurredAt: claimedAt.toISOString(),
        });
        return {
          status: 'claimed',
          voucher: toVoucher(records, voucher),
          balance: balance - stored.cost,
        };
      });
    },

    async listVouchers(): Promise<Voucher[]> {
      await settle();
      const records = store.read();
      return memberVouchers(records, currentMember(records).memberId);
    },

    async getVoucher(voucherId: string): Promise<Voucher> {
      await settle();
      const records = store.read();
      const member = currentMember(records);
      const voucher = records.vouchers.find(
        (item) => item.id === voucherId && item.memberId === member.memberId
      );
      if (!voucher) {
        throw new DataError('not_found', 'That voucher is not in your wallet.');
      }
      return toVoucher(records, voucher);
    },

    async getCheckInStation(): Promise<CheckInStation> {
      await settle();
      const records = store.read();
      currentOfficer(records);
      const event = records.events.find(
        (item) => item.id === records.currentEventId
      )!;
      return { event: clone(event), roster: roster(records, event.id) };
    },

    async listScanSamples(): Promise<ScanSample[]> {
      await settle();
      currentOfficer(store.read());
      return DEMO_SCAN_SAMPLES.map((sample) => ({ ...sample }));
    },

    async checkIn(input: CheckInInput): Promise<CheckInResult> {
      await settle();
      return store.update((records) => {
        currentOfficer(records);
        const event = records.events.find((item) => item.id === input.eventId);
        if (!event) {
          throw new DataError('not_found', 'That event does not exist.');
        }
        const reject = (
          reason: Extract<CheckInResult, { outcome: 'rejected' }>['reason'],
          message: string
        ): CheckInResult => ({
          outcome: 'rejected',
          reason,
          message,
          roster: roster(records, event.id),
        });

        let member: DemoMember | undefined;
        if (input.method === 'scan') {
          member = records.members.find(
            (item) => item.qrToken === input.credential
          );
          if (!member) {
            return reject(
              'invalid_credential',
              'This QR is not a recognized ASTRA member ID.'
            );
          }
        } else {
          const studentId = input.studentId.trim();
          if (!studentId) {
            throw new DataError('invalid_input', 'Enter a student ID.');
          }
          member = records.members.find((item) => item.studentId === studentId);
          if (!member) {
            return reject(
              'unknown_member',
              `No member has the student ID ${studentId}.`
            );
          }
        }

        if (!member.duesPaid) {
          return reject(
            'membership_inactive',
            `${member.fullName} does not have an active membership. No attendance or points were recorded.`
          );
        }
        const memberId = member.memberId;
        const already = records.attendance.some(
          (item) => item.eventId === event.id && item.memberId === memberId
        );
        if (already) {
          return reject(
            'duplicate',
            `${member.fullName} is already checked in to ${event.name}.`
          );
        }

        const checkedInAt = now().toISOString();
        const attendanceId = nextId(records, 'A');
        records.attendance.push({
          id: attendanceId,
          eventId: event.id,
          memberId,
          pointsAwarded: event.points,
          checkedInAt,
        });
        records.ledger.push({
          id: nextId(records, 'L'),
          memberId,
          delta: event.points,
          kind: 'event_checked_in',
          title: event.name,
          reference: event.id,
          occurredAt: checkedInAt,
        });
        const updated = roster(records, event.id);
        return {
          outcome: 'accepted',
          record: updated.find((item) => item.id === attendanceId)!,
          roster: updated,
          message: `${member.fullName} checked in. +${event.points} pts`,
        };
      });
    },

    async searchMembers(query: string): Promise<MemberSearchResult[]> {
      await settle();
      const records = store.read();
      currentOfficer(records);
      const needle = query.trim().toLowerCase();
      if (!needle) {
        return [];
      }
      const ids = (member: DemoMember) => [
        member.memberId.toLowerCase(),
        member.studentId.toLowerCase(),
      ];
      const exact = (member: DemoMember) => ids(member).includes(needle);
      return records.members
        .filter(
          (member) =>
            member.fullName.toLowerCase().includes(needle) ||
            ids(member).some((id) => id.includes(needle))
        )
        .sort((a, b) => Number(exact(b)) - Number(exact(a)))
        .slice(0, SEARCH_RESULT_LIMIT)
        .map((member) => toSearchResult(records, member));
    },

    async grantPoints(input: GrantPointsInput): Promise<GrantPointsResult> {
      await settle();
      return store.update((records) => {
        const officer = currentOfficer(records);
        if (
          !Number.isInteger(input.amount) ||
          input.amount < 1 ||
          input.amount > MAX_GRANT
        ) {
          throw new DataError(
            'invalid_input',
            `Enter a whole number of points from 1 to ${MAX_GRANT}.`
          );
        }
        if (!input.reason.trim()) {
          throw new DataError(
            'invalid_input',
            'Choose a reason for the grant.'
          );
        }
        const member = findMember(records, input.memberId);
        const previousBalance = balanceOf(records, member.memberId);
        const entryId = nextId(records, 'L');
        records.ledger.push({
          id: entryId,
          memberId: member.memberId,
          delta: input.amount,
          kind: 'points_granted',
          title: input.reason.trim(),
          reference: `Granted by ${officer.fullName}`,
          occurredAt: now().toISOString(),
        });
        return {
          entryId,
          recipient: toSearchResult(records, member),
          amount: input.amount,
          reason: input.reason.trim(),
          previousBalance,
          newBalance: previousBalance + input.amount,
        };
      });
    },

    reset() {
      store.reset();
    },
  };
}
