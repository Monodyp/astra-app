export interface ApiResponse {
  status: number;
  body: unknown;
}

export async function verifyMembership(srCode: string): Promise<ApiResponse> {
  const response = await fetch('/api/members/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ srCode }),
  });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* Keep non-JSON proxy/error text. */
  }
  return { status: response.status, body };
}
