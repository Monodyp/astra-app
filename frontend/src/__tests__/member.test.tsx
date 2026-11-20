import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';
import EventsCalendar from '../components/home/events-calendar';
import {
  DataError,
  portalData,
  setPortalDataSource,
  type ClaimPerkOptions,
  type ClaimResult,
  type PortalDataSource,
} from '../data/index.js';
import { createDemoDataSource } from '../data/demo/demoSource.js';
import { RECORDS_KEY } from '../data/demo/store.js';
import { DESKTOP_MEDIA_QUERY } from '../lib/viewport.js';

let previous: PortalDataSource | null = null;

function useAdapter(
  overrides: (base: PortalDataSource) => Partial<PortalDataSource>
) {
  const base = createDemoDataSource();
  const replaced = setPortalDataSource({ ...base, ...overrides(base) });
  previous ??= replaced;
}

function useViewport(desktop: boolean) {
  let matches = desktop;
  const listeners = new Set<() => void>();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return query === DESKTOP_MEDIA_QUERY && matches;
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          listeners.delete(listener),
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
  );
  return {
    set(next: boolean) {
      matches = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

async function signInAs(label: RegExp, path: string) {
  window.history.pushState({}, '', `/login?next=${encodeURIComponent(path)}`);
  const view = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: label }));
  await waitFor(() => expect(window.location.pathname).toBe(path));
  return view;
}

