CREATE TABLE team_delegation_results (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  coordinator_id TEXT NOT NULL REFERENCES agents_config(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents_config(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('started','answered','waiting_approval','failed')),
  result_encrypted TEXT,
  result_iv TEXT,
  result_tag TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_team_results_scope ON team_delegation_results(owner_id,session_id,coordinator_id,created_at);
