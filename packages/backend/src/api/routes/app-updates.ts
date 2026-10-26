import type { FastifyInstance } from 'fastify';
import { updateCheck } from '../../maintenance/update-check.js';

type Check = Pick<typeof updateCheck, 'read' | 'check'>;

/**
 * Settings › About and updates (owner only: the `/api/system` prefix is an
 * owner route in the auth gate). GET reads local git only; POST …/check is
 * the one network look (`git fetch`), made only when the owner asks.
 */
export function appUpdateRoutes(check: Check = updateCheck) {
  return async function routes(fastify: FastifyInstance) {
    fastify.get('/api/system/updates', async (request, reply) => {
      if (Object.keys(request.query as object).length) return reply.code(400).send({ error: 'No options', code: 'invalid_request' });
      reply.header('Cache-Control', 'no-store');
      return check.read();
    });
    fastify.post('/api/system/updates/check', async (request, reply) => {
      if (Object.keys(request.query as object).length || (request.body !== undefined && request.body !== null && (typeof request.body !== 'object' || Object.keys(request.body as object).length))) return reply.code(400).send({ error: 'No options', code: 'invalid_request' });
      reply.header('Cache-Control', 'no-store');
      return await check.check();
    });
  };
}
