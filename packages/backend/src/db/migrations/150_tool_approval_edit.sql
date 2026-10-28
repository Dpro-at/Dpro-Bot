-- Migration 150: the owner changed a waiting hand-off's task before Allow once (CH6 "Change the task…")
--   edited_at  when the owner last replaced the request (params_hash/params_salt were made again over the new text)
--   edited_by  the owner who changed it
-- Date: 2026-10-28

ALTER TABLE tool_approvals ADD COLUMN edited_at TEXT;
ALTER TABLE tool_approvals ADD COLUMN edited_by TEXT;
