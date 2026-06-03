create schema if not exists architecture;

create table if not exists architecture.design (
  design_id text primary key,
  work_item_id text not null,
  title text not null,
  owner text not null,
  status text not null default 'proposed',
  rationale text not null,
  fowler_signal text not null default 'none',
  rail_ref text not null default 'none - architecture-authority-only',
  approved_at timestamptz,
  supersedes_id text references architecture.design(design_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint architecture_design_status_check check (
    status in ('proposed', 'review', 'approved', 'implementing', 'implemented', 'drift', 'superseded')
  ),
  constraint architecture_design_fowler_signal_check check (
    fowler_signal in (
      'anemic_domain',
      'boundary_drift',
      'feature_envy',
      'hidden_authority',
      'primitive_obsession',
      'published_language',
      'responsibility_overload',
      'evolutionary_architecture',
      'none'
    )
  ),
  constraint architecture_design_approved_timestamp_check check (
    status not in ('approved', 'implementing', 'implemented')
    or approved_at is not null
  )
);

create table if not exists architecture.design_scope (
  design_id text not null references architecture.design(design_id) on delete cascade,
  subject_kind text not null,
  subject_id text not null,
  scope_kind text not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (design_id, subject_kind, subject_id, scope_kind),
  constraint architecture_design_scope_subject_kind_check check (
    subject_kind in (
      'component',
      'relation',
      'contract',
      'flow',
      'check',
      'path',
      'query',
      'decision',
      'evidence',
      'risk',
      'test'
    )
  ),
  constraint architecture_design_scope_kind_check check (
    scope_kind in ('may_create', 'may_update', 'may_delete', 'may_reference', 'must_prove')
  )
);

create table if not exists architecture.component (
  component_id text primary key,
  name text not null,
  kind text not null,
  layer text not null,
  owner text not null,
  repo_path text not null,
  public_contract text not null default '',
  runtime text not null default 'none',
  criticality text not null default 'medium',
  status text not null default 'proposed',
  maturity_score numeric,
  parent_component_id text references architecture.component(component_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint architecture_component_kind_check check (
    kind in ('package', 'module', 'port', 'adapter', 'service', 'ui-view', 'workflow', 'dbt-model', 'api')
  ),
  constraint architecture_component_layer_check check (
    layer in ('domain', 'application', 'adapter', 'ui', 'infra', 'contracts')
  ),
  constraint architecture_component_criticality_check check (
    criticality in ('low', 'medium', 'high', 'critical')
  ),
  constraint architecture_component_status_check check (
    status in ('proposed', 'review', 'approved', 'implemented', 'deprecated', 'drift')
  ),
  constraint architecture_component_maturity_score_check check (
    maturity_score is null
    or (
      maturity_score >= 0
      and maturity_score <= 100
    )
  ),
  constraint architecture_component_parent_self_check check (
    parent_component_id is null
    or parent_component_id <> component_id
  )
);

create table if not exists architecture.component_responsibility (
  responsibility_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  responsibility text not null,
  reason_to_change text not null,
  ddd_owner text not null,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  constraint architecture_component_responsibility_status_check check (
    status in ('proposed', 'approved', 'implemented', 'drift')
  )
);

create table if not exists architecture.component_metric (
  metric_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  metric_name text not null,
  metric_value numeric not null,
  threshold_value numeric,
  measured_at timestamptz not null default now(),
  source_ref text not null,
  constraint architecture_component_metric_name_check check (
    metric_name in ('file_count', 'loc', 'fan_in', 'fan_out', 'test_count', 'coverage', 'maturity')
  )
);

create table if not exists architecture.contract (
  contract_id text primary key,
  contract_kind text not null,
  owner_component_id text not null references architecture.component(component_id) on delete restrict,
  contract_ref text not null,
  compatibility text not null default 'none',
  status text not null default 'proposed',
  validation_command text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint architecture_contract_kind_check check (
    contract_kind in ('api', 'event', 'port', 'storage', 'type', 'workflow', 'dbt')
  ),
  constraint architecture_contract_compatibility_check check (
    compatibility in ('breaking', 'additive', 'internal', 'none')
  ),
  constraint architecture_contract_status_check check (
    status in ('proposed', 'approved', 'implemented', 'deprecated')
  )
);

create table if not exists architecture.component_relation (
  relation_id text primary key,
  source_component_id text not null references architecture.component(component_id) on delete restrict,
  target_component_id text not null references architecture.component(component_id) on delete restrict,
  relation_type text not null,
  direction text not null,
  sync_async text not null,
  contract_id text references architecture.contract(contract_id) on delete set null,
  failure_mode text not null default 'not_documented',
  authorization_scope text not null default 'not_documented',
  source_refs jsonb not null default '[]'::jsonb,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint architecture_component_relation_type_check check (
    relation_type in (
      'contains',
      'depends_on',
      'calls',
      'publishes',
      'consumes',
      'reads',
      'writes',
      'implements_port',
      'exposes_api',
      'transforms',
      'guards'
    )
  ),
  constraint architecture_component_relation_direction_check check (
    direction in ('outbound', 'inbound', 'bidirectional')
  ),
  constraint architecture_component_relation_sync_async_check check (
    sync_async in ('sync', 'async', 'batch', 'build_time')
  ),
  constraint architecture_component_relation_status_check check (
    status in ('proposed', 'approved', 'implemented', 'drift')
  ),
  constraint architecture_component_relation_source_refs_check check (
    jsonb_typeof(source_refs) = 'array'
  ),
  constraint architecture_component_relation_no_self_check check (
    source_component_id <> target_component_id
  )
);

create table if not exists architecture.component_port (
  port_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  port_name text not null,
  port_kind text not null,
  direction text not null,
  input_contract_id text references architecture.contract(contract_id) on delete set null,
  output_contract_id text references architecture.contract(contract_id) on delete set null,
  negative_tests text[] not null default array[]::text[],
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  constraint architecture_component_port_kind_check check (
    port_kind in ('command', 'query', 'event', 'storage', 'api', 'ui-action')
  ),
  constraint architecture_component_port_direction_check check (
    direction in ('inbound', 'outbound')
  ),
  constraint architecture_component_port_status_check check (
    status in ('proposed', 'approved', 'implemented')
  )
);

create table if not exists architecture.decision (
  decision_id text primary key,
  decision_kind text not null,
  title text not null,
  status text not null default 'proposed',
  source_ref text not null,
  applies_to jsonb not null default '[]'::jsonb,
  rationale text not null,
  created_at timestamptz not null default now(),
  constraint architecture_decision_kind_check check (
    decision_kind in ('adr', 'proposal', 'risk_acceptance', 'implementation_choice')
  ),
  constraint architecture_decision_status_check check (
    status in ('proposed', 'accepted', 'superseded', 'rejected')
  ),
  constraint architecture_decision_applies_to_check check (
    jsonb_typeof(applies_to) = 'array'
  )
);

create table if not exists architecture.component_flow (
  flow_id text primary key,
  name text not null,
  entry_component_id text not null references architecture.component(component_id) on delete restrict,
  exit_component_id text not null references architecture.component(component_id) on delete restrict,
  flow_kind text not null,
  status text not null default 'proposed',
  criticality text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint architecture_component_flow_kind_check check (
    flow_kind in ('command', 'query', 'event', 'batch', 'ui')
  ),
  constraint architecture_component_flow_status_check check (
    status in ('proposed', 'approved', 'implemented', 'drift')
  ),
  constraint architecture_component_flow_criticality_check check (
    criticality in ('low', 'medium', 'high', 'critical')
  )
);

create table if not exists architecture.component_transformation (
  transformation_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  input_contract_id text references architecture.contract(contract_id) on delete set null,
  output_contract_id text references architecture.contract(contract_id) on delete set null,
  transformation_kind text not null,
  lossiness text not null default 'lossless',
  test_requirement text not null,
  created_at timestamptz not null default now(),
  constraint architecture_component_transformation_kind_check check (
    transformation_kind in ('mapping', 'projection', 'validation', 'normalization', 'enrichment')
  ),
  constraint architecture_component_transformation_lossiness_check check (
    lossiness in ('lossless', 'lossy', 'redacted', 'aggregated')
  )
);

create table if not exists architecture.component_flow_step (
  flow_id text not null references architecture.component_flow(flow_id) on delete cascade,
  step_order integer not null,
  component_id text not null references architecture.component(component_id) on delete restrict,
  relation_id text references architecture.component_relation(relation_id) on delete set null,
  input_contract_id text references architecture.contract(contract_id) on delete set null,
  output_contract_id text references architecture.contract(contract_id) on delete set null,
  transformation_id text references architecture.component_transformation(transformation_id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (flow_id, step_order),
  constraint architecture_component_flow_step_order_check check (step_order > 0)
);

create table if not exists architecture.component_event_io (
  event_io_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  event_name text not null,
  direction text not null,
  contract_id text references architecture.contract(contract_id) on delete set null,
  runtime text not null default 'none',
  created_at timestamptz not null default now(),
  constraint architecture_component_event_io_direction_check check (
    direction in ('consumes', 'emits')
  )
);

create table if not exists architecture.component_storage_io (
  storage_io_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  storage_object text not null,
  direction text not null,
  access_pattern text not null,
  contract_id text references architecture.contract(contract_id) on delete set null,
  created_at timestamptz not null default now(),
  constraint architecture_component_storage_io_direction_check check (
    direction in ('reads', 'writes')
  ),
  constraint architecture_component_storage_io_access_pattern_check check (
    access_pattern in ('transactional', 'projection', 'bulk', 'migration', 'read_only')
  )
);

create table if not exists architecture.component_test (
  test_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  required boolean not null default true,
  validation_command text not null,
  created_at timestamptz not null default now(),
  constraint architecture_component_test_kind_check check (
    test_kind in ('unit', 'contract', 'integration', 'architecture', 'e2e', 'property')
  ),
  constraint architecture_component_test_coverage_level_check check (
    coverage_level in ('smoke', 'behavior', 'negative', 'boundary', 'flow')
  )
);

create table if not exists architecture.component_observability (
  observability_id text primary key,
  component_id text not null references architecture.component(component_id) on delete cascade,
  signal_name text not null,
  signal_kind text not null,
  required boolean not null default true,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  constraint architecture_component_observability_signal_kind_check check (
    signal_kind in ('metric', 'log', 'trace', 'alert', 'dashboard')
  ),
  constraint architecture_component_observability_status_check check (
    status in ('proposed', 'implemented', 'missing', 'not_applicable')
  )
);

create table if not exists architecture.risk (
  risk_id text primary key,
  component_id text references architecture.component(component_id) on delete set null,
  severity text not null,
  probability text not null,
  status text not null default 'open',
  source_ref text not null,
  created_at timestamptz not null default now(),
  constraint architecture_risk_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint architecture_risk_probability_check check (
    probability in ('low', 'medium', 'high')
  ),
  constraint architecture_risk_status_check check (
    status in ('open', 'mitigated', 'accepted', 'closed')
  )
);

create table if not exists architecture.evidence (
  evidence_id text primary key,
  subject_kind text not null,
  subject_id text not null,
  evidence_kind text not null,
  source_ref text not null,
  result_state text not null,
  recorded_at timestamptz not null default now(),
  source_content_sha256 text,
  constraint architecture_evidence_subject_kind_check check (
    subject_kind in ('component', 'relation', 'contract', 'flow', 'decision', 'check')
  ),
  constraint architecture_evidence_kind_check check (
    evidence_kind in ('test', 'query', 'doc', 'risk', 'screenshot', 'ci')
  ),
  constraint architecture_evidence_result_state_check check (
    result_state in ('pass', 'fail', 'missing', 'stale')
  )
);

create table if not exists architecture.component_health_check (
  check_id text primary key,
  subject_kind text not null,
  subject_id text not null,
  check_kind text not null,
  severity text not null,
  predicate text not null,
  query_ref text not null,
  status text not null default 'not_indexed',
  created_at timestamptz not null default now(),
  constraint architecture_component_health_check_subject_kind_check check (
    subject_kind in ('component', 'relation', 'contract', 'flow')
  ),
  constraint architecture_component_health_check_kind_check check (
    check_kind in ('design', 'implementation', 'test', 'observability', 'risk', 'drift')
  ),
  constraint architecture_component_health_check_severity_check check (
    severity in ('info', 'warning', 'error', 'blocker')
  ),
  constraint architecture_component_health_check_status_check check (
    status in ('pass', 'fail', 'not_applicable', 'not_indexed')
  )
);

create index if not exists architecture_design_work_item_idx
  on architecture.design (work_item_id, status);

create index if not exists architecture_design_scope_subject_idx
  on architecture.design_scope (subject_kind, subject_id, scope_kind);

create index if not exists architecture_component_owner_idx
  on architecture.component (owner, layer, kind);

create index if not exists architecture_component_parent_idx
  on architecture.component (parent_component_id);

create index if not exists architecture_component_repo_path_idx
  on architecture.component (repo_path);

create index if not exists architecture_contract_owner_idx
  on architecture.contract (owner_component_id, contract_kind);

create index if not exists architecture_relation_source_idx
  on architecture.component_relation (source_component_id, relation_type);

create index if not exists architecture_relation_target_idx
  on architecture.component_relation (target_component_id, relation_type);

create index if not exists architecture_port_component_idx
  on architecture.component_port (component_id, direction, port_kind);

create index if not exists architecture_flow_step_component_idx
  on architecture.component_flow_step (component_id);

create index if not exists architecture_event_io_component_idx
  on architecture.component_event_io (component_id, direction);

create index if not exists architecture_storage_io_component_idx
  on architecture.component_storage_io (component_id, direction);

create index if not exists architecture_test_component_idx
  on architecture.component_test (component_id, required, test_kind);

create index if not exists architecture_observability_component_idx
  on architecture.component_observability (component_id, required, signal_kind);

create index if not exists architecture_risk_component_idx
  on architecture.risk (component_id, status, severity);

create index if not exists architecture_evidence_subject_idx
  on architecture.evidence (subject_kind, subject_id, result_state);

create index if not exists architecture_health_check_subject_idx
  on architecture.component_health_check (subject_kind, subject_id, severity, status);
