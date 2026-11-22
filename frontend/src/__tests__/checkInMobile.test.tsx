import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App.js';
import { portalData } from '../data/index.js';
import { decodeQrFrame } from '../features/checkin/decodeQr.js';

vi.mock('../features/checkin/decodeQr.js', () => ({
  decodeQrFrame: vi.fn(() => null),
}));

const decode = vi.mocked(decodeQrFrame);

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

async function openCheckIn() {
  window.history.pushState(
    {},
    '',
    `/login?next=${encodeURIComponent('/checkin')}`
  );
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /^Officer/ }));
  await waitFor(() => expect(window.location.pathname).toBe('/checkin'));
  await screen.findByText('Scan Member Digital ID QR');
}

function checkedInMembers() {
  return screen.getByRole('list', { name: 'Checked-in members' });
}

async function enterStudentId(studentId: string) {
  fireEvent.change(screen.getByLabelText('Or enter Student ID manually:'), {
    target: { value: studentId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Check In' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Verifying…' })).toBeNull()
  );
}

describe('responsive event check-in', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    usePhoneViewport();
    decode.mockReset();
    decode.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });

  it('uses the responsive check-in page at a phone viewport', async () => {
    await openCheckIn();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Event Check-In' })
    ).toBeDefined();
    expect(
      screen.getByText(
        'No camera is available here. Use a sample ID or the student ID.'
      )
    ).toBeDefined();
    expect(screen.getByText('Or enter Student ID manually:')).toBeDefined();
    expect(within(checkedInMembers()).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(checkedInMembers()).getByText('Paolo Lim')
    ).toBeDefined();
  });

  it('checks in by student ID and reports rejected members at a phone viewport', async () => {
    await openCheckIn();
    await enterStudentId('24-90001');
    expect(
      (await screen.findByRole('status')).textContent
    ).toContain('Verified Doe checked in. +100 pts');
    expect(within(checkedInMembers()).getAllByRole('listitem')).toHaveLength(3);

    await enterStudentId('24-90001');
    expect(screen.getByRole('alert').textContent).toContain(
      'already checked in'
    );
    await enterStudentId('24-90010');
    expect(screen.getByRole('alert').textContent).toContain(
      'does not have an active membership'
    );
    await enterStudentId('99-99999');
    expect(screen.getByRole('alert').textContent).toContain(
      'No member has the student ID 99-99999.'
    );
    expect(within(checkedInMembers()).getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows and simulates a demo QR at a phone viewport', async () => {
    await openCheckIn();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Show QR for Verified Doe, Sample verified member ID',
      })
    );
    const panel = screen.getByRole('region', {
      name: 'Sample QR for Verified Doe',
    });
    expect(
      within(panel).getByRole('img', { name: 'QR code for Verified Doe' })
    ).toBeDefined();
    fireEvent.click(within(panel).getByRole('button', { name: 'Simulate scan' }));
    await waitFor(() =>
      expect(within(checkedInMembers()).getAllByRole('listitem')).toHaveLength(3)
    );
    expect(
      within(checkedInMembers()).getByText('Verified Doe')
    ).toBeDefined();
  });

  it('checks in the member whose QR the camera decodes, once', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(
          async () =>
            ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream
        ),
      },
    });
    const checkIn = vi.spyOn(portalData, 'checkIn');
    await openCheckIn();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open camera to scan a member QR',
      })
    );
    expect(await screen.findByLabelText('Camera preview')).toBeDefined();
    decode.mockReturnValue('demo-qr.v1.7f3a9c41e2b8');

    await waitFor(() =>
      expect(within(checkedInMembers()).getAllByRole('listitem')).toHaveLength(3)
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(checkIn).toHaveBeenCalledTimes(1);
    expect(checkIn.mock.calls[0][0]).toMatchObject({
      method: 'scan',
      credential: 'demo-qr.v1.7f3a9c41e2b8',
    });
  });

  it('keeps the same responsive check-in page at desktop width', async () => {
    vi.restoreAllMocks();
    window.history.pushState(
      {},
      '',
      `/login?next=${encodeURIComponent('/checkin')}`
    );
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^Officer/ }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Event Check-In' })
    ).toBeDefined();
    expect(screen.getByText('Or enter Student ID manually:')).toBeDefined();
  });
});
