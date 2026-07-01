-- Identity foundation (Phase 2): Organization / Membership / Artist /
-- ArtistClaim / OrgEntity + User.email_verified + Subscription.organization_id
-- + email_verification_codes, with a pure-SQL backfill.
--
-- Compat-preserving: nothing is dropped; users.role, user_scopes,
-- monitored_songs and label_artists remain the operational sources until P6.
--
-- Name normalization decision: no migration in this repo ever ran
-- CREATE EXTENSION (checked 00000000000000_initial_schema and all later
-- ones), so `unaccent` cannot be assumed. Normalization is therefore done
-- with translate() over the Romanian diacritics (both the correct
-- comma-below forms ăâîșțĂÂÎȘȚ and the legacy cedilla forms şţŞŢ), then
-- lower(), whitespace collapse and trim. The TypeScript twin of this
-- expression lives in src/lib/artist-name.ts (normalizeArtistName) and is
-- the canonical implementation going forward (it additionally strips
-- non-Romanian diacritics via NFKD — a superset of what this backfill needs
-- for the Romanian-locale data).

-- ─── 1. New columns on existing tables ──────────────────────────────

-- users.email_verified: new self-serve signups start unverified; every user
-- that already exists predates email verification, so backfill TRUE for all
-- current rows (the column default keeps future rows FALSE).
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
UPDATE "users" SET "email_verified" = true;

-- subscriptions.organization_id: nullable during the transition.
ALTER TABLE "subscriptions" ADD COLUMN "organization_id" INTEGER;

-- ─── 2. New tables ──────────────────────────────────────────────────

CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "memberships_organization_id_user_id_key"
    ON "memberships"("organization_id", "user_id");
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

CREATE TABLE "artists" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "artists_name_normalized_key" ON "artists"("name_normalized");

CREATE TABLE "artist_claims" (
    "id" SERIAL NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "requested_by_id" INTEGER NOT NULL,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decided_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "artist_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "artist_claims_status_idx" ON "artist_claims"("status");

CREATE TABLE "org_entities" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "entity_type" TEXT NOT NULL,
    "artist_id" INTEGER,
    "station_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_entities_pkey" PRIMARY KEY ("id")
);

-- Shortened name: the Prisma-default identifier would exceed Postgres'
-- 63-char limit; matches @@unique(..., map:) in schema.prisma.
CREATE UNIQUE INDEX "org_entities_org_type_artist_station_key"
    ON "org_entities"("organization_id", "entity_type", "artist_id", "station_id");
CREATE INDEX "org_entities_artist_id_idx" ON "org_entities"("artist_id");
CREATE INDEX "org_entities_station_id_idx" ON "org_entities"("station_id");

CREATE TABLE "email_verification_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_verification_codes_user_id_idx"
    ON "email_verification_codes"("user_id");

-- ─── 3. Foreign keys ────────────────────────────────────────────────

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artist_claims" ADD CONSTRAINT "artist_claims_artist_id_fkey"
    FOREIGN KEY ("artist_id") REFERENCES "artists"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_entities" ADD CONSTRAINT "org_entities_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_entities" ADD CONSTRAINT "org_entities_artist_id_fkey"
    FOREIGN KEY ("artist_id") REFERENCES "artists"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_entities" ADD CONSTRAINT "org_entities_station_id_fkey"
    FOREIGN KEY ("station_id") REFERENCES "stations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "subscriptions_organization_id_idx"
    ON "subscriptions"("organization_id");

ALTER TABLE "email_verification_codes"
    ADD CONSTRAINT "email_verification_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 4. Backfill (pure SQL) ─────────────────────────────────────────
--
-- Mapping trick: organizations are created 1:1 from users, and later steps
-- need the org<->user pairing. INSERT ... SELECT cannot RETURNING source
-- columns, so a temporary mapping column is added to organizations and
-- dropped at the end of this migration.

ALTER TABLE "organizations" ADD COLUMN "backfill_user_id" INTEGER;

-- 4.1 One organization per active non-ADMIN user + OWNER membership.
INSERT INTO "organizations" ("name", "type", "backfill_user_id", "updated_at")
SELECT
    u."name",
    CASE u."role"
        WHEN 'ARTIST'  THEN 'ARTIST_TEAM'
        WHEN 'LABEL'   THEN 'LABEL'
        WHEN 'STATION' THEN 'STATION_GROUP'
        ELSE 'AGENCY'
    END,
    u."id",
    CURRENT_TIMESTAMP
