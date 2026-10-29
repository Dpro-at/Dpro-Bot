-- Migration 157: the full task page (TASKPAGE-02)
--
-- board_card_people     people of the workspace on a card, with what they do on it
-- board_card_agents.role what an agent does on it (asked, does, checks, tests)
-- board_card_checklist  an item may belong to a person or an agent and have a due date
-- board_cards           parent_card_id (a sub-task's card), release_name (the release it goes in)
-- board_card_links      "waits for": a card that has to be done first
-- board_card_followers  people who follow a card
-- board_card_chats      every chat that worked on a card (the one it came from stays in conversation_id)
-- board_card_events     the task page's small lines that board_card_activity has no kind for
--                       (people, agents, labels, release, links, sub-tasks)
-- Date: 2026-10-29

CREATE TABLE IF NOT EXISTS board_card_people (
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'does' CHECK (role IN ('asked', 'does', 'checks', 'tests')),
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (card_id, user_id)
);

ALTER TABLE board_card_agents ADD COLUMN role TEXT NOT NULL DEFAULT 'does';

ALTER TABLE board_card_checklist ADD COLUMN owner_kind TEXT;
ALTER TABLE board_card_checklist ADD COLUMN owner_id TEXT;
ALTER TABLE board_card_checklist ADD COLUMN due_date TEXT;

ALTER TABLE board_cards ADD COLUMN parent_card_id TEXT;
ALTER TABLE board_cards ADD COLUMN release_name TEXT;
CREATE INDEX IF NOT EXISTS idx_board_cards_parent ON board_cards (parent_card_id);

CREATE TABLE IF NOT EXISTS board_card_links (
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  waits_for TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (card_id, waits_for)
);

CREATE TABLE IF NOT EXISTS board_card_followers (
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE TABLE IF NOT EXISTS board_card_chats (
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (card_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS board_card_events (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES board_cards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_board_card_events_card ON board_card_events (card_id, created_at);
