--
-- PostgreSQL database dump
--

\restrict BsVOqkHskkqhKW181dRjGZh238c4RaFgeb42E2XxvFryN5P6MLWGqaHAbDtqwXo

-- Dumped from database version 17.9 (Ubuntu 17.9-0ubuntu0.25.10.1)
-- Dumped by pg_dump version 17.9 (Ubuntu 17.9-0ubuntu0.25.10.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA app;


--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.current_tenant_id() RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v text;
BEGIN
  v := current_setting('app.current_tenant_id', true);
  IF v IS NULL OR btrim(v) = '' THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
END;
$$;


--
-- Name: FUNCTION current_tenant_id(); Type: COMMENT; Schema: app; Owner: -
--

COMMENT ON FUNCTION app.current_tenant_id() IS 'Returns the tenant UUID stored in app.current_tenant_id.';


--
-- Name: set_current_tenant(uuid); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.set_current_tenant(p_tenant_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', COALESCE(p_tenant_id::text, ''), false);
END;
$$;


--
-- Name: FUNCTION set_current_tenant(p_tenant_id uuid); Type: COMMENT; Schema: app; Owner: -
--

COMMENT ON FUNCTION app.set_current_tenant(p_tenant_id uuid) IS 'Call once per request/connection after resolving the tenant subdomain.';


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    tenant_id uuid NOT NULL,
    actor_user_id uuid,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.audit_log FORCE ROW LEVEL SECURITY;


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: availability_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    exception_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    is_closed boolean DEFAULT false NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT availability_exceptions_time_check CHECK ((((start_time IS NULL) AND (end_time IS NULL)) OR ((start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (end_time > start_time))))
);

ALTER TABLE ONLY public.availability_exceptions FORCE ROW LEVEL SECURITY;


--
-- Name: availability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_duration_minutes integer,
    slot_interval_minutes integer,
    is_open boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT availability_rules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT availability_rules_slot_duration_minutes_check CHECK (((slot_duration_minutes IS NULL) OR (slot_duration_minutes > 0))),
    CONSTRAINT availability_rules_slot_interval_minutes_check CHECK (((slot_interval_minutes IS NULL) OR (slot_interval_minutes > 0))),
    CONSTRAINT availability_rules_time_check CHECK ((end_time > start_time))
);

ALTER TABLE ONLY public.availability_rules FORCE ROW LEVEL SECURITY;


--
-- Name: booking_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    token text DEFAULT encode(public.gen_random_bytes(24), 'hex'::text) NOT NULL,
    resource_id uuid,
    preferred_date date,
    customer_name text,
    customer_email text,
    customer_phone text,
    party_size integer DEFAULT 1 NOT NULL,
    notes text,
    booking_mode text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '48:00:00'::interval) NOT NULL,
    CONSTRAINT booking_drafts_booking_mode_check CHECK ((booking_mode = ANY (ARRAY['free'::text, 'availability_only'::text, 'hybrid'::text]))),
    CONSTRAINT booking_drafts_party_size_check CHECK ((party_size >= 1))
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    created_by_user_id uuid,
    public_reference text,
    status text DEFAULT 'provisional'::text NOT NULL,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    cancellation_reason text,
    confirmed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'admin'::text NOT NULL,
    party_size integer DEFAULT 1 NOT NULL,
    meeting_type text,
    location_id uuid,
    booker_phone text,
    event_type_id uuid,
    CONSTRAINT bookings_meeting_type_check CHECK ((meeting_type = ANY (ARRAY['in_person'::text, 'online'::text, 'telephone'::text]))),
    CONSTRAINT bookings_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['provisional'::text, 'confirmed'::text, 'cancelled'::text]))),
    CONSTRAINT bookings_time_check CHECK ((end_at > start_at))
);

ALTER TABLE ONLY public.bookings FORCE ROW LEVEL SECURITY;


