import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';

async function signInAs(label: RegExp, path: string) {
  window.history.pushState({}, '', `/login?next=${encodeURIComponent(path)}`);
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: label }));
  await waitFor(() => expect(window.location.pathname).toBe('/id'));
}

describe('digital ID', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows the verified member card with the check-in QR', async () => {
    await signInAs(/Verified member/, '/id');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Verified Doe' })
    ).toBeDefined();
    expect(screen.getByText('Verified Member')).toBeDefined();
    expect(screen.getAllByText('24-90001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ASTR1D-0001').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('img', { name: 'Member check-in QR' })
    ).toHaveLength(1);
    expect(screen.queryByText('Preview: Verified Member')).toBeNull();
  });

  it('shows an unverified member without a scannable QR', async () => {
    await signInAs(/Unverified member/, '/id');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Unverified Doe' })
    ).toBeDefined();
    expect(screen.getAllByText('Unverified').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive for check-in').length).toBeGreaterThan(
      0
    );
    expect(
      screen.queryByRole('img', { name: 'Member check-in QR' })
    ).toBeNull();
    expect(screen.queryByText(/Non-member/i)).toBeNull();
  });

  it('opens /not-valid as the signed-in member ID', async () => {
    await signInAs(/Unverified member/, '/not-valid');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Unverified Doe' })
    ).toBeDefined();
  });

  it('zooms the card', async () => {
    await signInAs(/Verified member/, '/id');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Click to zoom in ID card' })
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('img', { name: 'Member check-in QR' })
    ).toBeDefined();
  });
});
