-- Migration 156: board_task_update for the agents that already have the board tools (TASKLOG-01)
--
-- Grants are stored per agent, so a new default tool reaches only new agents.
-- board_task_update works like board_comment and board_move: only on the
-- agent's own cards (its task in the project's task file). Every agent that
-- may move its cards gets it too; the owner can take it away like any grant.
-- Date: 2026-10-29

INSERT OR IGNORE INTO agent_tool_grants (agent_id, tool_name, scopes, granted_by)
SELECT agent_id, 'board_task_update', NULL, 'system:migration-156' FROM agent_tool_grants WHERE tool_name = 'board_move';
