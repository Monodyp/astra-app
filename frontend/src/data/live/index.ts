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
  MemberSearchResult,
  GrantPointsInput,
  GrantPointsResult,
} from '../contracts.js';
import { DataError } from '../contracts.js';
import { apiClient } from '../../lib/apiClient.js';
import { signOutFirebase } from '../../lib/firebase.js';

export interface LiveSourceOptions {
  apiUrl?: string;
}

export class LivePortalDataSource implements PortalDataSource {
  constructor(private readonly options: LiveSourceOptions = {}) {}

  async restoreSession(): Promise<Session | null> {
    try {
      const res = await apiClient<{ member: { uid: string; srCode: string; fullName: string; role: string; isPaid: boolean } }>('/auth/me');
      return {
        uid: res.member.uid,
        displayName: res.member.fullName,
        email: '',
        role: res.member.role as Session['role'],
        membershipId: res.member.srCode,
        membershipStatus: res.member.isPaid ? 'active' : 'inactive',
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
      throw new DataError('unsupported', 'Demo shortcut sign-in is not supported in live mode');
    }
    throw new DataError('unavailable', 'Direct live sign-in must use Firebase auth flow');
  }

  async signOut(): Promise<void> {
    await signOutFirebase();
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

  async searchMembers(_query: string): Promise<MemberSearchResult[]> {
    throw new DataError('unavailable', 'Live searchMembers is being connected in FT-11');
  }

  async grantPoints(_input: GrantPointsInput): Promise<GrantPointsResult> {
    throw new DataError('unavailable', 'Live grantPoints is being connected in FT-11');
  }
}

export function createLiveDataSource(options?: LiveSourceOptions): PortalDataSource {
  return new LivePortalDataSource(options);
}
