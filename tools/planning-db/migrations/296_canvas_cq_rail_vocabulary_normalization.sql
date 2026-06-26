-- Normalize Canvas UX specification rail vocabulary before UI implementation.
-- Raw TAREA-derived rows remain historical evidence; this view is the effective
-- DB-first specification surface consumed by planning-db queries and drift checks.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'CANVAS-CQ-RAIL-VOCABULARY-NORMALIZATION-20260626',
  'E-CANVAS-CQ-RAIL-VOCABULARY-NORMALIZE-1',
  'Canvas command/query rail vocabulary normalization',
  'Frontend / Planning DB',
  'review',
  'Canvas UX records must use canonical command/query rail vocabulary before graph, shell, source import, node workbench, SQL workbench, project explorer, manual export or browser-proof UI slices are implemented.',
  'hidden_authority',
  'ListCanvasCqRailVocabularyNormalization',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

create or replace view planning_query_store.canvas_uxdb_canonical_specification_query as
with rail_overrides as (
  select *
  from (
    values
      (
        'OpenCanvasAddSourceDialog',
        'OpenCanvasSourceImportDialog',
        'canonical_source_import_dialog',
        'Add Source opens the canonical Source Import dialog rail.'
      ),
      (
        'OpenCanvasNodeWorkbench',
        'InspectCanvasNodeProperties',
        'canonical_node_properties_read_model',
        'Node Workbench sections are reached through the canonical node inspection read model.'
      ),
      (
        'PreviewCanvasExecutionPlan',
        'PreviewExecutionPlan',
        'canonical_execution_preview',
        'Execution Preview reuses the existing execution preview rail.'
      ),
      (
        'OpenCanvasSqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'canonical_workbench_context',
        'SQL workbench rendering resolves the existing Canvas workbench context rail.'
      )
  ) as override(requested_rail_name, canonical_rail_name, canonical_posture, reason)
)
select
  spec.record_id,
  spec.record_type,
  spec.record_title,
  spec.canonical_task_id,
  spec.component_id,
  coalesce(override.canonical_rail_name, spec.rail_name) as rail_name,
  spec.spec_state,
  case
    when override.canonical_rail_name is not null then override.canonical_posture
    else spec.legacy_posture
  end as legacy_posture,
  spec.source_path,
  spec.metadata || jsonb_build_object(
    'rawRailName',
    spec.rail_name,
    'railVocabularyNormalization',
    coalesce(override.reason, 'already canonical')
  ) as metadata
from planning_query_store.canvas_uxdb_specification_query spec
left join rail_overrides override
  on override.requested_rail_name = spec.rail_name;

create or replace view planning_query_store.canvas_cq_rail_drift_query as
with spec_rails as materialized (
  select
    spec.record_id,
    spec.record_type,
    spec.record_title,
    spec.canonical_task_id,
    spec.component_id,
    spec.rail_name as requested_rail_name,
    spec.spec_state,
    spec.legacy_posture,
    spec.source_path,
    spec.metadata
  from planning_query_store.canvas_uxdb_canonical_specification_query spec
  where nullif(btrim(spec.rail_name), '') is not null
    and spec.record_type in (
      'ux_decision',
      'ui_component',
      'context_action',
      'workbench_section',
      'command_query_rail',
      'anti_pattern',
      'acceptance_criterion',
      'test_requirement'
    )
),
matched as materialized (
  select
    spec_rails.*,
    rail.rail_id,
    rail.rail_type,
    rail.rail_status as canonical_rail_status,
    rail.is_gap,
    rail.is_duplicate,
    rail.implementation_ref_count,
    rail.source_path as canonical_rail_source_path
  from spec_rails
  left join planning_query_store.command_query_rail_query rail
    on rail.rail_name = spec_rails.requested_rail_name
)
select
  case
    when matched.rail_id is null and matched.spec_state = 'accepted' then 'blocker'
    when matched.rail_id is null then 'warning'
    when matched.is_duplicate then 'error'
    when matched.is_gap then 'error'
    when lower(coalesce(matched.canonical_rail_status, '')) in ('deprecated', 'retired') then 'error'
    else 'info'
  end as severity,
  case
    when matched.rail_id is null then 'missing_canonical_rail'
    when matched.is_duplicate then 'duplicate_canonical_rail'
    when matched.is_gap then 'gap_canonical_rail'
    when lower(coalesce(matched.canonical_rail_status, '')) in ('deprecated', 'retired') then
      'retired_canonical_rail'
    else 'ready'
  end as drift_state,
  matched.record_id,
  matched.record_type,
  matched.record_title,
  matched.canonical_task_id,
  matched.component_id,
  matched.requested_rail_name,
  matched.requested_rail_name as canonical_rail_name,
  coalesce(matched.rail_type, '-') as rail_type,
  coalesce(matched.canonical_rail_status, '-') as canonical_rail_status,
  case
    when matched.rail_id is null then
      'Register canonical Canvas rail ' || matched.requested_rail_name
      || ' before implementing ' || matched.record_id || '.'
    when matched.is_duplicate then
      'Resolve duplicate canonical rail ' || matched.requested_rail_name
      || ' before adding UI behavior.'
    when matched.is_gap then
      'Complete existing gap rail ' || matched.requested_rail_name
      || ' before adding UI behavior.'
    when lower(coalesce(matched.canonical_rail_status, '')) in ('deprecated', 'retired') then
      'Do not implement against retired/deprecated rail ' || matched.requested_rail_name || '.'
    else
      'Canvas UX record is aligned with canonical command/query rail ' || matched.requested_rail_name || '.'
  end as action_hint,
  matched.source_path,
  matched.metadata || jsonb_build_object(
    'canonicalRailSourcePath',
    coalesce(matched.canonical_rail_source_path, '-'),
    'specState',
    matched.spec_state,
    'legacyPosture',
    matched.legacy_posture
  ) as metadata
