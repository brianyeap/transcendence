-- ============================================================================
-- Migration 0004: Give each room its own name
-- ----------------------------------------------------------------------------
-- The lobby card shows a title and, under it, "by <creator>". Until now the
-- title was built from the creator's username ("sbf_ftx's Room"), so the card
-- said the same name twice.
--
-- The Create Match modal already has a "Room Name" field, so we store what the
-- creator types here. The column is nullable: when it is empty the API falls
-- back to "<creator>'s Room", which keeps every room already in the table
-- looking exactly the way it does today.
--
-- Safe to run more than once.
-- ============================================================================

alter table matches
  add column if not exists name text;
