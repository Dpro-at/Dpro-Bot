/**
 * WAF Security API Routes - Pure JavaScript
 * All routes mounted at /api/ext/waf/
 */

import {
  detectWAF,
  testPayload,
  generateBypassVariants,
  selfAudit,
  getPayloadCategories,
  getPayloads,
  getPayloadsFromDatabase,
  getPayloadCategoriesFromDatabase,
} from './engine.js';
import { WafRateLimiter } from './rate-limiter.js';
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  runCampaign,
  deleteCampaign,
} from './campaign-service.js';
import { calculateSecurityScore, generateRecommendations } from './scoring.js';
import { randomUUID } from 'crypto';

/**
 * Extract user ID from JWT token
 * @throws {Error} if token is missing or invalid
 */
function getUserIdFromRequest(request) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No authorization token provided');
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.userId || payload.sub;

    if (!userId) {
      throw new Error('Unauthorized: Invalid token payload');
    }

    return userId;
  } catch (err) {
    throw new Error('Unauthorized: Invalid token format');
  }
}

/**
 * Validate scan request parameters
 * @throws {Error} if validation fails
 */
function validateScanRequest(body) {
  const { url, mode, categories } = body;

  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: must be a non-empty string');
  }

  if (!url.match(/^https?:\/\/.+/)) {
    throw new Error('Invalid URL: must start with http:// or https://');
  }

  if (mode && !['quick', 'full'].includes(mode)) {
    throw new Error('Invalid mode: must be "quick" or "full"');
  }

  if (categories && !Array.isArray(categories)) {
    throw new Error('Invalid categories: must be an array');
  }

  return {
    url,
    mode: mode || 'quick',
    categories: categories || []
  };
}

