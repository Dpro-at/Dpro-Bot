/**
 * SEO Extension for Girru
 *
 * Professional SEO suite with keyword tracking, SERP scraping, Google Search Console,
 * competitor analysis, AI-powered insights, and WordPress publishing.
 *
 * Features:
 * - 9 SERP scrapers with automatic fallback
 * - Google OAuth for Search Console integration
 * - AI-powered keyword research and analysis
 * - Competitor tracking and comparison
 * - WordPress content publishing
 * - Real-time ranking notifications
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'seo',
  name: 'SEO Keyword Tracker & Analytics',
  version: '1.0.0',

  /**
   * Register extension on startup
   */
  async register(api) {
    try {
      // 1. Run database migrations
      api.log('info', '[SEO] Running database migrations...');
      await api.runMigrations([
        join(__dirname, 'migrations', '001_seo_core.sql'),
        join(__dirname, 'migrations', '002_search_console.sql'),
        join(__dirname, 'migrations', '003_settings.sql'),
      ]);

      // 2. Register API routes
      api.log('info', '[SEO] Registering API routes...');
      const { registerSeoRoutes } = await import('./src/routes.js');
      api.registerRoutes(registerSeoRoutes);

      // Register OAuth routes
      const { registerOAuthRoutes } = await import('./src/oauth.js');
      api.registerRoutes(registerOAuthRoutes);

      // 3. Register AI tools
      api.log('info', '[SEO] Registering AI tools...');
      const { seoTools } = await import('./src/tools.js');
      for (const tool of seoTools) {
        api.registerTool(tool);
      }

      api.log('info', `[SEO] Extension loaded successfully - ${seoTools.length} tools registered`);
    } catch (error) {
      api.log('error', `[SEO] Failed to initialize extension: ${error.message}`);
      throw error;
    }
  },

  /**
   * Cleanup when extension is disabled
   */
  async onDisable(api) {
    // Unregister all SEO tools
    const toolNames = [
      'seo_track_keyword',
      'seo_analyze_serp',
      'seo_research_keywords',
      'seo_competitor_analysis',
      'seo_get_stats',
      'seo_show_rankings',
    ];

    for (const toolName of toolNames) {
      try {
        api.unregisterTool(toolName);
      } catch (error) {
        api.log('warn', `[SEO] Failed to unregister tool ${toolName}: ${error.message}`);
      }
    }

    api.log('info', '[SEO] Extension disabled');
  },
};
