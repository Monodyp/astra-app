import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';
import {
  DataError,
  portalData,
  setPortalDataSource,
  type ClaimResult,
  type PortalDataSource,
} from '../data/index.js';
import { createDemoDataSource } from '../data/demo/demoSource.js';

let previous: PortalDataSource;

beforeEach(() => {
  window.sessionStorage.clear();
  previous = setPortalDataSource(createDemoDataSource({ latencyMs: 0 }));
});

afterEach(() => {
  setPortalDataSource(previous);
  vi.restoreAllMocks();
});

function useAdapter(
  overrides: (base: PortalDataSource) => Partial<PortalDataSource>
) {
  const base = createDemoDataSource({ latencyMs: 0 });
  setPortalDataSource({ ...base, ...overrides(base) });
}

async function open(path = '/marketplace') {
  await portalData.signIn({
    method: 'shortcut',
    shortcutId: 'verified-member',
  });
  window.history.pushState({}, '', path);
  return render(<App />);
}

function goTo(path: string) {
  act(() => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

async function confirmClaim() {
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Claim Campus Cafe Free Beverage',
    })
  );
  const dialog = screen.getByRole('dialog', { name: 'Claim this voucher?' });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Confirm claim' })
  );
  return dialog;
}

describe('marketplace integration', () => {
  it('uses the returned catalog, merchant, inventory and wallet count', async () => {
    useAdapter((base) => ({
      listPerks: async () => {
        const catalog = await base.listPerks();
        return {
          ...catalog,
          perks: catalog.perks.filter((perk) => perk.category === 'food'),
        };
      },
    }));
    await open();
    const filters = await screen.findByRole('group', {
      name: 'Perk categories',
    });
    expect(
      within(filters)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['All Perks', 'Food & Drink']);
    const card = screen.getByRole('article');
    expect(
      within(card).getByLabelText('Remaining inventory').textContent
    ).toMatch(/remaining|stock/);
    expect(within(card).getAllByText('Campus Cafe').length).toBeGreaterThan(0);
    const wallet = within(screen.getByRole('main')).getByRole('link', {
      name: 'My Vouchers',
    });
    await waitFor(() => expect(wallet.textContent).toContain('(1)'));
  });

  it('keeps claims usable when only the voucher count fails', async () => {
    let fail = true;
    useAdapter((base) => ({
      listVouchers: () =>
        fail
          ? Promise.reject(new DataError('unavailable', 'Wallet offline'))
          : base.listVouchers(),
    }));
    await open();
    expect(
      await screen.findByRole('button', {
        name: 'Claim Campus Cafe Free Beverage',
      })
    ).toBeEnabled();
    await screen.findByRole('button', { name: 'Retry voucher count' });
    fail = false;
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry voucher count' })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Retry voucher count' })
      ).toBeNull()
    );
  });

  it('does not redirect after leaving a pending claim', async () => {
    let finish!: () => Promise<void>;
    useAdapter((base) => ({
      claimPerk: (perkId, options) =>
        new Promise<ClaimResult>((resolve) => {
          finish = async () => resolve(await base.claimPerk(perkId, options));
        }),
    }));
    await open();
    await confirmClaim();
    goTo('/vouchers');
    await screen.findByRole('heading', { name: 'Claimed Vouchers' });
    await act(finish);
    expect(window.location.pathname).toBe('/vouchers');
    expect((await portalData.getPoints()).balance).toBe(400);
  });

  it('submits once while resizing across the desktop breakpoint', async () => {
    let finish!: () => Promise<void>;
    const submit = vi.fn<PortalDataSource['claimPerk']>();
    useAdapter((base) => ({
      claimPerk: submit.mockImplementation(
        (perkId, options) =>
          new Promise<ClaimResult>((resolve) => {
            finish = async () => resolve(await base.claimPerk(perkId, options));
          })
      ),
    }));
    await open();
    const dialog = await confirmClaim();
    const originalWidth = window.innerWidth;
    try {
      for (const width of [390, 820, 1280]) {
        act(() => {
          window.innerWidth = width;
          window.dispatchEvent(new Event('resize'));
        });
      }
      expect(
        within(dialog).getByRole('button', { name: 'Claiming…' })
      ).toBeDisabled();
      expect(submit).toHaveBeenCalledTimes(1);
      await act(finish);
      await screen.findByRole('dialog', { name: 'Campus Cafe Free Beverage' });
      expect((await portalData.getPoints()).balance).toBe(400);
    } finally {
      window.innerWidth = originalWidth;
    }
  });

  it.each([
    'insufficient_points',
    'out_of_stock',
    'claim_limit',
    'membership_inactive',
  ] as const)('shows an authoritative %s decline', async (reason) => {
    useAdapter(() => ({
      claimPerk: async () => ({
        status: 'declined',
        reason,
        message: `Claim declined: ${reason}`,
      }),
    }));
    await open();
    const dialog = await confirmClaim();
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      `Claim declined: ${reason}`
    );
    expect(window.location.pathname).toBe('/marketplace');
  });
});
