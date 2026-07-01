-- Baseline drift reconciliation: these tables/indexes were created in prod via 'prisma db push'
-- without corresponding migrations. This migration makes the chain self-contained for fresh DBs.
-- On prod it is marked as applied via 'prisma migrate resolve' (tables already exist).


CREATE TABLE public.chart_alerts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    song_title text NOT NULL,
    artist_name text NOT NULL,
    isrc text,
    platform text NOT NULL,
    country text NOT NULL,
    chart_name text NOT NULL,
    "position" integer NOT NULL,
    alert_type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.chart_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.chart_alerts_id_seq OWNED BY public.chart_alerts.id;

CREATE TABLE public.chart_entries (
    id integer NOT NULL,
    platform text NOT NULL,
    country text NOT NULL,
    chart_name text NOT NULL,
    "position" integer NOT NULL,
    song_title text NOT NULL,
    artist_name text NOT NULL,
    isrc text,
    snapshot_date timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.chart_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.chart_entries_id_seq OWNED BY public.chart_entries.id;

CREATE TABLE public.curation_scores (
    id integer NOT NULL,
    curation_song_id integer NOT NULL,
    keeper_count integer DEFAULT 0 NOT NULL,
    skipper_count integer DEFAULT 0 NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE public.curation_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.curation_scores_id_seq OWNED BY public.curation_scores.id;

CREATE TABLE public.curation_songs (
    id integer NOT NULL,
    station_id integer NOT NULL,
    song_title text NOT NULL,
    artist_name text NOT NULL,
    isrc text,
    deezer_track_id text,
    preview_url text,
    cover_url text,
    artist_picture_url text,
    source text DEFAULT 'rotation'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.curation_songs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.curation_songs_id_seq OWNED BY public.curation_songs.id;

CREATE TABLE public.curation_votes (
    id integer NOT NULL,
    curation_song_id integer NOT NULL,
    session_token text NOT NULL,
    vote text NOT NULL,
    voted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.curation_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.curation_votes_id_seq OWNED BY public.curation_votes.id;

CREATE TABLE public.daily_reports (
    id integer NOT NULL,
    user_id integer NOT NULL,
    report_date timestamp(3) without time zone NOT NULL,
    content jsonb NOT NULL,
    tips text[],
    is_premium boolean DEFAULT false NOT NULL,
    delivered_via text[] DEFAULT ARRAY['push'::text],
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.daily_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.daily_reports_id_seq OWNED BY public.daily_reports.id;

CREATE TABLE public.features (
    id integer NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category text NOT NULL,
    roles text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE public.features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.features_id_seq OWNED BY public.features.id;

CREATE TABLE public.plan_features (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    feature_id integer NOT NULL
);

CREATE SEQUENCE public.plan_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.plan_features_id_seq OWNED BY public.plan_features.id;

CREATE TABLE public.plans (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    role text NOT NULL,
    tier text NOT NULL,
    monthly_price_cents integer DEFAULT 0 NOT NULL,
    annual_price_cents integer DEFAULT 0 NOT NULL,
    trial_days integer DEFAULT 7 NOT NULL,
    per_seat_price_cents integer DEFAULT 0 NOT NULL,
    per_seat_label text,
    stripe_monthly_price_id text,
    stripe_annual_price_id text,
    stripe_product_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE public.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plan_id integer NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text DEFAULT 'active'::text NOT NULL,
    billing_interval text DEFAULT 'monthly'::text NOT NULL,
    trial_ends_at timestamp(3) without time zone,
    current_period_start timestamp(3) without time zone,
    current_period_end timestamp(3) without time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    seat_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;

CREATE TABLE public.user_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    daily_report_time text DEFAULT '08:00'::text NOT NULL,
    daily_report_timezone text DEFAULT 'Europe/Bucharest'::text NOT NULL,
    daily_report_enabled boolean DEFAULT true NOT NULL,
    chart_alerts_enabled boolean DEFAULT true NOT NULL,
    chart_alert_countries text[] DEFAULT ARRAY['RO'::text],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE public.user_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_settings_id_seq OWNED BY public.user_settings.id;

ALTER TABLE ONLY public.chart_alerts ALTER COLUMN id SET DEFAULT nextval('public.chart_alerts_id_seq'::regclass);

ALTER TABLE ONLY public.chart_entries ALTER COLUMN id SET DEFAULT nextval('public.chart_entries_id_seq'::regclass);

ALTER TABLE ONLY public.curation_scores ALTER COLUMN id SET DEFAULT nextval('public.curation_scores_id_seq'::regclass);

ALTER TABLE ONLY public.curation_songs ALTER COLUMN id SET DEFAULT nextval('public.curation_songs_id_seq'::regclass);

ALTER TABLE ONLY public.curation_votes ALTER COLUMN id SET DEFAULT nextval('public.curation_votes_id_seq'::regclass);

ALTER TABLE ONLY public.daily_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_reports_id_seq'::regclass);

ALTER TABLE ONLY public.features ALTER COLUMN id SET DEFAULT nextval('public.features_id_seq'::regclass);

ALTER TABLE ONLY public.plan_features ALTER COLUMN id SET DEFAULT nextval('public.plan_features_id_seq'::regclass);

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);

ALTER TABLE ONLY public.user_settings ALTER COLUMN id SET DEFAULT nextval('public.user_settings_id_seq'::regclass);

ALTER TABLE ONLY public.chart_alerts
    ADD CONSTRAINT chart_alerts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chart_entries
    ADD CONSTRAINT chart_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.curation_scores
    ADD CONSTRAINT curation_scores_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.curation_songs
    ADD CONSTRAINT curation_songs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.curation_votes
    ADD CONSTRAINT curation_votes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);

CREATE INDEX chart_alerts_user_id_is_read_idx ON public.chart_alerts USING btree (user_id, is_read);

CREATE INDEX chart_alerts_user_id_sent_at_idx ON public.chart_alerts USING btree (user_id, sent_at);

CREATE INDEX chart_entries_isrc_snapshot_date_idx ON public.chart_entries USING btree (isrc, snapshot_date);

CREATE UNIQUE INDEX chart_entries_platform_country_chart_name_position_snapshot_key ON public.chart_entries USING btree (platform, country, chart_name, "position", snapshot_date);

CREATE INDEX chart_entries_platform_country_snapshot_date_idx ON public.chart_entries USING btree (platform, country, snapshot_date);

CREATE UNIQUE INDEX curation_scores_curation_song_id_key ON public.curation_scores USING btree (curation_song_id);

CREATE INDEX curation_songs_station_id_is_active_idx ON public.curation_songs USING btree (station_id, is_active);

CREATE UNIQUE INDEX curation_songs_station_id_isrc_key ON public.curation_songs USING btree (station_id, isrc);

CREATE INDEX curation_votes_curation_song_id_idx ON public.curation_votes USING btree (curation_song_id);

CREATE UNIQUE INDEX curation_votes_curation_song_id_session_token_key ON public.curation_votes USING btree (curation_song_id, session_token);

CREATE INDEX daily_reports_user_id_idx ON public.daily_reports USING btree (user_id);

CREATE UNIQUE INDEX daily_reports_user_id_report_date_key ON public.daily_reports USING btree (user_id, report_date);

CREATE UNIQUE INDEX features_key_key ON public.features USING btree (key);

CREATE UNIQUE INDEX plan_features_plan_id_feature_id_key ON public.plan_features USING btree (plan_id, feature_id);

CREATE UNIQUE INDEX plans_slug_key ON public.plans USING btree (slug);

CREATE INDEX subscriptions_stripe_customer_id_idx ON public.subscriptions USING btree (stripe_customer_id);

CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON public.subscriptions USING btree (stripe_subscription_id);

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions USING btree (user_id);

CREATE UNIQUE INDEX user_settings_user_id_key ON public.user_settings USING btree (user_id);

ALTER TABLE ONLY public.chart_alerts
    ADD CONSTRAINT chart_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.curation_scores
    ADD CONSTRAINT curation_scores_curation_song_id_fkey FOREIGN KEY (curation_song_id) REFERENCES public.curation_songs(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.curation_songs
    ADD CONSTRAINT curation_songs_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.curation_votes
    ADD CONSTRAINT curation_votes_curation_song_id_fkey FOREIGN KEY (curation_song_id) REFERENCES public.curation_songs(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Indexes added out-of-band on tables that do have migrations
CREATE UNIQUE INDEX IF NOT EXISTS "detections_raw_callback_id_detected_at_key" ON "detections"("raw_callback_id", "detected_at");
CREATE INDEX IF NOT EXISTS "device_tokens_user_id_idx" ON "device_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "watched_stations_user_id_idx" ON "watched_stations"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "watched_stations_user_id_station_id_key" ON "watched_stations"("user_id", "station_id");