--
-- Name: calendar_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider text NOT NULL,
    external_calendar_id text NOT NULL,
    display_name text,
    status text DEFAULT 'active'::text NOT NULL,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calendar_connections_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'outlook'::text, 'ical'::text]))),
    CONSTRAINT calendar_connections_status_check CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text, 'error'::text])))
);

ALTER TABLE ONLY public.calendar_connections FORCE ROW LEVEL SECURITY;


--
-- Name: event_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    duration_minutes integer DEFAULT 60 NOT NULL,
    booking_form_type text DEFAULT 'classic'::text NOT NULL,
    booking_mode text DEFAULT 'free'::text NOT NULL,
    auto_confirm boolean DEFAULT false NOT NULL,
    max_advance_booking_days integer,
    min_notice_hours integer DEFAULT 0 NOT NULL,
    buffer_before_minutes integer DEFAULT 0 NOT NULL,
    buffer_after_minutes integer DEFAULT 0 NOT NULL,
    booking_confirmation_message text,
    public_booking_enabled boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_types_booking_form_type_check CHECK ((booking_form_type = ANY (ARRAY['classic'::text, 'minimal'::text, 'split'::text, 'cards'::text]))),
    CONSTRAINT event_types_booking_mode_check CHECK ((booking_mode = ANY (ARRAY['free'::text, 'slots'::text, 'hybrid'::text]))),
    CONSTRAINT event_types_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    address_line_1 text,
    address_line_2 text,
    city text,
    postcode text,
    country text DEFAULT 'GB'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    feature_key text NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    metric_key text NOT NULL,
    limit_value bigint,
    period text DEFAULT 'absolute'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plan_limits_period_check CHECK ((period = ANY (ARRAY['absolute'::text, 'monthly'::text])))
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resource_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_locations (
    resource_id uuid NOT NULL,
    location_id uuid NOT NULL,
    tenant_id uuid NOT NULL
);


--
-- Name: resource_meeting_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_meeting_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    meeting_type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    online_platform text,
    online_meeting_url text,
    CONSTRAINT resource_meeting_types_meeting_type_check CHECK ((meeting_type = ANY (ARRAY['in_person'::text, 'online'::text, 'telephone'::text]))),
    CONSTRAINT resource_meeting_types_online_platform_check CHECK ((online_platform = ANY (ARRAY['teams'::text, 'google_meet'::text, 'zoom'::text, 'other'::text])))
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    booking_mode text DEFAULT 'free'::text NOT NULL,
    max_booking_duration_hours numeric(8,2),
    min_notice_hours numeric(8,2) DEFAULT 0 NOT NULL,
    max_advance_booking_days integer,
    buffer_before_minutes integer DEFAULT 0 NOT NULL,
    buffer_after_minutes integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    booking_form_type text DEFAULT 'classic'::text NOT NULL,
    auto_confirm boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT resources_booking_form_type_check CHECK ((booking_form_type = ANY (ARRAY['classic'::text, 'minimal'::text, 'split'::text, 'cards'::text]))),
    CONSTRAINT resources_booking_mode_check CHECK ((booking_mode = ANY (ARRAY['free'::text, 'availability_only'::text, 'hybrid'::text]))),
    CONSTRAINT resources_buffer_after_minutes_check CHECK ((buffer_after_minutes >= 0)),
    CONSTRAINT resources_buffer_before_minutes_check CHECK ((buffer_before_minutes >= 0)),
    CONSTRAINT resources_capacity_check CHECK ((capacity > 0)),
    CONSTRAINT resources_max_advance_booking_days_check CHECK (((max_advance_booking_days IS NULL) OR (max_advance_booking_days >= 0))),
    CONSTRAINT resources_max_booking_duration_hours_check CHECK (((max_booking_duration_hours IS NULL) OR (max_booking_duration_hours > (0)::numeric)))
);

