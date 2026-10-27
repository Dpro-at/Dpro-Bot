/**
 * Swagger/OpenAPI Configuration
 * API Documentation setup for Fastify
 */

import type { FastifyInstance } from 'fastify';
import { schemas } from './schemas.js';

/**
 * Register Swagger documentation
 */
export async function registerSwagger(fastify: FastifyInstance): Promise<void> {
  // Import swagger plugins
  const swagger = await import('@fastify/swagger');
  const swaggerUi = await import('@fastify/swagger-ui');

  // Register schemas (always: route schemas may reference them)
  for (const [name, schema] of Object.entries(schemas)) {
    fastify.addSchema({ $id: name, ...schema });
  }

  // SECURITY (S0-A.9): the OpenAPI spec and Swagger UI publish the complete
  // route map, so they exist only in development.
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Register Swagger
  await fastify.register(swagger.default, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Girru API',
        description: `
## Overview

Girru Backend API provides a comprehensive set of endpoints for managing AI agents,
browser automation, webhooks, security auditing, and more.

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Rate Limiting

API requests are rate-limited to 100 requests per minute per IP address.

## Error Handling

All errors follow a consistent format:
\`\`\`json
{
  "error": "Error message description",
  "code": "ERROR_CODE"
}
\`\`\`

## Versioning

Current API version: v1 (implicit in all routes)
        `,
        version: '0.1.0',
        contact: {
          name: 'Girru Support',
          email: 'support@agentplayer.dev',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 64001}`,
          description: 'Development server',
        },
        {
          url: 'https://api.agentplayer.dev',
          description: 'Production server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Multi-Agent', description: 'Multi-agent orchestration system' },
        { name: 'Agents', description: 'Agent management' },
        { name: 'Teams', description: 'Team management' },
        { name: 'Tasks', description: 'Task management' },
        { name: 'Messages', description: 'Inter-agent messaging' },
        { name: 'Browser', description: 'Browser automation' },
        { name: 'Sessions', description: 'Browser session management' },
        { name: 'Webhooks', description: 'Webhook management' },
        { name: 'Audit', description: 'Security audit logs' },
        { name: 'Heartbeat', description: 'Health monitoring' },
        { name: 'Encryption', description: 'Credential vault' },
        { name: 'Sandbox', description: 'Code execution sandbox' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT authentication token',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for service-to-service auth',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi.default, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      syntaxHighlight: {
        theme: 'monokai',
      },
      tryItOutEnabled: true,
    },
    uiHooks: {
      onRequest: function (_request, _reply, next) {
        next();
      },
      preHandler: function (_request, _reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, _request, _reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  console.log('[Swagger] Documentation available at /docs');
}

/**
 * Common route schemas for reuse
 */
export const routeSchemas = {
  // Common path parameters
  idParam: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Resource ID' },
    },
    required: ['id'],
  },

  // Common query parameters
  paginationQuery: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
  },

  // Common responses
  notFoundResponse: {
    description: 'Resource not found',
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Resource not found' },
    },
  },

  badRequestResponse: {
    description: 'Bad request',
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Missing required fields' },
    },
  },

  unauthorizedResponse: {
    description: 'Unauthorized',
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Authentication required' },
    },
  },

  successResponse: {
    description: 'Operation successful',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
    },
  },
};

/**
 * Helper to create route options with schema
 */
export function createRouteSchema(options: {
  tags: string[];
  summary: string;
  description?: string;
  params?: object;
  querystring?: object;
  body?: object;
  response?: Record<number, object>;
  security?: Array<Record<string, string[]>>;
}) {
  return {
    schema: {
      tags: options.tags,
      summary: options.summary,
      description: options.description,
      params: options.params,
      querystring: options.querystring,
      body: options.body,
      response: options.response,
      security: options.security,
    },
  };
}
