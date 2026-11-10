import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DevTools } from '../pages/DevTools.js';

// ---------------------------------------------------------------------------
// Mock apiClient module so tests don't hit the network
// ---------------------------------------------------------------------------

vi.mock('../lib/apiClient.js', () => ({
  attendanceApi: {
    checkIn: vi.fn(),
    getEventAttendees: vi.fn(),
  },
  partnerApi: {
    validate: vi.fn(),
    apply: vi.fn(),
  },
  apiClient: vi.fn(),
}));

// Mock AuthContext so we don't need a provider
vi.mock('../context/AuthContext.js', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import { attendanceApi, partnerApi } from '../lib/apiClient.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DevTools page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the TEST MOCKUP banner', () => {
    render(<DevTools />);
    expect(screen.getByText(/TEST MOCKUP - NOT FINAL UI/i)).toBeDefined();
  });

  it('renders attendance inputs and buttons', () => {
    render(<DevTools />);
    expect(screen.getByTestId('sr-code-input')).toBeDefined();
    expect(screen.getByTestId('event-id-input')).toBeDefined();
    expect(screen.getByTestId('checkin-btn')).toBeDefined();
    expect(screen.getByTestId('show-attendees-btn')).toBeDefined();
  });

  it('renders partner section inputs and buttons', () => {
    render(<DevTools />);
    expect(screen.getByTestId('voucher-code-input')).toBeDefined();
    expect(screen.getByTestId('partner-name-input')).toBeDefined();
    expect(screen.getByTestId('validate-btn')).toBeDefined();
    expect(screen.getByTestId('apply-btn')).toBeDefined();
  });

  it('renders seeded voucher hints', () => {
    render(<DevTools />);
    expect(screen.getByTestId('hint-NEXCAFE-001')).toBeDefined();
    expect(screen.getByTestId('hint-BEANB-001')).toBeDefined();
    expect(screen.getByTestId('hint-USED-001')).toBeDefined();
    expect(screen.getByTestId('hint-EXP-001')).toBeDefined();
  });

  it('shows HTTP status and raw JSON after successful check-in', async () => {
    const mockResponse = { awarded: true, points: 10, newBalance: 10 };
    (attendanceApi.checkIn as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse
    );

    render(<DevTools />);

    fireEvent.click(screen.getByTestId('checkin-btn'));

    await waitFor(() => {
      const statusEl = screen.getByTestId('response-status');
      expect(statusEl.textContent).toContain('HTTP 200');
    });

    const jsonEl = screen.getByTestId('response-json');
    const parsed = JSON.parse(jsonEl.textContent ?? '{}');
    expect(parsed.awarded).toBe(true);
    expect(parsed.points).toBe(10);
  });

  it('shows HTTP status and error JSON on API failure', async () => {
    (attendanceApi.checkIn as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('HTTP 401: Unauthorized')
    );

    render(<DevTools />);

    fireEvent.click(screen.getByTestId('checkin-btn'));

    await waitFor(() => {
      const statusEl = screen.getByTestId('response-status');
      expect(statusEl.textContent).toContain('401');
      expect(statusEl.textContent).toContain('Unauthorized');
    });
  });

  it('shows HTTP status and raw JSON after partner validate', async () => {
    const mockValidateResponse = {
      valid: true,
      reason: 'ok',
      reward: 'Free Latte',
    };
    (partnerApi.validate as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockValidateResponse
    );

    render(<DevTools />);

    // Fill in voucher code
    fireEvent.change(screen.getByTestId('voucher-code-input'), {
      target: { value: 'NEXCAFE-001' },
    });
    fireEvent.change(screen.getByTestId('partner-name-input'), {
      target: { value: 'NexCafe' },
    });

    fireEvent.click(screen.getByTestId('validate-btn'));

    await waitFor(() => {
      const statusEls = screen.getAllByTestId('response-status');
      // Find the Validate status box
      const validateStatus = statusEls.find((el) =>
        el.textContent?.includes('Validate')
      );
      expect(validateStatus?.textContent).toContain('HTTP 200');
    });
  });

  it('clicking a hint fills in voucher code and partner name', () => {
    render(<DevTools />);

    fireEvent.click(screen.getByTestId('hint-NEXCAFE-001'));

    const codeInput = screen.getByTestId(
      'voucher-code-input'
    ) as HTMLInputElement;
    const partnerInput = screen.getByTestId(
      'partner-name-input'
    ) as HTMLInputElement;

    expect(codeInput.value).toBe('NEXCAFE-001');
    expect(partnerInput.value).toBe('NexCafe');
  });

  it('shows (not signed in) when user is null', () => {
    render(<DevTools />);
    const emailEl = screen.getByTestId('auth-email');
    expect(emailEl.textContent).toBe('(not signed in)');
  });

  it('does not crash on 403 Forbidden error', async () => {
    (attendanceApi.checkIn as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('HTTP 403: Forbidden')
    );

    render(<DevTools />);
    fireEvent.click(screen.getByTestId('checkin-btn'));

    await waitFor(() => {
      const statusEl = screen.getByTestId('response-status');
      expect(statusEl.textContent).toContain('403');
      expect(statusEl.textContent).toContain('Forbidden');
    });
    // Page should still be rendered (no crash)
    expect(screen.getByText(/TEST MOCKUP/i)).toBeDefined();
  });
});
