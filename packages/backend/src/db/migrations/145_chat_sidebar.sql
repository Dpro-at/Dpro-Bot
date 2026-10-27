-- Migration 145: chat sidebar (CHAT-BUILD-01 stage 2)
--
-- chat_sessions.archived_at  when the owner archived the chat (NULL = not archived).
--                            An archived chat leaves the sidebar sections and stays
--                            searchable; it opens and continues like any chat.
-- chat_sessions.parent_id    the chat an agent opened this one from (NULL = a chat
--                            of its own). No FK: a deleted parent leaves the child
--                            as an ordinary chat.
-- Date: 2026-10-27

ALTER TABLE chat_sessions ADD COLUMN archived_at TEXT;
ALTER TABLE chat_sessions ADD COLUMN parent_id TEXT;
