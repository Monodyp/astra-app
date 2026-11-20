import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  type PortalDataSource,
} from '../data/index.js';
import { createDemoDataSource } from '../data/demo/demoSource.js';
import { RECORDS_KEY } from '../data/demo/store.js';

let previous: PortalDataSource | null = null;

function useAdapter(
  overrides: (base: PortalDataSource) => Partial<PortalDataSource>
) {
  const base = createDemoDataSource();
  const replaced = setPortalDataSource({ ...base, ...overrides(base) });
  previous ??= replaced;
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

async function openClaim(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Claim ${name}` }));
  return screen.getByRole('dialog', { name: 'Claim this voucher?' });
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  if (previous) setPortalDataSource(previous);
  previous = null;
});

describe('perks marketplace', () => {
  it('builds the filters from the portal categories', async () => {
    await signInAs(/Verified member/, '/marketplace');
    const filters = await screen.findByRole('group', {
      name: 'Perk categories',
    });
    expect(
      within(filters)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual([
      'All Perks',
      'Discounts',
      'Merch / Collectibles',
      'Partner Workshops',
      'Food & Drink',
    ]);
    fireEvent.click(
      within(filters).getByRole('button', { name: 'Food & Drink' })
    );
    expect(
      screen.getByRole('button', { name: 'Claim Campus Cafe Free Beverage' })
    ).toBeDefined();
    expect(
      screen.queryByRole('button', { name: /Claim ASTRA Mission Hoodie/ })
    ).toBeNull();
  });

  it('explains why a perk cannot be claimed', async () => {
    await signInAs(/Verified member/, '/marketplace');
    expect(await screen.findByText('450 PTS Available')).toBeDefined();
    const hoodie = screen.getByRole('button', {
      name: 'Claim ASTRA Mission Hoodie',
    });
    expect(hoodie.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText('Not enough points: you need 750 more PTS.')
    ).toBeDefined();
    expect(screen.getByText('This perk is out of stock.')).toBeDefined();
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
      name: 'Campus Cafe Free Beverage',
    });
    expect(window.location.pathname).toMatch(/^\/vouchers\/V-/);
    expect(within(receipt).getByText('Voucher claimed')).toBeDefined();
    const code = within(receipt).getByLabelText(/^Voucher code/).textContent!;
    expect(code).toMatch(/^ASTR-PRK-/);
    expect(
      within(receipt).getByRole('img', { name: 'Voucher QR' })
    ).toBeDefined();

    fireEvent.click(within(receipt).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(window.location.pathname).toBe('/marketplace'));
    expect(await screen.findByText('400 PTS Available')).toBeDefined();

    fireEvent.click(
      within(screen.getByRole('main')).getByRole('link', {
        name: 'My Vouchers',
      })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/vouchers'));
    const wallet = await screen.findByRole('list', {
      name: 'Claimed vouchers',
    });
    expect(within(wallet).getByText(code)).toBeDefined();
    expect(within(wallet).getAllByRole('listitem')).toHaveLength(4);
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
      'could not confirm your claim'
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Retry claim' })
    );
    await screen.findByRole('dialog', { name: 'Campus Cafe Free Beverage' });

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
        name: 'ASTRA Official Dev Sticker Pack',
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
      'That claim key was already used for a different perk.'
    );
    expect(
      within(dialog).getByRole('button', { name: 'Confirm claim' })
    ).toBeDefined();
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
      name: 'Campus Cafe Free Beverage',
    });
    expect(within(receipt).getByLabelText(/^Voucher code/)).toBeDefined();
    fireEvent.click(within(receipt).getByRole('button', { name: 'Close' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Perks are offline.'
    );
    expect((await portalData.getPoints()).balance).toBe(400);
  });
});

describe('voucher wallet and receipts', () => {
  it('shows each voucher state with its code', async () => {
    await signInAs(/Verified member/, '/vouchers');
    const wallet = await screen.findByRole('list', {
      name: 'Claimed vouchers',
    });
    expect(within(wallet).getByText('ASTR-PRK-98214')).toBeDefined();
    expect(within(wallet).getByText('Ready')).toBeDefined();
    expect(within(wallet).getByText('Redeemed')).toBeDefined();
    expect(within(wallet).getByText('Expired')).toBeDefined();
    expect(
      within(wallet)
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
      within(receipt).getByRole('img', { name: 'Voucher QR' })
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
      within(expired).getByText('Expired · cannot be redeemed')
    ).toBeDefined();
    expect(
      within(expired).queryByRole('img', { name: 'Voucher QR' })
    ).toBeNull();
    goTo('/vouchers/V-66319');
    const used = await screen.findByRole('dialog', {
      name: 'ASTRA Official Dev Sticker Pack',
    });
    expect(within(used).getByText('Already redeemed')).toBeDefined();
  });

  it('hides vouchers that belong to another account', async () => {
    await signInAs(/^Officer/, '/vouchers/V-98214');
    expect(await screen.findByText('Voucher not found')).toBeDefined();
    fireEvent.click(
      screen.getByRole('link', { name: 'Back to claimed vouchers' })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/vouchers'));
    expect(await screen.findByText('No vouchers yet')).toBeDefined();
  });

  it('shows an unknown voucher as not found', async () => {
    await signInAs(/Verified member/, '/vouchers/does-not-exist');
    expect(await screen.findByText('Voucher not found')).toBeDefined();
  });

  it('opens the wallet after a perk was renamed or removed', async () => {
    const first = await signInAs(/Verified member/, '/vouchers');
    await screen.findByRole('list', { name: 'Claimed vouchers' });
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
    const wallet = await screen.findByRole('list', {
      name: 'Claimed vouchers',
    });
    expect(within(wallet).getByText('Perk details unavailable')).toBeDefined();
    expect(
      within(wallet).getByText('ASTRA Official Dev Sticker Pack')
    ).toBeDefined();
    expect(within(wallet).getByText('ASTR-PRK-98214')).toBeDefined();
  });
});

describe('points history', () => {
  it('opens the complete ledger from the overview points card', async () => {
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
    const activity = await screen.findByRole('list', {
      name: 'Recent activity',
    });
    expect(within(activity).getAllByRole('listitem')).toHaveLength(5);
    fireEvent.click(screen.getByRole('link', { name: /Total Points/ }));
    await waitFor(() => expect(window.location.pathname).toBe('/points'));

    const ledger = await screen.findByRole('list', { name: 'Points ledger' });
    expect(within(ledger).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Current Balance').nextSibling?.textContent).toBe(
      '470PTS'
    );
    expect(screen.getByText('Spent on Perks').nextSibling?.textContent).toBe(
      '50PTS'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redemptions' }));
    expect(within(ledger).getAllByRole('listitem')).toHaveLength(1);
    expect(within(ledger).getByText('-50 pts')).toBeDefined();
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
      await screen.findByRole('heading', { level: 1, name: 'Points' })
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

  it('links the header to the internal ASTRAscend pages', async () => {
    await signInAs(/Verified member/, '/home');
    expect(
      screen
        .getByRole('link', { name: 'ASTRAscend services' })
        .getAttribute('href')
    ).toBe('/astrascend');
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
