/**
 * FIRSTRUN-01 setup steps after the owner account (owner only).
 *
 *   GET  /api/first-run              -> { pending, step }
 *   PUT  /api/first-run              -> { step: 'tools' | 'model' | 'team' }
 *   GET  /api/first-run/tools        -> { tools: [{ id, name, installed, signedIn, install, signIn, needs? }] }
 *   GET  /api/first-run/local-model  -> { memoryGb, recommended, choices, ollama, installed, install, download, commands }
 *   POST /api/first-run/finish       -> { conversationId } (the Welcome chat)
 *
 * The commands are fixed strings for the owner to run in Girru's terminal; this
 * route never runs anything.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authorizeActiveRole } from '../../auth/route-guards.js';
import { handleError } from '../error-handler.js';
import { FIRST_RUN_STEPS, aiTools, finishFirstRun, firstRunState, localModelCommand, localModelStep, saveFirstRunStep, type FirstRunStep } from '../../onboarding/first-run.js';

const owner = (request: FastifyRequest, reply: FastifyReply) => authorizeActiveRole(request, reply, ['owner'] as const);

export async function firstRunRoutes(fastify: FastifyInstance) {
  fastify.get('/api/first-run', async (request, reply) => {
    const userId = owner(request, reply); if (userId === null) return reply;
    try { return await firstRunState(userId); } catch (error) { return handleError(reply, error, 'internal', '[FirstRun]'); }
  });

  fastify.put('/api/first-run', async (request, reply) => {
    const userId = owner(request, reply); if (userId === null) return reply;
    const body = request.body as { step?: unknown } | null;
    if (!body || typeof body !== 'object' || Object.keys(body).some(k => k !== 'step') || !(FIRST_RUN_STEPS as readonly unknown[]).includes(body.step)) return reply.code(400).send({ error: 'step must be tools, model or team' });
    try { return await saveFirstRunStep(userId, body.step as FirstRunStep); } catch (error) { return handleError(reply, error, 'internal', '[FirstRun]'); }
  });

  fastify.get('/api/first-run/tools', async (request, reply) => {
    const userId = owner(request, reply); if (userId === null) return reply;
    try { return { tools: await aiTools() }; } catch (error) { return handleError(reply, error, 'internal', '[FirstRun]'); }
  });

  fastify.get('/api/first-run/local-model', async (request, reply) => {
    const userId = owner(request, reply); if (userId === null) return reply;
    try {
      const step = await localModelStep();
      return { ...step, commands: Object.fromEntries(step.choices.map(c => [c.id, localModelCommand(step, c.id)])) };
    } catch (error) { return handleError(reply, error, 'internal', '[FirstRun]'); }
  });

  fastify.post('/api/first-run/finish', async (request, reply) => {
    const userId = owner(request, reply); if (userId === null) return reply;
    try { return await finishFirstRun(userId); } catch (error) { return handleError(reply, error, 'internal', '[FirstRun]'); }
  });
}
