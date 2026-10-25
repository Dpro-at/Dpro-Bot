export type WorkspaceMode = 'code' | 'chat';
export type WorkspaceModeState = { available: boolean; mode: WorkspaceMode; busy: boolean; error: string | null };
export type NabuBridge = {
  status(): Promise<WorkspaceModeState | null>;
  select(mode: WorkspaceMode, top: number, bottom: number): Promise<WorkspaceModeState | null>;
  layout(top: number, bottom: number): void;
  onState(callback: (state: WorkspaceModeState) => void): () => void;
};
export function validWorkspaceState(value: unknown): value is WorkspaceModeState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.available === 'boolean' && (v.mode === 'code' || v.mode === 'chat') && typeof v.busy === 'boolean' && (v.error === null || (typeof v.error === 'string' && v.error.length <= 160));
}
