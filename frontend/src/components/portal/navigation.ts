import type { Role } from '../../data/index.js';

export interface PortalDestination {
  path: string;
  label: string;
  shortLabel: string;
  roles: readonly Role[];
}

const EVERYONE: readonly Role[] = ['member', 'officer'];
const OFFICERS: readonly Role[] = ['officer'];

export const PORTAL_DESTINATIONS: readonly PortalDestination[] = [
  { path: '/home', label: 'Overview', shortLabel: 'Overview', roles: EVERYONE },
  { path: '/id', label: 'Digital ID', shortLabel: 'ID', roles: EVERYONE },
  {
    path: '/officer/grant-points',
    label: 'Officer Points',
    shortLabel: 'Officer',
    roles: OFFICERS,
  },
  {
    path: '/marketplace',
    label: 'Perks Marketplace',
    shortLabel: 'Perks',
    roles: EVERYONE,
  },
  {
    path: '/checkin',
    label: 'Event Check-in',
    shortLabel: 'Check-in',
    roles: OFFICERS,
  },
  {
    path: '/vouchers',
    label: 'My Vouchers',
    shortLabel: 'Vouchers',
    roles: EVERYONE,
  },
];

export function destinationsFor(role: Role): PortalDestination[] {
  return PORTAL_DESTINATIONS.filter((item) => item.roles.includes(role));
}

export function isActivePath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}
