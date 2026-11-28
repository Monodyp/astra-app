import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  DataError,
  PERK_CATEGORY_LABELS,
  type ActivityEntry,
  type AttendanceRecord,
  type CheckInInput,
  type CheckInResult,
  type CheckInStation,
  type ClaimDeclineReason,
  type ClaimPerkOptions,
  type ClaimResult,
  type DigitalId,
  type GrantPointsInput,
  type GrantPointsResult,
  type MemberOverview,
  type MemberSearchPage,
  type Perk,
  type PerkCatalog,
  type PerkCategory,
  type PointsEntry,
  type PointsEntryType,
  type PointsHistory,
  type PortalDataSource,
  type Role,
  type Session,
  type SessionUser,
  type SignInInput,
  type Voucher,
  type VoucherState,
} from '../contracts.js';
import {
  ApiError,
  requestApi,
  type ApiRequestOptions,
  type ApiResponse,
} from '../../lib/apiClient.js';
import { getFirebaseAuth, hasFirebaseConfig } from '../../lib/firebase.js';

export interface LiveAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

export interface LiveAuthClient {
  readonly currentUser: LiveAuthUser | null;
  authStateReady(): Promise<void>;
  signInWithGoogle(): Promise<LiveAuthUser>;
  signInWithEmail(email: string, password: string): Promise<LiveAuthUser>;
  signOut(): Promise<void>;
}

export type LiveRequestFn = <T>(
  endpoint: string,
  options?: ApiRequestOptions
) => Promise<ApiResponse<T>>;

export interface LiveSourceOptions {
  auth?: LiveAuthClient;
  request?: LiveRequestFn;
}

interface BackendMemberResponse {
  member: {
    uid: string;
    srCode: string;
    fullName: string | null;
    membershipId?: string | null;
    controlNumber?: string | null;
    program?: string | null;
    yearLevel?: string | null;
    email?: string | null;
    isPaid: boolean;
    role: string;
  };
}

interface BackendCardResponse {
  card: {
    studentId: string;
    fullName: string | null;
    membershipId?: string | null;
    program?: string | null;
    yearLevel?: string | null;
    isPaid: boolean;
    qrToken: string;
    qrExpiresAt?: string | null;
    qrStatus?: DigitalId['qrStatus'];
  };
}

interface BackendLedgerEntry {
  id: string;
  memberId: string;
  amount: number;
  reason: string;
  type: PointsEntryType | 'event_attendance';
  referenceId: string;
  createdBy: string;
  createdAt: string;
}

interface BackendPerk {
  id: string;
  partnerName: string;
  title: string;
  pointsCost: number;
  stock: number | null;
  instructions: string;
  category?: PerkCategory;
  eyebrow?: string;
  headline?: string;
  subline?: string;
  description?: string;
  claimLimit?: number;
  featured?: boolean;
}

interface BackendVoucher {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired';
  partnerName: string;
  reward: string;
  expiresAt?: string;
  perkId?: string;
  instructions?: string;
  redeemedAt?: string;
  createdAt: string;
}

interface BackendEvent {
  id: string;
  title?: string;
  name?: string;
  pointsEarned?: number;
  points?: number;
}

interface BackendAttendanceRecord {
  id: string;
  srCode: string;
  fullName: string;
  checkedInAt: string;
}

const FIREBASE_ERROR_MESSAGES: Record<string, { code: DataError['code']; message: string }> = {
  'auth/popup-closed-by-user': {
    code: 'invalid_credentials',
    message: 'Google sign-in was cancelled before completing.',
  },
  'auth/cancelled-popup-request': {
    code: 'invalid_credentials',
    message: 'Google sign-in was cancelled before completing.',
  },
  'auth/popup-blocked': {
    code: 'unavailable',
    message: 'Pop-up was blocked by your browser. Allow pop-ups and try again.',
  },
  'auth/unauthorized-domain': {
    code: 'unavailable',
    message: 'This domain is not authorized in Firebase Authentication settings.',
  },
  'auth/operation-not-allowed': {
    code: 'unsupported',
    message: 'This sign-in method is not enabled in Firebase Authentication.',
  },
  'auth/invalid-credential': {
    code: 'invalid_credentials',
    message: 'The email address or password did not match.',
  },
  'auth/wrong-password': {
    code: 'invalid_credentials',
    message: 'The email address or password did not match.',
  },
  'auth/user-not-found': {
    code: 'invalid_credentials',
    message: 'No account was found with that email address.',
  },
  'auth/invalid-email': {
    code: 'invalid_input',
    message: 'Enter a valid email address.',
  },
  'auth/too-many-requests': {
    code: 'unavailable',
    message: 'Too many sign-in attempts. Wait a moment and try again.',
  },
  'auth/network-request-failed': {
    code: 'unavailable',
    message: 'Unable to reach Firebase Authentication. Check your connection.',
  },
};

