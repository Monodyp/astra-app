import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { secondaryButton } from './buttons.js';

export const Modal: React.FC<{
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  busy?: boolean;
}> = ({ label, onClose, children, className = '', busy = false }) => {
  const overlay = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = () => { if (!busy) onClose(); };

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== overlay.current
    );
    const previous = background.map((element) => ({
      element,
      inert: element.inert,
      hidden: element.getAttribute('aria-hidden'),
    }));
    for (const element of background) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';
    (dialog.current?.querySelector<HTMLButtonElement>('button:not([disabled])') ?? dialog.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab' || !dialog.current) return;
      const items = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]'
        )
      );
      if (!items.length) {
        event.preventDefault();
        dialog.current.focus();
        return;
      }
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !items.includes(document.activeElement as HTMLElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      for (const { element, inert, hidden } of previous) {
        element.inert = inert;
        if (hidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', hidden);
      }
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (busy) element.focus();
    else if (document.activeElement === element) {
      element.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    }
  }, [busy]);

  return createPortal(
    <div
      ref={overlay}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close.current();
      }}
    >
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-busy={busy || undefined}
        aria-label={label}
        className={`max-h-[calc(100dvh-2rem)] w-full max-w-2xl space-y-4 overflow-y-auto border border-astra-primary-dark bg-astra-black p-4 font-astra text-astra-white sm:p-6 ${className}`}
        style={{ maxHeight: 'calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom)))' }}
      >
        <button
          type="button"
          onClick={() => close.current()}
          disabled={busy}
          className={`${secondaryButton} ml-auto flex min-w-11`}
          aria-label={`Close ${label.toLowerCase()}`}
        >
          Close
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
};
