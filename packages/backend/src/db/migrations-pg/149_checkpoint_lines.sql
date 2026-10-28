-- Migration 149: lines a reply added and removed (CHAT-GAPS-01, CH2 "Changed files" row: +N −N)
-- Date: 2026-10-28

ALTER TABLE chat_messages ADD COLUMN checkpoint_added bigint;

ALTER TABLE chat_messages ADD COLUMN checkpoint_removed bigint;