ALTER TABLE ONLY public.resources FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN resources.booking_form_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resources.booking_form_type IS 'Controls which public booking form UI is shown for this resource. classic | minimal | split | cards';


--
-- Name: tenant_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_subscriptions_period_check CHECK ((current_period_end > current_period_start)),
    CONSTRAINT tenant_subscriptions_status_check CHECK ((status = ANY (ARRAY['trial'::text, 'grace'::text, 'active'::text, 'past_due'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY public.tenant_subscriptions FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_usage_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_usage_counters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_key text NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    usage_value bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_usage_counters_period_check CHECK ((period_end > period_start)),
    CONSTRAINT tenant_usage_counters_usage_value_check CHECK ((usage_value >= 0))
);

ALTER TABLE ONLY public.tenant_usage_counters FORCE ROW LEVEL SECURITY;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    subdomain text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    timezone text DEFAULT 'Europe/London'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text,
    contact_email text,
    logo_url text,
    brand_colour text,
    public_booking_enabled boolean DEFAULT true NOT NULL,
    booking_confirmation_message text,
    resource_label text DEFAULT 'Resource'::text NOT NULL,
    resource_label_plural text DEFAULT 'Resources'::text NOT NULL,
    CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'cancelled'::text])))
);


--
-- Name: unavailability_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unavailability_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    reason text,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unavailability_blocks_time_check CHECK ((end_at > start_at))
);

ALTER TABLE ONLY public.unavailability_blocks FORCE ROW LEVEL SECURITY;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_super_admin boolean DEFAULT false NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text]))),
    CONSTRAINT users_super_admin_no_tenant CHECK ((((is_super_admin = true) AND (tenant_id IS NULL)) OR ((is_super_admin = false) AND (tenant_id IS NOT NULL))))
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: availability_exceptions availability_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_exceptions
    ADD CONSTRAINT availability_exceptions_pkey PRIMARY KEY (id);


--
-- Name: availability_exceptions availability_exceptions_uniqueness; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_exceptions
    ADD CONSTRAINT availability_exceptions_uniqueness UNIQUE (tenant_id, resource_id, exception_date, start_time, end_time);


--
-- Name: availability_rules availability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_pkey PRIMARY KEY (id);


--
-- Name: booking_drafts booking_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_drafts
    ADD CONSTRAINT booking_drafts_pkey PRIMARY KEY (id);


--
-- Name: booking_drafts booking_drafts_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_drafts
    ADD CONSTRAINT booking_drafts_token_key UNIQUE (token);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: calendar_connections calendar_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_pkey PRIMARY KEY (id);


--
-- Name: calendar_connections calendar_connections_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_unique_key UNIQUE (tenant_id, provider, external_calendar_id);


--
-- Name: event_types event_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_unique_key UNIQUE (plan_id, feature_key);


--
-- Name: plan_limits plan_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_pkey PRIMARY KEY (id);


--
-- Name: plan_limits plan_limits_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_unique_key UNIQUE (plan_id, metric_key, period);


--
-- Name: plans plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_code_key UNIQUE (code);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: resource_locations resource_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_locations
    ADD CONSTRAINT resource_locations_pkey PRIMARY KEY (resource_id, location_id);


--
-- Name: resource_meeting_types resource_meeting_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_meeting_types
    ADD CONSTRAINT resource_meeting_types_pkey PRIMARY KEY (id);


--
-- Name: resource_meeting_types resource_meeting_types_resource_id_meeting_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_meeting_types
    ADD CONSTRAINT resource_meeting_types_resource_id_meeting_type_key UNIQUE (resource_id, meeting_type);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: resources resources_slug_per_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_slug_per_tenant_key UNIQUE (tenant_id, slug);


--
-- Name: tenant_subscriptions tenant_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tenant_usage_counters tenant_usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage_counters
    ADD CONSTRAINT tenant_usage_counters_pkey PRIMARY KEY (id);


