import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App.js';
import {
  DataError,
  setPortalDataSource,
  type CheckInStation,
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

  it('hides the demo accounts when the adapter offers none', async () => {
    use(testAdapter({ restoreSession: async () => null }));
    renderAt('/login');
    await screen.findByRole('heading', { name: 'Your Membership Dashboard' });
    await waitFor(() => expect(screen.queryByText('Demo accounts')).toBeNull());
  });
});
