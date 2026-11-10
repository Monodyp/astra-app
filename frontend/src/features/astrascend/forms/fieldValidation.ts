export function emailError(raw: string): string | undefined {
    const value = raw.trim();
    if (!value) return 'Enter your email address.';
    const parts = value.split('@');
    const local = parts[0];
    const domain = parts[1] || '';
    const labels = domain.split('.');
    const valid =
        parts.length === 2 &&
        value.length <= 254 &&
        local.length <= 64 &&
        /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) &&
        !local.startsWith('.') &&
        !local.endsWith('.') &&
        !local.includes('..') &&
        labels.length >= 2 &&
        labels.every(
            (label) =>
                label.length <= 63 &&
                /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
        ) &&
        /^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/i.test(labels[labels.length - 1]);
    return valid
        ? undefined
        : 'Enter a valid email address, such as you@example.com.';
}

const DEFAULT_MAX_LENGTH = 200;

export function maxLengthForField(
    name: string,
    kind?: string,
): number {
    if (name === 'fullName') return 80;
    if (name === 'email') return 254;
    if (name === 'organization') return 120;
    if (kind === 'url') return 2048;
    if (kind === 'textarea') return 1200;
    return DEFAULT_MAX_LENGTH;
}

export function sanitizeFieldValue(
    name: string,
    kind: string | undefined,
    raw: string,
): string {
    let value = raw;
    if (kind === 'number') value = value.replace(/\D/g, '');
    if (name === 'fullName')
        value = value.replace(/[^\p{L}\p{M}\s.'-]/gu, '');
    if (kind === 'text' || kind === 'textarea' || !kind)
        value = value.replace(/(\p{L})\1{2,}/gu, '$1$1');
    return value.slice(0, maxLengthForField(name, kind));
}

export function fieldFormatError(
    name: string,
    kind: string | undefined,
    value: string,
): string | undefined {
    if (value.length > maxLengthForField(name, kind))
        return `Keep this to ${maxLengthForField(name, kind)} characters or fewer.`;
    if (name === 'fullName' && !/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(value))
        return 'Use letters, spaces, apostrophes, or hyphens only.';
    if (kind === 'number' && !/^\d+$/.test(value))
        return 'Use numbers only.';
    return undefined;
}

export function isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}