--
-- Name: tenant_usage_counters tenant_usage_counters_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage_counters
    ADD CONSTRAINT tenant_usage_counters_unique_key UNIQUE (tenant_id, metric_key, period_start, period_end);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: tenants tenants_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_subdomain_key UNIQUE (subdomain);


--
-- Name: unavailability_blocks unavailability_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unavailability_blocks
    ADD CONSTRAINT unavailability_blocks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_per_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_per_tenant_key UNIQUE (tenant_id, email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: event_types_resource_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_types_resource_id_idx ON public.event_types USING btree (resource_id);


--
-- Name: event_types_tenant_id_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_types_tenant_id_slug_idx ON public.event_types USING btree (tenant_id, slug);


--
-- Name: idx_audit_log_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_tenant_created ON public.audit_log USING btree (tenant_id, created_at DESC);


--
-- Name: idx_availability_exceptions_resource_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_exceptions_resource_date ON public.availability_exceptions USING btree (resource_id, exception_date);


--
-- Name: idx_availability_rules_resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_rules_resource_id ON public.availability_rules USING btree (resource_id, day_of_week);


--
-- Name: idx_booking_drafts_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_drafts_expires_at ON public.booking_drafts USING btree (expires_at);


--
-- Name: idx_booking_drafts_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_drafts_tenant_id ON public.booking_drafts USING btree (tenant_id);


--
-- Name: idx_booking_drafts_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_drafts_token ON public.booking_drafts USING btree (token);


--
-- Name: idx_bookings_resource_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_resource_time ON public.bookings USING btree (resource_id, start_at, end_at);


--
-- Name: idx_bookings_tenant_status_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_tenant_status_start ON public.bookings USING btree (tenant_id, status, start_at);


--
-- Name: idx_bookings_time_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_time_range ON public.bookings USING gist (resource_id, tstzrange(start_at, end_at, '[)'::text));


--
-- Name: idx_calendar_connections_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_connections_tenant_id ON public.calendar_connections USING btree (tenant_id);


--
-- Name: idx_resources_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resources_tenant_id ON public.resources USING btree (tenant_id);


--
-- Name: idx_resources_tenant_id_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resources_tenant_id_active ON public.resources USING btree (tenant_id, is_active);


--
-- Name: idx_tenant_subscriptions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_subscriptions_tenant_id ON public.tenant_subscriptions USING btree (tenant_id);


--
-- Name: idx_tenant_usage_counters_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_usage_counters_lookup ON public.tenant_usage_counters USING btree (tenant_id, metric_key, period_start, period_end);


--
-- Name: idx_unavailability_blocks_resource_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unavailability_blocks_resource_time ON public.unavailability_blocks USING btree (resource_id, start_at, end_at);


--
-- Name: idx_unavailability_blocks_time_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unavailability_blocks_time_range ON public.unavailability_blocks USING gist (resource_id, tstzrange(start_at, end_at, '[)'::text));


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: users_super_admin_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_super_admin_email_unique ON public.users USING btree (email) WHERE (is_super_admin = true);


--
-- Name: availability_exceptions trg_availability_exceptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_availability_exceptions_updated_at BEFORE UPDATE ON public.availability_exceptions FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: availability_rules trg_availability_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_availability_rules_updated_at BEFORE UPDATE ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: bookings trg_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: calendar_connections trg_calendar_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_calendar_connections_updated_at BEFORE UPDATE ON public.calendar_connections FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: event_types trg_event_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_event_types_updated_at BEFORE UPDATE ON public.event_types FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: plan_features trg_plan_features_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plan_features_updated_at BEFORE UPDATE ON public.plan_features FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: plan_limits trg_plan_limits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plan_limits_updated_at BEFORE UPDATE ON public.plan_limits FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: plans trg_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: resources trg_resources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: tenant_subscriptions trg_tenant_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tenant_subscriptions_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: tenants trg_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: unavailability_blocks trg_unavailability_blocks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_unavailability_blocks_updated_at BEFORE UPDATE ON public.unavailability_blocks FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();


--
-- Name: audit_log audit_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_log audit_log_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: availability_exceptions availability_exceptions_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_exceptions
    ADD CONSTRAINT availability_exceptions_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: availability_exceptions availability_exceptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_exceptions
    ADD CONSTRAINT availability_exceptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: availability_rules availability_rules_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: availability_rules availability_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: booking_drafts booking_drafts_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_drafts
    ADD CONSTRAINT booking_drafts_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE SET NULL;


--
-- Name: booking_drafts booking_drafts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_drafts
    ADD CONSTRAINT booking_drafts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_event_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.event_types(id);


--
-- Name: bookings bookings_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: calendar_connections calendar_connections_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: event_types event_types_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: event_types event_types_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: locations locations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_limits plan_limits_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: resource_locations resource_locations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_locations
    ADD CONSTRAINT resource_locations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: resource_locations resource_locations_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_locations
    ADD CONSTRAINT resource_locations_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: resource_meeting_types resource_meeting_types_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_meeting_types
    ADD CONSTRAINT resource_meeting_types_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: resources resources_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_subscriptions tenant_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT;


--
-- Name: tenant_subscriptions tenant_subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_usage_counters tenant_usage_counters_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage_counters
    ADD CONSTRAINT tenant_usage_counters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: unavailability_blocks unavailability_blocks_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unavailability_blocks
    ADD CONSTRAINT unavailability_blocks_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: unavailability_blocks unavailability_blocks_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unavailability_blocks
    ADD CONSTRAINT unavailability_blocks_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: unavailability_blocks unavailability_blocks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unavailability_blocks
    ADD CONSTRAINT unavailability_blocks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_tenant_isolation ON public.audit_log USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: availability_exceptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_exceptions availability_exceptions_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY availability_exceptions_tenant_isolation ON public.availability_exceptions USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: availability_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_rules availability_rules_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY availability_rules_tenant_isolation ON public.availability_rules USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: booking_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_drafts booking_drafts_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY booking_drafts_tenant_isolation ON public.booking_drafts USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings bookings_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_tenant_isolation ON public.bookings USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: calendar_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_connections calendar_connections_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calendar_connections_tenant_isolation ON public.calendar_connections USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resource_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_meeting_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resource_meeting_types ENABLE ROW LEVEL SECURITY;

--
-- Name: resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

--
-- Name: resources resources_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resources_tenant_isolation ON public.resources USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: locations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.locations USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: resource_locations tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.resource_locations USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: resource_meeting_types tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.resource_meeting_types USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));


--
-- Name: tenant_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_subscriptions tenant_subscriptions_platform_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_subscriptions_platform_read ON public.tenant_subscriptions FOR SELECT TO booking_app USING (true);


--
-- Name: tenant_subscriptions tenant_subscriptions_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_subscriptions_tenant_isolation ON public.tenant_subscriptions USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: tenant_usage_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_usage_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_usage_counters tenant_usage_counters_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_usage_counters_tenant_isolation ON public.tenant_usage_counters USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: tenants tenants_platform_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_platform_read ON public.tenants FOR SELECT TO booking_app USING (true);


--
-- Name: unavailability_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unavailability_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: unavailability_blocks unavailability_blocks_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unavailability_blocks_tenant_isolation ON public.unavailability_blocks USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_super_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_super_admin_select ON public.users FOR SELECT TO booking_app USING ((is_super_admin = true));


--
-- Name: users users_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_tenant_isolation ON public.users USING ((tenant_id = app.current_tenant_id())) WITH CHECK ((tenant_id = app.current_tenant_id()));


--
-- PostgreSQL database dump complete
--

\unrestrict BsVOqkHskkqhKW181dRjGZh238c4RaFgeb42E2XxvFryN5P6MLWGqaHAbDtqwXo

