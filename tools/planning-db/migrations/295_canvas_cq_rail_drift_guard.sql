-- Canvas UX implementation must reuse canonical command/query rails instead of
-- inventing route-local aliases. This read model compares DB-owned Canvas UX
-- specification records with the canonical command_query_rail_query catalog.

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
  'CANVAS-CQ-RAIL-DRIFT-GUARD-20260626',
  'E-CANVAS-CQ-RAIL-DRIFT-GUARD-1',
  'Canvas command/query rail drift guard',
  'Frontend / Planning DB',
  'review',
  'Canvas UI implementation must not create duplicate action names for the same product intent. Canvas UX DB records now resolve through this guard before UI slices implement menus, workbenches, drawers, preview, source import, project exploration or run actions.',
  'hidden_authority',
  'ListCanvasCqRailDrift',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

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
  from planning_query_store.canvas_uxdb_specification_query spec
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
canonical_aliases as (
  select *
  from (
    values
      (
        'OpenCanvasAddSourceDialog',
        'OpenCanvasSourceImportDialog',
        'legacy_alias',
        'Add Source already uses the Source Import dialog rail; do not create a parallel Add Source dialog rail.'
      ),
      (
        'OpenCanvasNodeWorkbench',
        'InspectCanvasNodeProperties',
        'legacy_alias',
        'Node Workbench opening resolves the node inspection read model; do not duplicate Properties, Inputs or Tests as separate node-menu rails.'
      ),
      (
        'PreviewCanvasExecutionPlan',
        'PreviewExecutionPlan',
        'legacy_alias',
        'Execution Preview reuses the existing Canvas execution preview rail; do not reintroduce ambiguous Plan rails.'
      ),
      (
        'OpenCanvasSqlContextWorkbench',
        'ResolveCanvasWorkbenchContext',
        'legacy_alias',
        'SQL context workbench resolves the existing Canvas workbench context rail before rendering split code surfaces.'
      )
  ) as alias(requested_rail_name, canonical_rail_name, alias_posture, alias_reason)
),
canonicalized as materialized (
  select
    spec.*,
    coalesce(alias.canonical_rail_name, spec.requested_rail_name) as canonical_rail_name,
    alias.alias_posture,
    alias.alias_reason
  from spec_rails spec
  left join canonical_aliases alias
    on alias.requested_rail_name = spec.requested_rail_name
),
matched as materialized (
  select
    canonicalized.*,
    rail.rail_id,
    rail.rail_type,
    rail.rail_status as canonical_rail_status,
    rail.is_gap,
    rail.is_duplicate,
    rail.implementation_ref_count,
    rail.source_path as canonical_rail_source_path
  from canonicalized
  left join planning_query_store.command_query_rail_query rail
    on rail.rail_name = canonicalized.canonical_rail_name
)
select
  case
    when matched.rail_id is null and matched.spec_state = 'accepted' then 'blocker'
    when matched.rail_id is null then 'warning'
    when matched.is_duplicate then 'error'
    when matched.is_gap then 'error'
    when lower(coalesce(matched.canonical_rail_status, '')) in ('deprecated', 'retired') then 'error'
    when matched.alias_posture = 'legacy_alias' then 'warning'
    else 'info'
  end as severity,
  case
    when matched.rail_id is null then 'missing_canonical_rail'
    when matched.is_duplicate then 'duplicate_canonical_rail'
    when matched.is_gap then 'gap_canonical_rail'
    when lower(coalesce(matched.canonical_rail_status, '')) in ('deprecated', 'retired') then
      'retired_canonical_rail'
    when matched.alias_posture = 'legacy_alias' then 'legacy_alias'
    else 'ready'
  end as drift_state,
  matched.record_id,
  matched.record_type,
  matched.record_title,
  matched.canonical_task_id,
  matched.component_id,
  matched.requested_rail_name,
  matched.canonical_rail_name,
  coalesce(matched.rail_type, '-') as rail_type,
  coalesce(matched.canonical_rail_status, '-') as canonical_rail_status,
  case
    when matched.rail_id is null then
      'Register or map canonical Canvas rail ' || matched.canonical_rail_name
      || ' before implementing ' || matched.record_id || '.'
    when matched.is_duplicate then
      'Resolve duplicate canonical rail ' || matched.canonical_rail_name
      || ' before adding UI behavior.'
    when matched.is_gap then
      'Complete existing gap rail ' || matched.canonical_rail_name
      || ' before adding UI behavior.'
    when lower(coalesce(matched.canonical_rail_status, '')) in ('deprecated', 'retired') then
      'Do not implement against retired/deprecated rail ' || matched.canonical_rail_name || '.'
    when matched.alias_posture = 'legacy_alias' then
      'Use canonical rail ' || matched.canonical_rail_name
      || ' instead of alias ' || matched.requested_rail_name || '.'
    else
      'Canvas UX record is aligned with canonical command/query rail ' || matched.canonical_rail_name || '.'
  end as action_hint,
  matched.source_path,
  matched.metadata || jsonb_build_object(
    'canonicalRailSourcePath',
    coalesce(matched.canonical_rail_source_path, '-'),
    'aliasReason',
    coalesce(matched.alias_reason, '-'),
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
values (
  'local#E-CANVAS-CQ-RAIL-DRIFT-GUARD-1#query#listcanvascqraildrift',
  'E-CANVAS-CQ-RAIL-DRIFT-GUARD-1',
  'implemented',
  'ListCanvasCqRailDrift',
  'listcanvascqraildrift',
  'query',
  'CanvasCqRailDriftReadModel',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/295_canvas_cq_rail_drift_guard.sql#canvas_cq_rail_drift_query',
    'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs#readCanvasCqRailDriftRows',
    'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs#buildCanvasCqRailDriftRows'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/295_canvas_cq_rail_drift_guard.sql',
    'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'buzon/TAREA.TXT',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/295_canvas_cq_rail_drift_guard.sql',
    'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "Canvas command-query rail drift guard" scripts/planning-db-migrate.test.cjs',
    'node --test --test-name-pattern "readCanvasCqRailDriftRows|Canvas CQ rail drift help" scripts/planning-db-query.test.cjs',
    'pnpm planning:db:query canvas-cq-rail-drift --limit 40',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test --test-name-pattern "Canvas command-query rail drift guard" scripts/planning-db-migrate.test.cjs',
    'node --test --test-name-pattern "readCanvasCqRailDriftRows|Canvas CQ rail drift help" scripts/planning-db-query.test.cjs',
    'pnpm planning:db:query canvas-cq-rail-drift --limit 40',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/295_canvas_cq_rail_drift_guard.sql',
  md5('E-CANVAS-CQ-RAIL-DRIFT-GUARD-1:ListCanvasCqRailDrift:295')
    || md5('canvas-cq-rail-drift-guard'),
  jsonb_build_object(
    'name', 'ListCanvasCqRailDrift',
    'type', 'query',
    'dddOwner', 'CanvasCqRailDriftReadModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-CQ-RAIL-DRIFT-GUARD-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Expose Canvas UX command/query rail drift as a Planning DB read model before UI slices implement contextual menus, workbenches, source import, project explorer, preview or run actions.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'userStories', jsonb_build_array(
      jsonb_build_object(
        'role', 'Canvas implementer',
        'need', 'Know whether a Canvas UX record uses a canonical rail, legacy alias, gap rail, duplicate rail, or missing rail before adding UI code.',
        'acceptance', 'planning:db:query canvas-cq-rail-drift lists severity, drift_state, requested rail and canonical rail.'
      ),
      jsonb_build_object(
        'role', 'Canvas reviewer',
        'need', 'Reject PRs that implement OpenCanvasAddSourceDialog or PreviewCanvasExecutionPlan when canonical rails already exist.',
        'acceptance', 'The guard maps legacy aliases to OpenCanvasSourceImportDialog and PreviewExecutionPlan.'
      )
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/planning/state/planning-control-tower.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'tools/planning-db/migrations/295_canvas_cq_rail_drift_guard.sql',
      'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/**',
      'packages/**',
      'buzon/**#primary_spec_authority'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasCqRailDriftReadModel',
      'CanvasUxdbSpecificationReadModel',
      'CommandQueryRailCatalog'
    ),
    'fowlerSignals', jsonb_build_array(
      'duplicate_semantics',
      'hidden_authority',
      'documentation_drift'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test --test-name-pattern "Canvas command-query rail drift guard" scripts/planning-db-migrate.test.cjs',
      'node --test --test-name-pattern "readCanvasCqRailDriftRows|Canvas CQ rail drift help" scripts/planning-db-query.test.cjs',
      'pnpm planning:db:query canvas-cq-rail-drift --limit 40',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:planning_db_read_model_guard'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test --test-name-pattern "Canvas command-query rail drift guard" scripts/planning-db-migrate.test.cjs',
      'node --test --test-name-pattern "readCanvasCqRailDriftRows|Canvas CQ rail drift help" scripts/planning-db-query.test.cjs',
      'pnpm planning:db:query canvas-cq-rail-drift --limit 40',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListCanvasCqRailDrift',
        'type', 'query',
        'dddOwner', 'CanvasCqRailDriftReadModel',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-cq-rail-drift-query',
        'redTest',
        'node --test --test-name-pattern "readCanvasCqRailDriftRows|Canvas CQ rail drift help" scripts/planning-db-query.test.cjs',
        'expectedFailure',
        'The Canvas CQ rail drift read model and CLI query were absent.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs',
          'scripts/planning-db-query.cjs',
          'scripts/planning-db-query.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "readCanvasCqRailDriftRows|Canvas CQ rail drift help" scripts/planning-db-query.test.cjs'
      ),
      jsonb_build_object(
        'id', 'canvas-cq-rail-drift-migration',
        'redTest',
        'node --test --test-name-pattern "Canvas command-query rail drift guard" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'Migration 295 and canvas_cq_rail_drift_query were absent.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/295_canvas_cq_rail_drift_guard.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "Canvas command-query rail drift guard" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'canvas_cq_rail_drift_query',
        'path', 'tools/planning-db/migrations/295_canvas_cq_rail_drift_guard.sql',
        'dddOwner', 'CanvasCqRailDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasCqRailDrift'),
        'fowlerSignals', jsonb_build_array('duplicate_semantics', 'hidden_authority'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "Canvas command-query rail drift guard" scripts/planning-db-migrate.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'createCanvasCqRailDriftReadModelComponent',
        'path', 'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs',
        'dddOwner', 'CanvasCqRailDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasCqRailDrift'),
        'fowlerSignals', jsonb_build_array('duplicate_semantics'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "readCanvasCqRailDriftRows" scripts/planning-db-query.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'readCanvasCqRailDriftRows',
        'path', 'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs',
        'dddOwner', 'CanvasCqRailDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasCqRailDrift'),
        'fowlerSignals', jsonb_build_array('duplicate_semantics'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "readCanvasCqRailDriftRows" scripts/planning-db-query.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'buildCanvasCqRailDriftRows',
        'path', 'scripts/planning-db/queries/canvas-cq-rail-drift-query.cjs',
        'dddOwner', 'CanvasCqRailDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasCqRailDrift'),
        'fowlerSignals', jsonb_build_array('duplicate_semantics'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "readCanvasCqRailDriftRows" scripts/planning-db-query.test.cjs'
        )
      )
    )
  ),
  0,
  'codex'
)
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
