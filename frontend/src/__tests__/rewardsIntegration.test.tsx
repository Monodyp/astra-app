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

  it('does not reopen a receipt after the member signs out', async () => {
    let finish!: () => void;
    useAdapter((base) => ({
      claimPerk: async (perkId, options) => {
        const result = await base.claimPerk(perkId, options);
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        return result;
      },
    }));
    await open();
    await confirmClaim();
    await waitFor(() => expect(finish).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    await act(async () => finish());
    expect(window.location.pathname).toBe('/login');
    expect(screen.queryByRole('dialog')).toBeNull();
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

describe('voucher integration', () => {
  it('filters all three statuses and counts the returned records', async () => {
    await open('/vouchers');
    const filters = await screen.findByRole('group', {
      name: 'Filter vouchers by status',
    });
    const all = within(filters).getByRole('button', { name: 'All (3)' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    for (const [label, code] of [
      ['Ready', 'ASTR-PRK-98214'],
      ['Redeemed', 'ASTR-PRK-66319'],
      ['Expired', 'ASTR-PRK-50412'],
    ]) {
      fireEvent.click(
        within(filters).getByRole('button', { name: `${label} (1)` })
      );
      const list = screen.getByRole('list', { name: 'Claimed vouchers' });
      expect(within(list).getAllByRole('article')).toHaveLength(1);
      expect(within(list).getByText(code)).toBeDefined();
    }
    fireEvent.click(all);
    expect(
      within(
        screen.getByRole('list', { name: 'Claimed vouchers' })
      ).getAllByRole('article')
    ).toHaveLength(3);
  });

  it('keeps the other status filters available when one has no vouchers', async () => {
    useAdapter((base) => ({
      listVouchers: async () =>
        (await base.listVouchers()).filter(
          (voucher) => voucher.state === 'expired'
        ),
    }));
    await open('/vouchers');
    const filters = await screen.findByRole('group', {
      name: 'Filter vouchers by status',
    });
    fireEvent.click(within(filters).getByRole('button', { name: 'Ready (0)' }));
    expect(screen.getByText('No ready vouchers')).toBeDefined();
    fireEvent.click(
      within(filters).getByRole('button', { name: 'Expired (1)' })
    );
    expect(
      screen.getByRole('list', { name: 'Claimed vouchers' })
    ).toBeDefined();
  });

  it('opens the actual barcode from the wallet and returns with Escape', async () => {
    await open('/vouchers');
    fireEvent.click(
      await screen.findByRole('link', {
        name: 'Show Barcode for ASTR-PRK-98214',
      })
    );
    const dialog = await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    const barcode = within(dialog).getByRole('img', {
      name: 'Voucher barcode',
    });
    await waitFor(() =>
      expect(barcode.querySelectorAll('rect').length).toBeGreaterThan(10)
    );
    expect(barcode.tagName.toLowerCase()).toBe('svg');
    expect(window.location.hash).toBe('#barcode');
    expect(document.activeElement).toBe(barcode.closest('figure'));
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(
      within(dialog).getByText(
        /Staff can enter the voucher code ASTR-PRK-98214 manually/
      )
    ).toBeDefined();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(window.location.pathname).toBe('/vouchers'));
  });

  it('shows live QR unavailability without rendering a demo barcode', async () => {
    useAdapter((base) => ({
      getVoucher: async (id) => ({
        ...(await base.getVoucher(id)),
        code: 'ABCDEF1234567890',
        qrValue: null,
      }),
    }));
    await open('/vouchers/V-98214');
    const dialog = await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    expect(within(dialog).getByText(/Redemption QR unavailable/)).toBeDefined();
    expect(
      within(dialog).queryByRole('img', { name: 'Voucher barcode' })
    ).toBeNull();
    expect(
      within(dialog).queryByRole('img', { name: 'Voucher QR' })
    ).toBeNull();
    expect(
      within(dialog).getByLabelText('Voucher code ABCDEF1234567890')
    ).toBeDefined();
  });

  it('keeps an invalid barcode value readable as text', async () => {
    useAdapter((base) => ({
      getVoucher: async (id) => ({
        ...(await base.getVoucher(id)),
        code: 'invalid-☃',
      }),
    }));
    await open('/vouchers/V-98214');
    const dialog = await screen.findByRole('dialog', {
      name: '15% Off at the Campus Bookstore',
    });
    expect(
      within(dialog).getByLabelText('Voucher code invalid-☃')
    ).toBeDefined();
    expect(
      within(dialog).queryByRole('img', { name: 'Voucher barcode' })
    ).toBeNull();
  });

  it.each(['V-50412', 'V-66319'])(
    'hides both scan formats and gives inactive instructions for %s',
    async (id) => {
      await open(`/vouchers/${id}`);
      await screen.findByRole('heading', { name: 'Redemption Instructions' });
      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).queryByRole('img', { name: 'Voucher barcode' })
      ).toBeNull();
      expect(
        within(dialog).queryByRole('img', { name: 'Voucher QR' })
      ).toBeNull();
      expect(within(dialog).queryByText(/Staff can enter/)).toBeNull();
      expect(
        within(dialog).getByText(
          id === 'V-50412'
            ? /and can no longer be redeemed/
            : /Keep this receipt for your records/
        )
      ).toBeDefined();
    }
  );
});
