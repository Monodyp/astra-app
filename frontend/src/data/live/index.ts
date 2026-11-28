import type {
  PortalDataSource,
  Session,
  SignInShortcut,
  SignInInput,
  MemberOverview,
  DigitalId,
  PointsHistory,
  PerkCatalog,
  ClaimPerkOptions,
  ClaimResult,
  Voucher,
  CheckInStation,
  ScanSample,
  CheckInInput,
  CheckInResult,
  MemberSearchPage,
  GrantPointsInput,
  GrantPointsResult,
  Role,
  MembershipStatus,
} from '../contracts.js';
import { DataError } from '../contracts.js';
import { apiClient } from '../../lib/apiClient.js';
import * as firebaseLib from '../../lib/firebase.js';

export interface LiveSourceOptions {
  apiUrl?: string;
}

interface AuthMeResponse {
  member: {
    uid: string;
    srCode: string;
    fullName: string;
    membershipId?: string | null;
    controlNumber?: string | null;
    program?: string | null;
    yearLevel?: string | null;
    isPaid: boolean;
    role: string;
  };
}

export class LivePortalDataSource implements PortalDataSource {
  constructor(public readonly options: LiveSourceOptions = {}) {}

  async restoreSession(): Promise<Session | null> {
    try {
      const token = await firebaseLib.getIdToken(false);
      if (!token) return null;

      const res = await apiClient.get<AuthMeResponse>('/auth/me');
      const member = res.member;
      const role: Role =
        member.role === 'officer' || member.role === 'admin' ? 'officer' : 'member';
      const membershipStatus: MembershipStatus = member.isPaid ? 'verified' : 'unverified';

      return {
        user: {
          memberId: member.controlNumber || member.membershipId || member.srCode,
          studentId: member.srCode,
          fullName: member.fullName,
          displayName: member.fullName,
          email: '',
          role,
          membershipStatus,
        },
      };
    } catch {
      return null;
    }
  }

  async listSignInShortcuts(): Promise<SignInShortcut[]> {
    // In live mode, demo shortcut buttons are disabled
    return [];
  }

  async signIn(input: SignInInput): Promise<Session> {
    if (input.method === 'shortcut') {
      throw new DataError(
        'unsupported',
        'Demo shortcut sign-in is not supported in live mode'
      );
    }

    if (input.method === 'credentials') {
      throw new DataError(
        'invalid_credentials',
        'Direct username and password sign-in is not supported in live mode. Please use Google / Institutional SSO.'
      );
    }

    if (input.method === 'google') {
      try {
        const { user: fbUser, idToken } = await firebaseLib.signInWithGoogle();
        await apiClient.post<{ user: { uid: string; srCode: string; role: string } }>(
          '/auth/login',
          { idToken }
        );
        const res = await apiClient.get<AuthMeResponse>('/auth/me');
        const member = res.member;
        const role: Role =
          member.role === 'officer' || member.role === 'admin' ? 'officer' : 'member';
        const membershipStatus: MembershipStatus = member.isPaid ? 'verified' : 'unverified';

        return {
          user: {
            memberId: member.controlNumber || member.membershipId || member.srCode,
            studentId: member.srCode,
            fullName: member.fullName,
            displayName: member.fullName,
            email: fbUser.email ?? '',
            role,
            membershipStatus,
          },
        };
      } catch (err) {
        if (err instanceof Error) {
          if ('code' in err && (err as { code?: string }).code === 'auth/popup-closed-by-user') {
            throw new DataError('unavailable', 'Sign-in popup was closed before completing');
          }
          throw new DataError('unavailable', err.message);
        }
        throw new DataError('unavailable', 'Google sign-in failed');
      }
    }

    throw new DataError('unavailable', 'Unsupported sign-in method');
  }

  async signOut(): Promise<void> {
    await firebaseLib.signOutFirebase();
  }

  async getOverview(): Promise<MemberOverview> {
    throw new DataError('unavailable', 'Live getOverview is being connected in FT-11');
  }

  async getDigitalId(): Promise<DigitalId> {
    throw new DataError('unavailable', 'Live getDigitalId is being connected in FT-11');
  }

  async getPoints(): Promise<PointsHistory> {
    throw new DataError('unavailable', 'Live getPoints is being connected in FT-11');
  }

  async listPerks(): Promise<PerkCatalog> {
    throw new DataError('unavailable', 'Live listPerks is being connected in FT-11');
  }

  async claimPerk(_perkId: string, _options: ClaimPerkOptions): Promise<ClaimResult> {
    throw new DataError('unavailable', 'Live claimPerk is being connected in FT-11');
  }

  async listVouchers(): Promise<Voucher[]> {
    throw new DataError('unavailable', 'Live listVouchers is being connected in FT-11');
  }

  async getVoucher(_voucherId: string): Promise<Voucher> {
    throw new DataError('unavailable', 'Live getVoucher is being connected in FT-11');
  }

  async getCheckInStation(): Promise<CheckInStation> {
    throw new DataError('unavailable', 'Live getCheckInStation is being connected in FT-11');
  }

  async listScanSamples(): Promise<ScanSample[]> {
    // In live mode, sample scan credentials are not shown
    return [];
  }

  async checkIn(_input: CheckInInput): Promise<CheckInResult> {
    throw new DataError('unavailable', 'Live checkIn is being connected in FT-11');
  }

  async searchMembers(_query: string): Promise<MemberSearchPage> {
    throw new DataError('unavailable', 'Live searchMembers is being connected in FT-11');
  }

  async grantPoints(_input: GrantPointsInput): Promise<GrantPointsResult> {
    throw new DataError('unavailable', 'Live grantPoints is being connected in FT-11');
  }
}

export function createLiveDataSource(options?: LiveSourceOptions): PortalDataSource {
  return new LivePortalDataSource(options);
}
