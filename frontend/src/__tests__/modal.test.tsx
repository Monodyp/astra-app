import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Modal } from '../components/portal/Modal.js';

describe('portal modal', () => {
  it('contains focus and blocks dismissal when all actions are disabled', () => {
    const onClose = vi.fn();
    const previousOverflow = document.body.style.overflow;
    const view = render(<Modal label="Pending claim" busy onClose={onClose}><button disabled>Claiming</button></Modal>);
    const dialog = screen.getByRole('dialog', { name: 'Pending claim' });
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(view.container.inert).toBe(true);
    expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false);
    expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(dialog.parentElement!);
    expect(onClose).not.toHaveBeenCalled();
    view.rerender(<Modal label="Pending claim" onClose={onClose}><button>Retry</button></Modal>);
    expect(within(dialog).getByRole('button', { name: 'Close pending claim' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(document.body.style.overflow).toBe(previousOverflow);
    expect(view.container.inert).toBeFalsy();
  });

  it('portals dialogs, contains focus and restores background interaction on close', () => {
    const Test = () => {
      const [open, setOpen] = useState(false);
      return (
        <main>
          <button onClick={() => setOpen(true)}>Open credential</button>
          {open && (
            <Modal label="Credential" onClose={() => setOpen(false)}>
              <button>Refresh credential</button>
            </Modal>
          )}
        </main>
      );
    };
    render(<Test />);
    const opener = screen.getByRole('button', { name: 'Open credential' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Credential' });
    const close = within(dialog).getByRole('button', {
      name: 'Close credential',
    });
    const refresh = within(dialog).getByRole('button', {
      name: 'Refresh credential',
    });
    expect(dialog.closest('main')).toBeNull();
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(refresh).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    expect(opener.closest('[aria-hidden="true"]')).toBeNull();
  });
});