FROM "users" u
WHERE u."is_active" = true AND u."role" <> 'ADMIN';

INSERT INTO "memberships" ("organization_id", "user_id", "role")
SELECT o."id", o."backfill_user_id", 'OWNER'
FROM "organizations" o
WHERE o."backfill_user_id" IS NOT NULL;

-- 4.2 Point each subscription at its user's 1:1 organization.
UPDATE "subscriptions" s
SET "organization_id" = o."id"
FROM "organizations" o
WHERE o."backfill_user_id" = s."user_id";

-- 4.3 Canonical artists: distinct artist names from ARTIST users'
-- monitored_songs, merged (on the normalized name) with the names in
-- LABEL users' label_artists rosters.
--
-- Collisions on name_normalized: DISTINCT ON keeps one display name per
-- normalized value inside this statement (deterministic: alphabetically
-- first), and ON CONFLICT DO NOTHING guards against pre-existing rows;
-- later steps re-join on name_normalized, so they always reuse whichever
-- row won.
INSERT INTO "artists" ("name", "name_normalized", "updated_at")
SELECT c."name", c."norm", CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON (n."norm") n."name", n."norm"
    FROM (
        SELECT
            src."name",
            trim(regexp_replace(
                lower(translate(src."name", 'ăâîșțĂÂÎȘȚşţŞŢ', 'aaistAAISTstST')),
                '\s+', ' ', 'g'
            )) AS "norm"
        FROM (
            SELECT ms."artist_name" AS "name"
            FROM "monitored_songs" ms
            JOIN "users" u
              ON u."id" = ms."user_id"
             AND u."role" = 'ARTIST'
             AND u."is_active" = true
            UNION
            SELECT la."artist_name"
            FROM "label_artists" la
            JOIN "users" u
              ON u."id" = la."label_user_id"
             AND u."role" = 'LABEL'
             AND u."is_active" = true
        ) src
    ) n
    WHERE n."norm" <> ''
    ORDER BY n."norm", n."name"
) c
ON CONFLICT ("name_normalized") DO NOTHING;

-- 4.4 OrgEntity ARTIST (self): each ARTIST user's org is linked to the
-- canonical artists matching their monitored songs' artist names.
INSERT INTO "org_entities" ("organization_id", "entity_type", "artist_id")
SELECT DISTINCT o."id", 'ARTIST', a."id"
FROM "organizations" o
JOIN "users" u ON u."id" = o."backfill_user_id" AND u."role" = 'ARTIST'
JOIN "monitored_songs" ms ON ms."user_id" = u."id"
JOIN "artists" a
  ON a."name_normalized" = trim(regexp_replace(
         lower(translate(ms."artist_name", 'ăâîșțĂÂÎȘȚşţŞŢ', 'aaistAAISTstST')),
         '\s+', ' ', 'g'
     ));

-- 4.5 OrgEntity ARTIST (roster): each LABEL user's org is linked to the
-- canonical artists matching its label_artists roster.
INSERT INTO "org_entities" ("organization_id", "entity_type", "artist_id")
SELECT DISTINCT o."id", 'ARTIST', a."id"
FROM "organizations" o
JOIN "users" u ON u."id" = o."backfill_user_id" AND u."role" = 'LABEL'
JOIN "label_artists" la ON la."label_user_id" = u."id"
JOIN "artists" a
  ON a."name_normalized" = trim(regexp_replace(
         lower(translate(la."artist_name", 'ăâîșțĂÂÎȘȚşţŞŢ', 'aaistAAISTstST')),
         '\s+', ' ', 'g'
     ));

-- 4.6 OrgEntity STATION: STATION users' scopes become station links.
-- The join on stations guarantees FK validity (skips dangling scope ids).
INSERT INTO "org_entities" ("organization_id", "entity_type", "station_id")
SELECT DISTINCT o."id", 'STATION', us."entity_id"
FROM "organizations" o
JOIN "users" u ON u."id" = o."backfill_user_id" AND u."role" = 'STATION'
JOIN "user_scopes" us ON us."user_id" = u."id" AND us."entity_type" = 'STATION'
JOIN "stations" s ON s."id" = us."entity_id";

-- 4.7 Drop the temporary mapping column.
ALTER TABLE "organizations" DROP COLUMN "backfill_user_id";
