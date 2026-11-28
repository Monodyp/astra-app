import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App.js';

const attempt = vi.hoisted(() => vi.fn());
vi.mock('../pages/CheckIn.js', () => {
  attempt();
  throw new Error('Failed to fetch scanner module: internal fixture URL');
});

beforeEach(() => {
  window.sessionStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('scanner route download recovery', () => {
  it('keeps members outside the scanner boundary and module', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Verified member/ }));
    await screen.findByText('Welcome back,');
    window.history.pushState({}, '', '/checkin');
    fireEvent(window, new PopStateEvent('popstate'));
    expect(await screen.findByRole('heading', { name: 'Officer access only' })).toBeDefined();
    expect(attempt).not.toHaveBeenCalled();
  });

  it('contains a failed route import and lets an officer return to overview', async () => {
    window.history.pushState({}, '', '/login?next=%2Fcheckin');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^Officer/ }));
    expect(await screen.findByRole('heading', { name: 'Check-in could not open' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeDefined();
    expect(screen.getByRole('banner')).toBeDefined();
    expect(screen.getByRole('alert').textContent).not.toContain('internal fixture URL');
    fireEvent.click(screen.getByRole('link', { name: 'Back to overview' }));
    expect(await screen.findByText('Welcome back,')).toBeDefined();
    expect(window.location.pathname).toBe('/home');
  });
});
