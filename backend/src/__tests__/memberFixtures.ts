import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

export async function memberFixture(
  members = 'sr_code,full_name\n24-90001,Demo Member 01\n',
  paid = 'sr_code\n'
) {
  const prefix = path.join(tmpdir(), 'astra-members-');
  const directory = await mkdtemp(prefix);
  const membersPath = path.join(directory, 'members.csv');
  const paidPath = path.join(directory, 'paid.csv');
  await writeFile(membersPath, members, 'utf8');
  await writeFile(paidPath, paid, 'utf8');
  vi.stubEnv('MEMBER_DATA_SOURCE', 'csv');
  vi.stubEnv('MEMBERS_CSV_PATH', membersPath);
  vi.stubEnv('PAID_CSV_PATH', paidPath);
  return {
    membersPath,
    paidPath,
    async cleanup() {
      vi.unstubAllEnvs();
      if (!directory.startsWith(prefix))
        throw new Error('Unexpected fixture path');
      await rm(directory, { recursive: true, force: true });
    },
    async replacePaid(value: string) {
      await writeFile(paidPath, value, 'utf8');
    },
    async replaceMembers(value: string) {
      await writeFile(membersPath, value, 'utf8');
    },
  };
}
