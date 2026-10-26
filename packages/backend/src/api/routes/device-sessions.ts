import type { FastifyInstance } from 'fastify';
import { verifyRequestTokenAsync, verifyToken, AuthTokenError } from '../../auth/jwt.js';
import { listSessions, revokeSession } from '../../auth/sessions.js';
import { logAuthEvent } from '../../services/audit-logger.js';

/**
 * Settings › Account › Signed in: the account's own devices, and signing out
 * one of them (the current one too). Only the caller's own sessions; ids are
 * random row ids, never token parts. POST /api/auth/logout still ends every
 * device at once.
 */
export async function deviceSessionRoutes(fastify: FastifyInstance) {
  const caller = async (request: Parameters<typeof verifyRequestTokenAsync>[0]) => {
    if (request.actor && request.actor.kind !== 'user') throw new AuthTokenError('Unauthorized: Human account required');
    const { userId } = await verifyRequestTokenAsync(request);
    const jti = verifyToken(request.headers.authorization!.slice(7)).jti;
    return { userId, jti };
  };
  fastify.get('/api/auth/sessions', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (Object.keys(request.query as object).length) return reply.code(400).send({ error: 'No options', code: 'invalid_request' });
    try {
      const { userId, jti } = await caller(request);
      return { sessions: await listSessions(userId, jti) };
    } catch (error) {
      if (error instanceof AuthTokenError) return reply.code(401).send({ error: 'Unauthorized', code: 'unauthenticated' });
      throw error;
    }
  });
  fastify.post<{ Params: { id: string } }>('/api/auth/sessions/:id/sign-out', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (Object.keys(request.query as object).length || (request.body !== undefined && request.body !== null && (typeof request.body !== 'object' || Object.keys(request.body as object).length))) return reply.code(400).send({ error: 'No options', code: 'invalid_request' });
    try {
      const { userId } = await caller(request);
      if (!(await revokeSession(userId, request.params.id))) return reply.code(404).send({ error: 'No such device', code: 'not_found' });
      logAuthEvent('auth.logout', request, userId, undefined, true);
      return { success: true };
    } catch (error) {
      if (error instanceof AuthTokenError) return reply.code(401).send({ error: 'Unauthorized', code: 'unauthenticated' });
      throw error;
    }
  });
}
