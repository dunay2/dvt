--
-- Name: component; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component (
    component_id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    layer text NOT NULL,
    owner text NOT NULL,
    repo_path text NOT NULL,
    public_contract text DEFAULT ''::text NOT NULL,
    runtime text DEFAULT 'none'::text NOT NULL,
    criticality text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    maturity_score numeric,
    parent_component_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_criticality_check CHECK ((criticality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT architecture_component_kind_check CHECK ((kind = ANY (ARRAY['package'::text, 'module'::text, 'port'::text, 'adapter'::text, 'service'::text, 'ui-view'::text, 'workflow'::text, 'dbt-model'::text, 'api'::text]))),
    CONSTRAINT architecture_component_layer_check CHECK ((layer = ANY (ARRAY['domain'::text, 'application'::text, 'adapter'::text, 'ui'::text, 'infra'::text, 'contracts'::text]))),
    CONSTRAINT architecture_component_maturity_score_check CHECK (((maturity_score IS NULL) OR ((maturity_score >= (0)::numeric) AND (maturity_score <= (100)::numeric)))),
    CONSTRAINT architecture_component_parent_self_check CHECK (((parent_component_id IS NULL) OR (parent_component_id <> component_id))),
    CONSTRAINT architecture_component_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'review'::text, 'approved'::text, 'implemented'::text, 'deprecated'::text, 'drift'::text])))
);


--
-- Name: contract; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.contract (
    contract_id text NOT NULL,
    contract_kind text NOT NULL,
    owner_component_id text NOT NULL,
    contract_ref text NOT NULL,
    compatibility text DEFAULT 'none'::text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    validation_command text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_contract_compatibility_check CHECK ((compatibility = ANY (ARRAY['breaking'::text, 'additive'::text, 'internal'::text, 'none'::text]))),
    CONSTRAINT architecture_contract_kind_check CHECK ((contract_kind = ANY (ARRAY['api'::text, 'event'::text, 'port'::text, 'storage'::text, 'type'::text, 'workflow'::text, 'dbt'::text]))),
    CONSTRAINT architecture_contract_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'deprecated'::text])))
);


--
-- Name: component_dependency_observation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_dependency_observation (
    observation_id text NOT NULL,
    scan_id text NOT NULL,
    source_path text NOT NULL,
    target_path text,
    import_literal text NOT NULL,
    workspace_name text DEFAULT ''::text NOT NULL,
    package_name text DEFAULT ''::text NOT NULL,
    source_content_sha256 text NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    source_component_id text,
    target_component_id text,
    source_mapping_state text DEFAULT 'unmapped'::text NOT NULL,
    target_mapping_state text DEFAULT 'unmapped'::text NOT NULL,
    mapping_confidence numeric DEFAULT 0 NOT NULL,
    mapping_reason text NOT NULL,
    relation_type text DEFAULT 'depends_on'::text NOT NULL,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT architecture_component_dependency_observation_confidence_check CHECK (((mapping_confidence >= (0)::numeric) AND (mapping_confidence <= (1)::numeric))),
    CONSTRAINT architecture_component_dependency_observation_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT architecture_component_dependency_observation_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT architecture_component_dependency_observation_relation_type_che CHECK ((relation_type = ANY (ARRAY['depends_on'::text, 'calls'::text, 'reads'::text, 'writes'::text, 'publishes'::text, 'consumes'::text, 'implements_port'::text, 'exposes_api'::text, 'guards'::text]))),
    CONSTRAINT architecture_component_dependency_observation_source_mapping_ch CHECK ((source_mapping_state = ANY (ARRAY['mapped'::text, 'ambiguous'::text, 'unmapped'::text, 'external'::text, 'self'::text]))),
    CONSTRAINT architecture_component_dependency_observation_target_mapping_ch CHECK ((target_mapping_state = ANY (ARRAY['mapped'::text, 'ambiguous'::text, 'unmapped'::text, 'external'::text, 'self'::text])))
);