from matched;

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
select
  'local#E-CANVAS-CQ-RAIL-VOCABULARY-NORMALIZE-1#'
    || rail_type || '#'
    || lower(regexp_replace(rail_name, '([a-z0-9])([A-Z])', '\1-\2', 'g')) as rail_id,
  'E-CANVAS-CQ-RAIL-VOCABULARY-NORMALIZE-1' as feature_id,
  'implemented' as mechanization_status,
  rail_name,
  lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')) as normalized_rail_name,
  rail_type,
  ddd_owner,
  'implemented' as rail_status,
  jsonb_build_array('tools/planning-db/migrations/296_canvas_cq_rail_vocabulary_normalization.sql#' || rail_name) as symbol_refs,
  jsonb_build_array(
    'tools/planning-db/migrations/296_canvas_cq_rail_vocabulary_normalization.sql',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ) as implementation_refs,
  jsonb_build_array(
    'buzon/TAREA.TXT',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ) as documentation_refs,
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ) as governing_sources,
  jsonb_build_array(
    'tools/planning-db/migrations/296_canvas_cq_rail_vocabulary_normalization.sql',
    'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ) as allowed_implementation_surfaces,
  jsonb_build_array(
    'node --test --test-name-pattern "normalize Canvas UX command-query rail vocabulary" scripts/planning-db-migrate.test.cjs',
    'node --test --test-name-pattern "readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records" scripts/planning-db-query.test.cjs',
    'pnpm planning:db:query canvas-cq-rail-drift --state missing_canonical_rail --limit 20',
    'pnpm planning:db:query canvas-cq-rail-drift --state legacy_alias --limit 20'
  ) as architecture_guards,
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test --test-name-pattern "normalize Canvas UX command-query rail vocabulary" scripts/planning-db-migrate.test.cjs',
    'node --test --test-name-pattern "readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records" scripts/planning-db-query.test.cjs',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ) as completion_gate,
  'tools/planning-db/migrations/296_canvas_cq_rail_vocabulary_normalization.sql' as source_path,
  md5('E-CANVAS-CQ-RAIL-VOCABULARY-NORMALIZE-1:' || rail_name || ':296')
    || md5('canvas-cq-rail-vocabulary-normalization') as source_content_sha256,
  jsonb_build_object(
    'name', rail_name,
    'type', rail_type,
    'dddOwner', ddd_owner,
    'status', 'implemented'
  ) as raw_rail,
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-CQ-RAIL-VOCABULARY-NORMALIZE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Normalize Canvas UX rail vocabulary and register missing canonical rails before UI implementation.',
    'componentGuides',
    jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'userStories',
    jsonb_build_array(
      jsonb_build_object(
        'role',
        'Canvas implementer',
        'need',
        'Use one canonical command/query rail vocabulary before adding Canvas UI surfaces.',
        'acceptance',
        'planning:db:query canvas-cq-rail-drift has no legacy_alias or missing_canonical_rail rows for accepted Canvas UX records.'
      ),
      jsonb_build_object(
        'role',
        'Canvas reviewer',
        'need',
        'Reject legacy Add Source, Node Workbench, Plan and SQL Workbench aliases before UI work starts.',
        'acceptance',
        'canvas-uxdb-specification returns OpenCanvasSourceImportDialog, InspectCanvasNodeProperties, PreviewExecutionPlan and ResolveCanvasWorkbenchContext.'
      )
    ),
    'governingSources',
    jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'tools/planning-db/migrations/296_canvas_cq_rail_vocabulary_normalization.sql',
      'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'forbiddenImplementationSurfaces',
    jsonb_build_array('apps/**', 'packages/**', 'buzon/**#primary_spec_authority'),
    'domainObjects',
    jsonb_build_array(
      'CanvasCqRailVocabularyReadModel',
      'CanvasUxdbSpecificationReadModel',
      'CommandQueryRailCatalog',
      'CanvasGraphBasePresentation',
      'CanvasShellChromePresentation',
      'CanvasProjectExplorerSurface',
      'CanvasUxdbManualExport',
      'DbtCanvasBrowserProofReadModel',
      'DvtCanvasBrowserProofReadModel'
    ),
    'fowlerSignals',
    jsonb_build_array(
      'duplicate_semantics',
      'hidden_authority',
      'documentation_drift',
      'legacy_alias'
    ),
    'architectureGuards',
    jsonb_build_array(
      'node --test --test-name-pattern "normalize Canvas UX command-query rail vocabulary" scripts/planning-db-migrate.test.cjs',
      'node --test --test-name-pattern "readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records" scripts/planning-db-query.test.cjs',
      'pnpm planning:db:query canvas-cq-rail-drift --state missing_canonical_rail --limit 20',
      'pnpm planning:db:query canvas-cq-rail-drift --state legacy_alias --limit 20',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows',
    jsonb_build_array('not_applicable:planning_db_vocabulary_normalization'),
    'completionGate',
    jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test --test-name-pattern "normalize Canvas UX command-query rail vocabulary" scripts/planning-db-migrate.test.cjs',
      'node --test --test-name-pattern "readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records" scripts/planning-db-query.test.cjs',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name', rail_name,
        'type', rail_type,
        'dddOwner', ddd_owner,
        'status', 'implemented'
      )
    ),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'canonical-spec-query',
        'redTest',
        'node --test --test-name-pattern "readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records" scripts/planning-db-query.test.cjs',
        'expectedFailure',
        'Canvas UX specification query still read the raw TAREA-derived view.',
        'patchSurfaces',
        jsonb_build_array(
          'scripts/planning-db/queries/canvas-uxdb-specification-query.cjs',
          'scripts/planning-db-query.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records" scripts/planning-db-query.test.cjs'
      ),
      jsonb_build_object(
        'id', 'rail-vocabulary-normalization-migration',
        'redTest',
        'node --test --test-name-pattern "normalize Canvas UX command-query rail vocabulary" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'Migration 296 and canonical specification view were absent.',
        'patchSurfaces',
        jsonb_build_array(
          'tools/planning-db/migrations/296_canvas_cq_rail_vocabulary_normalization.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "normalize Canvas UX command-query rail vocabulary" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name', rail_name,
        'path', 'tools/planning-db/migrations/296_canvas_cq_rail_vocabulary_normalization.sql',
        'dddOwner', ddd_owner,
        'cqRails', jsonb_build_array(rail_name),
        'fowlerSignals',
        jsonb_build_array('duplicate_semantics', 'hidden_authority', 'legacy_alias'),
        'architectureGuard',
        'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage',
        'not_applicable:planning_db_vocabulary_normalization',
        'unitTests',
        jsonb_build_array(
          'node --test --test-name-pattern "normalize Canvas UX command-query rail vocabulary" scripts/planning-db-migrate.test.cjs'
        )
      )
    )
  ) as raw_manifest,
  0 as revision,
  'codex' as created_by
from (
  values
    ('ListCanvasCqRailVocabularyNormalization', 'query', 'CanvasCqRailVocabularyReadModel'),
    ('RenderCanvasGraphBase', 'query', 'CanvasGraphBasePresentation'),
    ('RenderCanvasShellChrome', 'query', 'CanvasShellChromePresentation'),
    ('OpenCanvasProjectExplorer', 'command', 'CanvasProjectExplorerSurface'),
    ('ExportCanvasUxdbManual', 'command', 'CanvasUxdbManualExport'),
    ('VerifyDbtCanvasFlowInBrowser', 'query', 'DbtCanvasBrowserProofReadModel'),
    ('VerifyDvtCanvasFlowInBrowser', 'query', 'DvtCanvasBrowserProofReadModel')
) as rail(rail_name, rail_type, ddd_owner)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
