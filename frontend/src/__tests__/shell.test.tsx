import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';

async function signInAs(label: RegExp) {
  window.history.pushState({}, '', '/login');
  const view = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: label }));
  await waitFor(() => expect(window.location.pathname).toBe('/home'));
  return view;
}

function navLabels() {
  const nav = screen.getByRole('navigation', { name: 'Portal' });
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

describe('portal shell', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows a member only member destinations', async () => {
    await signInAs(/Verified member/);
    expect(navLabels()).toEqual([
      'Overview',
      'Digital ID',
      'Perks Marketplace',
      'My Vouchers',
    ]);
    expect(screen.getByText('Welcome back, Verified')).toBeDefined();
  });

  it('adds officer tools for an officer', async () => {
    await signInAs(/Officer/);
    expect(navLabels()).toEqual([
      'Overview',
      'Digital ID',
      'Officer Points',
      'Perks Marketplace',
      'Event Check-in',
      'My Vouchers',
    ]);
    expect(screen.getByText('Officer console · Secure session')).toBeDefined();
  });

  it('opens each member tab', async () => {
    await signInAs(/Verified member/);
    const nav = screen.getByRole('navigation', { name: 'Portal' });
    const tabs: Array<[string, string, number, string]> = [
      ['Digital ID', '/id', 1, 'Digital ID'],
      ['Perks Marketplace', '/marketplace', 1, 'Perks Marketplace'],
      ['My Vouchers', '/vouchers', 1, 'Claimed Vouchers'],
      ['Overview', '/home', 1, 'Verified Doe'],
    ];
    for (const [label, path, level, heading] of tabs) {
      fireEvent.click(within(nav).getByRole('link', { name: label }));
      await waitFor(() => expect(window.location.pathname).toBe(path));
      expect(
        await screen.findByRole('heading', { level, name: heading })
      ).toBeDefined();
    }
  });

  it('marks an unverified member in the header', async () => {
    await signInAs(/Unverified member/);
    expect(screen.getByText('Unverified')).toBeDefined();
  });

  it('signs out to the login screen', async () => {
    await signInAs(/Verified member/);
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(window.sessionStorage.getItem('astra-demo:session')).toBeNull();
    expect(window.sessionStorage.getItem('astra-demo:records')).not.toBeNull();
  });
});