--
-- Name: component_dependency_scan; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_dependency_scan (
    scan_id text NOT NULL,
    design_id text,
    scanner_version text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    scan_state text DEFAULT 'recorded'::text NOT NULL,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT architecture_component_dependency_scan_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT architecture_component_dependency_scan_source_hash_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT architecture_component_dependency_scan_state_check CHECK ((scan_state = ANY (ARRAY['recorded'::text, 'evaluated'::text, 'stale'::text, 'failed'::text])))
);


--
-- Name: component_relation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_relation (
    relation_id text NOT NULL,
    source_component_id text NOT NULL,
    target_component_id text NOT NULL,
    relation_type text NOT NULL,
    direction text NOT NULL,
    sync_async text NOT NULL,
    contract_id text,
    failure_mode text DEFAULT 'not_documented'::text NOT NULL,
    authorization_scope text DEFAULT 'not_documented'::text NOT NULL,
    source_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_relation_direction_check CHECK ((direction = ANY (ARRAY['outbound'::text, 'inbound'::text, 'bidirectional'::text]))),
    CONSTRAINT architecture_component_relation_no_self_check CHECK ((source_component_id <> target_component_id)),
    CONSTRAINT architecture_component_relation_source_refs_check CHECK ((jsonb_typeof(source_refs) = 'array'::text)),
    CONSTRAINT architecture_component_relation_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'deprecated'::text, 'drift'::text]))),
    CONSTRAINT architecture_component_relation_sync_async_check CHECK ((sync_async = ANY (ARRAY['sync'::text, 'async'::text, 'batch'::text, 'build_time'::text]))),
    CONSTRAINT architecture_component_relation_type_check CHECK ((relation_type = ANY (ARRAY['contains'::text, 'depends_on'::text, 'calls'::text, 'publishes'::text, 'consumes'::text, 'reads'::text, 'writes'::text, 'implements_port'::text, 'exposes_api'::text, 'transforms'::text, 'guards'::text])))
);


--
-- Name: component_health_check; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_health_check (
    check_id text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    check_kind text NOT NULL,
    severity text NOT NULL,
    predicate text NOT NULL,
    query_ref text NOT NULL,
    status text DEFAULT 'not_indexed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_health_check_kind_check CHECK ((check_kind = ANY (ARRAY['design'::text, 'implementation'::text, 'test'::text, 'observability'::text, 'risk'::text, 'drift'::text]))),
    CONSTRAINT architecture_component_health_check_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'blocker'::text]))),
    CONSTRAINT architecture_component_health_check_status_check CHECK ((status = ANY (ARRAY['pass'::text, 'fail'::text, 'not_applicable'::text, 'not_indexed'::text]))),
    CONSTRAINT architecture_component_health_check_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['component'::text, 'relation'::text, 'contract'::text, 'flow'::text])))
);


--
-- Name: component_event_io; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_event_io (
    event_io_id text NOT NULL,
    component_id text NOT NULL,
    event_name text NOT NULL,
    direction text NOT NULL,
    contract_id text,
    runtime text DEFAULT 'none'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_event_io_direction_check CHECK ((direction = ANY (ARRAY['consumes'::text, 'emits'::text])))
);


--
-- Name: component_fitness_evaluation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_fitness_evaluation (
    evaluation_id text NOT NULL,
    scan_id text NOT NULL,
    fitness_rule_id text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    result_state text NOT NULL,
    severity text NOT NULL,
    reason text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_fitness_evaluation_evidence_check CHECK ((jsonb_typeof(evidence) = 'object'::text)),
    CONSTRAINT architecture_component_fitness_evaluation_result_state_check CHECK ((result_state = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'not_applicable'::text, 'not_evaluated'::text]))),
    CONSTRAINT architecture_component_fitness_evaluation_rule_check CHECK ((fitness_rule_id = ANY (ARRAY['DVT-ARCH-001'::text, 'DVT-ARCH-002'::text, 'DVT-ARCH-003'::text, 'DVT-ARCH-004'::text, 'DVT-ARCH-005'::text, 'DVT-ARCH-006'::text, 'DVT-ARCH-007'::text, 'DVT-ARCH-008'::text, 'DVT-ARCH-009'::text, 'DVT-ARCH-010'::text]))),
    CONSTRAINT architecture_component_fitness_evaluation_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'blocker'::text]))),
    CONSTRAINT architecture_component_fitness_evaluation_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['scan'::text, 'path'::text, 'component'::text, 'relation'::text, 'observation'::text])))
);


