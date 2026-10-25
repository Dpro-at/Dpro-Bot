# SEO Extension for Dpro Bot

Professional SEO suite for Dpro Bot with keyword tracking, SERP scraping, Google Search Console integration, competitor analysis, and AI-powered insights.

## Features

### Core Features
- **Keyword Tracking**: Monitor keyword rankings across 100+ positions
- **9 SERP Scrapers**: Automatic fallback between Serper, SerpAPI, ValueSERP, SearchAPI, Serply, ScrapingAnt, ScrapingRobot, SpaceSERP, HasData
- **Google Search Console**: Full OAuth integration for GSC analytics
- **Competitor Analysis**: Track and compare with competitor rankings
- **AI-Powered Research**: Keyword research using Claude/GPT/Gemini
- **WordPress Publishing**: Auto-publish content to WordPress sites
- **Real-time Notifications**: Ranking change alerts in Avatar Viewer

### AI Tools
When enabled, the following tools become available to all AI agents:

- `seo_track_keyword` - Add keywords to tracking
- `seo_analyze_serp` - Analyze SERP results with AI
- `seo_research_keywords` - Generate keyword ideas
- `seo_competitor_analysis` - Compare with competitors
- `seo_get_stats` - Show SEO dashboard (with Avatar UI)
- `seo_show_rankings` - Display ranking history charts

## Installation

1. **Enable Extension**
   - Go to `/dashboard/extensions`
   - Find "SEO Keyword Tracker & Analytics"
   - Click "Enable"
   - Backend will auto-restart

2. **Configure API Keys**
   - Go to `/dashboard/credentials`
   - Add at least one SERP scraper API key:
     - `serper-api-key` (recommended - get free key at https://serper.dev)
     - `serpapi-api-key` (alternative - https://serpapi.com)
     - `valueserp-api-key` (alternative - https://valueserp.com)
     - ... and 6 more scrapers available

3. **Create First Domain**
   - Go to `/dashboard/seo`
   - Click "Add Domain"
   - Enter your domain name (e.g., `example.com`)
   - Configure settings (language, target country)

4. **Track Keywords**
   - Go to `/dashboard/seo/keywords`
   - Click "Add Keyword"
   - Enter keyword, select device/country
   - Click "Scrape Now" to get initial ranking

## Google Search Console Setup

1. **Get Google OAuth Credentials**
   - Go to https://console.cloud.google.com
   - Create a new project (or select existing)
   - Enable "Google Search Console API"
   - Create OAuth 2.0 credentials (Web Application)
   - Add authorized redirect URI: `http://localhost:41522/api/ext/seo/oauth/google/callback`
   - Copy Client ID and Client Secret

2. **Configure Environment**
   - Add to `packages/backend/.env`:
     ```
     GOOGLE_CLIENT_ID=your_client_id_here
     GOOGLE_CLIENT_SECRET=your_client_secret_here
     BACKEND_URL=http://localhost:41522
     ```

3. **Connect Google Account**
   - Go to `/dashboard/seo/settings`
   - Click "Connect Google Search Console"
   - Complete OAuth flow
   - Select domain to sync

4. **Sync Analytics**
   - Go to `/dashboard/seo/analytics`
   - Click "Sync Now"
   - View clicks, impressions, CTR, positions

## Using SEO Agent

### Create SEO Agent
1. Go to `/dashboard/agent`
2. Click "Create Agent"
3. Name: "SEO Manager" (or any name)
4. Model: Claude Sonnet 4.5 (recommended)
5. System Prompt: "You are an SEO expert. Help users track keywords, analyze rankings, and improve search visibility."
6. Enable Cron: Yes
7. Cron Schedule: `0 2 * * *` (2 AM daily)
8. Save agent

### Assign Tasks to SEO Agent
1. Go to `/dashboard/tasks`
2. Create task: "Scrape all keywords for example.com"
3. Assign to: SEO Manager
4. Agent will auto-execute on next cron run

### Chat with SEO Agent
1. Go to `/avatar-viewer` or main chat
2. Ask: "Track keyword 'best CRM software' for example.com"
3. Agent uses `seo_track_keyword` tool
4. Ask: "Show me my SEO stats"
5. Stats appear on Avatar screen (JSON Render UI)

## Scraper Fallback System

The extension uses a smart fallback system:

1. **Primary Scraper**: Set in `/dashboard/seo/settings`
2. **Fallback Chain**: Automatically tries next scraper if primary fails
3. **Credential Check**: Skips scrapers with missing API keys
4. **Error Logging**: All failures logged for debugging

**Example flow:**
- User sets Primary: Serper
- Serper fails (rate limit)
- Auto-switches to SerpAPI
- SerpAPI succeeds
- Result returned to user

## WordPress Publishing

1. **Setup WordPress Credentials**
   - Go to WordPress site → Users → Application Passwords
   - Create new application password
   - Go to `/dashboard/credentials`
   - Add credential: `wordpress-{domain_id}`
   - Value: `username:password`

2. **Publish Content**
   - Go to `/dashboard/seo/settings`
   - Configure WordPress URL
   - Use AI agent: "Publish article about [keyword] to WordPress"

## Notifications

Ranking change notifications automatically appear in Avatar Viewer:

- **Green** - Keyword moved up ≥3 positions
- **Yellow** - Keyword dropped ≥5 positions
- **Red** - Keyword fell out of top 100
- **Blue** - New high-value keyword entered top 10

Configure notification settings in `/dashboard/seo/settings`

## API Endpoints

All endpoints under `/api/ext/seo/*`:

- `GET /domains` - List domains
- `POST /domains` - Create domain
- `GET /keywords` - List keywords
- `POST /keywords` - Add keyword
- `POST /scrape/:id` - Scrape keyword
- `POST /scrape-all` - Scrape all keywords
- `GET /jobs` - List scraper jobs
- `GET /gsc/analytics` - Get GSC analytics
- `POST /gsc/sync/:domain_id` - Sync GSC
- `POST /research` - AI keyword research
- `POST /competitors/analyze` - Competitor analysis
- `GET /settings` - Get settings
- `PUT /settings` - Update settings

## Database Tables

- `seo_domains` - SEO projects
- `seo_keywords` - Tracked keywords
- `seo_scraper_jobs` - Scraping queue
- `seo_search_analytics` - GSC data
- `seo_gsc_sync_log` - Sync history
- `seo_settings` - User settings

## Troubleshooting

### "No API key configured"
- Go to `/dashboard/credentials`
- Add at least one scraper API key (e.g., `serper-api-key`)

### "All scrapers failed"
- Check API keys are valid
- Verify you have available quota
- Check extension logs in terminal

### "OAuth redirect mismatch"
- Ensure `BACKEND_URL` in `.env` matches your backend URL
- Add exact redirect URI to Google Cloud Console

### Keywords not updating
- Check agent cron is enabled
- Verify agent has tasks assigned
- Check scraper job queue: `/api/ext/seo/jobs`

## Performance Notes

- **Scraping Speed**: ~3-5 seconds per keyword (network dependent)
- **Batch Scraping**: 100 keywords with 1s delay = ~2 minutes
- **GSC Sync**: ~30 seconds per domain (1000 rows)
- **Daily Quota**: Depends on scraper API limits

## Support

For issues or feature requests, visit the Dpro Bot repository or check the extension logs in the terminal.

## License

Same as Dpro Bot (MIT)
