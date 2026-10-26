import type { SessionClient, User } from './session';

/**
 * Practice and fixture controls (the session-mode bar, "Leave to fixture",
 * draft-copy notes) belong to developer builds only. A developer build is one
 * that carries the offline practice transport, or has no live sign-in at all
 * (the default fictional build). The desktop program ships a live-only build
 * (`--candidate --live-entry`), so it never shows them.
 */
export function isDeveloperBuild(client: Pick<SessionClient, 'canUse'>): boolean {
  return client.canUse('mock') || !client.canUse('live');
}

/** Plain words under the name in the account chip; never the raw role key. */
export function accountRoleLabel(role: User['role']): string {
  return role === 'owner' ? 'Owner of this workspace' : role === 'guest' ? 'Guest' : '';
}