--
-- Name: component_flow; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_flow (
    flow_id text NOT NULL,
    name text NOT NULL,
    entry_component_id text NOT NULL,
    exit_component_id text NOT NULL,
    flow_kind text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    criticality text DEFAULT 'medium'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_flow_criticality_check CHECK ((criticality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT architecture_component_flow_kind_check CHECK ((flow_kind = ANY (ARRAY['command'::text, 'query'::text, 'event'::text, 'batch'::text, 'ui'::text]))),
    CONSTRAINT architecture_component_flow_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'drift'::text])))
);


--
-- Name: component_flow_step; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_flow_step (
    flow_id text NOT NULL,
    step_order integer NOT NULL,
    component_id text NOT NULL,
    relation_id text,
    input_contract_id text,
    output_contract_id text,
    transformation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_flow_step_order_check CHECK ((step_order > 0))
);


--
-- Name: component_transformation; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_transformation (
    transformation_id text NOT NULL,
    component_id text NOT NULL,
    input_contract_id text,
    output_contract_id text,
    transformation_kind text NOT NULL,
    lossiness text DEFAULT 'lossless'::text NOT NULL,
    test_requirement text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_transformation_kind_check CHECK ((transformation_kind = ANY (ARRAY['mapping'::text, 'projection'::text, 'validation'::text, 'normalization'::text, 'enrichment'::text]))),
    CONSTRAINT architecture_component_transformation_lossiness_check CHECK ((lossiness = ANY (ARRAY['lossless'::text, 'lossy'::text, 'redacted'::text, 'aggregated'::text])))
);


--
-- Name: component_port; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_port (
    port_id text NOT NULL,
    component_id text NOT NULL,
    port_name text NOT NULL,
    port_kind text NOT NULL,
    direction text NOT NULL,
    input_contract_id text,
    output_contract_id text,
    negative_tests text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_port_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT architecture_component_port_kind_check CHECK ((port_kind = ANY (ARRAY['command'::text, 'query'::text, 'event'::text, 'storage'::text, 'api'::text, 'ui-action'::text]))),
    CONSTRAINT architecture_component_port_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text])))
);


--
-- Name: component_storage_io; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_storage_io (
    storage_io_id text NOT NULL,
    component_id text NOT NULL,
    storage_object text NOT NULL,
    direction text NOT NULL,
    access_pattern text NOT NULL,
    contract_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_storage_io_access_pattern_check CHECK ((access_pattern = ANY (ARRAY['transactional'::text, 'projection'::text, 'bulk'::text, 'migration'::text, 'read_only'::text]))),
    CONSTRAINT architecture_component_storage_io_direction_check CHECK ((direction = ANY (ARRAY['reads'::text, 'writes'::text])))
);


--
-- Name: component_metric; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_metric (
    metric_id text NOT NULL,
    component_id text NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    threshold_value numeric,
    measured_at timestamp with time zone DEFAULT now() NOT NULL,
    source_ref text NOT NULL,
    CONSTRAINT architecture_component_metric_name_check CHECK ((metric_name = ANY (ARRAY['file_count'::text, 'loc'::text, 'fan_in'::text, 'fan_out'::text, 'test_count'::text, 'coverage'::text, 'maturity'::text])))
);


