-- Migration 155: one task file per project (TASKLOG-01)
--
-- .girru/tasks.md in a chat project's folder holds the project's open tasks in
-- a fixed format; every agent and coding app reads and writes it. The board
-- shows each task as a card on its department board.
-- task_file_cards: the card a task of the file became.
--   task_no   the task's number in the file (T-7)
--   block     the task as Girru last read or wrote it (JSON), so a change in
--             the file can be told from a change on the board
--   problem   why the task's block could not be read (line and reason), or NULL
--   finished  1 = the task moved to .girru/tasks-done.md
-- agent_rule_files.tasks: the task file is on (1, the default once the
--   project's files are written) or off; task_problems: lines of the file that
--   are not in the format and belong to no card yet (JSON list).
-- Date: 2026-10-29

CREATE TABLE IF NOT EXISTS task_file_cards (
  card_id TEXT PRIMARY KEY REFERENCES board_cards(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES chat_projects(id) ON DELETE CASCADE,
  task_no TEXT NOT NULL,
  block TEXT NOT NULL DEFAULT '{}',
  problem TEXT,
  finished INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, task_no)
);

ALTER TABLE agent_rule_files ADD COLUMN tasks INTEGER NOT NULL DEFAULT 1;
ALTER TABLE agent_rule_files ADD COLUMN task_problems TEXT NOT NULL DEFAULT '[]';
