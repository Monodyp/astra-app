import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PortalProvider } from '../context/PortalContext.js';
import { Overview } from '../pages/Overview.js';

afterEach(cleanup);

describe('Member Overview Page', () => {
  it('renders Member Overview with HUD stats and recent activity', () => {
    render(
      <PortalProvider>
        <MemoryRouter>
          <Overview />
        </MemoryRouter>
      </PortalProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Fernandez, Menard Troy V.' })
    ).toBeTruthy();
    expect(screen.getByText('BS Computer Science')).toBeTruthy();
    expect(screen.getByText('2024-XXXXX')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Show My Digital ID' }).getAttribute('href')
    ).toBe('/id');
    expect(screen.getByText('Recent Activity')).toBeTruthy();
    expect(screen.getByText('5 ACTIVITIES RECORDED')).toBeTruthy();
    expect(screen.getByText('Yohan Leonor')).toBeTruthy();
    expect(screen.getByText('Charles Michael')).toBeTruthy();
  });
});
