-- Redefine the dashboard aggregate views over the DEDUPLICATED `airplay_events`
-- table instead of the RAW `detections` table.
--
-- WHY (data-integrity fix):
--   `detections` holds one row per ACRCloud callback. A single ~3-minute song
--   fires many callbacks, so COUNT(*) over `detections` massively INFLATES
--   plays, unique songs and unique artists. `airplay_events` is the
--   deduplicated, gap-tolerant aggregate that every other surface
--   (station/label/artist handlers) already reads. The dashboard must use the
--   same source so its numbers agree with the rest of the product.
--
-- ONE definition of "plays" (kept consistent with the station/label/artist
-- handlers, which all use COUNT(*) of airplay_events):
--     plays = COUNT(*) of airplay_events rows WHERE partial_play = false.
--   Each airplay_event is one distinct play; short teasers/jingles are flagged
--   partial_play = true and excluded from every user-facing aggregate.
--
-- unique_songs is keyed by ISRC, falling back to a normalized (lower/trim)
-- title when the event has no ISRC. This (a) still counts NULL-ISRC plays,
-- which COUNT(DISTINCT isrc) silently drops, and (b) does not collapse two
-- distinct recordings. The 'isrc:' / 'title:' prefixes keep the two key spaces
-- from ever colliding.
--
-- Views are recreated with CREATE OR REPLACE (column names, order and types are
-- unchanged: station_id INT, bucket TIMESTAMP, *_count INT), so grants and the
-- handler contract are preserved. `started_at` and `detected_at` are both
-- TIMESTAMP(3), so the bucket column type is unchanged.
--
-- NOTE: verify against a live DB snapshot before merge — run these views and
-- confirm the new dashboard numbers match the station/label handler outputs.

CREATE OR REPLACE VIEW daily_station_plays AS
SELECT
  station_id,
  DATE_TRUNC('day', started_at) AS bucket,
  COUNT(*)::int AS play_count,
  COUNT(DISTINCT COALESCE('isrc:' || isrc, 'title:' || lower(btrim(song_title))))::int AS unique_songs,
  COUNT(DISTINCT artist_name)::int AS unique_artists
FROM airplay_events
WHERE partial_play = false
GROUP BY station_id, DATE_TRUNC('day', started_at);

CREATE OR REPLACE VIEW weekly_artist_plays AS
SELECT
  artist_name,
  DATE_TRUNC('week', started_at) AS bucket,
  COUNT(*)::int AS play_count,
  COUNT(DISTINCT station_id)::int AS station_count
FROM airplay_events
WHERE partial_play = false
GROUP BY artist_name, DATE_TRUNC('week', started_at);

CREATE OR REPLACE VIEW monthly_song_plays AS
SELECT
  song_title,
  artist_name,
  isrc,
  DATE_TRUNC('month', started_at) AS bucket,
  COUNT(*)::int AS play_count,
  COUNT(DISTINCT station_id)::int AS station_count
FROM airplay_events
WHERE partial_play = false
GROUP BY song_title, artist_name, isrc, DATE_TRUNC('month', started_at);