function goTo(path: string) {
  act(() => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

async function perkCard(name: string) {
  return (await screen.findByRole('heading', { level: 3, name })).closest(
    'li'
  )!;
}

async function openClaim(name: string) {
  fireEvent.click(
    within(await perkCard(name)).getByRole('button', { name: 'Claim Voucher' })
  );
  return screen.getByRole('dialog', { name: 'Claim this voucher?' });
}

beforeEach(() => {
  window.sessionStorage.clear();
  useViewport(false);
});

afterEach(() => {
  if (previous) setPortalDataSource(previous);
  previous = null;
  vi.restoreAllMocks();
});

describe('mobile perks marketplace', () => {
  it('shows the mobile team filters with Food added', async () => {
    await signInAs(/Verified member/, '/marketplace');
    expect(
      await screen.findByRole('heading', { name: 'Partner Perks & Rewards' })
    ).toBeDefined();
    const filters = screen.getByRole('group', { name: 'Perk categories' });
    expect(
      within(filters)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['All Perks', 'Discounts', 'Merch', 'Partner Workshops', 'Food']);
    fireEvent.click(within(filters).getByRole('button', { name: 'Food' }));
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Campus Cafe Free Beverage']);
    fireEvent.click(within(filters).getByRole('button', { name: 'Merch' }));
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['ASTRA Official Dev Sticker Pack', 'ASTRA Mission Hoodie']);
  });

  it('keeps the mobile cards without sample labels', async () => {
    await signInAs(/Verified member/, '/marketplace');
    expect(await screen.findByText('450 PTS Available')).toBeDefined();
    expect(screen.getByRole('link', { name: 'My Vouchers (1)' })).toBeDefined();
    expect(screen.queryByText('(sample)')).toBeNull();
    expect(screen.queryByText(/SIMULATED/)).toBeNull();
    const hoodie = await perkCard('ASTRA Mission Hoodie');
    expect(
      within(hoodie)
        .getByRole('button', { name: 'Claim Voucher' })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(
      within(hoodie).getByText('Not enough points: you need 750 more PTS.')
    ).toBeDefined();
    expect(
      within(hoodie).getByRole('img', { name: 'Perk image placeholder' })
    ).toBeDefined();
  });

  it('shows a decline in the confirm dialog', async () => {
    await signInAs(/Verified member/, '/marketplace');
    const dialog = await openClaim('Mentor Code Review Session');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'Error: This perk is out of stock.'
    );
  });

  it('claims a perk, opens the receipt, and keeps it in the wallet', async () => {
    await signInAs(/Verified member/, '/marketplace');
    const dialog = await openClaim('Campus Cafe Free Beverage');
    expect(
      within(dialog).getByText('Cost: 50 PTS · Balance after: 400 PTS')
    ).toBeDefined();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );

    const receipt = await screen.findByRole('dialog', {
      name: 'Voucher Claimed: Campus Cafe Free Beverage',
    });
    expect(window.location.pathname).toMatch(/^\/vouchers\/V-/);
    const code = within(receipt)
      .getByLabelText(/^Voucher code/)
      .textContent!.trim();
    expect(code).toMatch(/^ASTR-PRK-/);
    expect(
      within(receipt).getByRole('img', { name: 'Redemption QR code' })
    ).toBeDefined();

    fireEvent.click(within(receipt).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(window.location.pathname).toBe('/marketplace'));
    expect(await screen.findByText('400 PTS Available')).toBeDefined();

    fireEvent.click(
      await screen.findByRole('link', { name: 'My Vouchers (2)' })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/vouchers'));
    expect(await screen.findByText(code)).toBeDefined();
    expect(screen.getAllByRole('link', { name: /View Details/ })).toHaveLength(
      4
    );
  });

  it('retries a lost claim response with the same key and charges once', async () => {
    const keys: string[] = [];
    useAdapter((base) => ({
      claimPerk: async (perkId: string, options: ClaimPerkOptions) => {
        keys.push(options.idempotencyKey);
        const result = await base.claimPerk(perkId, options);
        if (keys.length === 1) {
          throw new DataError('unavailable', 'The connection dropped.');
        }
        return result;
      },
    }));
    await signInAs(/Verified member/, '/marketplace');
    const dialog = await openClaim('Campus Cafe Free Beverage');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    expect((await within(dialog).findByRole('alert')).textContent).toContain(
      'could not be confirmed'
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    await screen.findByRole('dialog', {
      name: 'Voucher Claimed: Campus Cafe Free Beverage',
    });

    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    const vouchers = await portalData.listVouchers();
    expect(
      vouchers.filter((item) => item.perkId === 'perk-cafe-beverage')
    ).toHaveLength(2);
    expect((await portalData.getPoints()).balance).toBe(400);
  });

  it('gives each new claim a new key', async () => {
    const keys: string[] = [];
    useAdapter((base) => ({
      claimPerk: (perkId: string, options: ClaimPerkOptions) => {
        keys.push(options.idempotencyKey);
        return base.claimPerk(perkId, options);
      },
    }));
    await signInAs(/Verified member/, '/marketplace');
    for (let round = 0; round < 2; round += 1) {
      const dialog = await openClaim('ASTRA Official Dev Sticker Pack');
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Confirm claim' })
      );
      const receipt = await screen.findByRole('dialog', {
        name: 'Voucher Claimed: ASTRA Official Dev Sticker Pack',
      });
      fireEvent.click(within(receipt).getByRole('button', { name: 'Close' }));
      await waitFor(() =>
        expect(window.location.pathname).toBe('/marketplace')
      );
    }
    expect(new Set(keys).size).toBe(2);
  });

  it('shows a key that was used for another perk', async () => {
    useAdapter(() => ({
      claimPerk: () =>
        Promise.reject(
          new DataError(
            'key_reused',
            'That claim key was already used for a different perk.'
          )
        ),
    }));
    await signInAs(/Verified member/, '/marketplace');
    const dialog = await openClaim('Campus Cafe Free Beverage');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'Error: That claim key was already used for a different perk.'
    );
  });

  it('keeps the receipt when the balance cannot load again', async () => {
    let fail = false;
    useAdapter((base) => ({
      listPerks: () =>
        fail
          ? Promise.reject(new DataError('unavailable', 'Perks are offline.'))
          : base.listPerks(),
      claimPerk: async (perkId: string, options: ClaimPerkOptions) => {
        const result = await base.claimPerk(perkId, options);
        fail = true;
        return result;
      },
    }));
    await signInAs(/Verified member/, '/marketplace');
    const dialog = await openClaim('Campus Cafe Free Beverage');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    const receipt = await screen.findByRole('dialog', {
      name: 'Voucher Claimed: Campus Cafe Free Beverage',
    });
    expect(within(receipt).getByLabelText(/^Voucher code/)).toBeDefined();
    fireEvent.click(within(receipt).getByRole('button', { name: 'Close' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Perks are offline.'
    );
    expect((await portalData.getPoints()).balance).toBe(400);
  });
});

describe('mobile voucher wallet and receipts', () => {
  it('lists each voucher with its code and status', async () => {
    await signInAs(/Verified member/, '/vouchers');
    expect(
      await screen.findByRole('heading', { name: 'Claimed Vouchers' })
    ).toBeDefined();
    expect(await screen.findByText('ASTR-PRK-98214')).toBeDefined();
    expect(screen.getByText('✔ Active')).toBeDefined();
    expect(screen.getByText('✖ Redeemed')).toBeDefined();
    expect(screen.getByText('✖ Expired')).toBeDefined();
    expect(
      screen
        .getAllByRole('link', { name: /View Details/ })[0]
        .getAttribute('href')
    ).toBe('/vouchers/V-98214');
  });

  it('closes a direct link to the wallet with Close or Escape', async () => {
    await signInAs(/Verified member/, '/vouchers/V-98214');
    const receipt = await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    expect(
      within(receipt).getByRole('img', { name: 'Redemption QR code' })
    ).toBeDefined();
    fireEvent.click(within(receipt).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(window.location.pathname).toBe('/vouchers'));

    goTo('/vouchers/V-98214');
    await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(window.location.pathname).toBe('/vouchers'));
  });

  it('loads the new receipt when the voucher id changes', async () => {
    await signInAs(/Verified member/, '/vouchers/V-98214');
    await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    goTo('/vouchers/V-50412');
    const expired = await screen.findByRole('dialog', {
      name: 'Campus Cafe Free Beverage',
    });
    expect(
      within(expired).getByText('✖ EXPIRED · cannot be redeemed')
    ).toBeDefined();
    expect(
      within(expired).queryByRole('img', { name: 'Redemption QR code' })
    ).toBeNull();
    goTo('/vouchers/V-66319');
    const used = await screen.findByRole('dialog', {
      name: 'ASTRA Official Dev Sticker Pack',
    });
    expect(within(used).getByText('✖ ALREADY REDEEMED')).toBeDefined();
  });

  it('shows the unavailable QR box for a voucher without a supported code', async () => {
    useAdapter((base) => ({
      getVoucher: async (id: string) => ({
        ...(await base.getVoucher(id)),
        qrValue: null,
      }),
    }));
    await signInAs(/Verified member/, '/vouchers/V-98214');
    const receipt = await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    expect(
      within(receipt).getByText(/Redemption QR unavailable/)
    ).toBeDefined();
  });

  it('hides vouchers that belong to another account', async () => {
    await signInAs(/^Officer/, '/vouchers/V-98214');
    expect(await screen.findByText('Voucher not found')).toBeDefined();
    fireEvent.click(
      screen.getByRole('link', { name: 'Back to claimed vouchers' })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/vouchers'));
    expect(
      await screen.findByText('You have not claimed any vouchers yet.')
    ).toBeDefined();
  });

  it('shows an unknown voucher as not found', async () => {
    await signInAs(/Verified member/, '/vouchers/does-not-exist');
    expect(await screen.findByText('Voucher not found')).toBeDefined();
  });

  it('opens the wallet after a perk was renamed or removed', async () => {
    const first = await signInAs(/Verified member/, '/vouchers');
    await screen.findByText('ASTR-PRK-98214');
    first.unmount();

    const records = JSON.parse(window.sessionStorage.getItem(RECORDS_KEY)!);
    records.perks = records.perks
      .filter((perk: { id: string }) => perk.id !== 'perk-bookstore')
      .map((perk: { id: string; title: string }) =>
        perk.id === 'perk-sticker-pack'
          ? { ...perk, title: 'Renamed Stickers' }
          : perk
      );
    records.vouchers[0].reward = null;
    records.vouchers[0].partnerName = null;
    records.vouchers[0].instructions = null;
    window.sessionStorage.setItem(RECORDS_KEY, JSON.stringify(records));

    window.history.pushState({}, '', '/vouchers');
    render(<App />);
    expect(await screen.findByText('Perk details unavailable')).toBeDefined();
    expect(screen.getByText('ASTRA Official Dev Sticker Pack')).toBeDefined();
    expect(screen.getByText('ASTR-PRK-98214')).toBeDefined();
  });
});

describe('mobile points', () => {
  it('shows the complete ledger opened from the More menu', async () => {
    await portalData.signIn({ method: 'shortcut', shortcutId: 'officer' });
    for (const referenceId of ['Booth', 'Stage']) {
      await portalData.grantPoints({
        studentId: '24-90001',
        amount: 10,
        reason: 'Event Volunteer',
        referenceId,
        idempotencyKey: referenceId,
      });
    }
    await portalData.signOut();

    await signInAs(/Verified member/, '/home');
    expect(await screen.findByText('Total Points: 470 PTS')).toBeDefined();
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: 'Member navigation' })
      ).getByRole('button', { name: 'More' })
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'More' })).getByRole('link', {
        name: 'Points',
      })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/points'));

    expect(
      await screen.findByRole('heading', { name: 'Points and ledger' })
    ).toBeDefined();
    expect(screen.getByText('Current Balance').nextSibling?.textContent).toBe(
      '470 PTS'
    );
    expect(screen.getByText('Lifetime Redeemed').nextSibling?.textContent).toBe(
      '50 PTS'
    );
    expect(screen.getAllByText('Activity / Event')).toHaveLength(7);
    expect(screen.queryByText('Status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Redeemed' }));
    expect(screen.getAllByText('Activity / Event')).toHaveLength(1);
    expect(screen.getByText('−50 PTS')).toBeDefined();
  });
});

