-- Migration 146: chat composer and projects (CHAT-BUILD-01 stage 3)
--
-- chat_projects.extra_folders  more folders of a project besides its main one:
--                              JSON [{ "path": "/abs", "write": false }]. Read only by
--                              default; "write": true lets coding apps change files there.
-- chat_sessions.mode           how freely the team works in this chat: auto (the agent's
--                              own rules) | ask | accept_edits | plan. Never looser than
--                              the agent's permissions.
-- chat_sessions.thinking       quick | normal | deep (models that can think longer).
-- chat_sessions.queued         messages waiting to be sent after the running reply,
--                              JSON [{ "key": "...", "text": "..." }] (kept across reloads).
-- Project variables are stored encrypted in the credential store, never here.
-- Date: 2026-10-27

ALTER TABLE chat_projects ADD COLUMN extra_folders TEXT;
ALTER TABLE chat_sessions ADD COLUMN mode TEXT;
ALTER TABLE chat_sessions ADD COLUMN thinking TEXT;
ALTER TABLE chat_sessions ADD COLUMN queued TEXT;
