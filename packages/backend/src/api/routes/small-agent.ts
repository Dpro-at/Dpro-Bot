/**
 * Small-agent runs API (MCP-01, D-HYBRID). Owner only.
 *
 *   POST /api/small-agent/runs        { task, tools?, drawers?, max_steps?, kind?, read_dir? }
 *                                     -> 201 { run_id, status, kind, granted_tools, drawers, read_dir, budget, model, warnings, capacity }
 *                                     read_dir: absolute directory `read` is confined to (MCP-01b);
 *                                     default: the small agent's own workspace. Never the backend tree.
 *                                     -> 429 { error, capacity } when SMALL_AGENT_MAX_CONCURRENT runs are active
 *   GET  /api/small-agent/runs        ?status=&limit=  -> { runs, capacity }
 *   GET  /api/small-agent/runs/:id    -> { card }   (the result card, see services/small-agent.ts)
 *
 * Used by the Dpro Bot MCP server (packages/mcp-server) with the owner's
 * CLI token. Cancel a run with POST /api/task-runs/:id/cancel.
 * Tools are never wider than the small-agent safe set and the agent's grants;
 * the task text is not logged (audit metadata holds only counts and names).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logAudit } from '../../services/audit-logger.js';
import { executeTaskRun } from '../../services/task-run-executor.js';
import {
  SmallAgentCapacityError,
  SmallAgentInputError,
  listSmallAgentRuns,
  smallAgentCapacity,
  smallAgentCard,
  spawnSmallAgentRun,
} from '../../services/small-agent.js';
import { drawerId } from '../../memory/drawers.js';

const ID = /^[0-9a-f-]{36}$/i;
const STATUSES = new Set(['queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled']);

function owner(request: FastifyRequest, reply: FastifyReply) {
  const user = request.authUser;
  if (!user) { reply.code(401).send({ error: 'Authentication required' }); return null; }
  if (user.role !== 'owner') { reply.code(403).send({ error: 'This action requires the owner account' }); return null; }
  return user;
}

/** Start the run in the background; the recovery loop picks it up too if this process stops. */
function start(runId: string): void {
  setImmediate(() => {
    executeTaskRun(runId).catch((err) => console.warn(`[SmallAgent] run ${runId} failed to start: ${err?.message}`));
  });
}

export async function smallAgentRoutes(fastify: FastifyInstance) {
  const ownerOnly = { config: { access: 'owner' as const } };

  fastify.post<{ Body: { task?: unknown; tools?: unknown; drawers?: unknown; max_steps?: unknown; kind?: unknown; read_dir?: unknown } }>(
    '/api/small-agent/runs', ownerOnly, async (request, reply) => {
      const user = owner(request, reply);
      if (!user) return reply;
      const body = (request.body && typeof request.body === 'object' ? request.body : {}) as Record<string, unknown>;
      try {
        const res = await spawnSmallAgentRun({
          ownerId: user.id, task: body.task, tools: body.tools, drawers: body.drawers, maxSteps: body.max_steps, kind: body.kind, readDir: body.read_dir,
        });
        logAudit({
          event_type: 'data.create', event_category: 'data_modification', severity: 'info',
          user_id: user.id, ip_address: request.ip, user_agent: request.headers['user-agent'],
          request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
          resource_type: 'task_run', resource_id: res.run.id, action: 'small_agent.spawn', success: true,
          metadata: { kind: res.kind, tools: res.grantedTools, drawers: res.drawers.map(drawerId), maxSteps: res.run.max_steps, warnings: res.warnings.length, readDir: res.readRoot !== null },
        });
        start(res.run.id);
        return reply.code(201).send({
          run_id: res.run.id,
          status: res.run.status,
          kind: res.kind,
          granted_tools: res.grantedTools,
          drawers: res.drawers.map(drawerId),
          read_dir: res.readRoot,
          budget: { max_steps: res.run.max_steps, max_duration_ms: res.run.max_duration_ms },
          model: res.model,
          warnings: res.warnings,
          capacity: res.capacity,
        });
      } catch (err: any) {
        if (err instanceof SmallAgentCapacityError) return reply.code(429).send({ error: err.message, capacity: err.capacity });
        if (err instanceof SmallAgentInputError) return reply.code(400).send({ error: err.message });
        throw err;
      }
    });

  fastify.get<{ Querystring: { status?: string; limit?: string } }>('/api/small-agent/runs', ownerOnly, async (request, reply) => {
    const user = owner(request, reply);
    if (!user) return reply;
    const { status, limit } = request.query ?? {};
    if (status !== undefined && !STATUSES.has(status)) return reply.code(400).send({ error: 'Invalid status' });
    return { runs: await listSmallAgentRuns({ status, limit: Number(limit) || undefined }), capacity: await smallAgentCapacity() };
  });

  fastify.get<{ Params: { id: string } }>('/api/small-agent/runs/:id', ownerOnly, async (request, reply) => {
    const user = owner(request, reply);
    if (!user) return reply;
    if (!ID.test(request.params.id)) return reply.code(400).send({ error: 'Invalid id' });
    const card = await smallAgentCard(request.params.id);
    if (!card) return reply.code(404).send({ error: 'Run not found' });
    return { card };
  });
}