function createFirebaseAuthClient(): LiveAuthClient {
  return {
    get currentUser() {
      return getFirebaseAuth().currentUser;
    },
    async authStateReady() {
      await getFirebaseAuth().authStateReady();
    },
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(getFirebaseAuth(), provider);
      return credential.user;
    },
    async signInWithEmail(email: string, password: string) {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      return credential.user;
    },
    async signOut() {
      await firebaseSignOut(getFirebaseAuth());
    },
  };
}

function mapFirebaseError(error: unknown): DataError {
  if (error instanceof DataError) {
    return error;
  }
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;
  if (code && code in FIREBASE_ERROR_MESSAGES) {
    const mapped = FIREBASE_ERROR_MESSAGES[code];
    return new DataError(mapped.code, mapped.message);
  }
  if (error instanceof Error && error.message.includes('Firebase client configuration')) {
    return new DataError('unavailable', error.message);
  }
  return new DataError('unavailable', 'Sign-in could not be completed. Try again.');
}

function mapApiError(error: unknown): DataError {
  if (error instanceof DataError) {
    return error;
  }
  if (!(error instanceof ApiError)) {
    return new DataError('unavailable', 'ASTRA services are unavailable right now.');
  }
  switch (error.status) {
    case 400:
      return new DataError('invalid_input', error.message);
    case 401:
      return new DataError('unauthenticated', 'Your session expired. Sign in again.');
    case 403:
      return new DataError('forbidden', 'You do not have permission for this action.');
    case 404:
      return new DataError('not_found', error.message);
    case 409:
      return new DataError('conflict', error.message);
    case 422:
      return new DataError('key_reused', error.message);
    default:
      return new DataError('unavailable', error.message);
  }
}

function normalizeRole(role: string): Role {
  return role === 'officer' || role === 'admin' ? 'officer' : 'member';
}

function toSessionUser(
  member: BackendMemberResponse['member'],
  authUser: LiveAuthUser
): SessionUser {
  const fullName = member.fullName?.trim() || authUser.displayName?.trim() || member.srCode;
  const displayName = fullName.split(/\s+/)[0] || member.srCode;
  return {
    memberId: member.membershipId?.trim() || member.controlNumber?.trim() || member.srCode,
    studentId: member.srCode,
    fullName,
    displayName,
    email: member.email?.trim() || authUser.email || '',
    role: normalizeRole(member.role),
    membershipStatus: member.isPaid ? 'verified' : 'unverified',
  };
}

function mapLedgerEntry(entry: BackendLedgerEntry): PointsEntry {
  return {
    id: entry.id,
    type: entry.type === 'event_attendance' ? 'attendance' : entry.type,
    amount: entry.amount,
    reason: entry.reason,
    reference: entry.referenceId,
    createdAt: entry.createdAt,
  };
}

function mapActivityEntry(entry: BackendLedgerEntry): ActivityEntry {
  const kind =
    entry.type === 'attendance' || entry.type === 'event_attendance'
      ? 'event_checked_in'
      : entry.type === 'redemption'
        ? 'voucher_claimed'
        : 'points_granted';
  const statusLabel =
    kind === 'event_checked_in'
      ? 'Checked in'
      : kind === 'voucher_claimed'
        ? 'Voucher claimed'
        : 'Points granted';
  return {
    id: entry.id,
    kind,
    title: entry.reason,
    reference: entry.referenceId,
    statusLabel,
    pointsDelta: entry.amount,
    occurredAt: entry.createdAt,
  };
}

