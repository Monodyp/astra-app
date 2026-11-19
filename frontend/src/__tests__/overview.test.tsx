import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';

async function openOverviewAs(label: RegExp) {
  window.history.pushState({}, '', '/login');
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: label }));
  await waitFor(() => expect(window.location.pathname).toBe('/home'));
}

function statCard(label: string): string {
  return screen.getByText(label).parentElement?.textContent ?? '';
}

describe('member overview', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows the signed-in member, metrics, and recent activity', async () => {
    await openOverviewAs(/Verified member/);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Verified Doe' })
    ).toBeDefined();
    expect(screen.getByText('ASTR1D-0001')).toBeDefined();
    expect(screen.getByText('BS Computer Science')).toBeDefined();
    expect(screen.getByText('24-90001')).toBeDefined();
    expect(statCard('Total Points')).toContain('450PTS');
    expect(statCard('Events Attended')).toContain('Last: Git Essentials');
    expect(statCard('Active Vouchers')).toMatch(/Active Vouchers\d+/);
    expect(screen.getByText('5 ACTIVITIES RECORDED')).toBeDefined();
    const activity = screen.getByRole('list', { name: 'Recent activity' });
    expect(within(activity).getAllByRole('listitem')).toHaveLength(5);
    expect(
      screen.getByRole('link', { name: 'Show My Digital ID' })
    ).toHaveProperty('pathname', '/id');
  });

  it('links to check-in only for officers', async () => {
    await openOverviewAs(/Verified member/);
    await screen.findByRole('heading', { level: 1, name: 'Verified Doe' });
    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).not.toContain('/checkin');
  });

  it('gives officers a link to check-in', async () => {
    await openOverviewAs(/Officer/);
    await screen.findByRole('heading', { level: 1, name: 'Officer Doe' });
    expect(
      screen.getByRole('link', { name: /Events Attended/ })
    ).toHaveProperty('pathname', '/checkin');
  });

  it('tells an unverified member that the membership is inactive', async () => {
    await openOverviewAs(/Unverified member/);
    expect(
      await screen.findByText(/Membership inactive · pay your annual dues/)
    ).toBeDefined();
  });

  it('opens the same member on the digital ID', async () => {
    await openOverviewAs(/Unverified member/);
    fireEvent.click(
      await screen.findByRole('link', { name: 'Show My Digital ID' })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/id'));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Unverified Doe' })
    ).toBeDefined();
  });
});
