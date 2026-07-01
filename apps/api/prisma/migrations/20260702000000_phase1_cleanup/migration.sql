-- Phase 1 rebuild cleanup (see REBUILD_PLAN.md):
-- report consolidation, play-quality flags, dead-surface removal, integrity guards.

-- 1. Weekly report preference lives on user_settings (single source of notification prefs)
ALTER TABLE "user_settings" ADD COLUMN "weekly_report_enabled" BOOLEAN NOT NULL DEFAULT true;

-- 2. Preserve any digest opt-outs from the legacy users columns, then drop them
INSERT INTO "user_settings" ("user_id", "daily_report_enabled", "weekly_report_enabled", "updated_at")
SELECT u."id", u."daily_digest_enabled", u."weekly_digest_enabled", now()
FROM "users" u
WHERE u."daily_digest_enabled" = false OR u."weekly_digest_enabled" = false
ON CONFLICT ("user_id") DO UPDATE SET
  "daily_report_enabled"  = "user_settings"."daily_report_enabled"  AND EXCLUDED."daily_report_enabled",
  "weekly_report_enabled" = "user_settings"."weekly_report_enabled" AND EXCLUDED."weekly_report_enabled",
  "updated_at" = now();

ALTER TABLE "users" DROP COLUMN "daily_digest_enabled";
ALTER TABLE "users" DROP COLUMN "weekly_digest_enabled";

-- 3. daily_reports carries both daily and weekly rows now
ALTER TABLE "daily_reports" ADD COLUMN "report_type" TEXT NOT NULL DEFAULT 'daily';
DROP INDEX "daily_reports_user_id_report_date_key";
CREATE UNIQUE INDEX "daily_reports_user_id_report_date_report_type_key"
  ON "daily_reports"("user_id", "report_date", "report_type");

-- 4. airplay_events: partial-play flag (played < 30s teasers) + cached artwork
ALTER TABLE "airplay_events" ADD COLUMN "partial_play" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "airplay_events" ADD COLUMN "artwork_url" TEXT;

-- 5. monitored_songs: expiry was never written nor read
ALTER TABLE "monitored_songs" DROP COLUMN "expires_at";

-- 6. invitations: canonical status casing (code always used 'PENDING')
ALTER TABLE "invitations" ALTER COLUMN "status" SET DEFAULT 'PENDING';
UPDATE "invitations" SET "status" = 'PENDING' WHERE "status" = 'pending';

-- 7. Role integrity guards (typo'd roles used to fall back to admin UI on mobile)
ALTER TABLE "users" ADD CONSTRAINT "users_role_check"
  CHECK ("role" IN ('ADMIN','ARTIST','LABEL','STATION'));
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_check"
  CHECK ("role" IN ('ADMIN','ARTIST','LABEL','STATION'));

-- 8. Password reset tokens (forgot-password flow)
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Drop dead product surface: curation ("Tinder for songs") and the never-used audio_snippets
DELETE FROM "features" WHERE "key" LIKE 'curation.%';
DROP TABLE IF EXISTS "curation_votes";
DROP TABLE IF EXISTS "curation_scores";
DROP TABLE IF EXISTS "curation_songs";
DROP TABLE IF EXISTS "audio_snippets";
