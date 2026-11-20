import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import wordmark from '../assets/astra-home/wordmark.png';
import { btnPrimary, btnSecondary, inputCls } from '@/components/member/ui';
import { isFixtureMode } from '@/features/member/fixtures';

/**
 * Login screen. No authentication service is connected (AuthContext is a stub and the
 * backend /auth/login route is a stub), so submitting validates the form and then says
 * so honestly. It never pretends to sign anyone in.
 */
export const Login: React.FC = () => {
  const uid = useId();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);
  const fixture = isFixtureMode();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = 'Enter your student ID or email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setNotice(null);
    if (Object.keys(next).length) return;
    setNotice(
      'Sign-in is not available yet: the member authentication service is not connected to this site. Nothing was sent and you are not signed in.',
    );
  };

  const unavailable = (what: string) => () => setNotice(`${what} is not available yet. Please ask an ASTRA officer for help.`);
  const linkBtn =
    'inline-flex min-h-11 items-center self-start font-astra text-sm text-astra-white underline underline-offset-4 hover:text-astra-primary-light';

  return (
    <div className="flex min-h-dvh items-start justify-center bg-astra-black px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] font-astra text-astra-white sm:items-center sm:pt-10">
      <form
        onSubmit={onSubmit}
        noValidate
        aria-labelledby={`${uid}-title`}
        className="w-full max-w-md space-y-5 border border-astra-primary-dark bg-black/30 p-5 sm:p-8"
      >
        <div className="flex items-center gap-4">
          <Link to="/" aria-label="ASTRA Developers home" className="inline-flex min-h-11 shrink-0 items-center">
            <img src={wordmark} alt="ASTRA Developers" className="h-auto w-24" />
          </Link>
          <h1 id={`${uid}-title`} className="text-lg font-bold">
            ASTRA Member Portal Login
          </h1>
        </div>
        <p className="text-sm text-astra-gray">Sign in using your student credentials or registered account.</p>

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
          <button type="button" className={linkBtn} onClick={unavailable('Password recovery')}>
            Forgot password?
          </button>
          <button type="button" className={linkBtn} onClick={unavailable('Membership renewal')}>
            Need membership renewal?
          </button>
        </div>

        {notice && (
          <p role="alert" className="border border-amber-400/60 bg-amber-400/10 p-3 text-sm">
            {notice}
          </p>
        )}

        <button type="submit" className={btnPrimary}>
          Sign In to Portal
        </button>
        <button type="button" className={btnSecondary} onClick={unavailable('Google / institutional SSO sign-in')}>
          Login with Google / Institutional SSO
        </button>

        {fixture && (
          <p className="border-t border-white/10 pt-4 text-sm text-astra-gray">
            Fixture mode is on.{' '}
            <Link to="/member" className="font-bold text-astra-primary-light underline">
              Open the sample member screens
            </Link>{' '}
            (no sign-in takes place).
          </p>
        )}
      </form>
    </div>
  );
};
