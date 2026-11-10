import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { attendanceApi, partnerApi } from '../lib/apiClient.js';

// ---------------------------------------------------------------------------
// Types for local state
// ---------------------------------------------------------------------------

interface ApiResponse {
  status: number | null;
  data: unknown;
  error: string | null;
}

function emptyResponse(): ApiResponse {
  return { status: null, data: null, error: null };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps an apiClient call and captures the HTTP status code.
 * Since apiClient throws on non-2xx, we wrap fetch directly to capture status.
 */
async function callWithStatus(
  fn: () => Promise<unknown>
): Promise<ApiResponse> {
  try {
    const data = await fn();
    return { status: 200, data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Extract HTTP status from error message if present (e.g. "HTTP 401: Unauthorized")
    const statusMatch = message.match(/HTTP (\d{3})/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
    return { status, data: null, error: message };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ResponseBoxProps {
  label: string;
  response: ApiResponse;
}

function ResponseBox({ label, response }: ResponseBoxProps) {
  if (
    response.status === null &&
    response.data === null &&
    response.error === null
  ) {
    return null;
  }

  const statusColor = response.error
    ? response.status === 401
      ? 'text-yellow-400'
      : response.status === 403
        ? 'text-orange-400'
        : 'text-red-400'
    : 'text-green-400';

  return (
    <div className="mt-2 rounded border border-slate-700 bg-slate-950 p-3 text-xs font-mono">
      <div
        className={`font-bold mb-1 ${statusColor}`}
        data-testid="response-status"
      >
        {label} — HTTP {response.status ?? '???'}
        {response.status === 401 && ' (Unauthorized)'}
        {response.status === 403 && ' (Forbidden)'}
      </div>
      <pre
        className="whitespace-pre-wrap text-slate-300 overflow-auto max-h-40"
        data-testid="response-json"
      >
        {response.error
          ? JSON.stringify({ error: response.error }, null, 2)
          : JSON.stringify(response.data, null, 2)}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DevTools page
// ---------------------------------------------------------------------------

export const DevTools: React.FC = () => {
  const { user } = useAuth();

  // Attendance state
  const [srCode, setSrCode] = useState('S1001');
  const [eventId, setEventId] = useState('EVT-001');
  const [checkInResponse, setCheckInResponse] =
    useState<ApiResponse>(emptyResponse());
  const [attendeesResponse, setAttendeesResponse] =
    useState<ApiResponse>(emptyResponse());

  // Partner state
  const [voucherCode, setVoucherCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [validateResponse, setValidateResponse] =
    useState<ApiResponse>(emptyResponse());
  const [applyResponse, setApplyResponse] =
    useState<ApiResponse>(emptyResponse());

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleCheckIn() {
    const r = await callWithStatus(() =>
      attendanceApi.checkIn(srCode, eventId)
    );
    setCheckInResponse(r);
  }

  async function handleShowAttendees() {
    const r = await callWithStatus(() =>
      attendanceApi.getEventAttendees(eventId)
    );
    setAttendeesResponse(r);
  }

  async function handleValidate() {
    const r = await callWithStatus(() =>
      partnerApi.validate(voucherCode, partnerName)
    );
    setValidateResponse(r);
  }

  async function handleApply() {
    const r = await callWithStatus(() =>
      partnerApi.apply(voucherCode, partnerName)
    );
    setApplyResponse(r);
  }

  function fillHint(code: string, partner: string) {
    setVoucherCode(code);
    setPartnerName(partner);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 space-y-6">
      {/* Banner */}
      <div className="rounded-lg border-2 border-amber-500 bg-amber-900/30 p-3 text-center font-bold text-amber-300 text-sm">
        ⚠️ TEST MOCKUP - NOT FINAL UI
      </div>

      {/* Auth Info */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Auth Context
        </h2>
        <p className="text-sm">
          <span className="text-slate-400">Email: </span>
          <span data-testid="auth-email" className="text-slate-100">
            {user
              ? ((user as unknown as { email?: string }).email ?? '(no email)')
              : '(not signed in)'}
          </span>
        </p>
        <p className="text-sm">
          <span className="text-slate-400">Role: </span>
          <span data-testid="auth-role" className="text-slate-100">
            {user
              ? ((user as unknown as { role?: string }).role ?? '(no role)')
              : '(not signed in)'}
          </span>
        </p>
      </section>

      {/* Attendance Section */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-100">
          Attendance Check-In
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">SR Code</label>
            <input
              className="w-full rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              value={srCode}
              onChange={(e) => setSrCode(e.target.value)}
              placeholder="e.g. S1001"
              data-testid="sr-code-input"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Event ID
            </label>
            <input
              className="w-full rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="e.g. EVT-001"
              data-testid="event-id-input"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCheckIn}
            className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-sm font-medium transition-colors"
            data-testid="checkin-btn"
          >
            Check In
          </button>
          <button
            onClick={handleShowAttendees}
            className="rounded bg-slate-600 hover:bg-slate-500 px-3 py-1.5 text-sm font-medium transition-colors"
            data-testid="show-attendees-btn"
          >
            Show Event Check-ins
          </button>
        </div>

        <ResponseBox label="Check-In" response={checkInResponse} />
        <ResponseBox label="Attendees" response={attendeesResponse} />
      </section>

      {/* Partner Redemption Section */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-100">
          Partner Redemption
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Voucher Code
            </label>
            <input
              className="w-full rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="e.g. NEXCAFE-001"
              data-testid="voucher-code-input"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Partner Name
            </label>
            <input
              className="w-full rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. NexCafe"
              data-testid="partner-name-input"
            />
          </div>
        </div>

        {/* Clickable hints */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            Seeded voucher hints (click to fill):
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              {
                code: 'NEXCAFE-001',
                partner: 'NexCafe',
                label: 'Active (NexCafe)',
                color: 'text-green-400',
              },
              {
                code: 'BEANB-001',
                partner: 'BeanBrew',
                label: 'Active (BeanBrew)',
                color: 'text-green-400',
              },
              {
                code: 'USED-001',
                partner: 'NexCafe',
                label: 'Used',
                color: 'text-slate-500 line-through',
              },
              {
                code: 'EXP-001',
                partner: 'NexCafe',
                label: 'Expired',
                color: 'text-red-400',
              },
            ].map(({ code, partner, label, color }) => (
              <button
                key={code}
                onClick={() => fillHint(code, partner)}
                className={`text-xs underline cursor-pointer bg-transparent border-none p-0 ${color}`}
                data-testid={`hint-${code}`}
              >
                {code} ({label})
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-sm font-medium transition-colors"
            data-testid="validate-btn"
          >
            Validate
          </button>
          <button
            onClick={handleApply}
            className="rounded bg-green-700 hover:bg-green-600 px-3 py-1.5 text-sm font-medium transition-colors"
            data-testid="apply-btn"
          >
            Apply
          </button>
        </div>

        <ResponseBox label="Validate" response={validateResponse} />
        <ResponseBox label="Apply" response={applyResponse} />
      </section>
    </div>
  );
};
