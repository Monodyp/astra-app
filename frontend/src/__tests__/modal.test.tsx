import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Modal } from '../components/portal/Modal.js';

describe('portal modal', () => {
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
