import { useState, type FormEvent } from 'react';
import { verifyMembership, type ApiResponse } from './api';

function resultLabel(response: ApiResponse): string {
  if (response.status !== 200) return 'Request failed';
  const body = response.body;
  if (typeof body !== 'object' || body === null || !('isValid' in body)) {
    return 'Unexpected response';
  }
  if (body.isValid === true) return 'Valid';
  if (body.isValid === false) return 'Not valid';
  return 'Unexpected response';
}

export function App() {
  const [srCode, setSrCode] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResponse(null);
    setNetworkError(null);
    try {
      setResponse(await verifyMembership(srCode));
    } catch (error) {
      setNetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <p className="banner">TEST MOCKUP - NOT FINAL UI</p>
      <h1>Membership verification</h1>
      <p>
        Checks member and paid records. An SR code does not establish current
        year level.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="sr-code">SR code</label>
        <input
          id="sr-code"
          value={srCode}
          onChange={(event) => setSrCode(event.target.value)}
          required
          maxLength={128}
          autoComplete="off"
          placeholder="e.g. 24-90001 (fake)"
        />
        <button type="submit" disabled={pending}>
          {pending ? 'Checking...' : 'Verify'}
        </button>
      </form>
      <section
        aria-label="Verification response"
        aria-live="polite"
        aria-busy={pending}
      >
        {pending && <p>Waiting for backend response...</p>}
        {response && (
          <>
            <h2>Result: {resultLabel(response)}</h2>
            <p>HTTP status: {response.status}</p>
            <h3>Raw JSON / response body</h3>
            <pre>
              {typeof response.body === 'string'
                ? response.body
                : JSON.stringify(response.body, null, 2)}
            </pre>
          </>
        )}
        {networkError && (
          <>
            <p role="alert">Request failed: {networkError}</p>
            <p>HTTP status: No response</p>
          </>
        )}
      </section>
    </main>
  );
}
