import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FieldInput } from '../forms/controls/FieldInput';
import type { FieldDefinition } from '../forms/formModel';
import { emailError, isValidDate } from '../forms/fieldValidation';
import { calendarDays, dateKey, parseDate, shiftMonth } from '../forms/calendarDates';
import { placeFieldPopover } from '../forms/controls/useFieldPopover';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
const select: FieldDefinition = {
    name: 'format',
    label: 'Format',
    kind: 'select',
    placeholder: 'Choose an option',
    options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In person' },
        { value: 'hybrid', label: 'Hybrid' },
    ],
};
function Harness({
    field = select,
    initial = '',
}: {
    field?: FieldDefinition;
    initial?: string;
}) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <FieldInput field={field} value={value} onChange={setValue} />
            <button>Outside</button>
            <output>{value}</output>
        </>
    );
}

describe('field validation', () => {
    it('filters full names to letters and caps repeated-character spam', () => {
        render(
            <Harness
                field={{ name: 'fullName', label: 'Full name', required: true }}
            />,
        );
        fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), {
            target: { value: 'jyyyyyyyy123' },
        });
        expect(screen.getByRole('status').textContent).toBe('jyy');
    });

    it('keeps numeric fields limited to digits', () => {
        render(
            <Harness
                field={{
                    name: 'count',
                    label: 'Count',
                    kind: 'number',
                }}
            />,
        );
        fireEvent.change(screen.getByRole('textbox', { name: 'Count' }), {
            target: { value: '12abc3' },
        });
        expect(screen.getByRole('status').textContent).toBe('123');
    });

    it.each([
        'alex@example.com',
        ' alex+work@mail.example.org ',
        "o'brien@example.ph",
        'user@xn--bcher-kva.de',
    ])('accepts a valid email: %s', (value) => {
        expect(emailError(value)).toBeUndefined();
    });
    it.each([
        '',
        'invalid',
        'user@domain',
        'a..b@example.com',
        '.name@example.com',
        'user@-example.com',
        'user@example..com',
        'a b@example.com',
    ])('rejects a malformed email: %s', (value) => {
        expect(emailError(value)).toBeDefined();
    });
    it('shows an inline email error after blur and clears it as the value is corrected', () => {
        render(
            <Harness
                field={{
                    name: 'email',
                    label: 'Email',
                    kind: 'email',
                    required: true,
                }}
            />,
        );
        const email = screen.getByRole('textbox', { name: 'Email' });
        fireEvent.change(email, { target: { value: 'bad@domain' } });
        expect(email.getAttribute('aria-invalid')).toBeNull();
        fireEvent.blur(email);
        expect(email.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByText(/Enter a valid email address/)).toBeDefined();
        fireEvent.change(email, { target: { value: 'alex+work@example.com' } });
        expect(email.getAttribute('aria-invalid')).toBeNull();
        expect(screen.queryByText(/Enter a valid email address/)).toBeNull();
    });
});

