import { getConfiguredMemberService } from '../config/members.js';
import type { Member } from './members.js';

// Compatibility entry point for the configured CSV or read-only Sheets source.
export async function fetchMemberFromSheet(
  studentId: string
): Promise<Member | null> {
  return getConfiguredMemberService().findMember(studentId);
}

export async function fetchPaidStatus(studentId: string): Promise<boolean> {
  return getConfiguredMemberService().isPaid(studentId);
}
