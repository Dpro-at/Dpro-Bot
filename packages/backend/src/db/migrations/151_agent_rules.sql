-- Migration 151: rules the owner's agents follow (RULES-01, Agents › Rules)
--
-- One sentence each, in the owner's words. Two choices make a rule:
--   project_id  NULL = everywhere, else one chat project
--   who         all | departments | agents; targets = JSON list of department
--               names (lowercase) or agent ids
-- status: active (on or paused), suggested (an agent proposed it; waits for the
-- owner), dismissed, deleted (kept for Undo). Every edit keeps the earlier text
-- in agent_rule_versions so it can be put back.
-- Date: 2026-10-29

CREATE TABLE IF NOT EXISTS agent_rules (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  project_id TEXT REFERENCES chat_projects(id) ON DELETE CASCADE,
  who TEXT NOT NULL DEFAULT 'all',
  targets TEXT NOT NULL DEFAULT '[]',
  paused INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'owner',
  suggested_by TEXT,
  reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_rules_status ON agent_rules(status, project_id);

CREATE TABLE IF NOT EXISTS agent_rule_versions (
  rule_id TEXT NOT NULL REFERENCES agent_rules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  text TEXT NOT NULL,
  project_id TEXT,
  who TEXT NOT NULL,
  targets TEXT NOT NULL,
  paused INTEGER NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rule_id, version)
);
