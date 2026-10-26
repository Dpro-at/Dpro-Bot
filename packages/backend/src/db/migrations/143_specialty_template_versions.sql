-- SP2: earlier versions of a specialty. A row is written when a save replaces
-- a revision; the live revision stays in specialty_templates. Instructions are
-- content-addressed files, so content_hash keeps the old text readable.
CREATE TABLE IF NOT EXISTS specialty_template_versions (
 template_id TEXT NOT NULL REFERENCES specialty_templates(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 name TEXT NOT NULL,
 department TEXT NOT NULL,
 description TEXT NOT NULL,
 content_hash TEXT NOT NULL,
 config_json TEXT NOT NULL,
 replaced_at TEXT NOT NULL,
 PRIMARY KEY(template_id, revision)
);