--
-- Name: component_observability; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_observability (
    observability_id text NOT NULL,
    component_id text NOT NULL,
    signal_name text NOT NULL,
    signal_kind text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_observability_signal_kind_check CHECK ((signal_kind = ANY (ARRAY['metric'::text, 'log'::text, 'trace'::text, 'alert'::text, 'dashboard'::text]))),
    CONSTRAINT architecture_component_observability_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'implemented'::text, 'missing'::text, 'not_applicable'::text])))
);


--
-- Name: component_responsibility; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_responsibility (
    responsibility_id text NOT NULL,
    component_id text NOT NULL,
    responsibility text NOT NULL,
    reason_to_change text NOT NULL,
    ddd_owner text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_responsibility_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'implemented'::text, 'drift'::text])))
);


--
-- Name: component_test; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.component_test (
    test_id text NOT NULL,
    component_id text NOT NULL,
    test_path text NOT NULL,
    test_kind text NOT NULL,
    coverage_level text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    validation_command text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_component_test_coverage_level_check CHECK ((coverage_level = ANY (ARRAY['smoke'::text, 'behavior'::text, 'negative'::text, 'boundary'::text, 'flow'::text]))),
    CONSTRAINT architecture_component_test_kind_check CHECK ((test_kind = ANY (ARRAY['unit'::text, 'contract'::text, 'integration'::text, 'architecture'::text, 'e2e'::text, 'property'::text])))
);


--
-- Name: decision; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.decision (
    decision_id text NOT NULL,
    decision_kind text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    source_ref text NOT NULL,
    applies_to jsonb DEFAULT '[]'::jsonb NOT NULL,
    rationale text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_decision_applies_to_check CHECK ((jsonb_typeof(applies_to) = 'array'::text)),
    CONSTRAINT architecture_decision_kind_check CHECK ((decision_kind = ANY (ARRAY['adr'::text, 'proposal'::text, 'risk_acceptance'::text, 'implementation_choice'::text]))),
    CONSTRAINT architecture_decision_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'superseded'::text, 'rejected'::text])))
);


--
-- Name: risk; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.risk (
    risk_id text NOT NULL,
    component_id text,
    severity text NOT NULL,
    probability text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    source_ref text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_risk_probability_check CHECK ((probability = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT architecture_risk_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT architecture_risk_status_check CHECK ((status = ANY (ARRAY['open'::text, 'mitigated'::text, 'accepted'::text, 'closed'::text])))
);


--
-- Name: design; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.design (
    design_id text NOT NULL,
    work_item_id text NOT NULL,
    title text NOT NULL,
    owner text NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    rationale text NOT NULL,
    fowler_signal text DEFAULT 'none'::text NOT NULL,
    rail_ref text NOT NULL,
    approved_at timestamp with time zone,
    supersedes_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_design_approved_timestamp_check CHECK (((status <> ALL (ARRAY['approved'::text, 'implementing'::text, 'implemented'::text])) OR (approved_at IS NOT NULL))),
    CONSTRAINT architecture_design_explicit_rail_ref_check CHECK (((btrim(rail_ref) <> ''::text) AND (lower(btrim(rail_ref)) <> ALL (ARRAY['none'::text, 'n/a'::text, 'not-applicable'::text, 'none - architecture-authority-only'::text])))),
    CONSTRAINT architecture_design_fowler_signal_check CHECK ((fowler_signal = ANY (ARRAY['anemic_domain'::text, 'boundary_drift'::text, 'feature_envy'::text, 'hidden_authority'::text, 'primitive_obsession'::text, 'published_language'::text, 'responsibility_overload'::text, 'evolutionary_architecture'::text, 'none'::text]))),
    CONSTRAINT architecture_design_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'review'::text, 'approved'::text, 'implementing'::text, 'implemented'::text, 'drift'::text, 'superseded'::text])))
);