describe('desktop rewards screens', () => {
  const placeholders: Array<[string, string]> = [
    ['/marketplace', 'Perks Marketplace'],
    ['/vouchers', 'Claimed Vouchers'],
    ['/vouchers/V-98214', 'Voucher Details'],
    ['/points', 'Points & Ledger'],
  ];

  it('shows the placeholders and loads no rewards data', async () => {
    useViewport(true);
    const calls: string[] = [];
    useAdapter((base) => ({
      listPerks: () => {
        calls.push('listPerks');
        return base.listPerks();
      },
      listVouchers: () => {
        calls.push('listVouchers');
        return base.listVouchers();
      },
      getVoucher: (id: string) => {
        calls.push('getVoucher');
        return base.getVoucher(id);
      },
      getPoints: () => {
        calls.push('getPoints');
        return base.getPoints();
      },
    }));
    const first = await signInAs(/Verified member/, '/home');
    first.unmount();
    for (const [path, heading] of placeholders) {
      window.history.pushState({}, '', path);
      const view = render(<App />);
      expect(
        await screen.findByRole('heading', { level: 2, name: heading })
      ).toBeDefined();
      view.unmount();
    }
    expect(calls).toEqual([]);
  });

  it('switches screens when the viewport crosses the breakpoint', async () => {
    const viewport = useViewport(true);
    await signInAs(/Verified member/, '/marketplace');
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Perks Marketplace',
      })
    ).toBeDefined();
    viewport.set(false);
    expect(
      await screen.findByRole('heading', { name: 'Partner Perks & Rewards' })
    ).toBeDefined();
    viewport.set(true);
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Perks Marketplace',
      })
    ).toBeDefined();
    expect(
      screen.queryByRole('heading', { name: 'Partner Perks & Rewards' })
    ).toBeNull();
  });

  it('keeps an unconfirmed claim key across the breakpoint', async () => {
    const viewport = useViewport(false);
    const keys: string[] = [];
    useAdapter((base) => ({
      claimPerk: async (perkId: string, options: ClaimPerkOptions) => {
        keys.push(options.idempotencyKey);
        const result = await base.claimPerk(perkId, options);
        if (keys.length === 1) {
          throw new DataError('unavailable', 'The connection dropped.');
        }
        return result;
      },
    }));
    await signInAs(/Verified member/, '/marketplace');
    let dialog = await openClaim('Campus Cafe Free Beverage');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    await within(dialog).findByRole('alert');

    viewport.set(true);
    await screen.findByRole('heading', { level: 2, name: 'Perks Marketplace' });
    viewport.set(false);
    dialog = await openClaim('Campus Cafe Free Beverage');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    await screen.findByRole('dialog', {
      name: 'Voucher Claimed: Campus Cafe Free Beverage',
    });
    expect(keys[1]).toBe(keys[0]);
    expect((await portalData.getPoints()).balance).toBe(400);
  });

  it('opens no receipt when the screen changes during a claim', async () => {
    const viewport = useViewport(false);
    let finish: () => void = () => undefined;
    useAdapter((base) => ({
      claimPerk: (perkId: string, options: ClaimPerkOptions) =>
        new Promise<ClaimResult>((resolve, reject) => {
          finish = () => {
            base.claimPerk(perkId, options).then(resolve, reject);
          };
        }),
    }));
    await signInAs(/Verified member/, '/marketplace');
    const dialog = await openClaim('Campus Cafe Free Beverage');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    );
    expect(
      within(dialog).getByRole('button', { name: 'Claiming…' })
    ).toBeDefined();

    viewport.set(true);
    await screen.findByRole('heading', { level: 2, name: 'Perks Marketplace' });
    await act(async () => {
      finish();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(window.location.pathname).toBe('/marketplace');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((await portalData.getPoints()).balance).toBe(400);
  });
});

