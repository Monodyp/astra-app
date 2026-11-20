import React, { useEffect, useId, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import wordmark from '../../../assets/astra-home/wordmark.png';
import {
  LoadingState,
  btnPrimary,
  btnSecondary,
  inputCls,
} from '../../../components/mobile/ui.js';
import { landingPathFor } from '../../../components/portal/access.js';
import { useAuth } from '../../../context/AuthContext.js';
import {
  portalData,
  type SignInInput,
  type SignInShortcut,
} from '../../../data/index.js';
import { errorMessage } from '../../../lib/format.js';

export const MobileLogin: React.FC = () => {
  const uid = useId();
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [shortcuts, setShortcuts] = useState<SignInShortcut[]>([]);

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

  if (loading) return <LoadingState label="Restoring your session" />;
  if (user && !pending) {
    return <Navigate to={landingPathFor(next, user.role)} replace />;
  }

  const attempt = async (key: string, input: SignInInput) => {
    setPending(key);
    setNotice(null);
    try {
      const signedIn = await signIn(input);
      navigate(landingPathFor(next, signedIn.role), { replace: true });
    } catch (e) {
      setNotice(errorMessage(e));
      setPending(null);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!identifier.trim())
      nextErrors.identifier = 'Enter your student ID or email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    setNotice(null);
    if (Object.keys(nextErrors).length) return;
    void attempt('credentials', {
      method: 'credentials',
      identifier,
      password,
    });
  };

  const unavailable = (what: string) => () =>
    setNotice(
      `${what} is not available yet. Please ask an ASTRA officer for help.`
    );
  const linkBtn =
    'inline-flex min-h-11 items-center self-start font-astra text-sm text-astra-white underline underline-offset-4 hover:text-astra-primary-light';
  const busy = pending !== null;

  return (
    <div className="flex min-h-dvh items-start justify-center bg-astra-black px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] font-astra text-astra-white sm:items-center sm:pt-10">
      <form
        onSubmit={onSubmit}
        noValidate
        aria-labelledby={`${uid}-title`}
        className="w-full max-w-md space-y-5 border border-astra-primary-dark bg-black/30 p-5 sm:p-8"
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            aria-label="ASTRA Developers home"
            className="inline-flex min-h-11 shrink-0 items-center"
          >
            <img
              src={wordmark}
              alt="ASTRA Developers"
              className="h-auto w-24"
            />
          </Link>
          <h1 id={`${uid}-title`} className="text-lg font-bold">
            ASTRA Member Portal Login
          </h1>
        </div>
        <p className="text-sm text-astra-gray">
          Sign in using your student credentials or registered account.
        </p>

        <div>
          <label htmlFor={`${uid}-id`} className="mb-2 block text-sm">
            Student ID or Email Address
          </label>
          <input
            id={`${uid}-id`}
            name="username"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={inputCls}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            aria-invalid={!!errors.identifier}
            aria-describedby={errors.identifier ? `${uid}-id-err` : undefined}
          />
          {errors.identifier && (
            <p id={`${uid}-id-err`} className="mt-1 text-sm text-red-300">
              Error: {errors.identifier}
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor={`${uid}-pw`} className="text-sm">
              Password
            </label>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-end text-sm underline underline-offset-4"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              aria-controls={`${uid}-pw`}
            >
              {show ? 'Hide' : 'Show'}
              <span className="sr-only"> password</span>
            </button>
          </div>
          <input
            id={`${uid}-pw`}
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? `${uid}-pw-err` : undefined}
          />
          {errors.password && (
            <p id={`${uid}-pw-err`} className="mt-1 text-sm text-red-300">
              Error: {errors.password}
            </p>
          )}
        </div>

        <div className="flex flex-col">
          <button
            type="button"
            className={linkBtn}
            onClick={unavailable('Password recovery')}
          >
            Forgot password?
          </button>
          <button
            type="button"
            className={linkBtn}
            onClick={unavailable('Membership renewal')}
          >
            Need membership renewal?
          </button>
        </div>

        {notice && (
          <p
            role="alert"
            className="border border-amber-400/60 bg-amber-400/10 p-3 text-sm"
          >
            {notice}
          </p>
        )}

        <button type="submit" className={btnPrimary} disabled={busy}>
          {pending === 'credentials' ? 'Signing in…' : 'Sign In to Portal'}
        </button>
        <button
          type="button"
          className={btnSecondary}
          disabled={busy}
          onClick={() => void attempt('google', { method: 'google' })}
        >
          Login with Google / Institutional SSO
        </button>

        {shortcuts.length > 0 && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            <p className="text-sm text-astra-gray">Demo accounts</p>
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                className={`${btnSecondary} flex-col gap-0`}
                disabled={busy}
                onClick={() =>
                  void attempt(shortcut.id, {
                    method: 'shortcut',
                    shortcutId: shortcut.id,
                  })
                }
              >
                <span>
                  {pending === shortcut.id ? 'Signing in…' : shortcut.label}
                </span>
                <span className="text-xs font-normal text-astra-gray">
                  {shortcut.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};