function mapVoucherState(voucher: BackendVoucher): VoucherState {
  if (voucher.status === 'used') return 'redeemed';
  if (voucher.status === 'expired') return 'expired';
  if (voucher.expiresAt && Date.parse(voucher.expiresAt) < Date.now()) {
    return 'expired';
  }
  return 'ready';
}

function mapVoucher(voucher: BackendVoucher): Voucher {
  return {
    id: voucher.id,
    code: voucher.code,
    perkId: voucher.perkId ?? '',
    reward: voucher.reward ?? null,
    partnerName: voucher.partnerName ?? null,
    instructions: voucher.instructions
      ? voucher.instructions.split('\n').filter(Boolean)
      : [],
    category: null,
    categoryLabel: null,
    bannerLabel: null,
    state: mapVoucherState(voucher),
    claimedAt: voucher.createdAt,
    expiresAt: voucher.expiresAt ?? null,
    redeemedAt: voucher.redeemedAt ?? null,
    qrValue: null,
  };
}

function mapPerk(perk: BackendPerk, claimedCount: number): Perk {
  const category: PerkCategory =
    perk.category && perk.category in PERK_CATEGORY_LABELS ? perk.category : 'discount';
  const claimLimit = perk.claimLimit ?? 1;
  return {
    id: perk.id,
    name: perk.title,
    partner: perk.partnerName,
    category,
    categoryLabel: PERK_CATEGORY_LABELS[category],
    eyebrow: perk.eyebrow ?? perk.partnerName,
    headline: perk.headline ?? perk.title,
    subline: perk.subline ?? '',
    description: perk.description ?? perk.instructions,
    cost: perk.pointsCost,
    remainingStock: perk.stock,
    remainingClaims: Math.max(0, claimLimit - claimedCount),
    featured: Boolean(perk.featured),
  };
}

function inferClaimDeclineReason(message: string): ClaimDeclineReason {
  const lower = message.toLowerCase();
  if (lower.includes('stock')) return 'out_of_stock';
  if (lower.includes('limit')) return 'claim_limit';
  if (lower.includes('membership') || lower.includes('inactive')) return 'membership_inactive';
  return 'insufficient_points';
}

