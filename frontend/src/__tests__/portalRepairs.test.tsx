import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { App } from '../App.js';
import {
  portalData,
  setPortalDataSource,
  type PortalDataSource,
} from '../data/index.js';
import { createDemoDataSource } from '../data/demo/demoSource.js';

let previous: PortalDataSource;
beforeEach(() => {
  sessionStorage.clear();
  previous = setPortalDataSource(createDemoDataSource({ latencyMs: 0 }));
});
afterEach(() => setPortalDataSource(previous));

describe('portal entry and dialog repairs', () => {
  it('shows a direct app action to a signed-in homepage visitor', async () => {
    await portalData.signIn({
      method: 'shortcut',
      shortcutId: 'verified-member',
    });
    history.pushState({}, '', '/');
    render(<App />);
    const header = screen.getByRole('banner');
    expect(
      await within(header).findByRole('link', { name: 'Go to App' })
    ).toHaveAttribute('href', '/home');
    expect(within(header).queryByRole('link', { name: 'Log In' })).toBeNull();
    expect(
      screen
        .queryAllByRole('link')
        .some((link) => link.getAttribute('href') === '/login')
    ).toBe(false);
  });

  it('keeps a login action for a signed-out homepage visitor', async () => {
    history.pushState({}, '', '/');
    render(<App />);
    expect(
      await within(screen.getByRole('banner')).findByRole('link', {
        name: 'Log In',
      })
    ).toHaveAttribute('href', '/login');
  });

  it('removes unconfigured external form actions while preserving service requests', async () => {
    await portalData.signIn({
      method: 'shortcut',
      shortcutId: 'verified-member',
    });
    history.pushState({}, '', '/opportunities');
    render(<App />);
    await screen.findByRole('heading', { name: 'Opportunities' });
    expect(
      screen.queryByRole('link', { name: 'Partner With ASTRA' })
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Apply for Opportunities' })
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Request ASTRA Service' })
    ).toHaveAttribute('href', '/astrascend/request');
  });
});
