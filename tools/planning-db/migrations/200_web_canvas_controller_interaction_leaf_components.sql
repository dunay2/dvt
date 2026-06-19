-- Split the functional Canvas controller interaction bucket into concrete
-- child components. These are live product files, not deprecated history.

drop table if exists pg_temp.web_canvas_controller_leaf_map;

create temporary table web_canvas_controller_leaf_map (
  component_id text primary key,
  name text not null,
  repo_path text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  excludes text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

insert into web_canvas_controller_leaf_map (
  component_id,
  name,
  repo_path,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  excludes,
  test_id,
  test_path,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-WEB-CANVAS-CONTROLLER-READ-MODEL',
    'Canvas controller read model and posture',
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.ts',
    'CanvasControllerReadModel',
    'ReadCanvasControllerViewModel;ReadCanvasBackendPosture;ReadCanvasHostCycleState',
    'Canvas controller read models, backend posture, canonical snapshot, host-cycle state, and current draft payload derivation.',
    'Own the read-side state used by the Canvas controller and route shell before presentation handlers consume it.',
    'Canvas route posture, controller view-model shape, host-cycle state, or current draft payload derivation changes.',
    'Canvas controller read-model and route posture contract.',
    'responsibility_overload',
    array[
      'canvasBackendPosture',
      'canvasCanonicalSnapshot',
      'canvasControllerViewModel',
      'canvasHostCycleState',
      'useCanvasControllerReadModel',
      'useCanvasCurrentDraftPayload'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasBackendPosture%',
      'apps/web/src/app/views/canvas/canvasCanonicalSnapshot.ts',
      'apps/web/src/app/views/canvas/canvasControllerViewModel%',
      'apps/web/src/app/views/canvas/canvasHostCycleState%',
      'apps/web/src/app/views/canvas/useCanvasControllerReadModel%',
      'apps/web/src/app/views/canvas/useCanvasCurrentDraftPayload.ts'
    ]::text[],
    array[]::text[],
    'TEST-SYS-WEB-CANVAS-CONTROLLER-READ-MODEL',
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/useCanvasControllerReadModel.test.tsx src/app/views/canvas/canvasBackendPosture.test.ts',
    'ReadCanvasControllerViewModel',
    array[
      'backend unavailable posture falls closed',
      'host-cycle state cannot claim a draft without scope evidence',
      'read model must not mutate canvas draft state'
    ]::text[],
    76,
    'medium',
    'READ-MODEL'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-GRAPH-MUTATIONS',
    'Canvas controller graph mutation contracts',
    'apps/web/src/app/views/canvas/useCanvasMutationHandlers.ts',
    'CanvasGraphMutationApplicationService',
    'AuthorCanvasGraphNode;AuthorCanvasGraphEdge;PersistCanvasGraphLayout',
    'Canvas connection aggregate, mutation handler contracts, mutation handlers, layout handlers, and layout persistence boundary.',
    'Own graph mutation and layout handler contracts used by the Canvas controller.',
    'Canvas graph node/edge mutation, handler contract, layout handler, or layout persistence changes.',
    'Canvas graph mutation handler and layout persistence contract.',
    'boundary_drift',
    array[
      'canvasConnectionAggregate',
      'canvasMutationHandlerContracts',
      'useCanvasMutationHandlers',
      'useCanvasLayoutHandlers',
      'useCanvasLayoutPersistence'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasConnectionAggregate%',
      'apps/web/src/app/views/canvas/canvasLayoutPersistence%',
      'apps/web/src/app/views/canvas/canvasMutationHandler%',
      'apps/web/src/app/views/canvas/useCanvasLayoutHandlers%',
      'apps/web/src/app/views/canvas/useCanvasLayoutPersistence.ts',
      'apps/web/src/app/views/canvas/useCanvasMutationHandlers%'
    ]::text[],
    array[]::text[],
    'TEST-SYS-WEB-CANVAS-CONTROLLER-GRAPH-MUTATIONS',
    'apps/web/src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts',
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/useCanvasMutationHandlers.architecture.test.ts src/app/views/canvas/useCanvasLayoutHandlers.architecture.test.ts',
    'AuthorCanvasGraphMutation',
    array[
      'mutation handlers cannot bypass handler contracts',
      'layout persistence cannot write outside the Canvas draft scope',
      'edge mutation rejects invalid graph payloads'
    ]::text[],
    74,
    'medium',
    'GRAPH-MUTATIONS'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'Canvas controller command surface',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'CanvasInteractionCommandSurface',
    'ExecuteCanvasInteractionCommand;SelectCanvasObject;NavigateCanvasRoute',
    'Canvas interaction command surface, plan action routing, navigation actions, selection handlers, and controller store facade.',
    'Own the application command surface that the Canvas controller exposes to shell and route handlers.',
    'Canvas command dispatch, selection, navigation, plan action, or store facade changes.',
    'Canvas interaction command surface contract.',
    'duplicate_semantics',
    array[
      'canvasInteractionCommandSurface',
      'canvasPlanAction',
      'useCanvasNavigationActions',
      'useCanvasSelectionHandlers',
      'useCanvasStoreFacade'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasInteractionCommandSurface%',
      'apps/web/src/app/views/canvas/canvasPlanAction.ts',
      'apps/web/src/app/views/canvas/useCanvasNavigationActions%',
      'apps/web/src/app/views/canvas/useCanvasPlanActionHandler.ts',
      'apps/web/src/app/views/canvas/useCanvasSelectionHandlers%',
      'apps/web/src/app/views/canvas/useCanvasSelectionSync.ts',
      'apps/web/src/app/views/canvas/useCanvasStoreFacade.ts'
    ]::text[],
    array[]::text[],
    'TEST-SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
    'unit',
    'negative',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInteractionCommandSurface.test.ts src/app/views/canvas/useCanvasNavigationActions.test.tsx',
    'ExecuteCanvasInteractionCommand',
    array[
      'unknown command is rejected',
      'selection command cannot escape active Canvas scope',
      'route navigation command cannot bypass command surface'
    ]::text[],
    76,
    'high',
    'COMMAND-SURFACE'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-PRESENTATION-POLICY',
    'Canvas controller presentation policy',
    'apps/web/src/app/views/canvas/canvasPalette.ts',
    'CanvasPresentationPolicyReadModel',
    'ReadCanvasPalette;ReadCanvasPlanReadiness;ReadCanvasTemplatePresentation',
    'Canvas palette, plan readiness, template presentation, overlay context, provenance, impact overlay, and kind-registration test support.',
    'Own the presentation policy read models that support Canvas controller user decisions.',
    'Canvas palette, readiness, template presentation, overlay, provenance, or kind-registration support changes.',
    'Canvas presentation policy read-model contract.',
    'primitive_obsession',
    array[
      'canvasPalette',
      'canvasPlanReadiness',
      'canvasTemplatePresentation',
      'canvasOverlayContext',
      'useCanvasOverlayModel'
    ]::text[],
    array[
      'apps/web/src/app/views/canvas/canvasGitProvenance.ts',
      'apps/web/src/app/views/canvas/canvasImpactOverlay.ts',
      'apps/web/src/app/views/canvas/canvasKindRegistration.testSupport.ts',
      'apps/web/src/app/views/canvas/canvasOverlayContext.ts',
      'apps/web/src/app/views/canvas/canvasPalette%',
      'apps/web/src/app/views/canvas/canvasPlanReadiness%',
      'apps/web/src/app/views/canvas/canvasPreviewProvenance.ts',
      'apps/web/src/app/views/canvas/canvasTemplatePresentation%',
      'apps/web/src/app/views/canvas/useCanvasOverlayModel.ts'
    ]::text[],
    array[]::text[],
    'TEST-SYS-WEB-CANVAS-CONTROLLER-PRESENTATION-POLICY',
    'apps/web/src/app/views/canvas/canvasPlanReadiness.test.ts',
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasPlanReadiness.test.ts src/app/views/canvas/canvasPalette.test.ts src/app/views/canvas/canvasTemplatePresentation.test.ts',
    'ReadCanvasPresentationPolicy',
    array[
      'readiness denies unavailable plan action',
      'palette cannot expose unsupported kind registration',
      'template presentation cannot mutate controller state'
    ]::text[],
    72,
    'medium',
    'PRESENTATION-POLICY'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
    'Canvas controller orchestration hook',
    'apps/web/src/app/views/canvas/useCanvasController.ts',
    'CanvasControllerApplicationService',
    'OrchestrateCanvasController;RecoverCanvasDraft;PersistCanvasDraft',
    'useCanvasController orchestration hook and its focused behavior, recovery, persistence, permission, reload, and harness tests.',
    'Own the central Canvas controller orchestration hook without also owning read-model or environment helpers.',
    'Canvas controller orchestration, draft lifecycle, autosave, permission, recovery, persistence, or test harness changes.',
    'Canvas controller orchestration hook contract.',
    'responsibility_overload',
    array['useCanvasController', 'createUseCanvasControllerHarness']::text[],
    array['apps/web/src/app/views/canvas/useCanvasController%']::text[],
    array[
      'apps/web/src/app/views/canvas/useCanvasControllerReadModel%',
      'apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts'
    ]::text[],
    'TEST-SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
    'apps/web/src/app/views/canvas/useCanvasController.architecture.test.ts',
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/useCanvasController.architecture.test.ts',
    'OrchestrateCanvasController',
    array[
      'controller cannot bypass application services',
      'draft recovery cannot ignore authorization posture',
      'test harness cannot become product authority'
    ]::text[],
    78,
    'high',
    'ORCHESTRATION'
  ),
  (
    'SYS-WEB-CANVAS-CONTROLLER-ENVIRONMENT',
    'Canvas controller environment resolver',
    'apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts',
    'CanvasControllerEnvironmentResolver',
    'ResolveCanvasControllerEnvironment',
    'Canvas controller runtime environment resolution helper.',
    'Own the environment dependency resolution used by the Canvas controller hook.',
    'Canvas controller environment dependency, service lookup, or runtime bootstrap changes.',
    'Canvas controller environment resolution contract.',
    'hidden_authority',
    array['useCanvasControllerEnvironment']::text[],
    array['apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts']::text[],
    array[]::text[],
    'TEST-SYS-WEB-CANVAS-CONTROLLER-ENVIRONMENT',
    'apps/web/src/app/views/canvas/useCanvasController.architecture.test.ts',
    'architecture',
    'boundary',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/useCanvasController.architecture.test.ts',
    'ResolveCanvasControllerEnvironment',
    array[
      'environment resolver cannot introduce a second service authority',
      'missing dependency must fail closed',
      'resolver cannot own controller behavior'
    ]::text[],
    68,
    'medium',
    'ENVIRONMENT'
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
  'PLANNING-DB-WEB-CANVAS-CONTROLLER-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas controller interaction leaf components',
  'Architecture / Planning DB / Frontend',
  'review',
  'SYS-WEB-CANVAS-CONTROLLER-INTERACTION directly owned live Canvas controller files spanning read models, mutation contracts, command surface, presentation policy, orchestration, and environment resolution. This split keeps the functional files active and creates queryable child components with DDD owners, ports, contracts, tests, and Fowler rationale.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;OrchestrateCanvasController;ExecuteCanvasInteractionCommand',
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
  'PLANNING-DB-WEB-CANVAS-CONTROLLER-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-WEB-CANVAS-CONTROLLER-INTERACTION'::text, 'may_update'::text
  union all
  select 'path', 'apps/web/src/app/views/canvas/useCanvasController%', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from web_canvas_controller_leaf_map
  union all
  select 'path', owned.pattern, 'may_update'
  from web_canvas_controller_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
  union all
  select 'test', test_path, 'must_prove'
  from web_canvas_controller_leaf_map
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/200_web_canvas_controller_interaction_leaf_components.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-CONTROLLER-INTERACTION:200') || md5('controller-parent:200'),
  children_required = true,
  owned_concern = 'Owns the aggregate Canvas controller interaction boundary; concrete controller files resolve to read-model, mutation, command, presentation-policy, orchestration, or environment child components.',
  ddd_owner = 'CanvasControllerInteraction',
  cq_rails = 'OrchestrateCanvasController;ExecuteCanvasInteractionCommand;ReadCanvasControllerViewModel'
where component_id = 'SYS-WEB-CANVAS-CONTROLLER-INTERACTION';

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
  'tools/planning-db/migrations/200_web_canvas_controller_interaction_leaf_components.sql',
  md5(component_id || ':200') || md5(repo_path || cq_rails || ':canvas-controller-leaf'),
  0,
  name,
  'component',
  'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_canvas_controller_leaf_map
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
  owned.pattern,
  owned.pattern_order - 1
from web_canvas_controller_leaf_map
cross join lateral unnest(owns) with ordinality as owned(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'excludes',
  excluded.pattern,
  excluded.pattern_order - 1
from web_canvas_controller_leaf_map
cross join lateral unnest(excludes) with ordinality as excluded(pattern, pattern_order)
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
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'invariant', 'Files matching this child component must resolve here rather than to the aggregate SYS-WEB-CANVAS-CONTROLLER-INTERACTION.', 0
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'non_goal', 'No live Canvas controller file is deprecated by this split; old or nonfunctional files require explicit deprecation evidence before status changes.', 0
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-WEB-CANVAS-CONTROLLER-INTERACTION owns no direct controller files.', 0
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'consumer', 'Canvas route, Canvas shell, component-profile, component-quality, and architecture-drift query readers.', 0
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_canvas_controller_leaf_map
  union all
  select component_id, 'public_api', api.value, api.ordinality - 1
  from web_canvas_controller_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, ordinality)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
values (
  'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
  'Canvas controller interaction',
  'module',
  'application',
  'Frontend / Canvas',
  'apps/web/src/app/views/canvas/useCanvasController.ts',
  'Canvas controller aggregate boundary. Concrete files resolve to child components.',
  'browser',
  'high',
  'review',
  78,
  'SYS-WEB-VIEW-CANVAS'
)
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
  'Frontend / Canvas',
  repo_path,
  public_contract,
  'browser',
  criticality,
  'review',
  maturity_score,
  'SYS-WEB-CANVAS-CONTROLLER-INTERACTION'
from web_canvas_controller_leaf_map
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
from web_canvas_controller_leaf_map
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
  'CONTRACT-' || component_id || '-APP',
  'port',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from web_canvas_controller_leaf_map
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
  'REL-WEB-CANVAS-CONTROLLER-CONTAINS-' || relation_suffix,
  'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this Canvas controller child is removed or remapped without a governed Planning DB component update.',
  'repo-local frontend governance',
  jsonb_build_array(
    'tools/planning-db/migrations/200_web_canvas_controller_interaction_leaf_components.sql',
    repo_path
  ),
  'implemented'
from web_canvas_controller_leaf_map
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
  case
    when port_name ~* '^(Read|Resolve)' then 'query'
    else 'command'
  end,
  'inbound',
  'CONTRACT-' || component_id || '-APP',
  'CONTRACT-' || component_id || '-APP',
  negative_tests,
  'implemented'
from web_canvas_controller_leaf_map
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
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  true,
  validation_command
from web_canvas_controller_leaf_map
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
  'OBS-' || component_id || '-PROFILE',
  component_id,
  'Canvas controller child ownership is observable through component-profile, component-quality, filesystem-coverage, and architecture-drift.',
  'log',
  true,
  'implemented'
from web_canvas_controller_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.web_canvas_controller_leaf_map;
