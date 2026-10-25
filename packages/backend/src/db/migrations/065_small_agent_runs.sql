-- Migration 065: small-agent runs (MCP-01, D-HYBRID)
-- A large agent (Claude Code / Codex, through the Dpro Bot MCP server)
-- can hand a light task to the small local agent (Ollama Qwen). Each such
-- task is an ordinary durable task run (064); this table keeps what the run
-- was allowed when it was created: the tools (requested ∩ safe set ∩ the
-- small agent's own grants, never exec-class or approval-gated tools) and
-- the memory drawers (requested ∩ what an owner turn may open). The run
-- executor reads these on every attempt and never widens them.
-- No task text here (it stays encrypted in task_runs.input_encrypted).
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS small_agent_runs (
  run_id TEXT PRIMARY KEY REFERENCES task_runs(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other'
    CHECK (kind IN ('lookup', 'summary', 'classification', 'draft', 'other')),
  requested_tools TEXT NOT NULL DEFAULT '[]',
  granted_tools TEXT NOT NULL DEFAULT '[]',
  drawers TEXT NOT NULL DEFAULT '[]',
  model TEXT NOT NULL,
  warnings TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_small_agent_runs_created ON small_agent_runs(created_at);
