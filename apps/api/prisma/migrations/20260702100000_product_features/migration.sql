-- Product features: first-play alerts, rotation alerts, monitoring gaps (coverage transparency).

-- UserSettings: opt-out toggles for the two new push types (default enabled).
ALTER TABLE "user_settings" ADD COLUMN "first_play_alerts_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings" ADD COLUMN "rotation_alerts_enabled" BOOLEAN NOT NULL DEFAULT true;

-- MonitoringGap: periods when a station's monitoring was down/unreliable.
-- Opened by the station-health worker (ACTIVE -> DEGRADED/ERROR), closed on recovery.
CREATE TABLE "monitoring_gaps" (
    "id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_gaps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "monitoring_gaps_station_id_started_at_idx" ON "monitoring_gaps"("station_id", "started_at");
CREATE INDEX "monitoring_gaps_station_id_ended_at_idx" ON "monitoring_gaps"("station_id", "ended_at");

ALTER TABLE "monitoring_gaps" ADD CONSTRAINT "monitoring_gaps_station_id_fkey"
    FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
