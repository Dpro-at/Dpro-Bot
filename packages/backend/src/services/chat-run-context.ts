import { AsyncLocalStorage } from 'node:async_hooks';
import type { ToolResult } from '../tools/types.js';

/** Trusted execution context, never read from model arguments or HTTP bodies. */
/** CHAT-BUILD-01 stage 3 (CH3): how freely the team works in this chat; never looser than the agent's own rules. */
export type ChatMode = 'auto' | 'ask' | 'accept_edits' | 'plan';
export type ChatThinking = 'quick' | 'normal' | 'deep';
export interface ChatRunContext {
  reviewTools: boolean;
  chatMode?: ChatMode;
  thinking?: ChatThinking;
  /** The project's added folders the agent may read (absolute paths). */
  readRoots?: string[];
  failed?: boolean;
  beforeTool(name: string, params: Record<string, unknown>): Promise<string>;
  afterTool(id: string, result: ToolResult): Promise<void>;
}
const storage = new AsyncLocalStorage<ChatRunContext>();
export const currentChatRun = () => storage.getStore();
export function withChatRun<T>(context: ChatRunContext, execute: () => T): T { return storage.run(context, execute); }
