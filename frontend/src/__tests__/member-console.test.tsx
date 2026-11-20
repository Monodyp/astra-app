import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MemberConsole from '../components/home/member-console';

describe('Membership dashboard status group', () => {
  it('keeps points and the Active status in one row, with validity inside the status group', () => {
    render(<MemberConsole />);
    const row = screen.getByTestId('membership-status-row');
    const status = screen.getByTestId('membership-status');
    expect(row.firstElementChild?.textContent).toContain('430');
    expect(row.lastElementChild).toBe(status);
    expect(status.className).toContain('items-end');
    expect(status.textContent).toContain('Active');
    expect(status.textContent).toContain('Valid until Aug 2027');
    // status stays a non-interactive label
    expect(status.querySelector('button, a')).toBeNull();
  });
});
