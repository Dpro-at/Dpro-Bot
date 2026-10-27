-- Migration 148: undo what an agent changed (CHAT-BUILD-01 stage 5, CH10)
--
-- A reply in a project folder that is a git repository keeps two snapshots
-- of the folder (git trees, never commits): before the reply and after it.
-- "Undo these changes" puts the changed files back to the first; Redo to the
-- second. Files outside git's view (.gitignore) are not part of a snapshot.
--   checkpoint_folder  the folder the snapshots are of
--   checkpoint_before  tree before the reply
--   checkpoint_after   tree after the reply
--   checkpoint_undone  1 after Undo, 0 after Redo
--   checkpoint_files   how many files the reply changed
-- Date: 2026-10-27

ALTER TABLE chat_messages ADD COLUMN checkpoint_folder TEXT;
ALTER TABLE chat_messages ADD COLUMN checkpoint_before TEXT;
ALTER TABLE chat_messages ADD COLUMN checkpoint_after TEXT;
ALTER TABLE chat_messages ADD COLUMN checkpoint_undone INTEGER;
ALTER TABLE chat_messages ADD COLUMN checkpoint_files INTEGER;
