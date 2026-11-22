// HTTP client scoped to the configured ASTRA backend API base URL.
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface ApiRequestOptions extends RequestInit {
  token?: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return 'http://localhost:4000';
}

function buildApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}/${endpoint.replace(/^\/+/, '')}`;
}

export async function requestApi<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { token, headers: rawHeaders, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((rawHeaders as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(endpoint), { ...init, headers });
  } catch {
    throw new ApiError(0, 'Unable to reach the ASTRA server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(response.status, errorMessage, data);
  }

  return { status: response.status, data: data as T };
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const result = await requestApi<T>(endpoint, options);
  return result.data;
}

function get<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
}

function post<T>(endpoint: string, body: unknown): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export const attendanceApi = {
  checkIn: (srCode: string, eventId: string) =>
    post<unknown>('/attendance/checkin', { srCode, eventId }),
  getEventAttendees: (eventId: string) =>
    get<unknown>(`/attendance/${eventId}`),
};

export const partnerApi = {
  validate: (code: string, partner: string) =>
    post<unknown>('/partner/validate', { code, partner }),
  apply: (code: string, partner: string) =>
    post<unknown>('/partner/apply', { code, partner }),
};
