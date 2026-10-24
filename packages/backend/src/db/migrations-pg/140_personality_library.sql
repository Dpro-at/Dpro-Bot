CREATE TABLE personality_library (
 id TEXT PRIMARY KEY,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 profile_json TEXT NOT NULL,
 archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1))
);
CREATE TABLE personality_library_versions (
 personality_id TEXT NOT NULL REFERENCES personality_library(id),
 revision INTEGER NOT NULL,
 profile_json TEXT NOT NULL,
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(personality_id, revision)
);
CREATE TABLE agent_personality_links (
 agent_id TEXT PRIMARY KEY REFERENCES agents_config(id) ON DELETE CASCADE,
 personality_id TEXT NOT NULL REFERENCES personality_library(id),
 revision INTEGER NOT NULL,
 profile_json TEXT NOT NULL,
 applied_version INTEGER NOT NULL,
 linked INTEGER NOT NULL CHECK(linked IN (0,1))
);
CREATE INDEX idx_personality_library_links ON agent_personality_links(personality_id);
CREATE TABLE personality_exam_runs (
 id TEXT PRIMARY KEY,
 personality_id TEXT NOT NULL REFERENCES personality_library(id),
 revision INTEGER NOT NULL,
 profile_json TEXT NOT NULL,
 answers_json TEXT NOT NULL,
 ratings_json TEXT NOT NULL,
 score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE agent_personality_profile_versions (
 agent_id TEXT NOT NULL REFERENCES agents_config(id) ON DELETE CASCADE,
 version INTEGER NOT NULL,
 profile_json TEXT,
 PRIMARY KEY(agent_id,version)
);
ALTER TABLE team_hire_batch_items ADD COLUMN library_personality TEXT;