describe('mobile sign-in, overview, and digital ID', () => {
  it('signs in from the mobile login and returns to the requested page', async () => {
    window.history.pushState(
      {},
      '',
      `/login?next=${encodeURIComponent('/id')}`
    );
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'ASTRA Member Portal Login' })
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Sign In to Portal' }));
    expect(
      screen.getByText('Error: Enter your student ID or email address.')
    ).toBeDefined();
    expect(screen.getByText('Error: Enter your password.')).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Login with Google / Institutional SSO',
      })
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Google sign-in is not available'
    );

    fireEvent.click(
      await screen.findByRole('button', { name: /Verified member/ })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/id'));
  });

  it('signs in with typed credentials on the mobile login', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.change(
      await screen.findByLabelText('Student ID or Email Address'),
      { target: { value: '24-90001' } }
    );
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'any-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In to Portal' }));
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
    expect(await screen.findByText('Total Points: 450 PTS')).toBeDefined();
  });

  it('shows the member overview from the portal data', async () => {
    await signInAs(/Verified member/, '/home');
    expect(await screen.findByText('✔ Active Member')).toBeDefined();
    expect(screen.getByText('Annual Dues Paid')).toBeDefined();
    expect(screen.getByText('Student ID: 24-90001')).toBeDefined();
    expect(screen.getByText('Events Attended: 2')).toBeDefined();
    expect(screen.getByText('Last: Git Essentials')).toBeDefined();
    expect(screen.getByText('Active Vouchers: 1')).toBeDefined();
    expect(screen.getByText('15% Off at the Campus Bookstore')).toBeDefined();
    expect(
      screen
        .getByRole('link', { name: 'Check In to Event' })
        .getAttribute('href')
    ).toBe('/id');
  });

  it('sends officers from the overview to event check-in', async () => {
    await signInAs(/^Officer/, '/home');
    expect(
      (
        await screen.findByRole('link', { name: 'Check In to Event' })
      ).getAttribute('href')
    ).toBe('/checkin');
  });

  it('shows an inactive membership on the overview', async () => {
    await signInAs(/Unverified member/, '/home');
    expect(await screen.findByText('✖ Membership not active')).toBeDefined();
    expect(screen.getByText('Annual Dues Unpaid')).toBeDefined();
  });

  it('shows the verified card with the member QR', async () => {
    await signInAs(/Verified member/, '/id');
    expect(await screen.findByText('VALID / ACTIVE DUES')).toBeDefined();
    expect(screen.getByText('Verified Doe')).toBeDefined();
    expect(
      screen.getAllByRole('img', { name: 'Member check-in QR' })
    ).toHaveLength(1);
    expect(screen.queryByText(/Refreshes in/)).toBeNull();
    expect(screen.queryByText(/sample/i)).toBeNull();
  });

  it('shows an unverified card without a QR and opens the renewal notice', async () => {
    await signInAs(/Unverified member/, '/id');
    expect(
      await screen.findByText('UNVERIFIED / INACTIVE FOR CHECK-IN')
    ).toBeDefined();
    expect(
      screen.queryByRole('img', { name: 'Member check-in QR' })
    ).toBeNull();
    expect(screen.getByText('Payment Instructions')).toBeDefined();
    fireEvent.click(
      screen.getByRole('link', { name: 'Read renewal guidance' })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/not-valid'));
    expect(
      await screen.findByRole('heading', { name: 'Membership not valid' })
    ).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: 'Back to Digital ID' }));
    await waitFor(() => expect(window.location.pathname).toBe('/id'));
  });

  it('keeps the desktop redirect from the not-valid page', async () => {
    useViewport(true);
    await signInAs(/Unverified member/, '/id');
    window.history.pushState({}, '', '/not-valid');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(window.location.pathname).toBe('/id'));
  });
});

