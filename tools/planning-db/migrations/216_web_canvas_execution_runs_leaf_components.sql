-- Split the broad Web Canvas execution/runs component into active
-- responsibility leaves. These files are functional execution assets; old or
-- nonfunctional files require explicit deprecation evidence before they can be
-- marked deprecated.

drop table if exists pg_temp.web_canvas_execution_runs_leaf_map;
drop table if exists pg_temp.web_canvas_execution_runs_dependency_map;

create temporary table web_canvas_execution_runs_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

create temporary table web_canvas_execution_runs_dependency_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  contract_id text,
  failure_mode text not null
);

insert into web_canvas_execution_runs_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-ACTION-COMPOSITION',
    'Canvas execution action composition',
    'CanvasExecutionActionComposition',
    'PreviewExecutionPlan;StartCanvasRun;CoordinateCanvasExecutionActions',
    'Owns the React composition seam that exposes Canvas plan and run action handlers, session-context adaptation, plan-modal state, and execution action test support.',
    'Coordinate dedicated plan-preview, run-start, execution-state, and shell feedback seams without owning their lower-level command implementations.',
    'Execution action hook composition, session-context adaptation, plan modal state, plan-preview orchestration tests, or action test support changes.',
    'The composition hook must delegate plan preview to the Canvas command surface, run start to the run-start leaf, readiness to the readiness leaf, and draft flushing to the draft-flush leaf.',
    'apps/web/src/app/views/canvas/useCanvasExecutionActions.ts',
    'Canvas execution action composition contract for preview/run handlers.',
    'application_service',
    array[
      'useCanvasExecutionActions',
      'UseCanvasExecutionActionsParams',
      'UseCanvasExecutionActionsResult',
      'CanvasExecutionDraftGraph'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasExecutionActions.types.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.freshness.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.guards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.persistence.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.provenanceFailures.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.provenanceResolution.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.provenance.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.sourceMetadata.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.test.support.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.freshness.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.guards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.persistence.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.provenanceFailures.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.provenanceResolution.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.provenance.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.sourceMetadata.test.tsx'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx src/app/views/canvas/useCanvasExecutionActions.planPreview.guards.test.tsx src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx',
    'CoordinateCanvasExecutionActions',
    'command',
    array['planning denied', 'preview transport failure', 'placeholder provenance', 'stale preview proof']::text[],
    84,
    'critical',
    'ACTION-COMPOSITION'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-DRAFT-FLUSH',
    'Canvas execution draft flush',
    'CanvasExecutionDraftFlush',
    'FlushCanvasDraftForExecution;SaveWorkspaceGraphDraft;ReadCanvasDraftRecord',
    'Owns the execution-time draft flush command that waits for in-flight saves, writes the current draft when needed, and projects the persisted execution graph before plan preview.',
    'Flush the authoritative Canvas draft before execution without duplicating draft repository, autosave, or query-cache ownership.',
    'Draft flush wait policy, save-before-plan behavior, stale draft handling, flush graph projection, or execution flush tests change.',
    'Execution draft flush must use the existing draft repository and cache boundaries; it must not invent a second draft persistence model.',
    'apps/web/src/app/views/canvas/useCanvasExecutionDraftFlush.ts',
    'Execution draft flush command boundary.',
    'boundary_drift',
    array['useCanvasExecutionDraftFlush', 'projectFlushGraph']::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionDraftFlush.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionDraftFlush.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionDraftFlush.test.tsx'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionDraftFlush.test.tsx src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx',
    'FlushCanvasDraftForExecution',
    'command',
    array['in-flight save timeout', 'missing persisted revision', 'save conflict', 'graph projection missing']::text[],
    82,
    'critical',
    'DRAFT-FLUSH'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'Canvas execution selection',
    'CanvasExecutionSelection',
    'CollectCanvasPreviewSelection;CollectCanvasPlanSelection;PreviewExecutionPlan;StartCanvasRun',
    'Owns the canonical execution-selection seam for preview and persisted-plan run start.',
    'Derive caller-owned execution selection from Canvas selected nodes, workspace nodes, and persisted plan steps.',
    'Preview selection, run selection, selected-closure behavior, or execution-selection architecture changes.',
    'Selection must emit the shared ExecutionSelection contract through parseExecutionSelection and must not create a browser-local execution DTO.',
    'apps/web/src/app/views/canvas/canvasRunSelection.ts',
    'Canvas execution selection query boundary.',
    'published_language',
    array['collectPreviewSelection', 'collectPlanSelection']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasRunSelection.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.selection.test.tsx'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.planPreview.selection.test.tsx'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasExecutionSelection.architecture.test.ts && pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.planPreview.selection.test.tsx',
    'CollectCanvasExecutionSelection',
    'query',
    array['empty selected closure', 'duplicate plan nodes', 'ad hoc local selection DTO']::text[],
    86,
    'critical',
    'SELECTION'
  ),
  (
    'SYS-WEB-CANVAS-RUN-START-ACTION',
    'Canvas run-start action boundary',
    'CanvasRunStartActionBoundary',
    'StartCanvasRun;RevealStartedRunOperations',
    'Owns Canvas run-start readiness checks, caller-owned StartRunInput delegation, started-run drawer reveal, and run-start feedback handling.',
    'Start a Canvas run only after persisted plan proof and readiness pass while leaving runtime identity to the platform.',
    'Run-start readiness, StartRunInput delegation, started-run feedback, or run-start identity boundary changes.',
    'Canvas run start must not author runId, workflowId, provider ids, retry keys, or platform execution identity.',
    'apps/web/src/app/views/canvas/canvasRunStartAction.ts',
    'Canvas run-start command boundary for caller-owned start intent.',
    'identity_boundary',
    array['executeCanvasRunStartAction', 'useCanvasRunStartHandler', 'revealStartedRunOperations']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasRunStartAction.ts',
      'apps/web/src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasRunStartHandler.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx'
    ]::text[],
    'architecture',
    'negative',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts && pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx',
    'StartCanvasRun',
    'command',
    array['run permission denied', 'missing PlanRef', 'stale preview proof', 'client-authored run identity']::text[],
    86,
    'critical',
    'RUN-START-ACTION'
  ),
  (
    'SYS-WEB-CANVAS-RUNTIME-POLICY',
    'Canvas runtime policy',
    'CanvasRuntimePolicy',
    'ResolveCanvasRuntimePolicy;AuthorizeCanvasExecutionCommand',
    'Owns the Canvas runtime document, execution, command, and admission policy read model.',
    'Resolve which Canvas commands and node kinds are admitted by the active runtime without owning draft persistence or backend admission.',
    'Runtime document posture, command availability, plugin admission, node-kind catalog, or runtime policy tests change.',
    'Runtime policy must fail closed for missing documents, unsupported canvas kinds, disabled plugins, read-only drafts, and pending saves.',
    'apps/web/src/app/views/canvas/canvasRuntimePolicy.ts',
    'Canvas runtime policy query boundary.',
    'policy_object',
    array[
      'resolveCanvasRuntimePolicy',
      'CanvasRuntimePolicy',
      'CanvasRuntimeCommandPolicy',
      'CanvasRuntimeAdmissionPolicy'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasRuntimePolicy.test.ts',
      'apps/web/src/app/views/canvas/canvasRuntimePolicy.ts'
    ]::text[],
    array['apps/web/src/app/views/canvas/canvasRuntimePolicy.test.ts']::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasRuntimePolicy.test.ts',
    'ResolveCanvasRuntimePolicy',
    'query',
    array['missing document', 'unsupported canvas kind', 'disabled plugin', 'read-only draft posture']::text[],
    84,
    'critical',
    'RUNTIME-POLICY'
  ),
  (
    'SYS-WEB-CANVAS-PLAN-RUN-READINESS',
    'Canvas plan/run readiness',
    'PlanRunReadinessReadModel',
    'ObservePlanRunReadiness',
    'Owns the Canvas execution state adapter and readiness presentation that expose ObservePlanRunReadiness to the route and toolbar.',
    'Publish ready/blocked plan-run posture from plan proof, runtime policy, graph executability, authorization, and persisted preview evidence.',
    'Plan/run readiness blockers, execution state projection, readiness presentation copy, or readiness architecture changes.',
    'Readiness must remain a query/read-model boundary; it must not start runs, create plans, mutate draft state, or hide blocker semantics in toolbar copy.',
    'apps/web/src/app/views/canvas/canvasExecutionState.ts',
    'Plan/run readiness read-model and presentation boundary.',
    'presentation_model',
    array['deriveCanvasExecutionState', 'PlanRunReadinessPanel']::text[],
    array[
      'apps/web/src/app/views/canvas/canvasExecutionState.ts',
      'apps/web/src/app/views/canvas/canvasPlanRunReadiness.architecture.test.ts',
      'apps/web/src/app/views/canvas/PlanRunReadinessPanel.test.tsx',
      'apps/web/src/app/views/canvas/PlanRunReadinessPanel.tsx'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasPlanRunReadiness.architecture.test.ts',
      'apps/web/src/app/views/canvas/PlanRunReadinessPanel.test.tsx'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasPlanRunReadiness.architecture.test.ts && pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/PlanRunReadinessPanel.test.tsx',
    'ObservePlanRunReadiness',
    'query',
    array['authorization denied', 'capability mismatch', 'missing persisted preview proof', 'executable graph failure']::text[],
    86,
    'critical',
    'PLAN-RUN-READINESS'
  ),
  (
    'SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION',
    'Canvas operational drawer contribution',
    'CanvasOperationalDrawerContribution',
    'ResolveOperationalDrawerContribution;RegisterCanvasOperationalDrawerContribution;ObservePlanRunReadiness',
    'Owns the Canvas route contribution registered into the shell operational drawer for problems, runs, and execution preview.',
    'Project Canvas readiness, run, and preview facts into the shell operational drawer without owning shell drawer rendering or run-event history.',
    'Canvas operational drawer contribution, readiness problem projection, drawer tabs, or route contribution lifecycle changes.',
    'Canvas may contribute drawer content, but the shell operational drawer remains the rendering owner and run-event history remains outside this component.',
    'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
    'Canvas operational drawer contribution boundary.',
    'anti_corruption_layer',
    array['CanvasOperationalDrawerContributionRegistrar', 'buildCanvasOperationalDrawerContribution']::text[],
    array['apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx']::text[],
    array['scripts/planning-db-migrate.test.cjs']::text[],
    'architecture',
    'boundary',
    'node --test --test-name-pattern "Web Canvas execution/runs" scripts/planning-db-migrate.test.cjs',
    'RegisterCanvasOperationalDrawerContribution',
    'command',
    array['readiness problem hidden', 'shell drawer ownership bypass', 'run-event history duplicated']::text[],
    78,
    'high',
    'OPERATIONAL-DRAWER-CONTRIBUTION'
  );

insert into web_canvas_execution_runs_dependency_map (
  source_component_id,
  target_component_id,
  relation_id,
  contract_id,
  failure_mode
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-ACTION-COMPOSITION',
    'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'REL-WEB-CANVAS-EXECUTION-ACTIONS-DEPENDS-ON-CONTROLLER-COMMAND-SURFACE',
    null,
    'Execution action composition can duplicate plan-preview command semantics if it stops delegating to the Canvas controller command surface.'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-ACTION-COMPOSITION',
    'SYS-WEB-CANVAS-EXECUTION-DRAFT-FLUSH',
    'REL-WEB-CANVAS-EXECUTION-ACTIONS-DEPENDS-ON-DRAFT-FLUSH',
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-DRAFT-FLUSH-SURFACE',
    'Plan preview can run against stale Canvas state if execution actions bypass the draft flush boundary.'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-ACTION-COMPOSITION',
    'SYS-WEB-CANVAS-RUN-START-ACTION',
    'REL-WEB-CANVAS-EXECUTION-ACTIONS-DEPENDS-ON-RUN-START',
    'CONTRACT-SYS-WEB-CANVAS-RUN-START-ACTION-SURFACE',
    'Execution action composition can become a second run-start authority.'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-ACTION-COMPOSITION',
    'SYS-WEB-CANVAS-PLAN-RUN-READINESS',
    'REL-WEB-CANVAS-EXECUTION-ACTIONS-DEPENDS-ON-READINESS',
    'CONTRACT-SYS-WEB-CANVAS-PLAN-RUN-READINESS-SURFACE',
    'Plan/run buttons can drift from readiness read-model truth.'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-DRAFT-FLUSH',
    'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
    'REL-WEB-CANVAS-EXECUTION-DRAFT-FLUSH-DEPENDS-ON-DRAFT-LIFECYCLE',
    null,
    'Execution draft flush can invent persistence semantics if it stops depending on the draft lifecycle aggregate.'
  ),
  (
    'SYS-WEB-CANVAS-RUN-START-ACTION',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'REL-WEB-CANVAS-RUN-START-DEPENDS-ON-EXECUTION-SELECTION',
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-SELECTION-SURFACE',
    'Run start can widen or reorder execution scope if it stops using the canonical selection seam.'
  ),
  (
    'SYS-WEB-CANVAS-RUN-START-ACTION',
    'SYS-API-HTTP-RUN-LIFECYCLE',
    'REL-WEB-CANVAS-RUN-START-DEPENDS-ON-API-RUN-LIFECYCLE',
    null,
    'Canvas can overclaim runtime identity if its start-run command drifts from the API run lifecycle boundary.'
  ),
  (
    'SYS-WEB-CANVAS-RUN-START-ACTION',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'REL-WEB-CANVAS-RUN-START-DEPENDS-ON-API-START-RUN-ADMISSION',
    null,
    'Canvas readiness can drift from backend start-run admission if the relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-PLAN-RUN-READINESS',
    'SYS-WEB-CANVAS-RUNTIME-POLICY',
    'REL-WEB-CANVAS-PLAN-RUN-READINESS-DEPENDS-ON-RUNTIME-POLICY',
    'CONTRACT-SYS-WEB-CANVAS-RUNTIME-POLICY-SURFACE',
    'Readiness can expose enabled run controls when runtime policy is blocked.'
  ),
  (
    'SYS-WEB-CANVAS-PLAN-RUN-READINESS',
    'SYS-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION',
    'REL-WEB-CANVAS-PLAN-RUN-READINESS-DEPENDS-ON-TRANSFORMATION-PREVIEW',
    null,
    'Readiness can miss executable graph failures if it loses the transformation validation relation.'
  ),
  (
    'SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION',
    'SYS-WEB-APP-COMPONENTS-CONSOLE',
    'REL-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION-DEPENDS-ON-SHELL-DRAWER',
    null,
    'Canvas can duplicate shell drawer rendering semantics if the contribution relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION',
    'SYS-WEB-CANVAS-PLAN-RUN-READINESS',
    'REL-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION-DEPENDS-ON-READINESS',
    'CONTRACT-SYS-WEB-CANVAS-PLAN-RUN-READINESS-SURFACE',
    'Operational drawer problems can drift from the source-owned readiness read model.'
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
  'PLANNING-DB-WEB-CANVAS-EXECUTION-RUNS-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas execution/runs leaf component mapping',
  'Architecture / Planning DB / Web Canvas',
  'review',
  'SYS-WEB-CANVAS-EXECUTION-RUNS owned 31 active execution files directly across action composition, draft flushing, execution selection, run start, runtime policy, plan/run readiness, and operational drawer contribution responsibilities. This migration keeps the existing component as the aggregate execution boundary and maps concrete files to responsibility-owned leaves with component graph relations, ports, contracts, tests, observability, and Fowler/DDD basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;PreviewExecutionPlan;StartCanvasRun;ObservePlanRunReadiness',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select distinct
  'PLANNING-DB-WEB-CANVAS-EXECUTION-RUNS-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-WEB-CANVAS-EXECUTION-RUNS'::text, 'may_update'::text
  union all
  select 'component', 'SYS-WEB-VIEW-CANVAS', 'may_reference'
  union all
  select 'path', 'apps/web/src/app/views/canvas/**', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from web_canvas_execution_runs_leaf_map
  union all
  select 'component', target_component_id, 'may_reference'
  from web_canvas_execution_runs_dependency_map
  union all
  select 'path', pattern, 'may_update'
  from web_canvas_execution_runs_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'PreviewExecutionPlan;StartCanvasRun;FlushCanvasDraftForExecution;CollectCanvasExecutionSelection;ResolveCanvasRuntimePolicy;ObservePlanRunReadiness;RegisterCanvasOperationalDrawerContribution',
  fowler_signals = jsonb_build_array('responsibility_overload', 'component_split', 'execution_boundary'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'PreviewExecutionPlan;StartCanvasRun;FlushCanvasDraftForExecution;CollectCanvasExecutionSelection;ResolveCanvasRuntimePolicy;ObservePlanRunReadiness;RegisterCanvasOperationalDrawerContribution',
    'reconciledBy',
    '216_web_canvas_execution_runs_leaf_components',
    'ownedConcern',
    'Owns the aggregate Web Canvas execution and runs boundary; concrete files resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-WEB-CANVAS-EXECUTION-RUNS';

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-WEB-CANVAS-EXECUTION-RUNS',
  'tools/planning-db/migrations/216_web_canvas_execution_runs_leaf_components.sql',
  md5('SYS-WEB-CANVAS-EXECUTION-RUNS:216') || md5('web-canvas-execution-runs-parent:216'),
  0,
  'Canvas execution and runs',
  'component',
  'SYS-WEB-VIEW-CANVAS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate Web Canvas execution and runs boundary; concrete files resolve to responsibility-owned child components.',
  'CanvasExecutionRuns',
  'PreviewExecutionPlan;StartCanvasRun;FlushCanvasDraftForExecution;CollectCanvasExecutionSelection;ResolveCanvasRuntimePolicy;ObservePlanRunReadiness;RegisterCanvasOperationalDrawerContribution',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'tools/planning-db/migrations/216_web_canvas_execution_runs_leaf_components.sql',
  md5(component_id || ':216') || md5(repo_path || cq_rails || ':web-canvas-execution-runs-leaf'),
  0,
  name,
  'component',
  'SYS-WEB-CANVAS-EXECUTION-RUNS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_canvas_execution_runs_leaf_map
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from web_canvas_execution_runs_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  values
    (
      'SYS-WEB-CANVAS-EXECUTION-RUNS',
      'responsibility',
      'Own the aggregate Web Canvas execution and runs boundary and delegate concrete files to action composition, draft flush, selection, run-start, runtime policy, readiness, and operational drawer contribution leaves.',
      0
    ),
    (
      'SYS-WEB-CANVAS-EXECUTION-RUNS',
      'reason_to_change',
      'Canvas execution/runs taxonomy, child component ownership, execution command/query rail grouping, or component hierarchy changes.',
      0
    ),
    (
      'SYS-WEB-CANVAS-EXECUTION-RUNS',
      'invariant',
      'The aggregate must own no concrete apps/web/src/app/views/canvas execution/runs files directly once execution/runs leaves are applied.',
      0
    ),
    (
      'SYS-WEB-CANVAS-EXECUTION-RUNS',
      'non_goal',
      'Do not deprecate active Canvas execution files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-WEB-CANVAS-EXECUTION-RUNS',
      'governance_ref',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-WEB-CANVAS-EXECUTION-RUNS owns no direct execution/runs files and leaf validation commands pass.', 0
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'consumer', 'Canvas route maintainers, runtime safety reviewers, shell drawer reviewers, Planning DB component-profile readers, component-integrity, and changed-slice checks', 0
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/graph/canvas-execution-selection-component.md', 1
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/graph/canvas-plan-run-readiness-component.md', 2
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/runs/start-run-client-identity-boundary.md', 3
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_canvas_execution_runs_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_canvas_execution_runs_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'module',
  layer = 'application',
  owner = 'CanvasExecutionRuns',
  repo_path = 'apps/web/src/app/views/canvas',
  public_contract = 'Aggregate Web Canvas execution and runs boundary; concrete files are owned by execution responsibility leaves.',
  runtime = 'browser',
  criticality = 'critical',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 86),
  parent_component_id = 'SYS-WEB-VIEW-CANVAS',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-RUNS';

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'module',
  'application',
  ddd_owner,
  repo_path,
  public_contract,
  'browser',
  criticality,
  'review',
  maturity_score,
  'SYS-WEB-CANVAS-EXECUTION-RUNS'
from web_canvas_execution_runs_leaf_map
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from web_canvas_execution_runs_leaf_map
union all
select
  'RESP-SYS-WEB-CANVAS-EXECUTION-RUNS',
  'SYS-WEB-CANVAS-EXECUTION-RUNS',
  'Own the aggregate Web Canvas execution and runs boundary and delegate concrete files to responsibility leaves.',
  'Canvas execution/runs taxonomy, child component ownership, execution rail grouping, or component hierarchy changes.',
  'CanvasExecutionRuns',
  'implemented'
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-SURFACE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from web_canvas_execution_runs_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-WEB-CANVAS-EXECUTION-RUNS-CONTAINS-' || relation_suffix,
  'SYS-WEB-CANVAS-EXECUTION-RUNS',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this Canvas execution/runs leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local Web Canvas governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from web_canvas_execution_runs_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  relation_id,
  source_component_id,
  target_component_id,
  'depends_on',
  'outbound',
  'sync',
  contract_id,
  failure_mode,
  'browser-local Canvas execution',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/216_web_canvas_execution_runs_leaf_components.sql'
  ),
  'implemented'
from web_canvas_execution_runs_dependency_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  port_kind,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  'CONTRACT-' || component_id || '-SURFACE',
  negative_tests,
  'implemented'
from web_canvas_execution_runs_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  'TEST-' || component_id || '-' || test_path.test_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from web_canvas_execution_runs_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-WEB-CANVAS-EXECUTION-RUNS-COMPONENT-PROFILE',
  'SYS-WEB-CANVAS-EXECUTION-RUNS',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-WEB-CANVAS-EXECUTION-RUNS --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-WEB-CANVAS-EXECUTION-RUNS --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-WEB-CANVAS-EXECUTION-RUNS',
  component_id,
  name || ' is observable through component-profile, component-quality, focused web tests, shell drawer state, and Canvas execution UI states.',
  'dashboard',
  true,
  'implemented'
from web_canvas_execution_runs_leaf_map
union all
select
  'OBS-SYS-WEB-CANVAS-EXECUTION-RUNS-COMPONENT-QUALITY',
  'SYS-WEB-CANVAS-EXECUTION-RUNS',
  'Canvas execution/runs aggregate health is observable through component-quality direct-file count and child coverage.',
  'dashboard',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.web_canvas_execution_runs_dependency_map;
drop table if exists pg_temp.web_canvas_execution_runs_leaf_map;