describe('custom dropdowns', () => {
    it('offers only actual choices and clears optional selections separately', () => {
        render(<Harness />);
        const trigger = screen.getByRole('combobox', { name: 'Format' });
        fireEvent.click(trigger);
        expect(
            screen.getAllByRole('option').map((option) => option.textContent),
        ).toEqual(['Online', 'In person', 'Hybrid']);
        expect(
            screen.queryByRole('option', { name: 'Choose an option' }),
        ).toBeNull();
        fireEvent.click(screen.getByRole('option', { name: 'Hybrid' }));
        expect(screen.getByRole('status').textContent).toBe('hybrid');
        expect(screen.queryByRole('listbox')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Clear Format' }));
        expect(screen.getByRole('status').textContent).toBe('');
    });
    it('supports arrow keys, typeahead, Enter, and Escape', () => {
        render(<Harness />);
        const trigger = screen.getByRole('combobox', { name: 'Format' });
        trigger.focus();
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fireEvent.keyDown(trigger, { key: 'Enter' });
        expect(screen.getByRole('status').textContent).toBe('in_person');
        fireEvent.keyDown(trigger, { key: 'h' });
        fireEvent.keyDown(trigger, { key: 'Enter' });
        expect(screen.getByRole('status').textContent).toBe('hybrid');
        fireEvent.click(trigger);
        fireEvent.keyDown(trigger, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });
    it('dismisses on outside clicks and page scrolling but permits internal scrolling', () => {
        render(<Harness />);
        const trigger = screen.getByRole('combobox', { name: 'Format' });
        fireEvent.click(trigger);
        fireEvent.scroll(screen.getByRole('listbox'));
        fireEvent.wheel(screen.getByRole('listbox'));
        expect(screen.getByRole('listbox')).toBeDefined();
        fireEvent.scroll(window);
        expect(screen.queryByRole('listbox')).toBeNull();
        fireEvent.click(trigger);
        fireEvent.click(screen.getByRole('button', { name: 'Outside' }));
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});

describe('popover placement', () => {
    const viewport = { left: 0, top: 0, width: 400, height: 600 };
    it('opens below when there is room and above when the lower edge is close', () => {
        expect(
            placeFieldPopover(
                { left: 20, top: 100, bottom: 150, width: 200 },
                viewport,
                200,
            ).placement,
        ).toBe('bottom');
        const top = placeFieldPopover(
            { left: 20, top: 500, bottom: 550, width: 200 },
            viewport,
            200,
        );
        expect(top.placement).toBe('top');
        expect(top.top + top.maxHeight).toBeLessThan(500);
    });
    it('limits height on the larger side and keeps wide calendars inside small viewports', () => {
        const result = placeFieldPopover(
            { left: 250, top: 110, bottom: 160, width: 200 },
            { ...viewport, width: 320, height: 240 },
            400,
            320,
        );
        expect(result.placement).toBe('top');
        expect(result.maxHeight).toBe(96);
        expect(result.left).toBe(8);
        expect(result.width).toBe(304);
        expect(result.top).toBe(8);
    });
});

describe('custom calendar', () => {
    const date: FieldDefinition = {
        name: 'deadline',
        label: 'Deadline',
        kind: 'date',
    };
    it('selects date-only values and supports day/month keyboard navigation', () => {
        render(<Harness field={date} initial="2026-11-20" />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Open calendar for Deadline' }),
        );
        const selected = screen.getByRole('button', {
            name: 'Friday, November 20, 2026',
        });
        expect(document.activeElement).toBe(selected);
        fireEvent.keyDown(selected, { key: 'ArrowRight' });
        const next = screen.getByRole('button', {
            name: 'Saturday, November 21, 2026',
        });
        expect(document.activeElement).toBe(next);
        fireEvent.keyDown(next, { key: 'PageDown' });
        const december = screen.getByRole('button', {
            name: 'Monday, December 21, 2026',
        });
        expect(document.activeElement).toBe(december);
        fireEvent.click(december);
        expect(
            screen
                .getByRole('textbox', { name: 'Deadline' })
                .getAttribute('value'),
        ).toBe('2026-12-21');
        expect(screen.queryByRole('dialog')).toBeNull();
    });
    it('validates manual dates and dismisses on outside interaction', () => {
        render(<Harness field={date} />);
        const field = screen.getByRole('textbox', { name: 'Deadline' });
        fireEvent.change(field, { target: { value: '2026-02-30' } });
        fireEvent.blur(field);
        expect(field.getAttribute('aria-invalid')).toBe('true');
        fireEvent.click(
            screen.getByRole('button', { name: 'Open calendar for Deadline' }),
        );
        fireEvent.scroll(window);
        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'Open calendar for Deadline' }),
        );
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
    it('handles leap dates, month ends, and a complete six-week calendar', () => {
        expect(isValidDate('2028-02-29')).toBe(true);
        expect(isValidDate('2027-02-29')).toBe(false);
        expect(dateKey(shiftMonth(parseDate('2026-01-31')!, 1))).toBe(
            '2026-02-28',
        );
        expect(calendarDays(parseDate('2026-11-01')!)).toHaveLength(42);
    });
});
