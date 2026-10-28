--
-- Name: command_query_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.command_query_rails (
    rail_id text NOT NULL,
    feature_id text NOT NULL,
    mechanization_status text NOT NULL,
    rail_name text NOT NULL,
    normalized_rail_name text NOT NULL,
    rail_type text NOT NULL,
    ddd_owner text NOT NULL,
    rail_status text DEFAULT 'declared'::text NOT NULL,
    symbol_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    governing_sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_implementation_surfaces jsonb DEFAULT '[]'::jsonb NOT NULL,
    architecture_guards jsonb DEFAULT '[]'::jsonb NOT NULL,
    completion_gate jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_rail jsonb NOT NULL,
    raw_manifest jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    implementation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    documentation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT command_query_rails_rail_type_check CHECK ((rail_type = ANY (ARRAY['command'::text, 'query'::text])))
);


--
-- Name: feature_mechanization_local_rails; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.feature_mechanization_local_rails (
    rail_id text NOT NULL,
    feature_id text NOT NULL,
    mechanization_status text NOT NULL,
    rail_name text NOT NULL,
    normalized_rail_name text NOT NULL,
    rail_type text NOT NULL,
    ddd_owner text NOT NULL,
    rail_status text DEFAULT 'declared'::text NOT NULL,
    symbol_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    implementation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    documentation_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    governing_sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_implementation_surfaces jsonb DEFAULT '[]'::jsonb NOT NULL,
    architecture_guards jsonb DEFAULT '[]'::jsonb NOT NULL,
    completion_gate jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_rail jsonb NOT NULL,
    raw_manifest jsonb NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_mechanization_local_rails_mechanization_status_check CHECK ((mechanization_status = ANY (ARRAY['closed'::text, 'implemented'::text]))),
    CONSTRAINT feature_mechanization_local_rails_type_check CHECK ((rail_type = ANY (ARRAY['command'::text, 'query'::text])))
);


--
-- Name: dbt_project_roundtrip_phase_rail_evidence; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.dbt_project_roundtrip_phase_rail_evidence (
    evidence_id text NOT NULL,
    phase_id text NOT NULL,
    rail_name text NOT NULL,
    expected_rail_type text NOT NULL,
    expected_rail_status text NOT NULL,
    expected_mechanization_status text NOT NULL,
    expected_is_gap boolean NOT NULL,
    expected_implemented boolean NOT NULL,
    reviewed_pr_url text NOT NULL,
    reviewed_commit_sha text NOT NULL,
    evidence_summary text NOT NULL,
    source_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dbt_project_roundtrip_expected_rail_type_check CHECK ((expected_rail_type = ANY (ARRAY['command'::text, 'query'::text]))),
    CONSTRAINT dbt_project_roundtrip_reviewed_commit_check CHECK ((reviewed_commit_sha ~ '^[a-f0-9]{40}$'::text)),
    CONSTRAINT dbt_project_roundtrip_reviewed_pr_check CHECK ((reviewed_pr_url ~ '^https://github[.]com/dunay2/dvt/pull/[0-9]+$'::text))
);


--
-- Name: dbt_project_roundtrip_phases; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.dbt_project_roundtrip_phases (
    phase_id text NOT NULL,
    phase_order integer NOT NULL,
    phase_name text NOT NULL,
    expected_rail_count integer NOT NULL,
    source_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dbt_project_roundtrip_phase_order_check CHECK ((phase_order > 0)),
    CONSTRAINT dbt_project_roundtrip_phase_rail_count_check CHECK ((expected_rail_count > 0))
);


--
-- Name: feature_mechanization_local_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.feature_mechanization_local_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    rail_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer,
    resulting_revision integer NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
