import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';
import { DataError, portalData, type GrantPointsInput } from '../data/index.js';

function usePhoneViewport() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
  );
}

async function openAsOfficer() {
  window.history.pushState(
    {},
    '',
    `/login?next=${encodeURIComponent('/officer/grant-points')}`
  );
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /^Officer/ }));
  await waitFor(() =>
    expect(window.location.pathname).toBe('/officer/grant-points')
  );
  await screen.findByRole('form', { name: 'Grant points to a member' });
}

async function select(query: string, name: RegExp) {
  fireEvent.change(screen.getByLabelText('Search by Student ID or Name...'), {
    target: { value: query },
  });
  const list = await screen.findByRole('list', { name: 'Search results' });
  fireEvent.click(await within(list).findByRole('button', { name }));
}

function grant() {
  fireEvent.click(
    screen.getByRole('button', {
      name: /Grant Points to Member|Retry Grant/,
    })
  );
}

describe('responsive officer points', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    usePhoneViewport();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates the form and grants points to the selected member', async () => {
    const spy = vi.spyOn(portalData, 'grantPoints');
    await openAsOfficer();
    grant();
    expect(
      screen
        .getByRole('button', { name: 'Grant Points to Member' })
        .hasAttribute('disabled')
    ).toBe(true);

    await select('24-90004', /Iris Cruz/);
    expect(
      within(screen.getByRole('region', { name: 'Selected member' })).getByText(
        'Active member'
      )
    ).toBeDefined();
    fireEvent.change(screen.getByLabelText('Points Amount'), {
      target: { value: '1.5' },
    });
    grant();
    expect(
      screen
        .getByRole('button', { name: 'Grant Points to Member' })
        .hasAttribute('disabled')
    ).toBe(true);
    fireEvent.change(screen.getByLabelText('Points Amount'), {
      target: { value: '40' },
    });
    grant();
    expect((await screen.findByRole('status')).textContent).toBe(
      '✔ Iris Cruz received +40 points for Workshop Attendance. Balance went from 350 to 390 pts.'
    );
    expect(spy.mock.calls[0][0]).toMatchObject({
      studentId: '24-90004',
      amount: 40,
    });
  });

  it('blocks an inactive member and explains why', async () => {
    const spy = vi.spyOn(portalData, 'grantPoints');
    await openAsOfficer();
    await select('Unverified', /Unverified Doe/);
    expect(
      screen.getByText(
        /Unverified Doe cannot receive points because their membership is inactive/
      )
    ).toBeDefined();
    expect(
      screen
        .getByRole('button', { name: 'Grant Points to Member' })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('retries a lost grant once with the same key', async () => {
    const send = portalData.grantPoints;
    const spy = vi
      .spyOn(portalData, 'grantPoints')
      .mockImplementationOnce(async (input) => {
        await send(input);
        throw new DataError('unavailable', 'The connection dropped.');
      });
    await openAsOfficer();
    await select('24-90004', /Iris Cruz/);
    fireEvent.change(screen.getByLabelText('Points Amount'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('Reference link / notes'), {
      target: { value: 'Booth shift' },
    });
    grant();
    expect((await screen.findByRole('alert')).textContent).toContain(
      'could not confirm the grant to Iris Cruz'
    );
    expect(
      (screen.getByLabelText('Points Amount') as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Discard and edit' })
    ).toBeDefined();
    grant();
    expect((await screen.findByRole('status')).textContent).toBe(
      '✔ An earlier attempt already recorded +25 points for Iris Cruz for Workshop Attendance. It was not recorded again.'
    );
    const [first, second] = spy.mock.calls.map(
      ([input]) => input as GrantPointsInput
    );
    expect(second).toEqual(first);
    const [iris] = await portalData.searchMembers('24-90004');
    expect(iris.balance).toBe(375);
  });

  it('reports a reference already used for a new grant', async () => {
    await openAsOfficer();
    await select('24-90004', /Iris Cruz/);
    for (let round = 0; round < 2; round += 1) {
      fireEvent.change(screen.getByLabelText('Points Amount'), {
        target: { value: '10' },
      });
      fireEvent.change(screen.getByLabelText('Reference link / notes'), {
        target: { value: 'Hackathon 2026' },
      });
      grant();
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Submitting…' })).toBeNull()
      );
    }
    expect(screen.getByRole('alert').textContent).toBe(
      '✖ A grant with this reference is already recorded for Iris Cruz. Use a different reference.'
    );
  });

  it('shows a grant recorded without balances', async () => {
    vi.spyOn(portalData, 'grantPoints').mockResolvedValueOnce({
      entryId: 'entry-1',
      studentId: '24-90004',
      amount: 15,
      reason: 'Workshop Attendance',
      referenceId: 'key',
      balance: null,
    });
    await openAsOfficer();
    await select('24-90004', /Iris Cruz/);
    fireEvent.change(screen.getByLabelText('Points Amount'), {
      target: { value: '15' },
    });
    grant();
    expect((await screen.findByRole('status')).textContent).toBe(
      '✔ Iris Cruz received +15 points for Workshop Attendance. The grant is now in their ledger.'
    );
  });
});
