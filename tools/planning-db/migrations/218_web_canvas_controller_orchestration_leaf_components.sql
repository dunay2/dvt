-- Split the broad Web Canvas controller orchestration hook bucket into
-- responsibility leaves. These files are active implementation and validation
-- assets; old or nonfunctional files require explicit deprecation evidence
-- before they can be marked deprecated.

drop table if exists pg_temp.web_canvas_controller_orchestration_leaf_map;
drop table if exists pg_temp.web_canvas_controller_orchestration_dependency_map;

create temporary table web_canvas_controller_orchestration_leaf_map (
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

create temporary table web_canvas_controller_orchestration_dependency_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  contract_id text,
  failure_mode text not null
);

insert into web_canvas_controller_orchestration_leaf_map (
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
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'Canvas controller hook core facade',
    'CanvasControllerApplicationService',
    'OrchestrateCanvasController;ReadCanvasControllerViewModel;ExecuteCanvasInteractionCommand',
    'Owns the live useCanvasController facade, route-safe output contract, architecture guard, and core behavior tests.',
    'Compose controller read models, environment dependencies, graph handlers, command surface, execution actions, and presentation policy into one route-safe Canvas facade.',
    'Controller facade return contract, route-safe orchestration, permission posture, inspector exposure, or canvas document behavior changes.',
    'The core hook must remain a composition facade; it must not re-own read-model, environment, graph mutation, execution, draft persistence, or source-import semantics.',
    'apps/web/src/app/views/canvas/useCanvasController.ts',
    'Canvas controller hook facade contract.',
    'application_service',
    array['useCanvasController', 'CanvasControllerApplicationService']::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.ts',
      'apps/web/src/app/views/canvas/useCanvasController.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasController.core.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.canvasDocument.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.inspector.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasController.core.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.canvasDocument.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.inspector.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.permissions.test.tsx'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.canvasDocument.test.tsx src/app/views/canvas/useCanvasController.permissions.test.tsx',
    'OrchestrateCanvasController',
    'command',
    array['missing environment dependency', 'permission denied', 'inspector unavailable', 'controller route contract drift']::text[],
    84,
    'critical',
    'HOOK-CORE'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-AUTHORING',
    'Canvas controller active draft authoring',
    'CanvasControllerActiveDraftAuthoring',
    'ApplyCanvasActiveDraftAuthoring;ImportCanvasSourceIntoDraft;UpdateCanvasDraftLayout',
    'Owns controller-level active draft authoring behavior, source-import completion handling, imported-node focus, and layout authoring tests.',
    'Route active draft user actions into the dedicated Canvas draft and source-import boundaries without turning the controller hook into persistence authority.',
    'Active draft node authoring, layout authoring, source-import completion, imported focus, or active-draft authoring test changes.',
    'Active draft authoring must delegate persistence to draft lifecycle leaves and source import to the source import boundary; it must not bypass command surface or repository scope rails.',
    'apps/web/src/app/views/canvas/useCanvasController.activeDraftNodeAuthoring.test.tsx',
    'Controller active draft authoring command boundary.',
    'boundary_drift',
    array['applyInspectorNodeDraft', 'handleSourceImportComplete', 'handleImportedNodeFocusComplete']::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.activeDraftLayout.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.activeDraftNodeAuthoring.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.activeDraftSourceImport.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.test.draftAuthoring.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.activeDraftLayout.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.activeDraftNodeAuthoring.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.activeDraftSourceImport.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.sourceImport.test.tsx'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.activeDraftNodeAuthoring.test.tsx src/app/views/canvas/useCanvasController.sourceImport.test.tsx',
    'ApplyCanvasActiveDraftAuthoring',
    'command',
    array['missing persisted draft', 'source import after missing remote draft', 'layout-only autosave shortcut', 'inspector command outside visible scope']::text[],
    82,
    'critical',
    'ACTIVE-DRAFT-AUTHORING'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY',
    'Canvas controller draft recovery and reload',
    'CanvasControllerDraftRecovery',
    'RecoverCanvasControllerDraft;ReloadCanvasDraft;ProjectCanvasDraftScope',
    'Owns controller-level draft recovery, missing-remote fail-closed behavior, reload hydration guards, conflict recovery fixtures, and persisted projection guards.',
    'Coordinate reload and recovery behavior around the existing draft lifecycle and repository scope without duplicating draft storage semantics in the controller.',
    'Missing remote recovery, reload conflict handling, protected draft reload, hydration guards, scope projection, or recovery support fixture changes.',
    'Recovery and reload must remain fail-closed on missing or unauthorized remote draft state and must not synthesize repository records outside the draft lifecycle boundary.',
    'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx',
    'Controller draft recovery and reload command boundary.',
    'policy_object',
    array['reloadLatestDraft', 'hasMissingRemoteDraft', 'projectCanvasHarnessDraftReadModel']::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.conflictState.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasController.draftProjectionGuards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.missingRemote.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadProtectedDraft.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadRecovery.test.support.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.conflictState.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.draftProjectionGuards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.missingRemote.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.reloadProtectedDraft.test.tsx'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.missingRemote.test.tsx src/app/views/canvas/useCanvasController.reloadHydrationGuards.test.tsx src/app/views/canvas/useCanvasController.reloadConflictRecovery.test.tsx',
    'RecoverCanvasControllerDraft',
    'command',
    array['remote draft missing', 'stale revision conflict', 'scope projection widened', 'unauthorized protected draft reload']::text[],
    84,
    'critical',
    'DRAFT-RECOVERY'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-PERSISTENCE-GUARDS',
    'Canvas controller persistence guards',
    'CanvasControllerPersistenceGuards',
    'PersistCanvasControllerDraft;GuardCanvasAutosaveRace;ReadCanvasDraftRecord',
    'Owns controller-level autosave race guards, layout persistence probes, draft-save helpers, and remote draft record test builders.',
    'Validate the controller only asks the draft lifecycle to persist safe state and does not reopen editing, overwrite missing remotes, or lose scope evidence during autosave races.',
    'Autosave race guard, layout persistence, draft-save helper, remote draft record fixture, or persistence-probe test changes.',
    'Controller persistence must remain a client-side guard over the draft lifecycle; repository writes and idempotency semantics stay with Canvas draft repository leaves.',
    'apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx',
    'Controller persistence and autosave guard boundary.',
    'hidden_authority',
    array['triggerGovernedAutosave', 'resolveCanvasHarnessDraftSave', 'buildCanvasHarnessRemoteDraftRecord']::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.autosaveRace.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.test.draftRecord.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.draftSave.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.autosaveRace.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.persistence.test.tsx src/app/views/canvas/useCanvasController.autosaveRace.test.tsx',
    'PersistCanvasControllerDraft',
    'command',
    array['late autosave after missing remote', 'layout persistence during protected reload', 'scope-less save', 'duplicate draft record write']::text[],
    84,
    'critical',
    'PERSISTENCE-GUARDS'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-TEST-HARNESS',
    'Canvas controller test harness adapter',
    'CanvasControllerTestHarnessAdapter',
    'BuildCanvasControllerTestHarness;ReadCanvasHarnessGraphQuery;ConfigureCanvasControllerMocks',
    'Owns the reusable jsdom harness, query client mocks, store projections, default service fixtures, state factory, and harness type surface for controller tests.',
    'Provide a governed test adapter for controller behavior without allowing mocks or fixtures to become product semantics.',
    'Controller test harness, mock wiring, graph query mocks, state factory, service defaults, or harness type changes.',
    'Harness code must remain a test adapter; it must not define product authority, duplicate command/query rails, or mask missing real component ownership.',
    'apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx',
    'Canvas controller test harness adapter contract.',
    'anti_corruption_layer',
    array['setupCanvasControllerHarness', 'createDefaultCanvasHarnessState', 'configureDefaultCanvasHarnessMocks']::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.test.fixtures.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.graphQuery.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.test.mockSetup.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.mockWiring.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.projectionMocks.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.queryClientMocks.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.serviceDefaults.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.stateFactory.ts',
      'apps/web/src/app/views/canvas/useCanvasController.test.types.ts'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasController.core.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasController.persistence.test.tsx'
    ]::text[],
    'unit',
    'boundary',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasController.core.test.tsx src/app/views/canvas/useCanvasController.persistence.test.tsx',
    'BuildCanvasControllerTestHarness',
    'query',
    array['harness mocks define product behavior', 'query mock bypasses graph query key', 'store projection hides authorization state']::text[],
    78,
    'high',
    'TEST-HARNESS'
  );

