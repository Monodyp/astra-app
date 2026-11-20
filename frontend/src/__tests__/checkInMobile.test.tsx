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

function recentScans() {
  return screen.getByRole('heading', { name: 'Recent Scans' })
    .parentElement as HTMLElement;
}

async function enterStudentId(studentId: string) {
  fireEvent.change(screen.getByLabelText('Student ID Attendance'), {
    target: { value: studentId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify & Check In' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Verifying…' })).toBeNull()
  );
}

describe('mobile event check-in', () => {
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

  it('shows the mobile team layout with the attendee list as recent scans', async () => {
    await openCheckIn();
    expect(
      screen.getByText(
        'No camera or scanner is available on this device or browser. Use the student ID below.'
      )
    ).toBeDefined();
    expect(screen.getByText('Or enter Student ID manually:')).toBeDefined();
    expect(within(recentScans()).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(recentScans()).getByText('Paolo Lim · 25-90005')
    ).toBeDefined();
  });

  it('checks in by student ID and explains each rejection', async () => {
    await openCheckIn();
    fireEvent.click(screen.getByRole('button', { name: 'Verify & Check In' }));
    expect(screen.getByText('Error: Enter the student ID.')).toBeDefined();

    await enterStudentId('24-90001');
    expect(
      screen.getByText('✔ Verified Doe checked in. +100 pts')
    ).toBeDefined();
    expect(within(recentScans()).getAllByRole('listitem')).toHaveLength(3);

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
    expect(within(recentScans()).getAllByRole('listitem')).toHaveLength(3);
  });

  it('checks in from a demo QR', async () => {
    await openCheckIn();
    fireEvent.click(await screen.findByRole('button', { name: 'Iris Cruz' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Verified Doe' })
    );
    expect(
      screen.getByRole('img', { name: 'QR code for Verified Doe' })
    ).toBeDefined();
    expect(
      screen.queryByRole('img', { name: 'QR code for Iris Cruz' })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check in with this QR' })
    );
    await waitFor(() =>
      expect(within(recentScans()).getAllByRole('listitem')).toHaveLength(3)
    );
    expect(
      within(recentScans()).getByText('Verified Doe · 24-90001')
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
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(await screen.findByLabelText('Camera preview')).toBeDefined();
    decode.mockReturnValue('demo-qr.v1.7f3a9c41e2b8');

    await waitFor(() =>
      expect(within(recentScans()).getAllByRole('listitem')).toHaveLength(3)
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(checkIn).toHaveBeenCalledTimes(1);
    expect(checkIn.mock.calls[0][0]).toMatchObject({
      method: 'scan',
      credential: 'demo-qr.v1.7f3a9c41e2b8',
    });
  });

  it('keeps the desktop check-in at desktop width', async () => {
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
    expect(screen.queryByText('Or enter Student ID manually:')).toBeNull();
  });
});
