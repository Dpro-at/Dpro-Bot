import {LibraryError} from '../../services/personality-library.js';
/**
 * Agent Configurations API
 * CRUD for named agent profiles (name, system prompt, model, capabilities)
 *
 * Names (CORE-02): a new agent without a name gets a random name in the
 * onboarding language; every name used at creation or rename is reserved
 * company-wide for good (used_agent_names), so it never repeats, even after
 * the agent is deleted. POST /api/agents/name-suggestion (owner/admin)
 * returns a suggestion without reserving it.
 *
 * B1.6: data access and scope go through the agents repository
 * (repositories/agents-config.ts): members read, owner/admin write, the
 * reserved small local agent is owner-only. The owner/admin pre-check here
 * stays as defence in depth and keeps 401/403 before 400.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { repositories } from '../../repositories/index.js';
import { ScopeError, actorOrReply, requireAdmin, requireMember } from '../../repositories/scope.js';
import type { Actor } from '../../repositories/actor.js';
import {
  AgentConfigConflictError,
  AgentConfigError,
  AgentConfigInputError,
  type AgentConfigInput,
  type AgentConfigRow,
} from '../../repositories/agents-config.js';
import { SECRET_PLACEHOLDER } from '../../credentials/secret-mask.js';
import { AgentNameInputError, AgentNameTakenError } from '../../services/agent-names.js';
import { etag } from '../concurrency.js';
import { isoUtc } from '../timestamps.js';

const agents = () => repositories.agents;

/** Map scope, naming and agent errors to the usual replies; anything else is rethrown. */
function errorReply(err: unknown, reply: FastifyReply): FastifyReply | null {
  if(err instanceof LibraryError)return reply.status(err.status).send({code:err.status===409?'version_conflict':'invalid_personality',error:'Personality selection changed or is unavailable'});
  if (err instanceof ScopeError) {
    return reply.status(err.status).send(err.code === 'reserved_agent' ? { error: err.message, code: err.code } : { error: err.message });
  }
  if (err instanceof AgentNameTakenError) return reply.status(409).send({ error: err.message, code: 'name_taken' });
  if (err instanceof AgentNameInputError) return reply.status(400).send({ error: err.message });
  if (err instanceof AgentConfigInputError) return reply.status(400).send(err.code ? { error: err.message, code: err.code } : { error: err.message });
  if (err instanceof AgentConfigError) return reply.status(err.status).send({ error: err.message });
  if (err instanceof AgentConfigConflictError) {
    return reply.status(409).header('ETag', etag(err.current.version)).send({
      error: err.message,
      code: 'version_conflict',
      currentVersion: err.current.version,
      agent: parseAgent(err.current),
    });
  }
  return null;
}

/** Request actor through a scope rule (defence in depth), else 401/403 sent and null. */
const member = (req: FastifyRequest, reply: FastifyReply): Actor | null => actorOrReply(reply, actorOf(req), requireMember);
const admin = (req: FastifyRequest, reply: FastifyReply): Actor | null => actorOrReply(reply, actorOf(req), requireAdmin);

function parseAgent(row: AgentConfigRow) {
  // SECURITY (S1.1): the key lives in the encrypted credentials store; the
  // response only says whether one is set. The legacy column is never returned.
  const { api_key: _legacy, api_key_credential_id: _ref, ...rest } = row;
  const apiKeySet = !!row.api_key_credential_id || !!(row.api_key && row.api_key.trim());
  return {
    ...rest,
    // BE-UI-01: ISO-8601 UTC with Z; `version` is the optimistic-concurrency token.
    created_at: isoUtc(row.created_at),
    updated_at: isoUtc(row.updated_at),
    version: row.version ?? 1,
    isPrimary: row.is_primary === 1,
    capabilities: (() => { try { return JSON.parse(row.capabilities); } catch { return {}; } })(),
    apiKeySet,
    api_key: apiKeySet ? SECRET_PLACEHOLDER : '',
  };
}

