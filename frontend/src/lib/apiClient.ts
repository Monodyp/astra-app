// Thin fetch wrapper with base URL from environment, Bearer token injection,
// HTTP status preservation (200 vs 201), and automatic 401 token refresh retry.
import { getIdToken } from './firebase.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
  headers: Headers;
}

/**
 * Builds the full URL with base URL, endpoint path, and query parameters.
 */
export function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/${cleanEndpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

/**
 * Performs an HTTP request with automatic Bearer token injection,
 * JSON handling, and 401 token refresh retry. Returns status code and headers.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, params, ...requestInit } = options;
  const url = buildUrl(endpoint, params);

  const headers = new Headers(requestInit.headers || {});
  if (!headers.has('Content-Type') && !(requestInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer token if not already provided and not skipping auth
  if (!headers.has('Authorization') && !skipAuth) {
    const token = await getIdToken(false);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response = await fetch(url, { ...requestInit, headers });

  // On 401 Unauthorized, attempt ONE force refresh of the Firebase token and retry
  if (response.status === 401 && !skipAuth) {
    const refreshedToken = await getIdToken(true);
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      response = await fetch(url, { ...requestInit, headers });
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson
    ? await response.json().catch(() => ({} as T))
    : (await response.text().catch(() => '')) as unknown as T;

  if (!response.ok) {
    const message =
      (data as { error?: string })?.error ||
      `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status, data);
  }

  return {
    data,
    status: response.status,
    ok: response.ok,
    headers: response.headers,
  };
}

/**
 * Primary apiClient function: returns response data directly.
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const result = await apiFetch<T>(endpoint, options);
  return result.data;
}

apiClient.raw = apiFetch;
apiClient.get = <T>(endpoint: string, options?: ApiRequestOptions) =>
  apiClient<T>(endpoint, { ...options, method: 'GET' });
apiClient.post = <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

// ---------------------------------------------------------------------------
// Existing helpers for backwards compatibility (DevTools, etc.)
// ---------------------------------------------------------------------------

export const attendanceApi = {
  checkIn: (srCode: string, eventId: string) =>
    apiClient.post<unknown>('/attendance/checkin', { srCode, eventId }),
  getEventAttendees: (eventId: string) =>
    apiClient.get<unknown>(`/attendance/${eventId}`),
};

export const partnerApi = {
  validate: (code: string, partner: string) =>
    apiClient.post<unknown>('/partner/validate', { code, partner }),
  apply: (code: string, partner: string) =>
    apiClient.post<unknown>('/partner/apply', { code, partner }),
};