export async function registerWafRoutes(fastify) {
  // Initialize rate limiter
  const db = fastify.db || fastify.getDatabase();
  const rateLimiter = new WafRateLimiter(db);

  /**
   * GET /api/ext/waf/payloads - List all payload categories
   */
  fastify.get('/payloads', {
    schema: {
      tags: ['WAF Security'],
      description: 'List all attack payload categories',
    },
  }, async (request, reply) => {
    const categories = getPayloadCategories(db); // Load from database
    return { categories };
  });

  /**
   * POST /api/ext/waf/detect - Detect WAF on target URL
   */
  fastify.post('/detect', {
    schema: {
      tags: ['WAF Security'],
      description: 'Detect WAF presence and type',
      body: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        },
        required: ['url'],
      },
    },
  }, async (request, reply) => {
    const { url } = request.body;

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return reply.status(400).send({ error: 'Invalid URL' });
    }

    const detection = await detectWAF(url);
    return detection;
  });

  /**
   * POST /api/ext/waf/scan - Start a full WAF scan
   */
  fastify.post('/scan', {
    schema: {
      tags: ['WAF Security'],
      description: 'Start full WAF penetration test',
      body: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          categories: { type: 'array', items: { type: 'string' } },
          mode: { type: 'string', enum: ['quick', 'full'] },
        },
        required: ['url'],
      },
    },
  }, async (request, reply) => {
    try {
      // Authentication
      const userId = getUserIdFromRequest(request);

      // Validation
      const validated = validateScanRequest(request.body);
      const { url, categories, mode } = validated;

      // Rate limiting
      await rateLimiter.checkLimit(userId);

      const scanId = randomUUID();
      const db = fastify.db || request.server.db;

      // Create scan record with user_id
      db.prepare(`
        INSERT INTO waf_scans (id, target_url, scan_type, status, started_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(scanId, url, url.includes('localhost') ? 'self' : 'external', 'running', new Date().toISOString(), userId);

      // Run scan in background
      runScanAsync(scanId, url, categories, mode, db, userId).catch(err => {
        console.error('[WAF Scan] Error:', err);
        db.prepare('UPDATE waf_scans SET status = ?, ended_at = ? WHERE id = ?')
          .run('failed', new Date().toISOString(), scanId);
        rateLimiter.releaseScan(userId);
      });

      return { scanId, status: 'started' };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : err.message.includes('Rate limit') ? 429 : 400)
        .send({ error: err.message });
    }
  });

  /**
   * GET /api/ext/waf/scan/:id - Get scan results
   */
  fastify.get('/scan/:id', {
    schema: {
      tags: ['WAF Security'],
      description: 'Get scan results by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Authentication
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;
      const db = fastify.db || request.server.db;

      // Check ownership
      const scan = db.prepare('SELECT * FROM waf_scans WHERE id = ? AND user_id = ?').get(id, userId);

      if (!scan) {
        return reply.status(404).send({ error: 'Scan not found' });
      }

      // Parse results JSON
      if (scan.results_json) {
        scan.results = JSON.parse(scan.results_json);
        delete scan.results_json;
      }

      return scan;
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 500)
        .send({ error: err.message });
    }
  });

  /**
   * GET /api/ext/waf/scans - List all scans
   */
  fastify.get('/scans', {
    schema: {
      tags: ['WAF Security'],
      description: 'List all WAF scans',
    },
  }, async (request, reply) => {
    try {
      // Authentication
      const userId = getUserIdFromRequest(request);
      const db = fastify.db || request.server.db;

      // Filter by user_id
      const scans = db.prepare(`
        SELECT id, target_url, scan_type, waf_detected, waf_type, waf_confidence,
               total_payloads, blocked_count, passed_count, bypass_rate,
               risk_level, status, started_at, ended_at, created_at
        FROM waf_scans
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(userId);

      return { scans };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 500)
        .send({ error: err.message });
    }
  });

  /**
   * DELETE /api/ext/waf/scans/:id - Delete a scan
   */
  fastify.delete('/scans/:id', {
    schema: {
      tags: ['WAF Security'],
      description: 'Delete a scan record',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Authentication
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;
      const db = fastify.db || request.server.db;

      // Check ownership and delete
      const result = db.prepare('DELETE FROM waf_scans WHERE id = ? AND user_id = ?').run(id, userId);

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Scan not found' });
      }

      return { success: true };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 500)
        .send({ error: err.message });
    }
  });

  /**
   * POST /api/ext/waf/self - Run self-audit
   */
  fastify.post('/self', {
    schema: {
      tags: ['WAF Security'],
      description: 'Self-audit Girru backend security',
    },
  }, async (request, reply) => {
    const backendUrl = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;
    const audit = await selfAudit(backendUrl);

    return audit;
  });

  // ============================================================================
  // CAMPAIGN ROUTES - Professional security testing campaigns
  // ============================================================================

  /**
   * POST /api/ext/waf/campaigns - Create new campaign
   */
  fastify.post('/campaigns', {
    schema: {
      tags: ['WAF Campaigns'],
      description: 'Create a new security testing campaign',
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          targetDomain: { type: 'string' },
          scanMode: { type: 'string', enum: ['quick', 'full'] },
          categories: { type: 'array', items: { type: 'string' } },
          scheduleEnabled: { type: 'boolean' },
          scheduleFrequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          scheduleTime: { type: 'string' },
          scheduleDayOfWeek: { type: 'integer' },
          scheduleDayOfMonth: { type: 'integer' },
        },
        required: ['name', 'targetDomain'],
      },
    },
  }, async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const campaign = createCampaign(db, userId, request.body);
      return campaign;
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 400)
        .send({ error: err.message });
    }
  });

  /**
   * GET /api/ext/waf/campaigns - List all campaigns
   */
  fastify.get('/campaigns', {
    schema: {
      tags: ['WAF Campaigns'],
      description: 'List all campaigns for current user',
    },
  }, async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const campaigns = listCampaigns(db, userId);
      return { campaigns };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 500)
        .send({ error: err.message });
    }
  });

  /**
   * GET /api/ext/waf/campaigns/:id - Get campaign details
   */
  fastify.get('/campaigns/:id', {
    schema: {
      tags: ['WAF Campaigns'],
      description: 'Get campaign details with run history',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;

      const campaign = getCampaign(db, id);

      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      // Check ownership
      if (campaign.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Get campaign scans
      const scans = db.prepare(`
        SELECT * FROM waf_campaign_scans
        WHERE campaign_id = ?
        ORDER BY run_number DESC, stage ASC
      `).all(id);

      // Get comparisons
      const comparisons = db.prepare(`
        SELECT * FROM waf_campaign_comparisons
        WHERE campaign_id = ?
        ORDER BY created_at DESC
      `).all(id);

      return {
        ...campaign,
        scans,
        comparisons,
      };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 500)
        .send({ error: err.message });
    }
  });

  /**
   * POST /api/ext/waf/campaigns/:id/run - Run campaign
   */
  fastify.post('/campaigns/:id/run', {
    schema: {
      tags: ['WAF Campaigns'],
      description: 'Execute a campaign (4-stage scan)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;

      const campaign = getCampaign(db, id);

      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      // Check ownership
      if (campaign.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Run campaign in background
      runCampaign(db, id).catch(err => {
        console.error('[Campaign Run] Error:', err);
      });

      return {
        campaignId: id,
        status: 'started',
        message: 'Campaign execution started',
      };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 400)
        .send({ error: err.message });
    }
  });

  /**
   * DELETE /api/ext/waf/campaigns/:id - Delete campaign
   */
  fastify.delete('/campaigns/:id', {
    schema: {
      tags: ['WAF Campaigns'],
      description: 'Delete a campaign',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;

      const campaign = getCampaign(db, id);

      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      // Check ownership
      if (campaign.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      deleteCampaign(db, id);

      return { success: true };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 500)
        .send({ error: err.message });
    }
  });

  /**
   * GET /api/ext/waf/campaigns/:id/score - Get detailed security score
   */
  fastify.get('/campaigns/:id/score', {
    schema: {
      tags: ['WAF Campaigns'],
      description: 'Get detailed security score and recommendations',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;

      const campaign = getCampaign(db, id);

      if (!campaign) {
        return reply.status(404).send({ error: 'Campaign not found' });
      }

      // Check ownership
      if (campaign.user_id !== userId) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Get latest verification stage scan
      const latestScan = db.prepare(`
        SELECT cs.*, s.results_json
        FROM waf_campaign_scans cs
        INNER JOIN waf_scans s ON cs.scan_id = s.id
        WHERE cs.campaign_id = ? AND cs.stage = 4
        ORDER BY cs.run_number DESC
        LIMIT 1
      `).get(id);

      if (!latestScan || !latestScan.results_json) {
        return reply.status(404).send({ error: 'No completed scans found' });
      }

      // Parse results
      const scanResults = JSON.parse(latestScan.results_json);

      // Calculate score and recommendations
      const score = calculateSecurityScore(scanResults);
      const recommendations = generateRecommendations(scanResults, score);

      return {
        score,
        recommendations,
        scanId: latestScan.scan_id,
        runNumber: latestScan.run_number,
      };
    } catch (err) {
      return reply.status(err.message.includes('Unauthorized') ? 401 : 500)
        .send({ error: err.message });
    }
  });

  console.log('[WAF Routes] ✅ Registered (8 scan routes + 6 campaign routes)');
}

