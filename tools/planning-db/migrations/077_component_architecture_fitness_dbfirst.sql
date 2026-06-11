create table if not exists architecture.component_dependency_scan (
  scan_id text primary key,
  design_id text references architecture.design(design_id) on delete set null,
  scanner_version text not null,
  source_ref text not null,
  source_content_sha256 text not null,
  scan_state text not null default 'recorded',
  scanned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint architecture_component_dependency_scan_state_check check (
    scan_state in ('recorded', 'evaluated', 'stale', 'failed')
  ),
  constraint architecture_component_dependency_scan_source_hash_check check (
    source_content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint architecture_component_dependency_scan_metadata_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create table if not exists architecture.component_dependency_observation (
  observation_id text primary key,
  scan_id text not null references architecture.component_dependency_scan(scan_id) on delete cascade,
  source_path text not null,
  target_path text,
  import_literal text not null,
  workspace_name text not null default '',
  package_name text not null default '',
  source_content_sha256 text not null,
  is_test boolean not null default false,
  source_component_id text references architecture.component(component_id) on delete set null,
  target_component_id text references architecture.component(component_id) on delete set null,
  source_mapping_state text not null default 'unmapped',
  target_mapping_state text not null default 'unmapped',
  mapping_confidence numeric not null default 0,
  mapping_reason text not null,
  relation_type text not null default 'depends_on',
  observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint architecture_component_dependency_observation_hash_check check (
    source_content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint architecture_component_dependency_observation_source_mapping_check check (
    source_mapping_state in ('mapped', 'ambiguous', 'unmapped', 'external', 'self')
  ),
  constraint architecture_component_dependency_observation_target_mapping_check check (
    target_mapping_state in ('mapped', 'ambiguous', 'unmapped', 'external', 'self')
  ),
  constraint architecture_component_dependency_observation_confidence_check check (
    mapping_confidence >= 0
    and mapping_confidence <= 1
  ),
  constraint architecture_component_dependency_observation_relation_type_check check (
    relation_type in (
      'depends_on',
      'calls',
      'reads',
      'writes',
      'publishes',
      'consumes',
      'implements_port',
      'exposes_api',
      'guards'
    )
  ),
  constraint architecture_component_dependency_observation_metadata_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create table if not exists architecture.component_fitness_evaluation (
  evaluation_id text primary key,
  scan_id text not null references architecture.component_dependency_scan(scan_id) on delete cascade,
  fitness_rule_id text not null,
  subject_kind text not null,
  subject_id text not null,
  result_state text not null,
  severity text not null,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null default now(),
  constraint architecture_component_fitness_evaluation_rule_check check (
    fitness_rule_id in (
      'DVT-ARCH-001',
      'DVT-ARCH-002',
      'DVT-ARCH-003',
      'DVT-ARCH-004',
      'DVT-ARCH-005',
      'DVT-ARCH-006',
      'DVT-ARCH-007',
      'DVT-ARCH-008',
      'DVT-ARCH-009',
      'DVT-ARCH-010'
    )
  ),
  constraint architecture_component_fitness_evaluation_subject_kind_check check (
    subject_kind in ('scan', 'path', 'component', 'relation', 'observation')
  ),
  constraint architecture_component_fitness_evaluation_result_state_check check (
    result_state in ('pass', 'fail', 'warning', 'not_applicable', 'not_evaluated')
  ),
  constraint architecture_component_fitness_evaluation_severity_check check (
    severity in ('info', 'warning', 'error', 'blocker')
  ),
  constraint architecture_component_fitness_evaluation_evidence_check check (
    jsonb_typeof(evidence) = 'object'
  )
);

create index if not exists architecture_component_dependency_scan_design_idx
  on architecture.component_dependency_scan (design_id, scan_state, scanned_at desc);

create index if not exists architecture_component_dependency_observation_scan_idx
  on architecture.component_dependency_observation (scan_id, source_path);

create index if not exists architecture_component_dependency_observation_source_component_idx
  on architecture.component_dependency_observation (source_component_id, relation_type);

create index if not exists architecture_component_dependency_observation_target_component_idx
  on architecture.component_dependency_observation (target_component_id, relation_type);

create index if not exists architecture_component_fitness_evaluation_scan_idx
  on architecture.component_fitness_evaluation (scan_id, fitness_rule_id, result_state);

create or replace view architecture.component_dependency_observation_query as
select
  observation.observation_id,
  observation.scan_id,
  scan.design_id,
  scan.scan_state,
  observation.source_path,
  observation.target_path,
  observation.import_literal,
  observation.workspace_name,
  observation.package_name,
  observation.source_content_sha256,
  observation.is_test,
  observation.source_component_id,
  source_component.name as source_component_name,
  observation.target_component_id,
  target_component.name as target_component_name,
  observation.source_mapping_state,
  observation.target_mapping_state,
  observation.mapping_confidence,
  observation.mapping_reason,
  observation.relation_type,
  observation.observed_at,
  observation.metadata
from architecture.component_dependency_observation observation
join architecture.component_dependency_scan scan
  on scan.scan_id = observation.scan_id
left join architecture.component source_component
  on source_component.component_id = observation.source_component_id
left join architecture.component target_component
  on target_component.component_id = observation.target_component_id;

create or replace view architecture.component_path_mapping_query as
select
  observation.scan_id,
  scan.design_id,
  'source'::text as path_role,
  observation.source_path as path,
  observation.source_component_id as component_id,
  source_component.name as component_name,
  observation.source_mapping_state as mapping_state,
  observation.mapping_confidence,
  observation.mapping_reason,
  observation.source_content_sha256
from architecture.component_dependency_observation observation
join architecture.component_dependency_scan scan
  on scan.scan_id = observation.scan_id
left join architecture.component source_component
  on source_component.component_id = observation.source_component_id
union all
select
  observation.scan_id,
  scan.design_id,
  'target'::text as path_role,
  observation.target_path as path,
  observation.target_component_id as component_id,
  target_component.name as component_name,
  observation.target_mapping_state as mapping_state,
  observation.mapping_confidence,
  observation.mapping_reason,
  observation.source_content_sha256
from architecture.component_dependency_observation observation
join architecture.component_dependency_scan scan
  on scan.scan_id = observation.scan_id
left join architecture.component target_component
  on target_component.component_id = observation.target_component_id
where observation.target_path is not null;

create or replace view architecture.component_dependency_classification_query as
with classified as (
  select
    observation.*,
    declared.relation_id as declared_relation_id,
    reverse_declared.relation_id as reverse_declared_relation_id,
    case
      when observation.source_mapping_state = 'unmapped' then 'unmapped_source'
      when observation.target_mapping_state = 'unmapped' then 'unmapped_target'
      when observation.source_mapping_state = 'ambiguous'
        or observation.target_mapping_state = 'ambiguous'
        then 'ambiguous_mapping'
      when observation.target_mapping_state = 'external' then 'external_dependency'
      when observation.source_component_id is not null
        and observation.source_component_id = observation.target_component_id
        then 'self_dependency'
      when declared.relation_id is not null then 'declared'
      when reverse_declared.relation_id is not null then 'reverse_declared'
      else 'undeclared_dependency'
    end as dependency_classification
  from architecture.component_dependency_observation_query observation
  left join architecture.component_relation declared
    on declared.source_component_id = observation.source_component_id
   and declared.target_component_id = observation.target_component_id
   and declared.relation_type = observation.relation_type
   and declared.status in ('approved', 'implemented')
  left join architecture.component_relation reverse_declared
    on reverse_declared.source_component_id = observation.target_component_id
   and reverse_declared.target_component_id = observation.source_component_id
   and reverse_declared.relation_type = observation.relation_type
   and reverse_declared.status in ('approved', 'implemented')
)
select
  observation_id,
  scan_id,
  design_id,
  source_path,
  target_path,
  import_literal,
  source_component_id,
  source_component_name,
  target_component_id,
  target_component_name,
  relation_type,
  coalesce(declared_relation_id, reverse_declared_relation_id) as matched_relation_id,
  dependency_classification,
  case
    when dependency_classification in ('declared', 'external_dependency', 'self_dependency')
      then 'pass'
    when dependency_classification in ('unmapped_source', 'unmapped_target', 'undeclared_dependency')
      then 'fail'
    else 'warning'
  end as fitness_state,
  mapping_confidence,
  mapping_reason,
  is_test,
  source_content_sha256
from classified;

create or replace view architecture.component_fitness_query as
select
  evaluation.scan_id,
  scan.design_id,
  evaluation.fitness_rule_id,
  evaluation.subject_kind,
  evaluation.subject_id,
  evaluation.result_state,
  evaluation.severity,
  evaluation.reason,
  evaluation.evidence,
  evaluation.evaluated_at
from architecture.component_fitness_evaluation evaluation
join architecture.component_dependency_scan scan
  on scan.scan_id = evaluation.scan_id
union all
select
  classification.scan_id,
  classification.design_id,
  case classification.dependency_classification
    when 'unmapped_source' then 'DVT-ARCH-001'
    when 'ambiguous_mapping' then 'DVT-ARCH-002'
    when 'unmapped_target' then 'DVT-ARCH-002'
    when 'undeclared_dependency' then 'DVT-ARCH-003'
    when 'reverse_declared' then 'DVT-ARCH-004'
    else 'DVT-ARCH-005'
  end as fitness_rule_id,
  'observation'::text as subject_kind,
  classification.observation_id as subject_id,
  classification.fitness_state as result_state,
  case classification.fitness_state
    when 'fail' then 'error'
    when 'warning' then 'warning'
    else 'info'
  end as severity,
  case classification.dependency_classification
    when 'unmapped_source' then 'Observed source path is not mapped to an architecture component.'
    when 'unmapped_target' then 'Observed target path is not mapped to an architecture component.'
    when 'ambiguous_mapping' then 'Observed dependency has ambiguous component mapping.'
    when 'undeclared_dependency' then 'Observed internal dependency is not declared in architecture.component_relation.'
    when 'reverse_declared' then 'Observed dependency only matches a relation in the opposite direction.'
    when 'external_dependency' then 'Observed dependency is external to the architecture component graph.'
    when 'self_dependency' then 'Observed dependency remains within the same component.'
    else 'Observed dependency matches an approved or implemented architecture relation.'
  end as reason,
  jsonb_build_object(
    'sourcePath', classification.source_path,
    'targetPath', classification.target_path,
    'importLiteral', classification.import_literal,
    'sourceComponentId', classification.source_component_id,
    'targetComponentId', classification.target_component_id,
    'relationType', classification.relation_type,
    'classification', classification.dependency_classification
  ) as evidence,
  now() as evaluated_at
from architecture.component_dependency_classification_query classification;
