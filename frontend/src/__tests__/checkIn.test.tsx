import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';

async function openAsOfficer(path: string) {
  window.history.pushState({}, '', `/login?next=${encodeURIComponent(path)}`);
  const view = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /^Officer/ }));
  await waitFor(() => expect(window.location.pathname).toBe(path));
  return view;
}

function rosterNames() {
  const list = screen.getByRole('list', { name: 'Checked-in members' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('event check-in', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('accepts a verified member and rejects duplicates, inactive members, and unknown IDs', async () => {
    await openAsOfficer('/checkin');
    expect(await screen.findByText('2 verified attendees')).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Scan Verified Doe, Sample verified member ID',
      })
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'Verified Doe checked in. +100 pts'
    );
    expect(screen.getByText('3 verified attendees')).toBeDefined();
    expect(rosterNames()[0]).toContain('Verified Doe');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Scan Verified Doe, Sample verified member ID',
      })
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'already checked in'
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Scan Unverified Doe, Sample unverified member ID',
      })
    );
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'does not have an active membership'
      )
    );

    fireEvent.change(screen.getByLabelText('Or enter Student ID manually'), {
      target: { value: '99-99999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify & Check In' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'No member has the student ID 99-99999.'
      )
    );
    expect(screen.getByText('3 verified attendees')).toBeDefined();
  });

  it('checks in a member by student ID', async () => {
    await openAsOfficer('/checkin');
    fireEvent.change(
      await screen.findByLabelText('Or enter Student ID manually'),
      { target: { value: '23-90006' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Verify & Check In' }));
    expect((await screen.findByRole('status')).textContent).toContain(
      'Nina Garcia checked in.'
    );
  });
});
