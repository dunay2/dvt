--
-- Name: governance_component_local_definitions; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_definitions (
    component_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    name text NOT NULL,
    level text NOT NULL,
    parent_id text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    status text NOT NULL,
    children_required boolean DEFAULT false NOT NULL,
    owned_concern text NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_definiti_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_local_definitions_cq_rails_check CHECK ((btrim(cq_rails) !~* '^none$'::text)),
    CONSTRAINT governance_component_local_definitions_cq_rails_check1 CHECK ((btrim(cq_rails) !~* '^none[[:space:]]*$'::text)),
    CONSTRAINT governance_component_local_definitions_cq_rails_check2 CHECK (((btrim(cq_rails) !~* '^none($|[[:space:]]|[-:])'::text) OR (btrim(cq_rails) ~* '^none[[:space:]]*[-:][[:space:]]*[^[:space:]]+'::text))),
    CONSTRAINT governance_component_local_definitions_level_check CHECK ((level = 'component'::text)),
    CONSTRAINT governance_component_local_definitions_revision_check CHECK ((revision >= 0)),
    CONSTRAINT governance_component_local_definitions_status_check CHECK ((status = ANY (ARRAY['canonical'::text, 'review'::text, 'drift'::text, 'legacy'::text, 'coverage-required'::text, 'superseded'::text])))
);


--
-- Name: governance_component_local_ownership_patterns; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_ownership_patterns (
    component_id text NOT NULL,
    pattern_kind text NOT NULL,
    pattern text NOT NULL,
    pattern_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_ownership_patter_pattern_order_check CHECK ((pattern_order >= 0)),
    CONSTRAINT governance_component_local_ownership_pattern_pattern_kind_check CHECK ((pattern_kind = ANY (ARRAY['owns'::text, 'excludes'::text]))),
    CONSTRAINT governance_component_local_ownership_patterns_pattern_check CHECK ((btrim(pattern) <> ''::text))
);


--
-- Name: governance_component_local_semantic_items; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_semantic_items (
    component_id text NOT NULL,
    item_kind text NOT NULL,
    item_value text NOT NULL,
    item_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_semantic_items_item_kind_check CHECK ((item_kind = ANY (ARRAY['responsibility'::text, 'non_goal'::text, 'reason_to_change'::text, 'public_api'::text, 'invariant'::text, 'transition'::text, 'consumer'::text, 'governance_ref'::text, 'fowler_signal'::text]))),
    CONSTRAINT governance_component_local_semantic_items_item_order_check CHECK ((item_order >= 0)),
    CONSTRAINT governance_component_local_semantic_items_item_value_check CHECK ((btrim(item_value) <> ''::text))
);


--
-- Name: governance_components; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_components (
    component_id text NOT NULL,
    source_path text NOT NULL,
    name text NOT NULL,
    level text NOT NULL,
    parent_id text,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    unit_path jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text NOT NULL,
    governance_state text NOT NULL,
    canonical_role text NOT NULL,
    evidence_state text NOT NULL,
    is_drift boolean NOT NULL,
    is_legacy boolean NOT NULL,
    children_required boolean NOT NULL,
    file_count integer NOT NULL,
    ddd_owner text NOT NULL,
    cq_rails text NOT NULL,
    owns jsonb DEFAULT '[]'::jsonb NOT NULL,
    excludes jsonb DEFAULT '[]'::jsonb NOT NULL,
    governance_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    fowler_signals jsonb DEFAULT '[]'::jsonb NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component jsonb NOT NULL,
    CONSTRAINT governance_components_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_components_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_component_files; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_files (
    component_id text NOT NULL,
    path text NOT NULL,
    file_id text NOT NULL,
    owning_unit text NOT NULL,
    unit_status text NOT NULL,
    governance_state text NOT NULL,
    is_drift boolean NOT NULL,
    is_legacy boolean NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_component_file jsonb NOT NULL,
    CONSTRAINT governance_component_files_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_component_file_shards; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_file_shards (
    component_id text NOT NULL,
    source_path text NOT NULL,
    file_count integer NOT NULL,
    drift_file_count integer NOT NULL,
    legacy_file_count integer NOT NULL,
    content_hash text NOT NULL,
    source_content_sha256 text NOT NULL,
    raw_shard jsonb NOT NULL,
    CONSTRAINT governance_component_file_shards_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_file_shards_drift_file_count_check CHECK ((drift_file_count >= 0)),
    CONSTRAINT governance_component_file_shards_file_count_check CHECK ((file_count >= 0)),
    CONSTRAINT governance_component_file_shards_legacy_file_count_check CHECK ((legacy_file_count >= 0)),
    CONSTRAINT governance_component_file_shards_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: governance_component_local_operations; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_local_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    component_id text NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_local_operatio_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_local_operations_expected_revision_check CHECK (((expected_revision IS NULL) OR (expected_revision >= 0))),
    CONSTRAINT governance_component_local_operations_operation_type_check CHECK ((operation_type = ANY (ARRAY['component_create'::text, 'component_revise'::text, 'component_reparent'::text]))),
    CONSTRAINT governance_component_local_operations_previous_revision_check CHECK ((previous_revision >= 0)),
    CONSTRAINT governance_component_local_operations_resulting_revision_check CHECK ((resulting_revision >= 0))
);


--
-- Name: governance_component_reparent_overrides; Type: TABLE; Schema: planning_query_store; Owner: -
--

CREATE TABLE planning_query_store.governance_component_reparent_overrides (
    component_id text NOT NULL,
    parent_id text NOT NULL,
    root_unit text NOT NULL,
    domain_unit text NOT NULL,
    unit_path jsonb NOT NULL,
    raw_component jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_path text NOT NULL,
    source_content_sha256 text NOT NULL,
    revision integer NOT NULL,
    updated_by text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT governance_component_reparent_overr_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT governance_component_reparent_overrides_revision_check CHECK ((revision >= 0)),
    CONSTRAINT governance_component_reparent_overrides_unit_path_check CHECK ((jsonb_typeof(unit_path) = 'array'::text))
);
