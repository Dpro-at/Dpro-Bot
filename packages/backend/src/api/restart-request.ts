/**
 * A restart the server asks for itself (BACKUP-01 restore). server.ts registers the
 * handler: a clean shutdown with RESTART_EXIT_CODE, which the desktop app answers by
 * starting the program again. Without a handler (tests) nothing happens.
 */
export const RESTART_EXIT_CODE = 75;
let handler: (() => void) | null = null;
export function onRestartRequest(h: () => void): void { handler = h; }
export function requestRestart(): boolean {
  if (!handler) return false;
  const h = handler;
  setTimeout(h, 300).unref();
  return true;
}
