-- Migration 154: Girru's own rules are normal rules (RULES-04, one simple list)
--
-- The rules Girru ships become rows in agent_rules (source 'girru'), first in
-- the everywhere list. shipped_key names the rule in Girru's code;
-- shipped_version is the text version last seeded, so an update can improve a
-- rule the owner never edited. Safety rules are locked in code.
-- agent_rule_basics (RULES-03 pauses) is read once to carry the pauses over.
-- Date: 2026-10-29

ALTER TABLE agent_rules ADD COLUMN shipped_key TEXT;
ALTER TABLE agent_rules ADD COLUMN shipped_version INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_rules_shipped ON agent_rules(shipped_key);
