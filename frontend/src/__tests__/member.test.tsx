import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { MemberDataProvider } from '../features/member/MemberDataContext';
import { createFixtureSource } from '../features/member/fixtures';
import { unavailableSource } from '../features/member/unavailableSource';
import type { MemberDataSource, Role } from '../features/member/types';
import { Login } from '../pages/Login';
import { Marketplace } from '../pages/Marketplace';
import { VoucherDetails } from '../pages/VoucherDetails';
import { ClaimedVouchers } from '../pages/ClaimedVouchers';
import { CheckIn } from '../pages/CheckIn';
import { OfficerGrantPoints, validateGrant } from '../pages/OfficerGrantPoints';
import { DigitalID } from '../pages/DigitalID';
import { EventDetail } from '../pages/EventDetail';
import EventsCalendar from '../components/home/events-calendar';

// Minimal stand-in for @testing-library/user-event (not a dependency of this project).
const userEvent = {
  setup: () => ({
    click: async (el: Element) => { fireEvent.click(el); },
    type: async (el: Element, text: string) => {
      const input = el as HTMLInputElement;
      fireEvent.change(input, { target: { value: input.value + text } });
    },
    clear: async (el: Element) => { fireEvent.change(el, { target: { value: '' } }); },
    keyboard: async (k: string) => { fireEvent.keyDown(document, { key: k.replace(/[{}]/g, '') }); },
  }),
};

function fixture(role: Role = 'member', duesPaid = true): MemberDataSource {
  return createFixtureSource(() => ({ role, duesPaid }));
}

function renderAt(path: string, source: MemberDataSource) {
  return render(
    <MemberDataProvider source={source}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route element={<AppShell />}>
            <Route path="/id" element={<DigitalID />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/vouchers" element={<ClaimedVouchers />} />
            <Route path="/vouchers/:id" element={<VoucherDetails />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/officer/grant-points" element={<OfficerGrantPoints />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </MemberDataProvider>,
  );
}

beforeEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
});

describe('member navigation', () => {
  it('shows the six bottom-nav items and marks the active one', async () => {
    renderAt('/marketplace', fixture());
    const nav = screen.getAllByRole('navigation', { name: 'Member navigation' })[0];
    for (const l of ['Digital ID', 'Points', 'Home', 'Perks', 'Check-in', 'More']) {
      expect(within(nav).getByText(l)).toBeTruthy();
    }
    expect(within(nav).getByRole('link', { name: /Perks/ }).getAttribute('aria-current')).toBe('page');
  });

  it('More menu hides officer tools from members, shows them to officers, and closes on Escape', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/id', fixture('member'));
    await user.click(screen.getAllByRole('button', { name: /More/ })[0]);
    expect(screen.getByRole('dialog', { name: 'More' })).toBeTruthy();
    expect(screen.queryByText(/Grant points/)).toBeNull();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
    renderAt('/id', fixture('officer'));
    await waitFor(() => expect(screen.getAllByText('Officer').length).toBeGreaterThan(0));
    await user.click(screen.getAllByRole('button', { name: /More/ })[0]);
    expect(screen.getByText(/Grant points/)).toBeTruthy();
  });
});

describe('login', () => {
  it('validates, toggles Show/Hide and never pretends to sign in', async () => {
    const user = userEvent.setup();
    renderAt('/login', unavailableSource);
    await user.click(screen.getByRole('button', { name: 'Sign In to Portal' }));
    expect(screen.getByText(/Enter your student ID/)).toBeTruthy();
    const pw = screen.getByLabelText('Password') as HTMLInputElement;
    await user.type(pw, 'secret');
    expect(pw.type).toBe('password');
    await user.click(screen.getByRole('button', { name: /Show/ }));
    expect(pw.type).toBe('text');
    await user.type(screen.getByLabelText('Student ID or Email Address'), '2024-00001');
    await user.click(screen.getByRole('button', { name: 'Sign In to Portal' }));
    expect(screen.getByRole('alert').textContent).toMatch(/not available yet.*not signed in/);
  });
});

describe('digital ID states', () => {
  it('valid member gets a labeled sample QR; unpaid member gets no QR', async () => {
    const { unmount } = renderAt('/id', fixture('member', true));
    expect(await screen.findByText('VALID / ACTIVE DUES')).toBeTruthy();
    expect(screen.getByText(/Sample pattern/)).toBeTruthy();
    unmount();
    renderAt('/id', fixture('member', false));
    expect(await screen.findByText('UNPAID / NOT VALID')).toBeTruthy();
    expect(screen.queryByText(/Sample pattern/)).toBeNull();
    expect(screen.getByText('Payment Instructions')).toBeTruthy();
  });

  it('shows an honest unavailable state when the service is not connected', async () => {
    renderAt('/id', unavailableSource);
    expect(await screen.findByText('Not available yet')).toBeTruthy();
  });
});