export async function agentsConfigRoutes(fastify: FastifyInstance) {
  // POST /api/agents/name-suggestion — random unused name in the onboarding language (not reserved)
  fastify.post<{ Body: { language?: unknown; exclude?: unknown } }>(
    '/api/agents/name-suggestion', { config: { access: 'admin' } }, async (req, reply) => {
      const actor = admin(req, reply);
      if (!actor) return reply;
      try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        return reply.send(await agents().suggestName(actor, body));
      } catch (err) {
        const handled = errorReply(err, reply);
        if (handled) return handled;
        fastify.log.error({ err }, '[AgentsConfig] Name suggestion error');
        return reply.status(500).send({ error: 'Failed to suggest a name' });
      }
    });

  // GET /api/agents — list all agents
  fastify.get('/api/agents', async (req, reply) => {
    const actor = member(req, reply);
    if (!actor) return reply;
    try {
      const rows = await agents().listConfigs(actor);
      return reply.send({ agents: rows.map(parseAgent) });
    } catch (err: any) {
      const handled = errorReply(err, reply);
      if (handled) return handled;
      fastify.log.error('[AgentsConfig] List error:', err);
      return reply.status(500).send({ error: 'Failed to load agents' });
    }
  });

  // GET /api/agents/:id — get single agent
  fastify.get<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    const actor = member(req, reply);
    if (!actor) return reply;
    try {
      const row = await agents().getConfig(actor, req.params.id);
      if (!row) return reply.status(404).send({ error: 'Agent not found' });
      return reply.header('ETag', etag(row.version ?? 1)).send({ agent: parseAgent(row) });
    } catch (err: any) {
      const handled = errorReply(err, reply);
      if (handled) return handled;
      return reply.status(500).send({ error: 'Failed to load agent' });
    }
  });

  // POST /api/agents — create agent (CORE-02: no name -> random name, reserved with the insert)
  fastify.post<{ Body: AgentConfigInput }>('/api/agents', async (req, reply) => {
    const actor = admin(req, reply);
    if (!actor) return reply;
    try {
      const row = await agents().createConfig(actor, req.body || {});
      return reply.status(201).send({ agent: parseAgent(row) });
    } catch (err: any) {
      const handled = errorReply(err, reply);
      if (handled) return handled;
      fastify.log.error('[AgentsConfig] Create error:', err);
      return reply.status(500).send({ error: 'Failed to create agent' });
    }
  });

  // PUT /api/agents/:id — update agent (partial body; optimistic concurrency, BE-UI-01)
  //   body: any subset of { name, description, emoji, system_prompt, model, provider,
  //         temperature, max_tokens, capabilities, api_key, role, department }
  //   + optional expectedVersion or header If-Match: "<version>". Only the fields
  //   sent are written. role: main | manager | specialist | evaluator | null;
  //   department: <= 64 chars, stored lowercase, or null (400 code invalid_role).
  //   A role change never changes the personality (CORE-01d).
  //   409 { code: 'version_conflict', currentVersion, agent } when the version moved on.
  fastify.put<{ Params: { id: string }; Body: unknown }>('/api/agents/:id', async (req, reply) => {
    const actor = admin(req, reply);
    if (!actor) return reply;
    try {
      const updated = await agents().updateConfig(actor, req.params.id, req.body, req.headers['if-match']);
      return reply.header('ETag', etag(updated.version)).send({ agent: parseAgent(updated) });
    } catch (err: any) {
      const handled = errorReply(err, reply);
      if (handled) return handled;
      fastify.log.error('[AgentsConfig] Update error:', err);
      return reply.status(500).send({ error: 'Failed to update agent' });
    }
  });

  // POST /api/agents/:id/set-primary — make this agent the primary one
  fastify.post<{ Params: { id: string } }>('/api/agents/:id/set-primary', async (req, reply) => {
    const actor = admin(req, reply);
    if (!actor) return reply;
    try {
      await agents().setPrimary(actor, req.params.id);
      return reply.send({ success: true });
    } catch (err: any) {
      const handled = errorReply(err, reply);
      if (handled) return handled;
      return reply.status(500).send({ error: 'Failed to set primary agent' });
    }
  });

  // POST /api/agents/:id/duplicate — clone an agent (the copy gets its own new name)
  fastify.post<{ Params: { id: string } }>('/api/agents/:id/duplicate', async (req, reply) => {
    const actor = admin(req, reply);
    if (!actor) return reply;
    try {
      const row = await agents().duplicateConfig(actor, req.params.id);
      return reply.status(201).send({ agent: parseAgent(row) });
    } catch (err: any) {
      const handled = errorReply(err, reply);
      if (handled) return handled;
      return reply.status(500).send({ error: 'Failed to duplicate agent' });
    }
  });

  // DELETE /api/agents/:id — delete agent (cannot delete primary if others exist)
  fastify.delete<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    const actor = admin(req, reply);
    if (!actor) return reply;
    try {
      await agents().deleteConfig(actor, req.params.id);
      return reply.send({ success: true });
    } catch (err: any) {
      const handled = errorReply(err, reply);
      if (handled) return handled;
      return reply.status(500).send({ error: 'Failed to delete agent' });
    }
  });
}
