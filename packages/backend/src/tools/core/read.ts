/**
 * Read Tool
 *
 * Read a file from the agent's workspace (S1.6 sandbox: per-agent
 * `.data/workspaces/<agentId>/`, or an explicit read root set by server
 * code; realpath containment, always-deny list, size limit).
 */

import path from 'node:path';
import type { Tool, ToolResult } from '../types.js';
import { FileSandboxError, MAX_READ_BYTES, readRootFor, sandboxedReadFile } from './file-sandbox.js';

export const readTool: Tool = {
  name: 'read',
  description: `Read a text file from your workspace folder (paths are relative to it; max ${MAX_READ_BYTES} bytes). Files outside the workspace, environment files, keys, databases and credentials cannot be read.`,
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read (relative to your workspace)',
      },
    },
    required: ['path'],
    examples: [
      { path: 'notes/meeting.md', description: 'Read meeting notes saved earlier in the workspace' },
      { path: 'report.txt', description: 'Read a report file from the workspace' },
    ],
  },

  async execute(params, context): Promise<ToolResult> {
    const filePath = params?.path;
    try {
      let root = readRootFor(context);
      let rel = filePath;
      // CHAT-BUILD-01 stage 3: an absolute path inside the main folder or one of the project's added folders.
      if (typeof filePath === 'string' && path.isAbsolute(filePath)) {
        const hit = [root, ...(context?.extraReadRoots ?? [])].find((r) => { const x = path.relative(r, filePath); return !!x && !x.startsWith('..') && !path.isAbsolute(x); });
        if (hit) { root = hit; rel = path.relative(hit, filePath); }
      }
      const r = sandboxedReadFile(root, rel);
      return {
        content: [{ type: 'text', text: r.content }],
        details: { path: r.rel, size: r.size, modified: r.modified },
      };
    } catch (error: any) {
      const message = error instanceof FileSandboxError ? error.message : 'Failed to read file';
      if (!(error instanceof FileSandboxError)) console.error('[ReadTool] read failed:', error?.code ?? 'error');
      return {
        content: [{ type: 'text', text: `❌ ${message}` }],
        error: message,
      };
    }
  },
};
