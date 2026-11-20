import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { DEFAULT_PORTAL_PATH } from './access.js';

export const AccessDenied: React.FC = () => (
  <section
    aria-labelledby="access-denied-title"
    className="mx-auto max-w-xl border border-astra-primary-dark bg-black/40 px-8 py-10 text-center font-astra"
  >
    <ShieldAlert
      className="mx-auto h-10 w-10 text-astra-primary-light"
      aria-hidden="true"
    />
    <h1
      id="access-denied-title"
      className="mt-4 text-h5 font-bold text-astra-white"
    >
      Officer access only
    </h1>
    <p className="mt-2 text-sm text-astra-gray">
      This screen is for ASTRA officers. Your account does not have officer
      permissions.
    </p>
    <Link
      to={DEFAULT_PORTAL_PATH}
      className="mt-6 inline-flex rounded-full bg-astra-primary-light px-6 py-2.5 text-sm font-bold text-astra-white transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-white"
    >
      Back to Overview
    </Link>
  </section>
);
