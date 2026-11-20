import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App.js';
import {
  DataError,
  setPortalDataSource,
  type CheckInStation,
  type DigitalId,
  type MemberOverview,
  type PortalDataSource,
  type Session,
} from '../data/index.js';

const session: Session = {
  user: {
    memberId: 'LIVE-0042',
    studentId: '22-12345',
    fullName: 'Adapter Test Officer',
    displayName: 'Adapter',
    email: 'adapter@astra.example',
    role: 'officer',
    membershipStatus: 'verified',
  },
};

const station: CheckInStation = {
  event: { id: 'EVT-LIVE', name: 'Adapter Hack Night', points: 40 },
  roster: [
    {
      id: 'ATT-1',
      memberName: 'Adapter Attendee',
      studentId: '22-54321',
      pointsAwarded: 40,
      checkedInAt: '2026-11-18T18:30:00+08:00',
    },
  ],
};

const overview: MemberOverview = {
  member: {
    fullName: 'Adapter Test Officer',
    membershipId: 'LIVE-0042',
    studentId: '22-12345',
    program: 'BS Data Science',
    membershipStatus: 'verified',
  },
  points: 0,
  eventsAttended: 0,
  lastEventName: null,
  activeVoucherCount: 0,
  activeVoucherHighlight: null,
  recentActivity: [],
  activityCount: 0,
};

const digitalId: DigitalId = {
  fullName: 'Adapter Test Member',
  studentId: '22-12345',
  membershipId: 'LIVE-0042',
  program: 'BS Data Science',
  yearLevel: '2nd year',
  roleLabel: 'Unverified',
  membershipStatus: 'unverified',
  qrValue: 'live-credential',
  statusNote: 'Membership inactive',
};

function unexpected(): Promise<never> {
  return Promise.reject(new DataError('unsupported', 'Not used here.'));
}

function testAdapter(
  overrides: Partial<PortalDataSource> = {}
): PortalDataSource {
  return {
    restoreSession: async () => session,
    listSignInShortcuts: async () => [],
    signIn: async () => session,
    signOut: async () => undefined,
    getOverview: unexpected,
    getDigitalId: unexpected,
    getPoints: unexpected,
    listPerks: unexpected,
    claimPerk: unexpected,
    listVouchers: unexpected,
    getVoucher: unexpected,
    getCheckInStation: async () => station,
    listScanSamples: async () => [],
    checkIn: unexpected,
    searchMembers: unexpected,
    grantPoints: unexpected,
    ...overrides,
  };
}

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('replacing the data adapter', () => {
  let previous: PortalDataSource | null = null;

  function use(adapter: PortalDataSource) {
    const replaced = setPortalDataSource(adapter);
    previous ??= replaced;
  }

  afterEach(() => {
    if (previous) setPortalDataSource(previous);
    previous = null;
  });

  it('renders the results of a substituted adapter', async () => {
    use(testAdapter());
    renderAt('/checkin');
    expect(await screen.findByText('Adapter Hack Night')).toBeDefined();
    expect(screen.getByText('Current event / +40 pts')).toBeDefined();
    expect(screen.getByText('Adapter Attendee')).toBeDefined();
    expect(screen.getByText('Welcome back, Adapter')).toBeDefined();
  });

  it('shows an error and retries the operation', async () => {
    const getCheckInStation = vi
      .fn<PortalDataSource['getCheckInStation']>()
      .mockRejectedValueOnce(
        new DataError('unavailable', 'The event service is offline.')
      )
      .mockResolvedValueOnce(station);
    use(testAdapter({ getCheckInStation }));
    renderAt('/checkin');

    expect((await screen.findByRole('alert')).textContent).toContain(
      'The event service is offline.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Adapter Hack Night')).toBeDefined();
    expect(getCheckInStation).toHaveBeenCalledTimes(2);
  });

  it('renders the overview from a substituted adapter with no activity', async () => {
    let resolve: (value: MemberOverview) => void = () => undefined;
    use(
      testAdapter({
        getOverview: () =>
          new Promise<MemberOverview>((done) => {
            resolve = done;
          }),
      })
    );
    renderAt('/home');
    expect(await screen.findByText('Loading your overview…')).toBeDefined();
    resolve(overview);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Adapter Test Officer',
      })
    ).toBeDefined();
    expect(screen.getByText('No events yet')).toBeDefined();
    expect(screen.getByText('Claim a perk to start')).toBeDefined();
    expect(screen.getByText('No activity yet')).toBeDefined();
    expect(screen.getByText('0 ACTIVITIES RECORDED')).toBeDefined();
  });

  it('retries the overview after an error', async () => {
    const getOverview = vi
      .fn<PortalDataSource['getOverview']>()
      .mockRejectedValueOnce(
        new DataError('unavailable', 'The points service is offline.')
      )
      .mockResolvedValueOnce(overview);
    use(testAdapter({ getOverview }));
    renderAt('/home');
    expect((await screen.findByRole('alert')).textContent).toContain(
      'The points service is offline.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Adapter Test Officer',
      })
    ).toBeDefined();
    expect(getOverview).toHaveBeenCalledTimes(2);
  });

  it('renders the digital ID from a substituted adapter', async () => {
    const getDigitalId = vi
      .fn<PortalDataSource['getDigitalId']>()
      .mockRejectedValueOnce(
        new DataError('unavailable', 'The member service is offline.')
      )
      .mockResolvedValueOnce(digitalId);
    use(testAdapter({ getDigitalId }));
    renderAt('/id');
    expect(await screen.findByText('Loading your digital ID…')).toBeDefined();
    expect((await screen.findByRole('alert')).textContent).toContain(
      'The member service is offline.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Adapter Test Member',
      })
    ).toBeDefined();
    expect(screen.getAllByText('Inactive for check-in').length).toBeGreaterThan(
      0
    );
    expect(
      screen.queryByRole('img', { name: 'Member check-in QR' })
    ).toBeNull();
  });

  it('hides the demo accounts when the adapter offers none', async () => {
    use(testAdapter({ restoreSession: async () => null }));
    renderAt('/login');
    await screen.findByRole('heading', { name: 'Your Membership Dashboard' });
    await waitFor(() => expect(screen.queryByText('Demo accounts')).toBeNull());
  });
});
