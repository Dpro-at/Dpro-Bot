-- Migration 149: lines a reply added and removed (CHAT-GAPS-01, CH2 "Changed files" row: +N −N)
--   checkpoint_added    lines added in the project folder by the reply
--   checkpoint_removed  lines removed by the reply
-- Date: 2026-10-28

ALTER TABLE chat_messages ADD COLUMN checkpoint_added INTEGER;
ALTER TABLE chat_messages ADD COLUMN checkpoint_removed INTEGER;
