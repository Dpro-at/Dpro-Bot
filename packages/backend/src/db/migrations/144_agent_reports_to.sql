-- Migration 144: who an agent reports to (AGENTS-ORG-01, org chart)
--
-- agents_config.reports_to  the agent this one reports to (agents_config.id),
--                           or NULL: Dpro places it (under the manager of its
--                           department, else under the main agent).
-- Removing an agent moves the agents under it up to its own manager (done by
-- the repository in the same transaction); the column has no FK so a stale
-- value is simply ignored when the chart is drawn.
-- The version trigger (067/076) also watches reports_to, so a stale chart
-- editor sees the change.
-- Date: 2026-10-26

ALTER TABLE agents_config ADD COLUMN reports_to TEXT;

DROP TRIGGER IF EXISTS trg_agents_config_version;

CREATE TRIGGER IF NOT EXISTS trg_agents_config_version
AFTER UPDATE OF name, description, emoji, system_prompt, model, provider, temperature, max_tokens, capabilities, is_primary, role, department, reports_to
ON agents_config
WHEN NEW.version = OLD.version
BEGIN
  UPDATE agents_config SET version = OLD.version + 1 WHERE id = NEW.id;
END;
