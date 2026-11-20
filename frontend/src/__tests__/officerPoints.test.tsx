import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';
import {
  DataError,
  portalData,
  type GrantPointsInput,
  type MemberSearchResult,
} from '../data/index.js';

const SEARCH_LABEL = 'Search by ASTRA ID, student ID, or name';
const GRANT_BUTTON = 'Grant Points to Member';

async function openAsOfficer(path: string) {
  window.history.pushState({}, '', `/login?next=${encodeURIComponent(path)}`);
  const view = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /^Officer/ }));
  await waitFor(() => expect(window.location.pathname).toBe(path));
  return view;
}

async function searchInput() {
  return screen.findByRole('combobox', { name: SEARCH_LABEL });
}

async function search(query: string) {
  fireEvent.change(await searchInput(), { target: { value: query } });
}

async function memberOptions() {
  const list = await screen.findByRole('listbox', { name: 'Matching members' });
  return within(list).getAllByRole('option');
}

async function memberOption(name: RegExp) {
  const list = await screen.findByRole('listbox', { name: 'Matching members' });
  return within(list).findByRole('option', { name });
}

async function optionTexts() {
  return (await memberOptions()).map((option) => option.textContent);
}

function preview() {
  return screen.getByRole('region', { name: 'Grant preview' });
}

function grantButton() {
  return screen.getByRole('button', { name: GRANT_BUTTON });
}