/**
 * Run scan asynchronously in background
 */
async function runScanAsync(scanId, url, categories, mode, db, userId) {
  const rateLimiter = new WafRateLimiter(db);
  const results = {
    detection: null,
    tests: [],
  };

  // Step 1: Detect WAF
  const detection = await detectWAF(url);
  results.detection = detection;

  // Step 2: Test payloads (from database)
  const categoriesToTest = categories || getPayloadCategories(db).map(c => c.id);
  const selectedCategories = mode === 'quick' ? categoriesToTest.slice(0, 2) : categoriesToTest;

  for (const category of selectedCategories) {
    // Load payloads from database (returns payload objects)
    const payloadObjects = getPayloadsFromDatabase(db, category, true);
    const payloadsToTest = mode === 'quick' ? payloadObjects.slice(0, 3) : payloadObjects;

    for (const payloadObj of payloadsToTest) {
      const testResult = await testPayload(url, payloadObj.payload, category);
      // Add additional metadata from database
      testResult.severity = payloadObj.severity;
      testResult.description = payloadObj.description;
      testResult.evasionTechnique = payloadObj.evasion_technique;
      results.tests.push(testResult);

      // Brief delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Step 3: Calculate metrics
  const totalPayloads = results.tests.length;
  const blockedCount = results.tests.filter(t => t.blocked).length;
  const passedCount = totalPayloads - blockedCount;
  const bypassRate = totalPayloads > 0 ? (passedCount / totalPayloads) * 100 : 0;

  // Determine risk level
  let riskLevel = 'low';
  if (bypassRate > 50) riskLevel = 'critical';
  else if (bypassRate > 30) riskLevel = 'high';
  else if (bypassRate > 10) riskLevel = 'medium';

  // Update scan record
  db.prepare(`
    UPDATE waf_scans SET
      waf_detected = ?,
      waf_type = ?,
      waf_confidence = ?,
      total_payloads = ?,
      blocked_count = ?,
      passed_count = ?,
      bypass_rate = ?,
      risk_level = ?,
      results_json = ?,
      status = ?,
      ended_at = ?
    WHERE id = ?
  `).run(
    detection.detected ? 1 : 0,
    detection.type,
    detection.confidence,
    totalPayloads,
    blockedCount,
    passedCount,
    bypassRate,
    riskLevel,
    JSON.stringify(results),
    'completed',
    new Date().toISOString(),
    scanId
  );

  // Release rate limit slot
  if (userId) {
    await rateLimiter.releaseScan(userId);
  }

  console.log(`[WAF Scan] ✅ Completed: ${scanId}`);
}
