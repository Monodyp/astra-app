import React from 'react';
import { Link } from 'react-router-dom';
import { primaryButton, secondaryButton } from '../../components/portal/buttons.js';

export class CheckInBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section role="alert" className="space-y-4">
        <h1 className="text-2xl font-bold">Check-in could not open</h1>
        <p className="text-sm text-astra-gray">
          Check your connection, then reload this page to open the scanner.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={primaryButton} onClick={() => window.location.reload()}>
            Reload page
          </button>
          <Link to="/home" className={secondaryButton}>Back to overview</Link>
        </div>
      </section>
    );
  }
}