describe('officer points', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds the same member by ASTRA ID, student ID, or name', async () => {
    await openAsOfficer('/officer/grant-points');
    for (const query of ['ASTR1D-0001', '24-90001', 'Verified Doe']) {
      await search(query);
      const [first] = await optionTexts();
      expect(first).toBe(
        'Verified DoeASTRA ID ASTR1D-0001 · Student ID 24-90001'
      );
    }
  });

  it('matches partial input in any case and reports no matches', async () => {
    await openAsOfficer('/officer/grant-points');
    await search('  vErIf ');
    expect(await optionTexts()).toEqual([
      'Verified DoeASTRA ID ASTR1D-0001 · Student ID 24-90001',
      'Unverified DoeASTRA ID ASTR1D-0002 · Student ID 24-90010',
    ]);

    await search('zzz');
    expect(await screen.findByText('No members match “zzz”.')).toBeDefined();
    expect(screen.queryByRole('listbox')).toBeNull();

    await search('');
    expect(screen.queryByText(/No members match/)).toBeNull();
    expect((await searchInput()).getAttribute('aria-expanded')).toBe('false');
  });

  it('selects a member with the keyboard without granting points', async () => {
    await openAsOfficer('/officer/grant-points');
    const input = await searchInput();
    await search('24-900');
    expect(await optionTexts()).toHaveLength(3);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const active = input.getAttribute('aria-activedescendant');
    expect(document.getElementById(active ?? '')?.textContent).toContain(
      'Verified Doe'
    );

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((input as HTMLInputElement).value).toBe('Verified Doe');
    expect(within(preview()).getByText('ASTR1D-0001')).toBeDefined();
    expect(within(preview()).getByText('24-90001')).toBeDefined();
    expect(within(preview()).getByText('450 pts')).toBeDefined();
    expect(screen.queryByText('Points granted')).toBeNull();
    expect(grantButton().hasAttribute('disabled')).toBe(false);
  });

  it('closes the list with Escape', async () => {
    await openAsOfficer('/officer/grant-points');
    const input = await searchInput();
    await search('Doe');
    expect(await optionTexts()).toHaveLength(3);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('clears the recipient when the search changes', async () => {
    await openAsOfficer('/officer/grant-points');
    await search('Verified Doe');
    fireEvent.click((await memberOptions())[0]);
    expect(within(preview()).getByText('Verified Doe')).toBeDefined();
    expect(grantButton().hasAttribute('disabled')).toBe(false);

    await search('Verified Do');
    expect(within(preview()).getByText('Choose a member')).toBeDefined();
    expect(grantButton().hasAttribute('disabled')).toBe(true);

    await search('');
    expect(grantButton().hasAttribute('disabled')).toBe(true);
  });

  it('grants points only to the selected member', async () => {
    const view = await openAsOfficer('/officer/grant-points');
    await search('Verified Doe');
    fireEvent.click((await memberOptions())[0]);
    await search('ASTR1D-0004');
    fireEvent.click(await memberOption(/Iris Cruz/));
    expect(within(preview()).getByText('350 pts')).toBeDefined();
    expect(within(preview()).getByText('450 pts')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Project Contribution' },
    });
    fireEvent.click(grantButton());
    expect((await screen.findByRole('status')).textContent).toContain(
      'Iris Cruz received +100 points for Project Contribution. Balance went from 350 to 450 pts.'
    );

    await search('24-90001');
    fireEvent.click(await memberOption(/Verified Doe/));
    expect(within(preview()).getByText('450 pts')).toBeDefined();
    view.unmount();
  });

  it('records the grant for the recipient', async () => {
    const view = await openAsOfficer('/officer/grant-points');
    await search('Verified Doe');
    fireEvent.click((await memberOptions())[0]);
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Project Contribution' },
    });
    fireEvent.click(grantButton());
    expect((await screen.findByRole('status')).textContent).toContain(
      'Balance went from 450 to 550 pts.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    fireEvent.click(
      await screen.findByRole('button', { name: /Verified member/ })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
    const overview = await portalData.getOverview();
    expect(overview.points).toBe(550);
    expect(overview.recentActivity[0]).toMatchObject({
      title: 'Project Contribution',
      pointsDelta: 100,
    });
    view.unmount();
  });

  it('shows loading and error feedback', async () => {
    let fail: (reason: Error) => void = () => undefined;
    vi.spyOn(portalData, 'searchMembers').mockImplementation(
      () =>
        new Promise<MemberSearchResult[]>((_, reject) => {
          fail = reject;
        })
    );
    await openAsOfficer('/officer/grant-points');
    await search('Verified');
    expect(await screen.findByText('Searching members…')).toBeDefined();
    await waitFor(() => expect(portalData.searchMembers).toHaveBeenCalled());
    fail(new DataError('unavailable', 'The member directory is offline.'));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'The member directory is offline.'
    );
  });

  it('ignores results from an older search', async () => {
    const pending: Array<(results: MemberSearchResult[]) => void> = [];
    vi.spyOn(portalData, 'searchMembers').mockImplementation(
      () =>
        new Promise<MemberSearchResult[]>((resolve) => {
          pending.push(resolve);
        })
    );
    const member = (fullName: string, memberId: string) => ({
      memberId,
      fullName,
      studentId: '00-00000',
      membershipStatus: 'verified' as const,
      balance: 0,
    });
    await openAsOfficer('/officer/grant-points');
    await search('Verified');
    await waitFor(() => expect(pending).toHaveLength(1));
    await search('Officer');
    await waitFor(() => expect(pending).toHaveLength(2));

    pending[1]([member('Officer Doe', 'ASTR1D-0003')]);
    expect(await memberOption(/Officer Doe/)).toBeDefined();
    pending[0]([member('Verified Doe', 'ASTR1D-0001')]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await optionTexts()).toEqual([
      'Officer DoeASTRA ID ASTR1D-0003 · Student ID 00-00000',
    ]);
  });

  it('sends the same grant again after a lost response and credits once', async () => {
    const send = portalData.grantPoints;
    const spy = vi
      .spyOn(portalData, 'grantPoints')
      .mockImplementationOnce(async (input) => {
        await send(input);
        throw new DataError('unavailable', 'The connection dropped.');
      });
    const view = await openAsOfficer('/officer/grant-points');
    await search('24-90004');
    fireEvent.click(await memberOption(/Iris Cruz/));
    fireEvent.change(screen.getByLabelText('Reference'), {
      target: { value: 'Booth shift' },
    });
    fireEvent.click(grantButton());

    expect((await screen.findByRole('alert')).textContent).toContain(
      'could not confirm the grant to Iris Cruz'
    );
    const retry = screen.getByRole('button', { name: 'Retry Grant' });
    expect(
      (screen.getByLabelText('Points Amount') as HTMLInputElement).disabled
    ).toBe(true);
    fireEvent.click(retry);

    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('Grant already recorded');
    expect(status.textContent).not.toMatch(/Balance went/);
    expect(spy).toHaveBeenCalledTimes(2);
    const [first, second] = spy.mock.calls.map(
      ([input]) => input as GrantPointsInput
    );
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      studentId: '24-90004',
      amount: 100,
      referenceId: 'Booth shift',
    });
    const [iris] = await portalData.searchMembers('24-90004');
    expect(iris.balance).toBe(450);
    expect(within(preview()).getByText('450 pts')).toBeDefined();
    view.unmount();
  });

  it('uses a new key for each new grant', async () => {
    const spy = vi.spyOn(portalData, 'grantPoints');
    await openAsOfficer('/officer/grant-points');
    await search('24-90004');
    fireEvent.click(await memberOption(/Iris Cruz/));
    fireEvent.click(grantButton());
    await screen.findByRole('status');
    fireEvent.click(grantButton());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(
        'Balance went from 450 to 550 pts.'
      )
    );
    const keys = spy.mock.calls.map(
      ([input]) => (input as GrantPointsInput).idempotencyKey
    );
    expect(new Set(keys).size).toBe(2);
  });

  it('reports a reference that is already recorded for a new grant', async () => {
    await openAsOfficer('/officer/grant-points');
    await search('24-90004');
    fireEvent.click(await memberOption(/Iris Cruz/));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      fireEvent.change(screen.getByLabelText('Reference'), {
        target: { value: 'Hackathon 2026' },
      });
      fireEvent.click(grantButton());
      await waitFor(() => expect(screen.queryByText('Granting…')).toBeNull());
    }
    expect((await screen.findByRole('alert')).textContent).toContain(
      'A grant with this reference is already recorded for Iris Cruz.'
    );
    expect(grantButton().hasAttribute('disabled')).toBe(false);
  });

  it('explains why an inactive member cannot receive points', async () => {
    const spy = vi.spyOn(portalData, 'grantPoints');
    await openAsOfficer('/officer/grant-points');
    await search('Unverified Doe');
    fireEvent.click(await memberOption(/Unverified Doe/));
    expect(
      screen.getByText(
        /cannot receive points because their membership is inactive/
      )
    ).toBeDefined();
    expect(grantButton().hasAttribute('disabled')).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a recorded grant when the service returns no balances', async () => {
    vi.spyOn(portalData, 'grantPoints').mockResolvedValueOnce({
      entryId: 'entry-1',
      studentId: '24-90004',
      amount: 100,
      reason: 'Workshop Attendance',
      referenceId: 'key',
      balance: null,
    });
    await openAsOfficer('/officer/grant-points');
    await search('24-90004');
    fireEvent.click(await memberOption(/Iris Cruz/));
    fireEvent.click(grantButton());
    const status = await screen.findByRole('status');
    expect(status.textContent).toContain(
      'Iris Cruz received +100 points for Workshop Attendance. The grant is now in their ledger.'
    );
    expect(status.textContent).not.toMatch(/Balance went/);
  });

  it('blocks an invalid amount', async () => {
    await openAsOfficer('/officer/grant-points');
    await search('24-90004');
    fireEvent.click(await memberOption(/Iris Cruz/));
    fireEvent.change(screen.getByLabelText('Points Amount'), {
      target: { value: '0' },
    });
    expect(grantButton().hasAttribute('disabled')).toBe(true);
  });
});
