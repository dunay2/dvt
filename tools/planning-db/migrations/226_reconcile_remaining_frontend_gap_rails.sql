-- Close the remaining frontend command/query vocabulary gaps with DB-local
-- authority. Evidence-backed rails become implemented. Historical product
-- intents without active code/components are retired instead of staying as
-- active gap rails.

drop table if exists pg_temp.frontend_gap_rail_reconciliation;

create temporary table frontend_gap_rail_reconciliation (
  rail_name text not null,
  rail_type text not null,
  ddd_owner text not null,
  mechanization_status text not null,
  rail_status text not null,
  source_path text not null,
  implementation_refs jsonb not null,
  documentation_refs jsonb not null,
  governing_sources jsonb not null,
  allowed_implementation_surfaces jsonb not null,
  architecture_guards jsonb not null,
  completion_gate jsonb not null,
  reconciliation_note text not null
);

insert into frontend_gap_rail_reconciliation (
  rail_name,
  rail_type,
  ddd_owner,
  mechanization_status,
  rail_status,
  source_path,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  reconciliation_note
)
values
  (
    'ApplyWorkspaceGraphAuthoringCommand',
    'command',
    'Workspace graph authoring draft aggregate',
    'implemented',
    'implemented',
    'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md',
    jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringCommand.v1.ts#WorkspaceGraphAuthoringCommandSchema',
      'packages/@dvt/contracts/test/workspace-graph-authoring-draft.contract.test.ts',
      'packages/@dvt/contracts/test/workspace-graph-authoring-draft.architecture.test.ts',
      'docs/architecture/components/planner/workspace-authoring-draft-aggregate.md'
    ),
    jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md',
      'docs/architecture/components/planner/workspace-authoring-draft-aggregate.md',
      'docs/planning/closeouts/20260503-tf-e2-a-authoring-draft-hard-cut-closeout.md'
    ),
    jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/components/planner/workspace-authoring-draft-aggregate.md'
    ),
    jsonb_build_array(
      'WorkspaceGraphAuthoringCommand contract schema',
      'Canvas authoring draft aggregate command value object'
    ),
    jsonb_build_array(
      'Authoring commands must reject duplicate node ids, missing node refs, invalid edge refs, and non-writable posture.'
    ),
    jsonb_build_array(
      'pnpm --filter @dvt/contracts test -- workspace-graph-authoring-draft.contract.test.ts workspace-graph-authoring-draft.architecture.test.ts'
    ),
    'The aggregate command rail is implemented as the WorkspaceGraphAuthoringCommand contract and architecture-tested draft aggregate.'
  ),
  (
    'ValidateCanvasTransformationRun',
    'query',
    'Transformation graph validation read model',
    'implemented',
    'implemented',
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/transformationGraphValidation.ts#validateTransformationGraph',
      'apps/web/src/app/views/canvas/transformationGraphValidation.test.ts',
      'apps/web/src/app/views/canvas/canvasExecutionState.ts',
      'apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts'
    ),
    jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md',
      'docs/planning/closeouts/20260418-tf-e2-canvas-interaction-command-seam-closeout.md'
    ),
    jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    ),
    jsonb_build_array(
      'validateTransformationGraph',
      'Canvas execution read model'
    ),
    jsonb_build_array(
      'Invalid or incomplete transformation graphs must fail before plan/run readiness.'
    ),
    jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/transformationGraphValidation.test.ts'
    ),
    'The documented transformation validation query is implemented by validateTransformationGraph and its Canvas execution consumers.'
  ),
  (
    'ListAdminRoles',
    'query',
    'Admin RBAC unsupported read model',
    'implemented',
    'implemented',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts',
    jsonb_build_array(
      'apps/web/src/app/services/workspace/workspacePorts.api.ts#createApiWorkspaceAdminReadPort',
      'apps/web/src/app/services/workspace/workspacePorts.api.test.ts#unsupportedApiWorkspaceOperations',
      'apps/web/src/app/services/workspace/workspaceErrors.ts#WorkspaceApiUnsupportedRail'
    ),
    jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/web-api-workspace-port-route-parity-remediation-plan-20260510.md',
      'docs/architecture/components/web/workspace/workspace-port-decomposition-component.md',
      'docs/architecture/components/web/frontend-mechanical-truth-inventory.md'
    ),
    jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/components/web/workspace/workspace-port-decomposition-component.md'
    ),
    jsonb_build_array(
      'IWorkspaceAdminReadPort.getRoles',
      'fail-closed API workspace adapter'
    ),
    jsonb_build_array(
      'Admin role reads must reject before transport while the backend rail is intentionally unavailable.'
    ),
    jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/services/workspace/workspacePorts.api.test.ts'
    ),
    'The current rail posture is an implemented fail-closed adapter, not an untracked backend gap.'
  ),
  (
    'ListAdminAuditLog',
    'query',
    'Admin audit unsupported read model',
    'implemented',
    'implemented',
    'apps/web/src/app/services/workspace/workspacePorts.api.ts',
    jsonb_build_array(
      'apps/web/src/app/services/workspace/workspacePorts.api.ts#createApiWorkspaceAdminReadPort',
      'apps/web/src/app/services/workspace/workspacePorts.api.test.ts#unsupportedApiWorkspaceOperations',
      'apps/web/src/app/services/workspace/workspaceErrors.ts#WorkspaceApiUnsupportedRail'
    ),
    jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/web-api-workspace-port-route-parity-remediation-plan-20260510.md',
      'docs/architecture/components/web/workspace/workspace-port-decomposition-component.md',
      'docs/architecture/components/web/frontend-mechanical-truth-inventory.md'
    ),
    jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/components/web/workspace/workspace-port-decomposition-component.md'
    ),
    jsonb_build_array(
      'IWorkspaceAdminReadPort.getAuditLog',
      'fail-closed API workspace adapter'
    ),
    jsonb_build_array(
      'Admin audit reads must reject before transport while the backend rail is intentionally unavailable.'
    ),
    jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- src/app/services/workspace/workspacePorts.api.test.ts'
    ),
    'The current rail posture is an implemented fail-closed adapter, not an untracked backend gap.'
  ),
  (
    'CreateCanvasAnnotation',
    'command',
    'CanvasAnnotation',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active Canvas annotation component or command adapter exists.'),
    jsonb_build_array('Do not create annotation rails without a concrete component, port, and tests.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical annotation authoring intent has no active component or implementation surface and is retired from the canonical vocabulary.'
  ),
  (
    'UpdateCanvasAnnotation',
    'command',
    'CanvasAnnotation',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active Canvas annotation component or command adapter exists.'),
    jsonb_build_array('Do not create annotation rails without a concrete component, port, and tests.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical annotation authoring intent has no active component or implementation surface and is retired from the canonical vocabulary.'
  ),
  (
    'SubmitWorkbenchCommand',
    'command',
    'WorkbenchCommandSubmission',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
      'docs/planning/reviews/architecture-and-governance/20260527-canvas-workspace-explorer-fowler-review.md'
    ),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active browser command bus or WorkbenchCommandSubmission component exists.'),
    jsonb_build_array('Browser console product commands require explicit accepted rails before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical workbench command bus intent is retired because no active command bus component, adapter, or tests exist.'
  ),
  (
    'ListWorkbenchCommandHistory',
    'query',
    'WorkbenchCommandHistoryReadModel',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active workbench command history read model exists.'),
    jsonb_build_array('Command history requires a real read model and authorization scope before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical workbench command history intent is retired because no active read model or tests exist.'
  ),
  (
    'GetWorkbenchThemePreferences',
    'query',
    'WorkbenchThemePreference',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active workbench theme preference read model exists.'),
    jsonb_build_array('Theme preferences require a token policy component and tests before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical theme preference query is retired because current UI theming is not backed by this rail.'
  ),
  (
    'UpdateWorkbenchThemePreferences',
    'command',
    'WorkbenchThemePreference',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active workbench theme preference command adapter exists.'),
    jsonb_build_array('Theme preference writes require a token policy component and tests before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical theme preference command is retired because current UI theming is not backed by this rail.'
  ),
  (
    'UpdateTableField',
    'command',
    'FieldDefinition',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('Current Canvas inspector rails configure dbt/DVT nodes, not a generic FieldDefinition command.'),
    jsonb_build_array('Table-field authoring needs a concrete component and adapter before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical generic table-field command is retired in favor of concrete Canvas inspector authoring rails.'
  ),
  (
    'ListSupportedColumnTypes',
    'query',
    'ColumnTypeCatalog',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-workspace-explorer-console-theme-modeling-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active provider column type catalog read model exists.'),
    jsonb_build_array('Provider column type catalog needs an adapter-backed read model before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical column type catalog query is retired because no provider-backed read model exists.'
  ),
  (
    'ImportDbtProject',
    'command',
    'dbt project import',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('Current dbt runtime consumes artifact-backed bundles, not a browser dbt project import command.'),
    jsonb_build_array('dbt project import requires a real workspace-file command adapter before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical dbt project roundtrip import command is retired; current runtime authority is DbtProjectBundleRef artifact binding.'
  ),
  (
    'ValidateDbtProjectImport',
    'query',
    'dbt project import',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('Current dbt runtime validates artifact bundle bindings, not browser project import reports.'),
    jsonb_build_array('dbt project import validation needs a real read model before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical dbt project import validation query is retired; current runtime authority is DbtProjectBundleRef artifact binding.'
  ),
  (
    'SaveDbtProjectFileEdit',
    'command',
    'workspace file editing',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('Current workspace file writes use scoped workspace file command ports, not a dbt-specific edit rail.'),
    jsonb_build_array('dbt file edits must reuse or extend the canonical workspace file command rail before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical dbt-specific file edit command is retired in favor of canonical workspace file command authority.'
  ),
  (
    'RunPersistedDbtProject',
    'command',
    'run execution',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('Current run execution starts from governed run/start rails and artifact bundle binding, not this frontend-specific rail.'),
    jsonb_build_array('Persisted dbt project execution must map to canonical run rails before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical persisted dbt run command is retired in favor of canonical run execution and artifact binding rails.'
  ),
  (
    'ExportDbtProject',
    'command',
    'dbt project export',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active dbt project export adapter or artifact writer implements this rail.'),
    jsonb_build_array('dbt project export requires an artifact writer and compatibility tests before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical dbt project export command is retired because no active export adapter or tests exist.'
  ),
  (
    'SaveExecutionTemplateArtifact',
    'command',
    'WorkspaceArtifactWritePolicy',
    'closed',
    'retired',
    'docs/planning/proposals/mandatory/frontend-and-ux/top-menu-templates-artifact-graph-flow-plan-20260527.md',
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/top-menu-templates-artifact-graph-flow-plan-20260527.md'),
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('No active template artifact command adapter or workspace artifact writer implements this rail.'),
    jsonb_build_array('Template artifact saves require a concrete artifact writer component and tests before reintroduction.'),
    jsonb_build_array('pnpm planning:db:query rail-vocabulary --no-refresh --limit 80'),
    'Historical template artifact save command is retired because no active artifact writer or tests exist.'
  );

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
  'PLANNING-DB-FRONTEND-GAP-RAIL-RECONCILIATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Reconcile remaining frontend gap command/query rails',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The remaining rail-vocabulary warnings are imported frontend documentation rows. Four rows have implementation or fail-closed evidence. The others are historical product intents without active components, adapters, ports, or tests. The Planning DB stores the canonical reconciliation instead of keeping obsolete gap rails active.',
  'hidden_authority',
  'ValidateRailVocabulary;DetectRailDuplicates;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
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
  created_by,
  created_at,
  updated_at
)
select
  'local#frontend-gap-rail-reconciliation-20260619#' || rail_type || '#' || lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')),
  'FRONTEND-GAP-RAIL-RECONCILIATION-20260619',
  mechanization_status,
  rail_name,
  lower(regexp_replace(rail_name, '[^a-zA-Z0-9]+', '', 'g')),
  rail_type,
  ddd_owner,
  rail_status,
  implementation_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = frontend_gap_rail_reconciliation.source_path
      limit 1
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', rail_name,
    'type', rail_type,
    'status', rail_status,
    'dddOwner', ddd_owner,
    'implementationRefs', implementation_refs,
    'reconciliationNote', reconciliation_note,
    'reconciledBy', '226_reconcile_remaining_frontend_gap_rails'
  ),
  jsonb_build_object(
    'featureId', 'FRONTEND-GAP-RAIL-RECONCILIATION-20260619',
    'mechanizationStatus', mechanization_status,
    'implementationPlan', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'governingSources', governing_sources,
    'allowedImplementationSurfaces', allowed_implementation_surfaces,
    'architectureGuards', architecture_guards,
    'completionGate', completion_gate,
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', rail_name,
        'type', rail_type,
        'status', rail_status,
        'dddOwner', ddd_owner
      )
    )
  ),
  1,
  'codex',
  now(),
  now()
from frontend_gap_rail_reconciliation
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
  rail_status = excluded.rail_status,
  ddd_owner = excluded.ddd_owner,
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

create or replace view planning_query_store.command_query_rail_query as
with manifest_rails as (
  select
    rail.*,
    case
      when rail.source_path like 'docs/archive/%' then 5
      when rail.rail_source = 'local' then 0
      when rail.feature_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG' then 1
      when rail.source_path like 'docs/architecture/components/%command-query-catalog.md' then 1
      when rail.source_path like 'docs/architecture/components/%' then 2
      when rail.mechanization_status in ('implemented', 'closed') then 3
      else 4
    end as authority_priority
  from planning_query_store.command_query_rail_manifest_query rail
),
reference_rollup as (
  select
    rail_type,
    normalized_rail_name,
    count(*)::int as reference_count,
    count(*) filter (
      where authority_priority <= 2
        and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
    )::int as canonical_candidate_count,
    jsonb_agg(distinct feature_id order by feature_id) as related_feature_ids,
    jsonb_agg(distinct source_path order by source_path) as related_source_paths
  from manifest_rails
  group by rail_type, normalized_rail_name
),
rail_group as (
  select
    rail_type,
    normalized_rail_name,
    bool_or(
      lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
      and not is_gap
    ) as has_active_non_gap
  from manifest_rails
  group by rail_type, normalized_rail_name
),
ranked_canonical_rails as (
  select
    rail.*,
    row_number() over (
      partition by rail.rail_type, rail.normalized_rail_name
      order by
        case
          when not rail_group.has_active_non_gap
            and rail.rail_source = 'local'
            and lower(coalesce(rail.rail_status, '')) in ('deprecated', 'retired')
            then 0
          when lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            and not rail.is_gap
            then 1
          when rail.rail_source = 'local'
            and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            then 2
          when lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired')
            then 3
          else 4
        end,
        case when rail.rail_source = 'local' then 0 else 1 end,
        rail.is_gap,
        rail.authority_priority,
        rail.implementation_ref_count desc,
        rail.documentation_ref_count desc,
        rail.imported_at desc,
        rail.rail_id
    ) as canonical_rank
  from manifest_rails rail
  join rail_group
    on rail_group.rail_type = rail.rail_type
   and rail_group.normalized_rail_name = rail.normalized_rail_name
)
select
  rail.rail_id,
  rail.feature_id,
  rail.mechanization_status,
  rail.rail_name,
  rail.normalized_rail_name,
  rail.rail_type,
  rail.ddd_owner,
  rail.rail_status,
  rail.symbol_refs,
  rail.implementation_refs,
  rail.documentation_refs,
  rail.implementation_ref_count,
  rail.documentation_ref_count,
  rail.governing_sources,
  rail.allowed_implementation_surfaces,
  rail.architecture_guards,
  rail.completion_gate,
  rail.is_gap,
  rollup.reference_count,
  rollup.canonical_candidate_count as duplicate_count,
  rollup.canonical_candidate_count > 1 as is_duplicate,
  rollup.related_feature_ids,
  rollup.related_source_paths,
  rail.source_path,
  rail.source_content_sha256,
  rail.raw_rail,
  rail.raw_manifest,
  rail.rail_source,
  rail.imported_at
from ranked_canonical_rails rail
join reference_rollup rollup
  on rollup.rail_type = rail.rail_type
 and rollup.normalized_rail_name = rail.normalized_rail_name
where rail.canonical_rank = 1;

drop table if exists pg_temp.frontend_gap_rail_reconciliation;