insert into web_canvas_controller_orchestration_dependency_map (
  source_component_id,
  target_component_id,
  relation_id,
  contract_id,
  failure_mode
)
values
  (
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'SYS-WEB-CANVAS-CONTROLLER-READ-MODEL',
    'REL-WEB-CANVAS-CONTROLLER-HOOK-CORE-DEPENDS-ON-READ-MODEL',
    null,
    'The controller facade can become a read-model authority if it stops depending on SYS-WEB-CANVAS-CONTROLLER-READ-MODEL.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'SYS-WEB-CANVAS-CONTROLLER-ENVIRONMENT',
    'REL-WEB-CANVAS-CONTROLLER-HOOK-CORE-DEPENDS-ON-ENVIRONMENT',
    null,
    'The controller facade can resolve runtime dependencies ad hoc if the environment resolver relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'REL-WEB-CANVAS-CONTROLLER-HOOK-CORE-DEPENDS-ON-COMMAND-SURFACE',
    null,
    'The controller facade can duplicate command dispatch semantics if it stops depending on the command surface.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'SYS-WEB-CANVAS-CONTROLLER-GRAPH-MUTATIONS',
    'REL-WEB-CANVAS-CONTROLLER-HOOK-CORE-DEPENDS-ON-GRAPH-MUTATIONS',
    null,
    'The controller facade can bypass mutation contracts if graph handler ownership is not declared.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'SYS-WEB-CANVAS-EXECUTION-ACTION-COMPOSITION',
    'REL-WEB-CANVAS-CONTROLLER-HOOK-CORE-DEPENDS-ON-EXECUTION-ACTIONS',
    null,
    'The controller facade can duplicate plan-preview or run-start semantics if execution action composition is not the declared dependency.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-AUTHORING',
    'SYS-WEB-CANVAS-DRAFT-AUTHORING-MODEL',
    'REL-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-DEPENDS-ON-DRAFT-AUTHORING',
    null,
    'Active draft authoring can invent draft commands if it stops depending on the draft authoring model.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-AUTHORING',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
    'REL-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-DEPENDS-ON-SOURCE-IMPORT',
    null,
    'Source-import completion can drift from the source import workflow if this relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-AUTHORING',
    'SYS-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY',
    'REL-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-DEPENDS-ON-DRAFT-RECOVERY',
    'CONTRACT-SYS-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY-SURFACE',
    'Active authoring can write against missing or stale remote state if it loses the recovery relation.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY',
    'SYS-WEB-CANVAS-DRAFT-BOOTSTRAP-RECOVERY',
    'REL-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY-DEPENDS-ON-DRAFT-BOOTSTRAP',
    null,
    'Controller reload can duplicate bootstrap recovery semantics if it does not depend on the draft recovery leaf.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY',
    'SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE',
    'REL-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY-DEPENDS-ON-REPOSITORY-SCOPE',
    null,
    'Controller reload can widen protected draft scope if repository scope ownership is not declared.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-PERSISTENCE-GUARDS',
    'SYS-WEB-CANVAS-DRAFT-AUTOSAVE-PERSISTENCE',
    'REL-WEB-CANVAS-CONTROLLER-PERSISTENCE-DEPENDS-ON-DRAFT-AUTOSAVE',
    null,
    'Controller persistence guards can become an autosave implementation if the draft autosave relation is missing.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-PERSISTENCE-GUARDS',
    'SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE',
    'REL-WEB-CANVAS-CONTROLLER-PERSISTENCE-DEPENDS-ON-REPOSITORY-SCOPE',
    null,
    'Controller persistence guards can save records without scope and idempotency evidence if repository scope ownership is not declared.'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-TEST-HARNESS',
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'REL-WEB-CANVAS-CONTROLLER-TEST-HARNESS-DEPENDS-ON-HOOK-CORE',
    'CONTRACT-SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE-SURFACE',
    'The test harness can define product behavior if it is not explicitly tied to the hook core contract.'
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
  'PLANNING-DB-WEB-CANVAS-CONTROLLER-ORCHESTRATION-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas controller orchestration leaf component mapping',
  'Architecture / Planning DB / Web Canvas',
  'review',
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION owned 35 active useCanvasController files directly across hook facade, active draft authoring, reload/recovery, autosave/persistence, and test harness responsibilities. This migration keeps the existing component as the aggregate orchestration boundary and maps concrete files to responsibility-owned leaves with component graph relations, ports, contracts, tests, observability, and Fowler/DDD basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;OrchestrateCanvasController;RecoverCanvasControllerDraft;PersistCanvasControllerDraft;BuildCanvasControllerTestHarness',
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
  'PLANNING-DB-WEB-CANVAS-CONTROLLER-ORCHESTRATION-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION'::text, 'may_update'::text
  union all
  select 'component', 'SYS-WEB-CANVAS-CONTROLLER-INTERACTION', 'may_reference'
  union all
  select 'path', 'apps/web/src/app/views/canvas/useCanvasController%', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from web_canvas_controller_orchestration_leaf_map
  union all
  select 'component', target_component_id, 'may_reference'
  from web_canvas_controller_orchestration_dependency_map
  union all
  select 'path', pattern, 'may_update'
  from web_canvas_controller_orchestration_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'OrchestrateCanvasController;ApplyCanvasActiveDraftAuthoring;RecoverCanvasControllerDraft;PersistCanvasControllerDraft;BuildCanvasControllerTestHarness',
  fowler_signals = jsonb_build_array('responsibility_overload', 'component_split', 'application_service'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'OrchestrateCanvasController;ApplyCanvasActiveDraftAuthoring;RecoverCanvasControllerDraft;PersistCanvasControllerDraft;BuildCanvasControllerTestHarness',
    'reconciledBy',
    '218_web_canvas_controller_orchestration_leaf_components',
    'ownedConcern',
    'Owns the aggregate Web Canvas controller orchestration boundary; concrete useCanvasController files resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION';

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
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  'tools/planning-db/migrations/218_web_canvas_controller_orchestration_leaf_components.sql',
  md5('SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION:218') || md5('web-canvas-controller-orchestration-parent:218'),
  0,
  'Canvas controller orchestration',
  'component',
  'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate Web Canvas controller orchestration boundary; concrete useCanvasController files resolve to responsibility-owned child components.',
  'CanvasControllerOrchestration',
  'OrchestrateCanvasController;ApplyCanvasActiveDraftAuthoring;RecoverCanvasControllerDraft;PersistCanvasControllerDraft;BuildCanvasControllerTestHarness',
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
  'tools/planning-db/migrations/218_web_canvas_controller_orchestration_leaf_components.sql',
  md5(component_id || ':218') || md5(repo_path || cq_rails || ':web-canvas-controller-orchestration-leaf'),
  0,
  name,
  'component',
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_canvas_controller_orchestration_leaf_map
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
from web_canvas_controller_orchestration_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  'excludes',
  child_owns.pattern,
  child_owns.pattern_order - 1
from web_canvas_controller_orchestration_leaf_map
cross join lateral unnest(owns) with ordinality as child_owns(pattern, pattern_order)
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
      'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
      'responsibility',
      'Own the aggregate Web Canvas controller orchestration boundary and delegate concrete useCanvasController files to hook core, active draft authoring, draft recovery, persistence guards, and test harness leaves.',
      0
    ),
    (
      'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
      'reason_to_change',
      'Canvas controller orchestration taxonomy, child component ownership, controller command/query rail grouping, or component hierarchy changes.',
      0
    ),
    (
      'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
      'invariant',
      'The aggregate must own no concrete apps/web/src/app/views/canvas/useCanvasController files directly once orchestration leaves are applied.',
      0
    ),
    (
      'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
      'non_goal',
      'Do not deprecate active Canvas controller files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
      'governance_ref',
      'docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md',
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
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION owns no direct useCanvasController files and leaf validation commands pass.', 0
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'consumer', 'Canvas route maintainers, Web Canvas controller reviewers, Planning DB component-profile readers, component-integrity, and changed-slice checks', 0
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md', 1
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_canvas_controller_orchestration_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_canvas_controller_orchestration_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'module',
  layer = 'application',
  owner = 'CanvasControllerOrchestration',
  repo_path = 'docs/architecture/components/web/graph/canvas-controller-current-to-target-architecture.md',
  public_contract = 'Aggregate Web Canvas controller orchestration boundary; concrete useCanvasController files are owned by orchestration responsibility leaves.',
  runtime = 'browser',
  criticality = 'critical',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 84),
  parent_component_id = 'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION';

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
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION'
from web_canvas_controller_orchestration_leaf_map
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
from web_canvas_controller_orchestration_leaf_map
union all
select
  'RESP-SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  'Own the aggregate Web Canvas controller orchestration boundary and delegate concrete useCanvasController files to responsibility leaves.',
  'Canvas controller orchestration taxonomy, child ownership, controller rail grouping, or component hierarchy changes.',
  'CanvasControllerOrchestration',
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
from web_canvas_controller_orchestration_leaf_map
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
  'REL-WEB-CANVAS-CONTROLLER-ORCHESTRATION-CONTAINS-' || relation_suffix,
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this Canvas controller orchestration leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local Web Canvas governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from web_canvas_controller_orchestration_leaf_map
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
  'browser-local Canvas controller orchestration',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/218_web_canvas_controller_orchestration_leaf_components.sql'
  ),
  'implemented'
from web_canvas_controller_orchestration_dependency_map
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
from web_canvas_controller_orchestration_leaf_map
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
from web_canvas_controller_orchestration_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION-COMPONENT-PROFILE',
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION --no-refresh --limit 20'
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
  'OBS-' || component_id || '-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  component_id,
  name || ' is observable through component-profile, component-quality, focused web tests, and Canvas controller UI states.',
  'dashboard',
  true,
  'implemented'
from web_canvas_controller_orchestration_leaf_map
union all
select
  'OBS-SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION-COMPONENT-QUALITY',
  'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
  'Canvas controller orchestration aggregate health is observable through component-quality direct-file count and child coverage.',
  'dashboard',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.web_canvas_controller_orchestration_dependency_map;
drop table if exists pg_temp.web_canvas_controller_orchestration_leaf_map;
