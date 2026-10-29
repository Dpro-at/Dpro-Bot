-- Migration 152: a rule that applies only in a case (RULES-02, Agents › Rules "When …")
--
-- condition: one short line in the owner's words ("the task changes a screen");
-- NULL = the rule always applies. Earlier versions keep it too.
-- Date: 2026-10-29

ALTER TABLE agent_rules ADD COLUMN condition TEXT;
ALTER TABLE agent_rule_versions ADD COLUMN condition TEXT;
