/**
 * Dpro Bot MCP server (MCP-01): stdio transport, built on the official
 * MCP TypeScript SDK (@modelcontextprotocol/sdk, low-level Server API, so
 * the tool schemas are plain JSON Schema).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createBackendClient, type BackendClient } from './backend.js';
import { TOOL_DEFINITIONS, callTool } from './tools.js';

export const SERVER_NAME = 'agent-player';
export const SERVER_VERSION = '0.1.0';

const INSTRUCTIONS = [
  'Dpro Bot small local agent.',
  'Use spawn_small_agent for light, self-contained subtasks: lookups in Dpro Bot memory/storage, summaries of text you pass in, classification, first drafts.',
  'Keep code, security decisions, multi-step reasoning and anything with side effects for yourself.',
  'Then call get_result (wait_seconds up to 60). Review any card with needs_review: true before using it.',
  'list_runs shows the queue; when all slots are busy, spawns are refused: do the task yourself.',
].join(' ');

export function createMcpServer(deps: { backend?: BackendClient } = {}): Server {
  const backend = deps.backend ?? createBackendClient();
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS.map((t) => ({ ...t })) as any }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return (await callTool(request.params.name, request.params.arguments, { backend })) as any;
  });
  return server;
}

export async function runStdio(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}
