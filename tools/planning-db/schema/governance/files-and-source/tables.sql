--
-- Name: governance_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_files (
    path text NOT NULL,
    file_id text NOT NULL,
    shard_id text NOT NULL,
    source_path text NOT NULL,
    path_hash text NOT NULL,
    content_hash text NOT NULL,
    governance_hash text NOT NULL,
    state_fingerprint text NOT NULL,
    owning_unit text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    component_unit text NOT NULL,
    owner_level text NOT NULL,
    unit_status text NOT NULL,
    governance_state text NOT NULL,
    canonical_role text NOT NULL,
    evidence_state text NOT NULL,
    is_drift boolean NOT NULL,
    is_legacy boolean NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    governance_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_file jsonb NOT NULL,
    CONSTRAINT governance_files_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_governance_hash_check CHECK ((governance_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_path_hash_check CHECK ((path_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_files_state_fingerprint_check CHECK ((state_fingerprint ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governed_source_content_overrides; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governed_source_content_overrides (
    path text PRIMARY KEY,
    content_hash text NOT NULL,
    state_fingerprint text NOT NULL,
    source_commit_sha text NOT NULL,
    source_blob_sha text,
    revision integer DEFAULT 0 NOT NULL,
    updated_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governed_source_content_overrides_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governed_source_content_overrides_revision_check CHECK ((revision >= 0)),
    CONSTRAINT governed_source_content_overrides_source_blob_sha_check CHECK (((source_blob_sha IS NULL) OR (source_blob_sha ~ '^[a-f0-9]{40,64}$'::text))),
    CONSTRAINT governed_source_content_overrides_source_commit_sha_check CHECK ((source_commit_sha ~ '^[a-f0-9]{40,64}$'::text)),
    CONSTRAINT governed_source_content_overrides_state_fingerprint_check CHECK ((state_fingerprint ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governed_source_content_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governed_source_content_operations (
    operation_id text PRIMARY KEY,
    idempotency_key text NOT NULL UNIQUE,
    operation_type text NOT NULL,
    actor text NOT NULL,
    source_commit_sha text NOT NULL,
    paths jsonb NOT NULL,
    changes jsonb NOT NULL,
    expected_content_sha256_by_path jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governed_source_content_operations_changes_check CHECK ((jsonb_typeof(changes) = 'array'::text)),
    CONSTRAINT governed_source_content_operations_expected_check CHECK ((jsonb_typeof(expected_content_sha256_by_path) = 'object'::text)),
    CONSTRAINT governed_source_content_operations_paths_check CHECK ((jsonb_typeof(paths) = 'array'::text)),
    CONSTRAINT governed_source_content_operations_source_commit_sha_check CHECK ((source_commit_sha ~ '^[a-f0-9]{40,64}$'::text)),
    CONSTRAINT governed_source_content_operations_type_check CHECK ((operation_type = 'governed_source_content_refresh'::text))
);


--
-- Name: governance_file_shards; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_file_shards (
    shard_id text NOT NULL,
    source_path text NOT NULL,
    file_count integer NOT NULL,
    content_hash text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_shard jsonb NOT NULL,
    CONSTRAINT governance_file_shards_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_file_shards_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_file_shards_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: risk_debt_items; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.risk_debt_items (
    risk_id text NOT NULL,
    source_path text NOT NULL,
    title text NOT NULL,
    status text NOT NULL,
    owners jsonb DEFAULT '[]'::jsonb NOT NULL,
    severity text NOT NULL,
    probability text NOT NULL,
    priority text NOT NULL,
    component_unit text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_frontmatter jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_debt jsonb DEFAULT '{}'::jsonb NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_debt_items_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);
