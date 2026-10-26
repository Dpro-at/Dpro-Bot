-- Settings › Account › Signed in: one row per sign-in (the token's random id is kept only as a hash).
-- Signing out one device sets revoked_at; the auth check then refuses that token.
CREATE TABLE IF NOT EXISTS auth_sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE,
 token_version INTEGER NOT NULL,
 label TEXT NOT NULL,
 created_at BIGINT NOT NULL,
 last_seen_at BIGINT NOT NULL,
 expires_at BIGINT NOT NULL,
 revoked_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, last_seen_at);
