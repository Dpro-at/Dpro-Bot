/**
 * Slack API Routes - Pure JavaScript
 * Mounted at /api/ext/slack/
 */

import { registerRawBodyParsers, verifySlackRequest } from '../../shared/webhook-verify.js';

export async function registerSlackRoutes(fastify) {
  // Keep the raw body: /webhook verifies Slack's signature over it.
  registerRawBodyParsers(fastify);

  /**
   * POST /api/ext/slack/send - Send message to Slack channel
   */
  fastify.post('/send', {
    schema: {
      tags: ['Slack'],
      description: 'Send message to Slack channel',
      body: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          text: { type: 'string' },
          thread_ts: { type: 'string' },
        },
        required: ['channel', 'text'],
      },
    },
  }, async (request, reply) => {
    const { channel, text, thread_ts } = request.body;
    const db = fastify.db || request.server.db;

    try {
      // TODO: Implement Slack Web API logic
      // const config = db.prepare('SELECT * FROM slack_config WHERE id = 1').get();
      // const response = await fetch('https://slack.com/api/chat.postMessage', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${config.bot_token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ channel, text, thread_ts }),
      // });

      // For now, just store in database
      const messageId = `slack_${Date.now()}`;
      db.prepare(`
        INSERT INTO slack_messages (id, channel_id, content, user_id, username, timestamp, thread_ts, direction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        channel,
        text,
        'bot',
        'Dpro Bot Bot',
        new Date().toISOString(),
        thread_ts || null,
        'outgoing'
      );

      console.log(`[Slack] ✅ Message sent to channel ${channel}`);

      return {
        success: true,
        messageId,
        note: 'Slack bot not connected - message logged to database',
      };
    } catch (error) {
      console.error('[Slack] ❌ Send failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * POST /api/ext/slack/webhook - Receive Slack events
   */
  fastify.post('/webhook', {
    schema: {
      tags: ['Slack'],
      description: 'Receive Slack events and messages',
    },
  }, async (request, reply) => {
    const event = request.body;
    const db = fastify.db || request.server.db;

    // SECURITY (S0-Q.18): public route — only requests signed with the
    // configured Slack signing secret (5-minute replay window) are accepted.
    // No secret configured → every request is refused.
    let signingSecret = null;
    try {
      signingSecret = db.prepare('SELECT signing_secret FROM slack_config WHERE id = 1').get()?.signing_secret || null;
    } catch {
      signingSecret = null;
    }
    if (!verifySlackRequest(request, signingSecret)) {
      return reply.status(401).send({ error: 'Invalid Slack signature' });
    }

    try {
      // Handle URL verification challenge
      if (event.type === 'url_verification') {
        return { challenge: event.challenge };
      }

      // Handle message event
      if (event.event?.type === 'message' && !event.event.bot_id) {
        db.prepare(`
          INSERT INTO slack_messages (id, channel_id, content, user_id, timestamp, thread_ts, direction)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          event.event.ts || `msg_${Date.now()}`,
          event.event.channel,
          event.event.text,
          event.event.user,
          event.event.ts,
          event.event.thread_ts || null,
          'incoming'
        );

        console.log(`[Slack] ✅ Message received from user ${event.event.user}`);
      }

      return { ok: true };
    } catch (error) {
      console.error('[Slack] ❌ Webhook failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * GET /api/ext/slack/messages - Get recent messages
   */
  fastify.get('/messages', {
    schema: {
      tags: ['Slack'],
      description: 'Get recent Slack messages',
      querystring: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          limit: { type: 'number', default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { channel, limit } = request.query;
    const db = fastify.db || request.server.db;

    let query = `
      SELECT * FROM slack_messages
      ${channel ? 'WHERE channel_id = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const messages = channel
      ? db.prepare(query).all(channel, limit || 50)
      : db.prepare(query).all(limit || 50);

    return { messages };
  });

  /**
   * GET /api/ext/slack/status - Get bot status
   */
  fastify.get('/status', {
    schema: {
      tags: ['Slack'],
      description: 'Get Slack bot connection status',
    },
  }, async (request, reply) => {
    const db = fastify.db || request.server.db;

    // Get config
    const config = db.prepare('SELECT * FROM slack_config WHERE id = 1').get();

    // Count messages
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
      FROM slack_messages
    `).get();

    return {
      configured: config?.bot_token ? true : false,
      connected: false, // TODO: Check actual Slack connection
      stats: {
        totalMessages: stats.total || 0,
        incoming: stats.incoming || 0,
        outgoing: stats.outgoing || 0,
      },
    };
  });

  /**
   * PUT /api/ext/slack/config - Update Slack configuration
   */
  fastify.put('/config', {
    schema: {
      tags: ['Slack'],
      description: 'Update Slack bot configuration',
      body: {
        type: 'object',
        properties: {
          bot_token: { type: 'string' },
          signing_secret: { type: 'string' },
          app_token: { type: 'string' },
          allowed_channels: { type: 'array', items: { type: 'string' } },
          webhook_url: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { bot_token, signing_secret, app_token, allowed_channels, webhook_url } = request.body;
    const db = fastify.db || request.server.db;

    db.prepare(`
      INSERT OR REPLACE INTO slack_config (id, bot_token, signing_secret, app_token, allowed_channels, webhook_url, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      bot_token || null,
      signing_secret || null,
      app_token || null,
      allowed_channels ? JSON.stringify(allowed_channels) : null,
      webhook_url || null
    );

    console.log('[Slack] ✅ Configuration updated');

    return { success: true };
  });

  console.log('[Slack Routes] ✅ Registered');
}
