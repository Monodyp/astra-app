// Thin fetch wrapper with base URL from environment, Bearer token injection,
// HTTP status preservation (200 vs 201), and automatic 401 token refresh retry.
import { getIdToken } from './firebase.js';

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(
    statusOrMessage: number | string,
    messageOrStatus?: string | number,
    data: unknown = null
  ) {
    if (typeof statusOrMessage === 'number') {
      super(typeof messageOrStatus === 'string' ? messageOrStatus : '');
      this.status = statusOrMessage;
      this.data = data;
    } else {
      super(statusOrMessage);
      this.status = typeof messageOrStatus === 'number' ? messageOrStatus : 0;
      this.data = data;
    }
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends RequestInit {
  token?: string;
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  ok?: boolean;
  headers?: Headers;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return 'http://localhost:4000';
}

/**
 * Builds the full URL with base URL, endpoint path, and query parameters.
 */
export function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = new URL(`${getApiBaseUrl()}/${cleanEndpoint}`);
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
  const { token, skipAuth = false, params, ...requestInit } = options;
  const url = buildUrl(endpoint, params);

  const headers = new Headers(requestInit.headers || {});
  if (!headers.has('Content-Type') && !(requestInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject Bearer token if explicitly provided, or auto-fetch from Firebase if not skipping auth
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (!headers.has('Authorization') && !skipAuth) {
    const activeToken = await getIdToken(false);
    if (activeToken) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...requestInit, headers });
  } catch {
    throw new ApiError(0, 'Unable to reach the ASTRA server. Check your connection and try again.');
  }

  // On 401 Unauthorized, attempt ONE force refresh of the Firebase token and retry (if not using explicit token)
  if (response.status === 401 && !skipAuth && !token) {
    const refreshedToken = await getIdToken(true);
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      try {
        response = await fetch(url, { ...requestInit, headers });
      } catch {
        throw new ApiError(0, 'Unable to reach the ASTRA server. Check your connection and try again.');
      }
    }
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson
    ? await response.json().catch(() => null)
    : (await response.text().catch(() => '')) as unknown as T;

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
        ? ((data as { error: string }).error)
        : `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(response.status, message, data);
  }

  return {
    data: data as T,
    status: response.status,
    ok: response.ok,
    headers: response.headers,
  };
}

export const requestApi = apiFetch;

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