export function createLiveDataSource(
  options: LiveSourceOptions = {}
): PortalDataSource {
  const auth = options.auth ?? createFirebaseAuthClient();
  const request = options.request ?? requestApi;

  async function withAuth<T>(
    endpoint: string,
    init: Omit<ApiRequestOptions, 'token'> = {}
  ): Promise<ApiResponse<T>> {
    const user = auth.currentUser;
    if (!user) {
      throw new DataError('unauthenticated', 'Sign in to continue.');
    }

    const token = await user.getIdToken(false);
    try {
      return await request<T>(endpoint, { ...init, token });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshedToken = await user.getIdToken(true);
        try {
          return await request<T>(endpoint, { ...init, token: refreshedToken });
        } catch (retryError) {
          throw mapApiError(retryError);
        }
      }
      throw mapApiError(error);
    }
  }

  async function fetchCurrentMember(token?: string): Promise<BackendMemberResponse['member']> {
    const res = token
      ? await request<BackendMemberResponse>('/auth/me', { method: 'GET', token })
      : await withAuth<BackendMemberResponse>('/auth/me', { method: 'GET' });
    return res.data.member;
  }

  async function loadActiveEvent(eventId?: string): Promise<{ id: string; name: string; points: number }> {
    const eventsRes = await withAuth<{ events: BackendEvent[] }>('/events', { method: 'GET' });
    const list = eventsRes.data.events ?? [];
    const target = eventId ? list.find((item) => item.id === eventId) : list[0];
    if (!target) {
      throw new DataError('not_found', 'No active event is configured.');
    }
    return {
      id: target.id,
      name: target.title ?? target.name ?? target.id,
      points: target.pointsEarned ?? target.points ?? 10,
    };
  }

  async function fetchRoster(eventId: string, points: number): Promise<AttendanceRecord[]> {
    const res = await withAuth<{ attendance: BackendAttendanceRecord[] }>(
      `/attendance/${encodeURIComponent(eventId)}`,
      { method: 'GET' }
    );
    return (res.data.attendance ?? []).map((record) => ({
      id: record.id,
      memberName: record.fullName,
      studentId: record.srCode,
      pointsAwarded: points,
      checkedInAt: record.checkedInAt,
    }));
  }

  return {
    async restoreSession() {
      if (!options.auth && !hasFirebaseConfig()) {
        return null;
      }
      await auth.authStateReady();
      if (!auth.currentUser) {
        return null;
      }
      try {
        const member = await fetchCurrentMember();
        return { user: toSessionUser(member, auth.currentUser) };
      } catch (error) {
        const mapped = mapApiError(error);
        if (mapped.code === 'unauthenticated') {
          await auth.signOut().catch(() => undefined);
          return null;
        }
        if (mapped.code === 'not_found') {
          throw new DataError(
            'not_found',
            'Your Firebase account is signed in, but is not linked to an ASTRA member record yet.'
          );
        }
        throw mapped;
      }
    },

    async listSignInShortcuts() {
      return [];
    },

    async signIn(input: SignInInput): Promise<Session> {
      if (input.method === 'shortcut') {
        throw new DataError('unsupported', 'Demo accounts are disabled in live mode.');
      }

      let firebaseUser: LiveAuthUser;
      try {
        if (input.method === 'google') {
          firebaseUser = await auth.signInWithGoogle();
        } else {
          const email = input.identifier.trim();
          if (!email.includes('@')) {
            throw new DataError(
              'invalid_input',
              'Enter your registered email address and password, or continue with Google.'
            );
          }
          if (!input.password) {
            throw new DataError('invalid_input', 'Enter your password.');
          }
          firebaseUser = await auth.signInWithEmail(email, input.password);
        }
      } catch (error) {
        throw mapFirebaseError(error);
      }

      try {
        const idToken = await firebaseUser.getIdToken(false);
        await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ idToken }),
        });
        const member = await fetchCurrentMember(idToken);
        return { user: toSessionUser(member, firebaseUser) };
      } catch (error) {
        await auth.signOut().catch(() => undefined);
        const mapped = mapApiError(error);
        if (mapped.code === 'not_found') {
          throw new DataError(
            'not_found',
            'Signed in with Firebase, but no ASTRA member record matches this account yet. Ask an officer to link your SR code.'
          );
        }
        throw mapped;
      }
    },

    async signOut() {
      await auth.signOut();
    },

    async getOverview(): Promise<MemberOverview> {
      const [memberRes, pointsRes, historyRes, vouchersRes] = await Promise.all([
        withAuth<BackendMemberResponse>('/auth/me', { method: 'GET' }),
        withAuth<{ points: number }>('/points/me', { method: 'GET' }),
        withAuth<{ history: BackendLedgerEntry[] }>('/points/me/history', { method: 'GET' }),
        withAuth<{ vouchers: BackendVoucher[] }>('/vouchers/me', { method: 'GET' }),
      ]);

      const backendMember = memberRes.data.member;
      const authUser = auth.currentUser!;
      const sessionUser = toSessionUser(backendMember, authUser);
      const history = historyRes.data.history ?? [];
      const attendanceEntries = history.filter((entry) => entry.type === 'attendance' || entry.type === 'event_attendance');
      const vouchers = (vouchersRes.data.vouchers ?? []).map(mapVoucher);
      const activeVouchers = vouchers.filter((voucher) => voucher.state === 'ready');

      return {
        member: {
          fullName: sessionUser.fullName,
          membershipId: sessionUser.memberId,
          studentId: sessionUser.studentId,
          program: backendMember.program?.trim() || 'Not specified',
          membershipStatus: sessionUser.membershipStatus,
        },
        points: pointsRes.data.points ?? 0,
        eventsAttended: attendanceEntries.length,
        lastEventName: attendanceEntries[0]?.reason ?? null,
        activeVoucherCount: activeVouchers.length,
        activeVoucherHighlight: activeVouchers[0]?.reward ?? null,
        recentActivity: history.slice(0, 5).map(mapActivityEntry),
        activityCount: history.length,
      };
    },

    async getDigitalId(): Promise<DigitalId> {
      try {
        const res = await withAuth<BackendCardResponse>('/members/me/id', {
          method: 'GET',
        });
        const { card } = res.data;
        const verified = Boolean(card.isPaid);
        return {
          fullName: card.fullName ?? card.studentId,
          studentId: card.studentId,
          membershipId: card.membershipId?.trim() || card.studentId,
          program: card.program?.trim() || 'Not specified',
          yearLevel: card.yearLevel?.trim() || 'Member',
          roleLabel: verified ? 'Verified' : 'Unverified',
          membershipStatus: verified ? 'verified' : 'unverified',
          qrValue: verified ? card.qrToken : '',
          qrExpiresAt: verified ? card.qrExpiresAt ?? null : null,
          qrStatus: verified ? card.qrStatus ?? (card.qrToken ? 'ready' : 'provisioning_required') : 'inactive',
          statusNote: !verified ? 'Membership inactive' : card.qrToken ? 'Annual dues paid' : 'Control number needed for QR issuance',
        };
      } catch (error) {
        if (error instanceof DataError && error.code === 'invalid_input') {
          const member = await fetchCurrentMember();
          return {
            fullName: member.fullName ?? member.srCode,
            studentId: member.srCode,
            membershipId:
              member.membershipId?.trim() ||
              member.controlNumber?.trim() ||
              member.srCode,
            program: member.program?.trim() || 'Not specified',
            yearLevel: member.yearLevel?.trim() || 'Member',
            roleLabel: member.isPaid ? 'Verified' : 'Unverified',
            membershipStatus: member.isPaid ? 'verified' : 'unverified',
            qrValue: '',
            qrExpiresAt: null,
            qrStatus: member.isPaid ? 'provisioning_required' : 'inactive',
            statusNote: member.isPaid
              ? 'Control number needed for QR issuance'
              : 'Membership inactive',
          };
        }
        throw error;
      }
    },

    async getPoints(): Promise<PointsHistory> {
      const [pointsRes, historyRes] = await Promise.all([
        withAuth<{ points: number }>('/points/me', { method: 'GET' }),
        withAuth<{ history: BackendLedgerEntry[] }>('/points/me/history', {
          method: 'GET',
        }),
      ]);
      return {
        balance: pointsRes.data.points ?? 0,
        entries: (historyRes.data.history ?? []).map(mapLedgerEntry),
      };
    },

    async listPerks(): Promise<PerkCatalog> {
      const [perksRes, pointsRes, vouchersRes] = await Promise.all([
        withAuth<{ perks: BackendPerk[] }>('/perks', { method: 'GET' }),
        withAuth<{ points: number }>('/points/me', { method: 'GET' }),
        withAuth<{ vouchers: BackendVoucher[] }>('/vouchers/me', { method: 'GET' }),
      ]);
      const counts = new Map<string, number>();
      for (const voucher of vouchersRes.data.vouchers ?? []) {
        if (voucher.perkId) {
          counts.set(voucher.perkId, (counts.get(voucher.perkId) ?? 0) + 1);
        }
      }
      return {
        perks: (perksRes.data.perks ?? []).map((perk) =>
          mapPerk(perk, counts.get(perk.id) ?? 0)
        ),
        balance: pointsRes.data.points ?? 0,
      };
    },

    async claimPerk(perkId: string, claimOptions: ClaimPerkOptions): Promise<ClaimResult> {
      try {
        const res = await withAuth<{ voucher: BackendVoucher }>(
          `/perks/${encodeURIComponent(perkId)}/redeem`,
          {
            method: 'POST',
            body: JSON.stringify({ idempotencyKey: claimOptions.idempotencyKey }),
            signal: claimOptions.signal,
          }
        );
        return {
          status: 'claimed',
          voucher: mapVoucher(res.data.voucher),
          replayed: res.status === 200,
        };
      } catch (error) {
        if (error instanceof DataError && (error.code === 'invalid_input' || error.code === 'conflict')) {
          return {
            status: 'declined',
            reason: inferClaimDeclineReason(error.message),
            message: error.message,
          };
        }
        throw error;
      }
    },

    async listVouchers(): Promise<Voucher[]> {
      const res = await withAuth<{ vouchers: BackendVoucher[] }>('/vouchers/me', {
        method: 'GET',
      });
      return (res.data.vouchers ?? []).map(mapVoucher);
    },

    async getVoucher(voucherId: string): Promise<Voucher> {
      const res = await withAuth<{ voucher: BackendVoucher }>(
        `/vouchers/${encodeURIComponent(voucherId)}`,
        { method: 'GET' }
      );
      return mapVoucher(res.data.voucher);
    },

    async getCheckInStation(): Promise<CheckInStation> {
      const event = await loadActiveEvent();
      const eventRoster = await fetchRoster(event.id, event.points);
      return { event, roster: eventRoster };
    },

    async listScanSamples() {
      return [];
    },

    async checkIn(input: CheckInInput): Promise<CheckInResult> {
      const event = await loadActiveEvent(input.eventId);
      const body =
        input.method === 'scan'
          ? { qrToken: input.credential, eventId: input.eventId }
          : { srCode: input.studentId, eventId: input.eventId };

      let checkInResponse: {
        awarded: boolean;
        points?: number;
        reason?: 'already_checked_in' | 'invalid_member' | 'points_error';
      };

      try {
        const res = await withAuth<typeof checkInResponse>('/attendance/checkin', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        checkInResponse = res.data;
      } catch (error) {
        if (error instanceof DataError && error.code === 'invalid_input') {
          const currentRoster = await fetchRoster(input.eventId, event.points);
          return {
            outcome: 'rejected',
            reason: 'invalid_credential',
            message: error.message,
            roster: currentRoster,
          };
        }
        throw error;
      }

      const updatedRoster = await fetchRoster(input.eventId, event.points);
      if (!checkInResponse.awarded) {
        const reason =
          checkInResponse.reason === 'already_checked_in'
            ? 'duplicate'
            : checkInResponse.reason === 'invalid_member'
              ? 'unknown_member'
              : 'invalid_credential';
        return {
          outcome: 'rejected',
          reason,
          message:
            reason === 'duplicate'
              ? 'Member is already checked in for this event.'
              : reason === 'unknown_member'
                ? 'Member was not found or membership is inactive.'
                : 'Check-in could not be recorded.',
          roster: updatedRoster,
        };
      }

      const targetId = input.method === 'manual' ? input.studentId.trim().toUpperCase() : '';
      const matched =
        (targetId && updatedRoster.find((row) => row.studentId.toUpperCase() === targetId)) ||
        updatedRoster[0] || {
          id: `${input.eventId}-${Date.now()}`,
          memberName: targetId || 'Checked-in member',
          studentId: targetId || 'Member',
          pointsAwarded: checkInResponse.points ?? event.points,
          checkedInAt: new Date().toISOString(),
        };

      return {
        outcome: 'accepted',
        record: matched,
        roster: updatedRoster,
        message: `Checked in (+${checkInResponse.points ?? event.points} pts).`,
      };
    },

    async searchMembers(query: string): Promise<MemberSearchPage> {
      if (query.trim().length < 2) return { members: [], hasMore: false, limit: 20 };
      const res = await withAuth<{ hasMore?: boolean; limit?: number; members: { id: string; srCode: string; membershipId?: string; fullName: string | null; membershipStatus: 'verified' | 'unverified'; currentPoints: number }[] }>('/members/search', { method: 'GET', params: { q: query.trim() } });
      return { hasMore: res.data.hasMore === true, limit: res.data.limit ?? 20, members: res.data.members.map(member => ({
        memberId: member.membershipId || member.id,
        studentId: member.srCode,
        fullName: member.fullName || member.srCode,
        membershipStatus: member.membershipStatus === 'verified' ? 'verified' : 'unverified',
        balance: member.currentPoints,
      })) };
    },

    async grantPoints(input: GrantPointsInput): Promise<GrantPointsResult> {
      const res = await withAuth<{ entry: BackendLedgerEntry }>('/points/grant', {
        method: 'POST',
        body: JSON.stringify({
          memberId: input.studentId,
          amount: input.amount,
          reason: input.reason,
          referenceId: input.referenceId,
          idempotencyKey: input.idempotencyKey,
        }),
      });
      const { entry } = res.data;
      return {
        entryId: entry.id,
        studentId: entry.memberId,
        amount: entry.amount,
        reason: entry.reason,
        referenceId: entry.referenceId,
        balance: null,
      };
    },
  };
}
