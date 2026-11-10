// Thin fetch wrapper with base URL from environment
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function get<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
}

function post<T>(endpoint: string, body: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Attendance API
// ---------------------------------------------------------------------------

export const attendanceApi = {
  checkIn: (srCode: string, eventId: string) =>
    post<unknown>('/attendance/checkin', { srCode, eventId }),
  getEventAttendees: (eventId: string) =>
    get<unknown>(`/attendance/${eventId}`),
};

// ---------------------------------------------------------------------------
// Partner Redemption API
// ---------------------------------------------------------------------------

export const partnerApi = {
  validate: (code: string, partner: string) =>
    post<unknown>('/partner/validate', { code, partner }),
  apply: (code: string, partner: string) =>
    post<unknown>('/partner/apply', { code, partner }),
};
