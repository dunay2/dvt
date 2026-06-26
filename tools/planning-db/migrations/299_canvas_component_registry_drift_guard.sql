-- DB-first Canvas component registry drift guard.
-- The guard makes Canvas UI file ownership queryable before further TAREA.TXT
-- implementation slices modify graph chrome, context menus, node cards,
-- drawers, source import or workbench surfaces.

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
  'CANVAS-COMPONENT-REGISTRY-DRIFT-GUARD-20260626',
  'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1',
  'Canvas component registry drift guard',
  'Frontend / Planning DB',
  'review',
  'Canvas UI work must be component-first. The registry drift guard compares DB-owned governed source files with the DB-owned frontend component registry so unmapped Canvas files, duplicate file owners and legacy palette surfaces are visible before UI implementation proceeds.',
  'boundary_drift',
  'ListCanvasComponentRegistryDrift',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

create or replace view planning_query_store.canvas_component_registry_drift_query as
with canvas_candidate_files as materialized (
  select
    governed_file.path as file_path,
    case
      when governed_file.path like 'apps/web/src/app/components/canvas/%NodeComponent.tsx' then 'node-card'
      when governed_file.path like 'apps/web/src/app/components/canvas/%NodeShell.tsx' then 'node-card'
      when governed_file.path like 'apps/web/src/app/components/canvas/%ContextMenu%' then 'node-context-menu'
      when governed_file.path like 'apps/web/src/app/components/canvas/%.module.css' then 'node-card-style'
      when governed_file.path like 'apps/web/src/app/components/inspector/%' then 'node-workbench'
      when governed_file.path like 'apps/web/src/app/components/sourceImportWizard/%' then 'source-import'
      when governed_file.path like 'apps/web/src/app/components/shell/%Drawer%' then 'bottom-drawer'
      when governed_file.path like 'apps/web/src/app/components/shell/OperationalDrawer%' then 'bottom-drawer'
      when governed_file.path like 'apps/web/src/app/views/canvas/%ContextMenu%' then 'canvas-context-menu'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Workbench%' then 'node-workbench'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Viewport%' then 'canvas-viewport'
      when governed_file.path like 'apps/web/src/app/views/canvas/%SourceImport%' then 'source-import'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Authoring%' then 'authoring-presenter'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Drawer%' then 'bottom-drawer'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Menu%' then 'canvas-context-menu'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Palette%' then 'legacy-palette'
      else 'canvas-internal'
    end as surface_role,
    case
      when governed_file.path like 'apps/web/src/app/components/canvas/DbtNodeComponent%' then 'web.component.canvas.DbtNodeCard'
      when governed_file.path like 'apps/web/src/app/components/canvas/%NodeShell%' then 'web.component.canvas.GraphNodeCard'
      when governed_file.path like 'apps/web/src/app/components/canvas/%ContextMenu%' then 'web.component.canvas.CanvasNodeContextMenu'
      when governed_file.path like 'apps/web/src/app/components/inspector/%' then 'web.component.canvas.NodeWorkbench'
      when governed_file.path like 'apps/web/src/app/components/sourceImportWizard/%' then 'web.component.canvas.SourceImportWizard'
      when governed_file.path like 'apps/web/src/app/components/shell/%Drawer%' then 'web.component.canvas.BottomOperationalDrawer'
      when governed_file.path like 'apps/web/src/app/components/shell/OperationalDrawer%' then 'web.component.canvas.BottomOperationalDrawer'
      when governed_file.path like 'apps/web/src/app/views/canvas/%ContextMenu%' then 'web.component.canvas.CanvasContextMenuPresenter'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Workbench%' then 'web.component.canvas.CanvasNodeWorkbenchPanel'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Viewport%' then 'web.component.canvas.CanvasViewport'
      when governed_file.path like 'apps/web/src/app/views/canvas/%SourceImport%' then 'web.component.canvas.SourceImportWizard'
      when governed_file.path like 'apps/web/src/app/views/canvas/Dvt%Authoring%' then 'web.component.canvas.DvtAuthoringFields'
      when governed_file.path like 'apps/web/src/app/views/canvas/Dbt%Authoring%' then 'web.component.canvas.DbtAuthoringFields'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Drawer%' then 'web.component.canvas.BottomOperationalDrawer'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Menu%' then 'web.component.canvas.CanvasContextMenuPresenter'
      when governed_file.path like 'apps/web/src/app/views/canvas/%Palette%' then 'web.component.canvas.LegacyCanvasPalette'
      else 'web.component.canvas.CanvasInternal'
    end as expected_component_id,
    governed_file.source_path,
    governed_file.source_content_sha256
  from planning_query_store.governance_file_query governed_file
  where (
      governed_file.path like 'apps/web/src/app/views/canvas/%'
      or governed_file.path like 'apps/web/src/app/components/canvas/%'
      or governed_file.path like 'apps/web/src/app/components/inspector/%'
      or governed_file.path like 'apps/web/src/app/components/shell/BottomOperationalDrawer%'
      or governed_file.path like 'apps/web/src/app/components/shell/OperationalDrawer%'
      or governed_file.path like 'apps/web/src/app/components/sourceImportWizard/%'
    )
    and governed_file.path ~ '\.(ts|tsx|css)$'
    and governed_file.path !~ '\.(test|architecture\.test)\.'
    and governed_file.path not like '%test.support%'
),
registered_file_owners as materialized (
  select
    file_ref.file_path,
    jsonb_agg(distinct file_ref.component_id order by file_ref.component_id) as registered_component_ids,
    count(distinct file_ref.component_id)::int as registered_component_count
  from planning_query_store.frontend_component_file_query file_ref
  group by file_ref.file_path
),
joined as materialized (
  select
    candidate.file_path,
    candidate.surface_role,
    candidate.expected_component_id,
    coalesce(owner.registered_component_ids, '[]'::jsonb) as registered_component_ids,
    coalesce(owner.registered_component_count, 0) as registered_component_count,
    candidate.source_path,
    candidate.source_content_sha256
  from canvas_candidate_files candidate
  left join registered_file_owners owner
    on owner.file_path = candidate.file_path
),
unmapped as (
  select
    'blocker'::text as severity,
    'unmapped_canvas_component_file'::text as drift_state,
    joined.file_path,
    joined.expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'Register the Canvas file in frontend_component_local_files before changing UI behavior.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'expectedComponentId', joined.expected_component_id,
      'registeredComponentCount', joined.registered_component_count
    ) as metadata
  from joined
  where joined.registered_component_count = 0
),
unexpected_owner as (
  select
    'error'::text as severity,
    'unexpected_canvas_component_owner'::text as drift_state,
    joined.file_path,
    joined.expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'Move the file mapping to the expected Canvas component or adjust the DB vocabulary before implementation.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'expectedComponentId', joined.expected_component_id,
      'registeredComponentIds', joined.registered_component_ids
    ) as metadata
  from joined
  where joined.registered_component_count > 0
    and not joined.registered_component_ids ? joined.expected_component_id
),
duplicate_owner as (
  select
    'error'::text as severity,
    'duplicate_canvas_component_file_owner'::text as drift_state,
    joined.file_path,
    joined.expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'A Canvas file must not be owned by more than one frontend component.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'expectedComponentId', joined.expected_component_id,
      'registeredComponentIds', joined.registered_component_ids
    ) as metadata
  from joined
  where joined.registered_component_count > 1
),
legacy_palette as (
  select
    'error'::text as severity,
    'legacy_canvas_palette_surface'::text as drift_state,
    joined.file_path,
    'web.component.canvas.LegacyCanvasPalette'::text as expected_component_id,
    joined.registered_component_ids,
    joined.surface_role,
    'Retire fixed palette surfaces after spatial context-menu insertion owns add-node behavior.'::text as action_hint,
    joined.source_path,
    jsonb_build_object(
      'legacyReason', 'TAREA.TXT requires insertion to originate from the canvas context, not a fixed palette.'
    ) as metadata
  from joined
  where joined.file_path like '%CanvasAddNodePalette%'
     or joined.file_path like '%canvasPalette.ts'
)
select * from unmapped
union all
select * from unexpected_owner
union all
select * from duplicate_owner
union all
select * from legacy_palette;

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
values (
  'web.component.canvas.CanvasComponentRegistryDriftGuard',
  'CanvasComponentRegistryDriftGuard',
  'query-view',
  'current',
  'harden',
  'Frontend / Planning DB',
  'Owns the DB-first read model that detects unmapped Canvas component files, duplicate frontend component file owners and legacy palette surfaces before UI implementation slices proceed.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  jsonb_build_array(
    'The guard exposes drift; individual UI slices still need to register or retire affected files.'
  ),
  jsonb_build_array(
    'EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-QUERY',
    'EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-MIGRATION'
  ),
  'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
  md5('web.component.canvas.CanvasComponentRegistryDriftGuard:299'),
  jsonb_build_object(
    'dbFirst', true,
    'fowlerSignal', 'boundary_drift',
    'governingRail', 'ListCanvasComponentRegistryDrift'
  )
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    'query',
    'canvas_component_registry_drift_query',
    jsonb_build_object('role', 'DB view for Canvas frontend component registry drift'),
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    md5('299_canvas_component_registry_drift_guard.sql:299')
  ),
  (
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
    'query',
    'readCanvasComponentRegistryDriftRows',
    jsonb_build_object('role', 'Planning DB query component for Canvas component registry drift'),
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    md5('canvas-component-registry-drift-query.cjs:299')
  ),
  (
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
    'test',
    null,
    jsonb_build_object('coverage', 'Canvas component registry drift query component and CLI'),
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    md5('canvas-component-registry-drift.test.cjs:299')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasComponentRegistryDriftGuard',
  'ListCanvasComponentRegistryDrift',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'List Canvas frontend component files that are unmapped, multiply mapped, or legacy palette surfaces.',
    'owner', 'CanvasComponentRegistryDriftGuard'
  ),
  'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
  md5('CanvasComponentRegistryDriftGuard:ListCanvasComponentRegistryDrift:299')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-QUERY',
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'test',
    'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
    'passing',
    jsonb_build_object('scope', 'query component and CLI contract'),
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    md5('EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-QUERY:299')
  ),
  (
    'EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-MIGRATION',
    'web.component.canvas.CanvasComponentRegistryDriftGuard',
    'test',
    'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs',
    'passing',
    jsonb_build_object('scope', 'migration registration and DB view ownership'),
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    md5('EV-WEB-CANVAS-COMPONENT-REGISTRY-DRIFT-MIGRATION:299')
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
  'local#E-CANVAS-COMPONENT-REGISTRY-DRIFT-1#query#listcanvascomponentregistrydrift',
  'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1',
  'implemented',
  'ListCanvasComponentRegistryDrift',
  'listcanvascomponentregistrydrift',
  'query',
  'CanvasComponentRegistryDriftReadModel',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql#canvas_component_registry_drift_query',
    'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs#readCanvasComponentRegistryDriftRows',
    'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs#buildCanvasComponentRegistryDriftRows'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
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
    'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
    'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
    'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query canvas-component-registry-drift --limit 40',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
    'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query canvas-component-registry-drift --limit 40',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
  md5('E-CANVAS-COMPONENT-REGISTRY-DRIFT-1:ListCanvasComponentRegistryDrift:299')
    || md5('canvas-component-registry-drift-guard'),
  jsonb_build_object(
    'name', 'ListCanvasComponentRegistryDrift',
    'type', 'query',
    'dddOwner', 'CanvasComponentRegistryDriftReadModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-COMPONENT-REGISTRY-DRIFT-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Expose Canvas component registry drift from Planning DB before further TAREA.TXT UI implementation slices modify graph chrome, context menus, node cards, drawers, source import or workbench surfaces.',
    'componentGuides', jsonb_build_array(
      'planning-db:component/web.component.canvas.CanvasComponentRegistryDriftGuard',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'userStories', jsonb_build_array(
      jsonb_build_object(
        'role', 'Canvas implementer',
        'need', 'See which Canvas UI files are not registered to DB-owned frontend components before changing behavior.',
        'acceptance', 'planning:db:query canvas-component-registry-drift lists severity, drift state, file path, expected component, registered owners and action hints.'
      ),
      jsonb_build_object(
        'role', 'Canvas reviewer',
        'need', 'Reject duplicated or legacy component ownership instead of reviewing ad hoc JSX by hand.',
        'acceptance', 'The drift query reports duplicate_canvas_component_file_owner and legacy_canvas_palette_surface rows.'
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
      'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
      'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/**#ui_behavior_change_without_component_registry',
      'buzon/**#primary_spec_authority'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasComponentRegistryDriftReadModel',
      'FrontendComponentRegistry',
      'GovernedSourceFileInventory'
    ),
    'fowlerSignals', jsonb_build_array(
      'boundary_drift',
      'duplicate_semantics',
      'legacy_surface'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
      'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query canvas-component-registry-drift --limit 40',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array('not_applicable:planning_db_read_model_guard'),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
      'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query canvas-component-registry-drift --limit 40',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListCanvasComponentRegistryDrift',
        'type', 'query',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-component-registry-drift-query',
        'redTest', 'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
        'expectedFailure', 'The Canvas component registry drift read model and CLI query were absent.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
          'scripts/planning-db-query.cjs',
          'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs'
        ),
        'greenTest', 'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs'
      ),
      jsonb_build_object(
        'id', 'canvas-component-registry-drift-migration',
        'redTest', 'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs',
        'expectedFailure', 'Migration 299 and canvas_component_registry_drift_query were absent.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest', 'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'createCanvasComponentRegistryDriftReadModelComponent',
        'path', 'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasComponentRegistryDrift'),
        'fowlerSignals', jsonb_build_array('boundary_drift'),
        'architectureGuard', 'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'canvasComponentRegistryDriftSelect',
        'path', 'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasComponentRegistryDrift'),
        'fowlerSignals', jsonb_build_array('boundary_drift'),
        'architectureGuard', 'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'canvas_component_registry_drift_query',
        'path', 'tools/planning-db/migrations/299_canvas_component_registry_drift_guard.sql',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasComponentRegistryDrift'),
        'fowlerSignals', jsonb_build_array('boundary_drift', 'duplicate_semantics'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "Canvas component registry drift guard" scripts/planning-db-migrate.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'readCanvasComponentRegistryDriftRows',
        'path', 'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasComponentRegistryDrift'),
        'fowlerSignals', jsonb_build_array('boundary_drift'),
        'architectureGuard', 'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'buildCanvasComponentRegistryDriftRows',
        'path', 'scripts/planning-db/queries/canvas-component-registry-drift-query.cjs',
        'dddOwner', 'CanvasComponentRegistryDriftReadModel',
        'cqRails', jsonb_build_array('ListCanvasComponentRegistryDrift'),
        'fowlerSignals', jsonb_build_array('boundary_drift'),
        'architectureGuard', 'scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_guard',
        'unitTests', jsonb_build_array(
          'node --test scripts/planning-db-query-tests/canvas-component-registry-drift.test.cjs'
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
