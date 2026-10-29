--
-- Name: governance_coverage; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_coverage (
    coverage_id text NOT NULL,
    source_path text NOT NULL,
    coverage_kind text NOT NULL,
    name text NOT NULL,
    count_value integer,
    file_count integer,
    component_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_coverage jsonb NOT NULL,
    CONSTRAINT governance_coverage_count_value_check CHECK (((count_value IS NULL) OR (count_value >= 0))),
    CONSTRAINT governance_coverage_file_count_check CHECK (((file_count IS NULL) OR (file_count >= 0))),
    CONSTRAINT governance_coverage_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_remediation; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_remediation (
    task_id text NOT NULL,
    source_path text NOT NULL,
    task_type text NOT NULL,
    priority text NOT NULL,
    component_unit text NOT NULL,
    component_file_map text,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    blocking text NOT NULL,
    reason text NOT NULL,
    file_count integer NOT NULL,
    document_count integer NOT NULL,
    files jsonb DEFAULT '[]'::jsonb NOT NULL,
    documents jsonb DEFAULT '[]'::jsonb NOT NULL,
    expected_validation jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_task jsonb NOT NULL,
    CONSTRAINT governance_remediation_document_count_check CHECK ((document_count >= 0)),
    CONSTRAINT governance_remediation_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_remediation_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_fingerprints; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_fingerprints (
    path text NOT NULL,
    file_id text NOT NULL,
    source_path text NOT NULL,
    content_hash text NOT NULL,
    governance_hash text NOT NULL,
    state_fingerprint text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    component_unit text NOT NULL,
    owning_unit text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_fingerprint jsonb NOT NULL,
    CONSTRAINT governance_fingerprints_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_fingerprints_governance_hash_check CHECK ((governance_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_fingerprints_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_fingerprints_state_fingerprint_check CHECK ((state_fingerprint ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_refresh_run_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_refresh_run_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    run_id text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_refresh_run_operations_payload_object_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT governance_refresh_run_operations_revision_check CHECK (((previous_revision >= '-1'::integer) AND (resulting_revision >= 0))),
    CONSTRAINT governance_refresh_run_operations_source_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_refresh_run_operations_type_check CHECK ((operation_type = 'governance_refresh_run_record'::text))
);


--
-- Name: governance_refresh_runs; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_refresh_runs (
    run_id text NOT NULL,
    actor text NOT NULL,
    command_name text DEFAULT 'pnpm governance:refresh'::text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    run_state text NOT NULL,
    max_passes integer NOT NULL,
    generation_passes integer,
    stabilized boolean,
    error_summary text DEFAULT ''::text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT governance_refresh_runs_generation_passes_check CHECK (((generation_passes IS NULL) OR (generation_passes >= 0))),
    CONSTRAINT governance_refresh_runs_max_passes_check CHECK ((max_passes >= 1)),
    CONSTRAINT governance_refresh_runs_payload_object_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT governance_refresh_runs_revision_check CHECK ((revision >= 0)),
    CONSTRAINT governance_refresh_runs_source_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_refresh_runs_state_check CHECK ((run_state = ANY (ARRAY['accepted'::text, 'passed'::text, 'failed'::text])))
);


--
-- Name: governance_refresh_stage_runs; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_refresh_stage_runs (
    stage_run_id text NOT NULL,
    run_id text NOT NULL,
    stage_group text NOT NULL,
    pass_number integer NOT NULL,
    stage_index integer NOT NULL,
    stage_id text NOT NULL,
    stage_script text NOT NULL,
    args jsonb DEFAULT '[]'::jsonb NOT NULL,
    env jsonb DEFAULT '{}'::jsonb NOT NULL,
    stage_state text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT governance_refresh_stage_runs_args_array_check CHECK ((jsonb_typeof(args) = 'array'::text)),
    CONSTRAINT governance_refresh_stage_runs_env_object_check CHECK ((jsonb_typeof(env) = 'object'::text)),
    CONSTRAINT governance_refresh_stage_runs_group_check CHECK ((stage_group = ANY (ARRAY['generation'::text, 'database'::text]))),
    CONSTRAINT governance_refresh_stage_runs_index_check CHECK ((stage_index >= 1)),
    CONSTRAINT governance_refresh_stage_runs_metadata_object_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT governance_refresh_stage_runs_pass_check CHECK ((pass_number >= 1)),
    CONSTRAINT governance_refresh_stage_runs_state_check CHECK ((stage_state = ANY (ARRAY['planned'::text, 'passed'::text, 'failed'::text, 'skipped'::text]))),
    CONSTRAINT governance_refresh_stage_runs_unique_stage CHECK ((length(stage_id) > 0))
);


--
-- Name: governance_sources; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_sources (
    source_path text NOT NULL,
    source_type text NOT NULL,
    content_sha256 text NOT NULL,
    source_bytes bigint NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_source jsonb,
    source_authority text DEFAULT 'database'::text NOT NULL,
    raw_source_text text,
    CONSTRAINT governance_sources_content_sha256_check CHECK ((content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_sources_source_authority_check CHECK ((source_authority = ANY (ARRAY['database'::text, 'git-bootstrap'::text]))),
    CONSTRAINT governance_sources_source_bytes_check CHECK ((source_bytes >= 0)),
    CONSTRAINT governance_sources_source_type_check CHECK ((source_type = ANY (ARRAY['governance_file_index'::text, 'governance_file_shard'::text, 'governance_component_index'::text, 'governance_component_file_map'::text, 'governance_component_shard'::text, 'governance_fingerprint_baseline'::text, 'governance_coverage_report'::text, 'governance_remediation_queue'::text])))
);


--
-- Name: pr_readiness_checks; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.pr_readiness_checks (
    readiness_id text NOT NULL,
    base_ref text NOT NULL,
    head_ref text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    effective_arc_level text NOT NULL,
    is_arc boolean NOT NULL,
    blocking boolean NOT NULL,
    requirements jsonb DEFAULT '{}'::jsonb NOT NULL,
    required_checks jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommended_guides jsonb DEFAULT '[]'::jsonb NOT NULL,
    changed_files jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence_docs jsonb DEFAULT '[]'::jsonb NOT NULL,
    risk_updates jsonb DEFAULT '[]'::jsonb NOT NULL,
    trigger_hits jsonb DEFAULT '[]'::jsonb NOT NULL,
    missing_requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    raw_readiness jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);
