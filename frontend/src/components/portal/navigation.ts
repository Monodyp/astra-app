import type { Role } from '../../data/index.js';

export interface PortalDestination {
  path: string;
  label: string;
  roles: readonly Role[];
}

const EVERYONE: readonly Role[] = ['member', 'officer'];
const OFFICERS: readonly Role[] = ['officer'];

export const PORTAL_DESTINATIONS: readonly PortalDestination[] = [
  { path: '/home', label: 'Overview', roles: EVERYONE },
  { path: '/id', label: 'Digital ID', roles: EVERYONE },
  { path: '/officer/grant-points', label: 'Officer Points', roles: OFFICERS },
  { path: '/marketplace', label: 'Perks Marketplace', roles: EVERYONE },
  { path: '/checkin', label: 'Event Check-in', roles: OFFICERS },
  { path: '/vouchers', label: 'My Vouchers', roles: EVERYONE },
];

export function destinationsFor(role: Role): PortalDestination[] {
  return PORTAL_DESTINATIONS.filter((item) => item.roles.includes(role));
}
