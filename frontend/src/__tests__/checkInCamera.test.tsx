import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App.js';
import { portalData } from '../data/index.js';
import { decodeQrFrame } from '../features/checkin/decodeQr.js';

vi.mock('../features/checkin/decodeQr.js', () => ({
  decodeQrFrame: vi.fn(() => null),
}));

const VERIFIED_CREDENTIAL = 'demo-qr.v1.7f3a9c41e2b8';
const decode = vi.mocked(decodeQrFrame);

function installCamera(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia) },
  });
}

function fakeStream(stop = vi.fn()) {
  return { getTracks: () => [{ stop }] } as unknown as MediaStream;
}

async function openCheckIn() {
  window.history.pushState(
    {},
    '',
    `/login?next=${encodeURIComponent('/checkin')}`
  );
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /^Officer/ }));
  await screen.findByText('2 verified attendees');
}

describe('camera check-in', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    decode.mockReset();
    decode.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });

  it('checks in the member whose QR the camera decodes, once', async () => {
    installCamera(async () => fakeStream());
    const checkIn = vi.spyOn(portalData, 'checkIn');
    await openCheckIn();

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(await screen.findByLabelText('Camera preview')).toBeDefined();
    decode.mockReturnValue(VERIFIED_CREDENTIAL);

    expect((await screen.findByRole('status')).textContent).toContain(
      'Verified Doe checked in. +100 pts'
    );
    expect(screen.getByText('3 verified attendees')).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(checkIn).toHaveBeenCalledTimes(1);
    expect(checkIn).toHaveBeenCalledWith({
      eventId: 'EVT-WEB-2026',
      method: 'scan',
      credential: VERIFIED_CREDENTIAL,
    });
  });

  it('stops the camera', async () => {
    const stop = vi.fn();
    installCamera(async () => fakeStream(stop));
    await openCheckIn();
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stop camera' }));
    expect(stop).toHaveBeenCalled();
    expect(screen.queryByLabelText('Camera preview')).toBeNull();
  });

  it('explains a blocked camera', async () => {
    installCamera(() =>
      Promise.reject(
        Object.assign(new Error('blocked'), { name: 'NotAllowedError' })
      )
    );
    await openCheckIn();
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }));
    expect(await screen.findByText(/Camera access is blocked/)).toBeDefined();
  });

  it('falls back to sample IDs when there is no camera', async () => {
    await openCheckIn();
    expect(screen.getByText(/No camera is available here/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Start camera' })).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Show QR for Verified Doe, Sample verified member ID',
      })
    ).toBeDefined();
  });
});