--
-- Name: design_operations; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.design_operations (
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    actor text NOT NULL,
    design_id text NOT NULL,
    source_ref text NOT NULL,
    source_content_sha256 text NOT NULL,
    expected_revision integer,
    previous_revision integer NOT NULL,
    resulting_revision integer NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_design_operations_type_check CHECK ((operation_type = ANY (ARRAY['architecture_design_create'::text, 'architecture_design_transition'::text, 'architecture_component_record'::text, 'architecture_component_responsibility_retire'::text, 'architecture_relation_record'::text, 'architecture_contract_record'::text, 'architecture_port_record'::text, 'architecture_storage_io_record'::text, 'architecture_fitness_scan'::text, 'architecture_test_record'::text, 'architecture_test_retire'::text, 'architecture_observability_record'::text, 'architecture_evidence_record'::text, 'architecture_evidence_retire'::text]))),
    CONSTRAINT design_operations_expected_revision_check CHECK (((expected_revision IS NULL) OR (expected_revision >= 0))),
    CONSTRAINT design_operations_previous_revision_check CHECK ((previous_revision >= 0)),
    CONSTRAINT design_operations_resulting_revision_check CHECK ((resulting_revision >= 0)),
    CONSTRAINT design_operations_source_content_sha256_check CHECK ((source_content_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: design_scope; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.design_scope (
    design_id text NOT NULL,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    scope_kind text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT architecture_design_scope_kind_check CHECK ((scope_kind = ANY (ARRAY['may_create'::text, 'may_update'::text, 'may_delete'::text, 'may_reference'::text, 'must_prove'::text]))),
    CONSTRAINT architecture_design_scope_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['component'::text, 'relation'::text, 'contract'::text, 'port'::text, 'flow'::text, 'check'::text, 'path'::text, 'command'::text, 'query'::text, 'decision'::text, 'evidence'::text, 'risk'::text, 'test'::text])))
);


--
-- Name: evidence; Type: TABLE; Schema: architecture; Owner: -
--

CREATE TABLE architecture.evidence (
    evidence_id text NOT NULL,
    design_id text,
    subject_kind text NOT NULL,
    subject_id text NOT NULL,
    evidence_kind text NOT NULL,
    evidence_origin text NOT NULL,
    source_ref text NOT NULL,
    source_path text,
    result_state text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    source_content_sha256 text,
    implementation_content_sha256 text,
    CONSTRAINT architecture_evidence_execution_provenance_check CHECK ((((evidence_origin = ANY (ARRAY['declared'::text, 'imported_assertion'::text])) AND (design_id IS NULL) AND (source_path IS NULL)) OR ((evidence_origin = ANY (ARRAY['local_execution'::text, 'ci_execution'::text])) AND (design_id IS NOT NULL) AND (source_path IS NOT NULL) AND (source_content_sha256 ~ '^[a-f0-9]{64}$'::text)))),
    CONSTRAINT architecture_evidence_implementation_hash_check CHECK (((implementation_content_sha256 IS NULL) OR (implementation_content_sha256 ~ '^[a-f0-9]{64}$'::text))),
    CONSTRAINT architecture_evidence_kind_check CHECK ((evidence_kind = ANY (ARRAY['test'::text, 'query'::text, 'doc'::text, 'risk'::text, 'screenshot'::text, 'ci'::text]))),
    CONSTRAINT architecture_evidence_origin_check CHECK ((evidence_origin = ANY (ARRAY['declared'::text, 'imported_assertion'::text, 'local_execution'::text, 'ci_execution'::text]))),
    CONSTRAINT architecture_evidence_result_state_check CHECK ((result_state = ANY (ARRAY['pass'::text, 'fail'::text, 'missing'::text, 'stale'::text]))),
    CONSTRAINT architecture_evidence_subject_kind_check CHECK ((subject_kind = ANY (ARRAY['component'::text, 'command'::text, 'relation'::text, 'contract'::text, 'port'::text, 'flow'::text, 'check'::text, 'path'::text, 'query'::text, 'decision'::text, 'evidence'::text, 'risk'::text, 'test'::text])))
);
