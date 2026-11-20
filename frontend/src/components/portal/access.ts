import type { Role } from '../../data/index.js';

const OFFICER_PATHS = ['/officer', '/checkin'];

export const DEFAULT_PORTAL_PATH = '/home';

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function requiredRole(pathname: string): Role | null {
  return OFFICER_PATHS.some((prefix) => matches(pathname, prefix))
    ? 'officer'
    : null;
}

export function canOpen(pathname: string, role: Role): boolean {
  const required = requiredRole(pathname);
  return required === null || required === role;
}

export function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return null;
  }
  if (raw.startsWith('/login')) {
    return null;
  }
  return raw;
}

export function loginPathFor(location: {
  pathname: string;
  search: string;
}): string {
  const next = `${location.pathname}${location.search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export function landingPathFor(next: string | null, role: Role): string {
  const safe = safeNextPath(next);
  if (!safe) {
    return DEFAULT_PORTAL_PATH;
  }
  const pathname = safe.split(/[?#]/)[0];
  return canOpen(pathname, role) ? safe : DEFAULT_PORTAL_PATH;
}