describe('portal navigation', () => {
  function bottomNav() {
    return screen.getByRole('navigation', { name: 'Member navigation' });
  }

  function names(nav: HTMLElement) {
    return within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label'));
  }

  it('builds the mobile navigation from the role destinations', async () => {
    const member = await signInAs(/Verified member/, '/home');
    expect(names(bottomNav())).toEqual([
      'Overview',
      'Digital ID',
      'Perks Marketplace',
      'My Vouchers',
    ]);
    expect(
      within(bottomNav())
        .getByRole('link', { name: 'Overview' })
        .getAttribute('aria-current')
    ).toBe('page');
    member.unmount();
    window.sessionStorage.clear();

    await signInAs(/^Officer/, '/home');
    expect(names(bottomNav())).toEqual([
      'Overview',
      'Digital ID',
      'Officer Points',
      'Perks Marketplace',
      'Event Check-in',
      'My Vouchers',
    ]);
    expect(
      within(bottomNav()).getByRole('button', { name: 'More' })
    ).toBeDefined();
  });

  it('marks My Vouchers active on a voucher receipt', async () => {
    await signInAs(/Verified member/, '/vouchers/V-98214');
    await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    const desktop = screen.getByRole('navigation', { name: 'Portal' });
    for (const nav of [desktop, bottomNav()]) {
      expect(
        within(nav)
          .getByRole('link', { name: 'My Vouchers' })
          .getAttribute('aria-current')
      ).toBe('page');
      expect(
        within(nav)
          .getByRole('link', { name: 'Overview' })
          .getAttribute('aria-current')
      ).toBeNull();
    }
  });

  it('opens Points from the mobile More menu and closes the menu with Escape', async () => {
    await signInAs(/Verified member/, '/home');
    const more = within(bottomNav()).getByRole('button', { name: 'More' });
    fireEvent.click(more);
    const sheet = screen.getByRole('dialog', { name: 'More' });
    expect(document.activeElement).toBe(
      within(sheet).getByRole('button', { name: 'Close more menu' })
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'More' })).toBeNull();
    expect(document.activeElement).toBe(more);

    fireEvent.click(more);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'More' })).getByRole('link', {
        name: 'Points',
      })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/points'));
    expect(
      await screen.findByRole('heading', { name: 'Points and ledger' })
    ).toBeDefined();
    expect(
      within(bottomNav()).getByRole('button', { name: 'More' }).className
    ).toContain('text-astra-primary-light');
  });

  it('keeps the officer tools out of the member More menu', async () => {
    await signInAs(/Verified member/, '/home');
    fireEvent.click(within(bottomNav()).getByRole('button', { name: 'More' }));
    const sheet = screen.getByRole('dialog', { name: 'More' });
    expect(
      within(sheet)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual([
      'Points',
      'Opportunities',
      'Partner instructions',
      'ASTRAscend services',
      'Public homepage',
    ]);
  });

  it('puts Logout before the ASTRAscend pill on desktop', async () => {
    await signInAs(/Verified member/, '/home');
    const header = screen.getByRole('banner');
    const logout = within(header).getByRole('button', { name: 'Logout' });
    const pill = within(header).getByRole('link', { name: 'ASTRAscend' });
    expect(pill.textContent).toBe('ASTRAscend');
    expect(pill.getAttribute('href')).toBe('/astrascend');
    expect(pill.className).toContain('hidden');
    expect(pill.className).toContain('lg:inline-flex');
    expect(
      logout.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const small = within(header).getByRole('link', {
      name: 'ASTRAscend services',
    });
    expect(small.getAttribute('href')).toBe('/astrascend');
    expect(small.className).toContain('md:inline-flex');
    expect(small.className).toContain('lg:hidden');
    expect(
      small.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe('public pages', () => {
  it('event registration link target is honest about registration', () => {
    window.history.pushState({}, '', '/events/html-css-lab');
    render(<App />);
    expect(screen.getByText(/registration is not open yet/i)).toBeDefined();
  });

  it('events calendar navigates months and does not invent events', () => {
    render(<EventsCalendar initialMonth={new Date(2026, 10, 1)} />);
    expect(screen.getByText('November 2026')).toBeDefined();
    expect(
      screen.getByText(/No events are published for November 2026/)
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('December 2026')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('November 2026')).toBeDefined();
  });
});
