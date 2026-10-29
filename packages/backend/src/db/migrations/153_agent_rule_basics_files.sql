-- Migration 153: Girru basics and coding app files (RULES-03, Agents › Rules)
--
-- agent_rule_basics: the owner's pause per built-in rule (the rules themselves
--   live in Girru's code; safety rules can never be paused).
-- agent_rule_files: per chat project, whether Girru writes the coding apps'
--   files (.girru/rules.md, the @ line in CLAUDE.md and GEMINI.md, the rules
--   part of AGENTS.md) and whether they stay private (Git exclude) or go with
--   the project.
-- Date: 2026-10-29

CREATE TABLE IF NOT EXISTS agent_rule_basics (
  id TEXT PRIMARY KEY,
  paused INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_rule_files (
  project_id TEXT PRIMARY KEY REFERENCES chat_projects(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'private',
  written_at TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
