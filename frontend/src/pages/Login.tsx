import React, { useEffect, useId, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Eye, EyeOff } from 'lucide-react';
import logoMark from '../assets/astra-portal/logo-mark.png';
import { technicalCorners } from '../components/home/ui-util.js';
import { PortalBackdrop } from '../components/portal/PortalBackdrop.js';
import { landingPathFor } from '../components/portal/access.js';
import { LoadingState } from '../components/portal/StatusViews.js';
import { useAuth } from '../context/AuthContext.js';
import {
  isDataError,
  portalData,
  type SignInInput,
  type SignInShortcut,
} from '../data/index.js';

type HelpTopic = 'password' | 'renewal';

const HELP_TEXT: Record<HelpTopic, string> = {
  password:
    'ASTRA officers reset portal passwords. Ask an officer at the ASTRA booth or on Discord.',
  renewal:
    'Pay your annual dues to an ASTRA officer. Your ID turns active after the officer confirms payment.',
};

const fieldClass =
  'h-12 w-full border border-astra-primary-dark bg-black/40 px-4 font-astra text-sm text-astra-white placeholder:text-astra-gray/70 focus:border-astra-primary-light focus:outline-none focus-visible:ring-1 focus-visible:ring-astra-primary-light';

const GoogleMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
    />
  </svg>
);

export const Login: React.FC = () => {
  const { user, loading, restoreError, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState<HelpTopic | null>(null);
  const [shortcuts, setShortcuts] = useState<SignInShortcut[]>([]);

  const identifierId = useId();
  const passwordId = useId();
  const errorId = useId();

  useEffect(() => {
    let active = true;
    portalData
      .listSignInShortcuts()
      .then((items) => {
        if (active) setShortcuts(items);
      })
      .catch(() => {
        if (active) setShortcuts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-astra-black">
        <LoadingState label="Restoring your session" />
      </div>
    );
  }
  if (user && !pending) {
    return <Navigate to={landingPathFor(next, user.role)} replace />;
  }

  async function attempt(key: string, input: SignInInput) {
    setPending(key);
    setError(null);
    try {
      const signedIn = await signIn(input);
      navigate(landingPathFor(next, signedIn.role), { replace: true });
    } catch (caught) {
      setError(
        isDataError(caught)
          ? caught.message
          : 'Sign-in is unavailable right now. Try again.'
      );
      setPending(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Validate fields before submitting
    if (!identifier.trim()) {
      setError('Enter your student ID or email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setError(null);
    void attempt('credentials', {
      method: 'credentials',
      identifier,
      password,
    });
  }

  const busy = pending !== null;
  const alertMessage = error ?? restoreError;

  return (
    <div className="relative min-h-screen overflow-hidden bg-astra-black font-astra text-astra-white">
      <PortalBackdrop />
      <header className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-[112px] py-8">
        <Link
          to="/"
          className="flex items-center gap-4 text-h6 font-bold text-astra-white transition-colors hover:text-astra-primary-light"
        >
          <img src={logoMark} alt="" className="h-11 w-11" />
          <span className="flex items-center gap-1">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Home
          </span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-8">
          <a
            href="/astrascend"
            className="inline-flex items-center gap-2 rounded-full bg-astra-primary-light px-8 py-3 text-sm font-bold text-astra-white transition-transform hover:scale-105"
          >
            ASTRAscend
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex max-w-[1440px] justify-center px-6 pb-20 pt-4">
        <section
          aria-labelledby="login-title"
          className="relative w-full max-w-[476px] border border-astra-primary-dark bg-[#0b1118]/80 px-8 py-8 shadow-[0_0_32px_rgba(0,140,204,0.12)] backdrop-blur-sm"
        >
          {technicalCorners}
          <div className="flex items-center gap-4">
            <img src={logoMark} alt="" className="h-12 w-12" />
            <h1 id="login-title" className="text-h6 font-bold">
              Your Membership Dashboard
            </h1>
          </div>
          <p className="mt-4 text-sm font-medium">
            Sign in using your student credentials or registered account
          </p>

          {alertMessage && (
            <p
              id={errorId}
              role="alert"
              className="mt-6 border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
            >
              {alertMessage}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void attempt('google', { method: 'google' })}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-astra-primary-dark bg-black/30 text-sm text-astra-white transition-colors hover:border-astra-primary-light disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-4 text-sm text-astra-gray">
            <span className="h-px flex-1 bg-astra-white/60" />
            or
            <span className="h-px flex-1 bg-astra-white/60" />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor={identifierId}
              className="block text-sm font-bold text-astra-white"
            >
              Student ID or Email Address
            </label>
            <input
              id={identifierId}
              name="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="2X-XXXXX or name@astra.example"
              aria-describedby={error ? errorId : undefined}
              className={`${fieldClass} mt-3`}
            />

            <label
              htmlFor={passwordId}
              className="mt-5 block text-sm font-bold text-astra-white"
            >
              Password
            </label>
            <div className="relative mt-3">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-astra-primary-light"
              >
                {showPassword ? (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="mt-6 flex justify-between text-xs font-bold">
              <button
                type="button"
                onClick={() => setHelp(help === 'password' ? null : 'password')}
                aria-expanded={help === 'password'}
                className="underline underline-offset-2 hover:text-astra-primary-light"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setHelp(help === 'renewal' ? null : 'renewal')}
                aria-expanded={help === 'renewal'}
                className="underline underline-offset-2 hover:text-astra-primary-light"
              >
                Need membership renewal?
              </button>
            </div>
            {help && (
              <p className="mt-3 text-xs leading-5 text-astra-gray">
                {HELP_TEXT[help]}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-8 h-12 w-full rounded-xl bg-astra-secondary text-sm font-medium text-astra-white transition-colors hover:bg-[#1a2f73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-primary-light disabled:opacity-60"
            >
              {pending === 'credentials' ? 'Signing in…' : 'Sign In to Portal'}
            </button>
          </form>

          {shortcuts.length > 0 && (
            <div className="mt-8 border-t border-astra-primary-dark pt-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-astra-primary-light">
                Demo accounts
              </h2>
              <p className="mt-2 text-xs leading-5 text-astra-gray">
                Fictional accounts for trying the portal. Choose one, or type
                its student ID with any password.
              </p>
              <ul className="mt-4 space-y-2">
                {shortcuts.map((shortcut) => (
                  <li key={shortcut.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void attempt(shortcut.id, {
                          method: 'shortcut',
                          shortcutId: shortcut.id,
                        })
                      }
                      className="flex w-full items-center justify-between gap-4 border border-astra-primary-dark bg-black/30 px-4 py-3 text-left transition-colors hover:border-astra-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light disabled:opacity-60"
                    >
                      <span>
                        <span className="block text-sm font-bold">
                          {shortcut.label}
                        </span>
                        <span className="block text-xs text-astra-gray">
                          {shortcut.description}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-astra-primary-light">
                        {pending === shortcut.id
                          ? 'Signing in…'
                          : shortcut.identifier}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
