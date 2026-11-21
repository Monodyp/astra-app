import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App.js';
import { landingPathFor, safeNextPath } from '../components/portal/access.js';

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

async function chooseDemoAccount(label: RegExp) {
  fireEvent.click(await screen.findByRole('button', { name: label }));
}

describe('sign-in and route access', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('sends a signed-out visitor to sign-in and back to the requested screen', async () => {
    renderAt('/id?from=link');
    expect(
      await screen.findByRole('heading', { name: 'Your Membership Dashboard' })
    ).toBeDefined();
    expect(window.location.search).toContain(
      `next=${encodeURIComponent('/id?from=link')}`
    );

    await chooseDemoAccount(/Verified member/);
    await waitFor(() => expect(window.location.pathname).toBe('/id'));
    expect(window.location.search).toBe('?from=link');
  });

  it('signs in with a typed student ID', async () => {
    renderAt('/login');
    fireEvent.change(
      await screen.findByLabelText('Student ID or Email Address'),
      { target: { value: '24-90001' } }
    );
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'any-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In to Portal' }));
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
  });

  it('shows the reason when sign-in fails', async () => {
    renderAt('/login');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Continue with Google' })
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Google sign-in is not available'
    );
  });

  it('keeps a member out of officer screens opened by URL', async () => {
    const first = renderAt('/officer/grant-points');
    await chooseDemoAccount(/Verified member/);
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
    first.unmount();

    renderAt('/officer/grant-points');
    expect(
      await screen.findByRole('heading', { name: 'Officer access only' })
    ).toBeDefined();
    expect(
      screen.queryByRole('button', { name: 'Grant Points to Member' })
    ).toBeNull();
  });

  it('lets an officer open officer screens', async () => {
    renderAt('/checkin');
    await chooseDemoAccount(/Officer/);
    await waitFor(() => expect(window.location.pathname).toBe('/checkin'));
    expect(screen.queryByText('Officer access only')).toBeNull();
  });

  it('opens the rewards pages after a reload', async () => {
    const first = renderAt('/login');
    await chooseDemoAccount(/Verified member/);
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
    first.unmount();

    const pages = [
      ['/marketplace', 'Perks Marketplace'],
      ['/vouchers', 'Claimed Vouchers'],
      ['/points', 'Points'],
    ];
    for (const [path, heading] of pages) {
      const view = renderAt(path);
      expect(
        await screen.findByRole('heading', { level: 1, name: heading })
      ).toBeDefined();
      expect(window.location.pathname).toBe(path);
      view.unmount();
    }
  });

  it('restores the session after a reload', async () => {
    const first = renderAt('/login');
    await chooseDemoAccount(/Officer/);
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
    first.unmount();

    renderAt('/login');
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
  });
});

describe('return path rules', () => {
  it('accepts only same-origin paths', () => {
    expect(safeNextPath('/vouchers/V-1')).toBe('/vouchers/V-1');
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('/login?next=/id')).toBeNull();
  });

  it('returns to officer screens only for officers', () => {
    expect(landingPathFor('/checkin', 'member')).toBe('/home');
    expect(landingPathFor('/checkin', 'officer')).toBe('/checkin');
    expect(landingPathFor(null, 'member')).toBe('/home');
  });
});
