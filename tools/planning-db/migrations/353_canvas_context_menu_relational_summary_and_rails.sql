-- Reconcile Canvas context-menu DB-first read models after the context split.
-- Summary counts now read relational gap/evidence tables, context actions
-- resolve against canonical command/query rails, and the edge context is
-- explicitly modeled as a semantic context without owned source files.

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'fileOwnershipModel', 'semantic-context-no-owned-files',
    'fileCountZeroIsValid', true,
    'sharedPresenterComponentId', 'web.component.canvas.CanvasContextMenuPresenter',
    'ownershipDecision', 'EdgeContextMenu is a semantic interaction context served by the shared Canvas context-menu presenter until it grows dedicated UI, presenter, or view-model source files.'
  ),
  source_content_sha256 = md5('web.component.canvas.CanvasEdgeContextMenu:semantic-context-no-owned-files:353'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasEdgeContextMenu';

update planning_query_store.frontend_component_contexts
set
  raw_context = coalesce(raw_context, '{}'::jsonb) || jsonb_build_object(
    'fileOwnershipModel', 'semantic-context-no-owned-files',
    'fileCountZeroIsValid', true,
    'sharedPresenterComponentId', 'web.component.canvas.CanvasContextMenuPresenter'
  ),
  source_content_sha256 = md5('context:edge:semantic-context-no-owned-files:353'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasEdgeContextMenu'
  and context_id = 'edge';

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
  'local#CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625#query#rendercanvascontextmenu',
  'CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625',
  'implemented',
  'RenderCanvasContextMenu',
  'rendercanvascontextmenu',
  'query',
  'CanvasContextMenuLayer',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx#CanvasContextMenuLayer',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx#CanvasContextMenuSurface'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/353_canvas_context_menu_relational_summary_and_rails.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md#RenderCanvasContextMenu'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/353_canvas_context_menu_relational_summary_and_rails.sql'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "tracked migrations reconcile Canvas context menu summary and canonical rails relationally" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:migrate',
    'pnpm planning:db:integrity:check'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "tracked migrations reconcile Canvas context menu summary and canonical rails relationally" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:migrate',
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/353_canvas_context_menu_relational_summary_and_rails.sql',
  md5('CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625:RenderCanvasContextMenu:353'),
  jsonb_build_object(
    'name', 'RenderCanvasContextMenu',
    'type', 'query',
    'dddOwner', 'CanvasContextMenuLayer',
    'status', 'implemented',
    'canonicalComponentId', 'web.component.canvas.CanvasContextMenu',
    'reason', 'RenderCanvasContextMenu is the host/template query and must be visible in the canonical command_query_rail_query catalog, not only as a frontend component-local rail.'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Reconcile the Canvas context-menu host read model so RenderCanvasContextMenu is a canonical query rail, context actions resolve canonical rails, and edge context ownership remains semantic until dedicated edge source files exist.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.CanvasContextMenu',
      'web.component.canvas.CanvasEdgeContextMenu'
    ),
    'userStories', jsonb_build_array(
      jsonb_build_object(
        'role', 'Canvas author',
        'need', 'Use the right-click Canvas menu through one governed context-menu host.',
        'acceptance', 'The host render action is visible as RenderCanvasContextMenu in the canonical rail query.'
      ),
      jsonb_build_object(
        'role', 'Frontend maintainer',
        'need', 'Understand why EdgeContextMenu has no owned source files.',
        'acceptance', 'The component summary reports semantic-context-no-owned-files and fileCountZeroIsValid.'
      )
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/353_canvas_context_menu_relational_summary_and_rails.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/**#new_behavior',
      'apps/web/cypress/e2e/**#fake_contextmenu_success',
      'packages/@dvt/contracts/**'
    ),
    'domainObjects', jsonb_build_array(
      'CanvasContextMenuLayer',
      'CanvasContextMenuSurface',
      'CanvasEdgeContextMenu'
    ),
    'fowlerSignals', jsonb_build_array(
      'responsibility_overload',
      'duplicate_semantics',
      'documentation_drift'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test --test-name-pattern "tracked migrations reconcile Canvas context menu summary and canonical rails relationally" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:migrate',
      'pnpm planning:db:integrity:check',
      'pnpm verify:prepush'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-context-menu-relational-summary-and-canonical-rails',
        'redTest',
        'node --test --test-name-pattern "tracked migrations reconcile Canvas context menu summary and canonical rails relationally" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'The migration test failed while migration 353 was absent.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/353_canvas_context_menu_relational_summary_and_rails.sql'
        ),
        'greenTest',
        'node --test --test-name-pattern "tracked migrations reconcile Canvas context menu summary and canonical rails relationally" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'RenderCanvasContextMenu',
        'type', 'query',
        'dddOwner', 'CanvasContextMenuLayer',
        'status', 'implemented'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasContextMenuLayer',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
        'dddOwner', 'CanvasContextMenuLayer',
        'cqRails', jsonb_build_array('RenderCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('responsibility_overload', 'duplicate_semantics'),
        'architectureGuard',
        'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage',
        'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
          'scripts/planning-db-migrate.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'CanvasContextMenuSurface',
        'path', 'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
        'dddOwner', 'CanvasContextMenuLayer',
        'cqRails', jsonb_build_array('RenderCanvasContextMenu'),
        'fowlerSignals', jsonb_build_array('responsibility_overload', 'duplicate_semantics'),
        'architectureGuard',
        'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
        'cypressCoverage',
        'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
          'scripts/planning-db-migrate.test.cjs'
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

create or replace view planning_query_store.frontend_component_context_action_query as
with canonical_rails as (
  select distinct on (rail.normalized_rail_name)
    rail.normalized_rail_name,
    rail.rail_name,
    rail.rail_type,
    rail.rail_status,
    rail.ddd_owner,
    rail.source_path,
    rail.source_content_sha256
  from planning_query_store.command_query_rail_query rail
  where lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
  order by
    rail.normalized_rail_name,
    case lower(coalesce(rail.rail_status, ''))
      when 'implemented' then 0
      when 'accepted' then 1
      when 'declared' then 2
      else 3
    end,
    case when rail.rail_source = 'local' then 0 else 1 end,
    rail.source_path
)
select
  action.component_id,
  component.component_name,
  action.context_id,
  context.context_kind,
  action.action_id,
  action.action_label,
  action.action_kind,
  action.action_status,
  action.rail_name,
  coalesce(rail.rail_kind, canonical_rail.rail_type) as frontend_rail_kind,
  coalesce(rail.rail_status, canonical_rail.rail_status) as frontend_rail_status,
  action.action_order,
  action.source_path,
  action.source_content_sha256,
  canonical_rail.rail_name as canonical_rail_name,
  canonical_rail.ddd_owner as canonical_rail_owner
from planning_query_store.frontend_component_context_actions action
left join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = action.component_id
left join planning_query_store.frontend_component_contexts context
  on context.component_id = action.component_id
 and context.context_id = action.context_id
left join planning_query_store.frontend_component_rail_query rail
  on rail.component_id = action.component_id
 and rail.rail_name = action.rail_name
left join canonical_rails canonical_rail
  on canonical_rail.normalized_rail_name = lower(coalesce(action.rail_name, ''));

create or replace view planning_query_store.frontend_component_summary_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.raw_file
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select
    local_file.component_id,
    local_file.file_path,
    local_file.file_role,
    local_file.raw_file
  from planning_query_store.frontend_component_local_files local_file
),
effective_rails as (
  select
    imported.component_id,
    imported.rail_name,
    imported.raw_rail
  from planning_query_store.frontend_component_cq_rails imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails local_rail
    where local_rail.component_id = imported.component_id
      and local_rail.rail_name = imported.rail_name
  )
  union all
  select
    local_rail.component_id,
    local_rail.rail_name,
    local_rail.raw_rail
  from planning_query_store.frontend_component_local_cq_rails local_rail
),
effective_evidence as (
  select
    imported.component_id,
    imported.evidence_id
  from planning_query_store.frontend_component_evidence imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_evidence local_evidence
    where local_evidence.evidence_id = imported.evidence_id
  )
  union all
  select
    local_evidence.component_id,
    local_evidence.evidence_id
  from planning_query_store.frontend_component_local_evidence local_evidence
),
surface_rollups as (
  select
    link.component_id,
    jsonb_agg(link.surface_id order by link.surface_id) as surface_ids,
    count(*)::int as surface_count
  from planning_query_store.frontend_component_surface_link_query link
  group by link.component_id
),
file_counts as (
  select
    file_ref.component_id,
    count(*)::int as file_count
  from effective_files file_ref
  where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false)
  group by file_ref.component_id
),
rail_counts as (
  select
    rail_relation.component_id,
    count(*)::int as rail_count
  from (
    select distinct
      rail.component_id,
      rail.rail_name
    from effective_rails rail
    where not coalesce((rail.raw_rail ->> 'retiredForContextActionCatalog')::boolean, false)
    union
    select distinct
      action.component_id,
      action.rail_name
    from planning_query_store.frontend_component_context_actions action
    where action.rail_name is not null
      and action.action_status <> 'retired'
  ) rail_relation
  group by rail_relation.component_id
),
evidence_counts as (
  select
    evidence.component_id,
    count(*)::int as evidence_count
  from effective_evidence evidence
  group by evidence.component_id
),
gap_counts as (
  select
    gap.component_id,
    count(*)::int as capability_gap_count
  from planning_query_store.frontend_component_capability_gaps gap
  where gap.gap_status in ('open', 'planned', 'moved')
  group by gap.component_id
),
validation_evidence_counts as (
  select
    evidence.component_id,
    count(*)::int as evidence_ref_count
  from planning_query_store.frontend_component_validation_evidence evidence
  where evidence.evidence_status = 'current'
  group by evidence.component_id
)
select
  component.component_id,
  component.component_name,
  component.component_kind,
  component.component_status,
  component.reuse_decision,
  component.frontend_owner,
  component.responsibility,
  component.package_name,
  component.route_scope,
  component.plugin_scope,
  component.capability_gaps,
  component.evidence_refs,
  coalesce(surface_rollups.surface_ids, '[]'::jsonb) as surface_ids,
  coalesce(surface_rollups.surface_count, 0) as surface_count,
  coalesce(file_counts.file_count, 0) as file_count,
  coalesce(rail_counts.rail_count, 0) as rail_count,
  coalesce(evidence_counts.evidence_count, 0) as evidence_count,
  coalesce(gap_counts.capability_gap_count, 0) as capability_gap_count,
  coalesce(validation_evidence_counts.evidence_ref_count, 0) as evidence_ref_count,
  component.source_path,
  component.source_content_sha256,
  component.imported_at,
  coalesce(component.raw_component ->> 'fileOwnershipModel', 'owned-files') as file_ownership_model,
  coalesce((component.raw_component ->> 'fileCountZeroIsValid')::boolean, false) as file_count_zero_is_valid
from planning_query_store.frontend_component_effective_component_query component
left join surface_rollups
  on surface_rollups.component_id = component.component_id
left join file_counts
  on file_counts.component_id = component.component_id
left join rail_counts
  on rail_counts.component_id = component.component_id
left join evidence_counts
  on evidence_counts.component_id = component.component_id
left join gap_counts
  on gap_counts.component_id = component.component_id
left join validation_evidence_counts
  on validation_evidence_counts.component_id = component.component_id;