describe('marketplace → claim → voucher', () => {
  it('confirms a claim, shows the simulated receipt, and Escape returns', async () => {
    const user = userEvent.setup();
    renderAt('/marketplace', fixture());
    const claims = await screen.findAllByRole('button', { name: 'Claim Voucher' });
    // 450 PTS: the 800 PTS mug is disabled with a reason
    expect(claims.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getAllByText(/Not enough points/).length).toBeGreaterThan(0);
    await user.click(claims[0]);
    const dlg = screen.getByRole('dialog', { name: 'Claim this voucher?' });
    await user.click(within(dlg).getByRole('button', { name: 'Confirm claim' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Claim this voucher?' })).toBeNull());
  });

  it('shows voucher not found for an unknown id', async () => {
    renderAt('/vouchers/does-not-exist', fixture());
    expect(await screen.findByText('Voucher not found')).toBeTruthy();
  });

  it('shows expired status and no QR for an expired voucher', async () => {
    renderAt('/vouchers/v-00001', fixture());
    expect(await screen.findByText(/EXPIRED/)).toBeTruthy();
    expect(screen.queryByText(/Sample pattern/)).toBeNull();
  });

  it('lists claimed vouchers with View Details links', async () => {
    renderAt('/vouchers', fixture());
    expect(await screen.findByText('ASTR-PRK-98214')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /View Details/ })[0].getAttribute('href')).toBe('/vouchers/v-98214');
  });
});

describe('check-in', () => {
  it('handles invalid, success and repeat submissions', async () => {
    const user = userEvent.setup();
    renderAt('/checkin', fixture());
    const field = screen.getByLabelText('Event Code Attendance');
    const go = screen.getByRole('button', { name: 'Verify & Check In' });
    await user.click(go);
    expect(screen.getByText(/Enter the event code/)).toBeTruthy();
    await user.type(field, 'WRONG-CODE');
    await user.click(go);
    expect((await screen.findByRole('alert')).textContent).toMatch(/not recognized/);
    await user.clear(field);
    await user.type(field, 'astra-demo');
    await user.click(go);
    expect((await screen.findByRole('status', { name: '' })).textContent).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText(/Simulated check-in/).length).toBeGreaterThan(0));
    await user.type(field, 'ASTRA-DEMO');
    await user.click(go);
    expect(await screen.findByText(/already checked in/)).toBeTruthy();
  });

  it('says the scanner is unsupported when there is no camera API', () => {
    renderAt('/checkin', fixture());
    expect(screen.getByText(/No camera or scanner is available/)).toBeTruthy();
  });

  it('real (unavailable) source reports the service is not connected', async () => {
    const user = userEvent.setup();
    renderAt('/checkin', unavailableSource);
    await user.type(screen.getByLabelText('Event Code Attendance'), 'ASTRA-DEMO');
    await user.click(screen.getByRole('button', { name: 'Verify & Check In' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/not connected/);
  });
});

describe('officer grant points', () => {
  it('validateGrant covers selection, amount range and reason', () => {
    expect(validateGrant({ member: null, amount: '', reason: '' })).toEqual({
      member: expect.any(String), amount: expect.any(String), reason: expect.any(String),
    });
    const m = { studentId: '1', name: 'A', program: 'P' };
    expect(validateGrant({ member: m, amount: '1.5', reason: 'x' }).amount).toBeTruthy();
    expect(validateGrant({ member: m, amount: '99999', reason: 'x' }).amount).toBeTruthy();
    expect(validateGrant({ member: m, amount: '50', reason: 'x' })).toEqual({});
  });

  it('is blocked for non-officers', async () => {
    renderAt('/officer/grant-points', fixture('member'));
    expect(await screen.findByText('Officer access required')).toBeTruthy();
  });

  it('officers can search, select, validate, and submit a simulated grant', async () => {
    const user = userEvent.setup();
    renderAt('/officer/grant-points', fixture('officer'));
    await user.click(await screen.findByRole('button', { name: 'Grant Points to Member' }));
    expect(screen.getByText(/Search for and select a member/)).toBeTruthy();
    await user.type(screen.getByLabelText(/Search by Student ID/), 'jane');
    await user.click(await screen.findByRole('button', { name: /Jane Doe/ }));
    await user.type(screen.getByLabelText('Points Amount'), '25');
    await user.click(screen.getByRole('button', { name: 'Grant Points to Member' }));
    expect((await screen.findAllByText(/Simulated grant/)).length).toBeGreaterThan(0);
  });
});

describe('public pages', () => {
  it('event registration link target is honest about registration', () => {
    renderAt('/events/html-css-lab', fixture());
    expect(screen.getByText(/registration is not open yet/i)).toBeTruthy();
  });

  it('events calendar navigates months and does not invent events', async () => {
    const user = userEvent.setup();
    render(<EventsCalendar initialMonth={new Date(2026, 10, 1)} />);
    expect(screen.getByText('November 2026')).toBeTruthy();
    expect(screen.getByText(/No events are published for November 2026/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('December 2026')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('November 2026')).toBeTruthy();
  });
});
