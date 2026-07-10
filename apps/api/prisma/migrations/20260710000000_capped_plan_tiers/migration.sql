-- Capped-tier pricing: per-plan quota columns on `plans`.
-- These are the single source of truth for entitlement limits (monitored songs,
-- roster artists, competitor stations) and the analytics history look-back window.
-- Defaults are 0 (locked) for the quota caps so that any pre-existing row degrades
-- to a locked/free state until re-seeded with real caps; history defaults to 30 days.

ALTER TABLE "plans" ADD COLUMN "max_monitored_songs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN "max_roster_artists" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN "max_competitor_stations" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN "max_history_days" INTEGER NOT NULL DEFAULT 30;
