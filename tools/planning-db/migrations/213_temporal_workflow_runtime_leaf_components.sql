-- Split the broad Temporal run-plan workflow runtime component into
-- responsibility leaves. These workflow and test files are active
-- implementation/evidence assets; old or nonfunctional files require explicit
-- deprecation evidence before they can be marked deprecated.

drop table if exists pg_temp.temporal_workflow_runtime_leaf_map;
drop table if exists pg_temp.temporal_workflow_runtime_dependency_map;

create temporary table temporal_workflow_runtime_leaf_map (
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

create temporary table temporal_workflow_runtime_dependency_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  contract_id text,
  failure_mode text not null
);

insert into temporal_workflow_runtime_leaf_map (
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
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUN-MAPPING',
    'Temporal workflow run mapping',
    'TemporalWorkflowRunMapping',
    'MapTemporalRunReference;ReadTemporalProviderRunStatus',
    'Owns Temporal workflow id, task queue, provider run-reference, and provider-status mapping for DVT runs.',
    'Translate DVT run identity and provider status into Temporal workflow references without owning workflow execution or lifecycle control.',
    'Temporal workflow id, task queue, provider run ref, provider status, or mapping type-check changes.',
    'Run mapping must remain a pure adapter translation and must not start, signal, cancel, or inspect workflows directly.',
    'packages/@dvt/adapter-temporal/src/WorkflowMapper.ts',
    'Temporal workflow id, task queue, run reference, and provider status mapping boundary.',
    'anti_corruption_layer',
    array['toTemporalWorkflowId', 'toTemporalTaskQueue', 'toTemporalRunRef', 'mapTemporalStatusToRunStatus']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/WorkflowMapper.ts',
      'packages/@dvt/adapter-temporal/test/helpers/lookupRunRefHarness.ts',
      'packages/@dvt/adapter-temporal/test/workflowMapper.typecheck.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-temporal/test/workflowMapper.typecheck.ts'
    ]::text[],
    'contract',
    'boundary',
    'pnpm --filter @dvt/adapter-temporal test -- workflowMapper.typecheck.ts',
    'MapTemporalRunReference',
    'query',
    array['blank workflow id', 'unknown provider status', 'invalid task queue mapping']::text[],
    82,
    'high',
    'RUN-MAPPING'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT',
    'Temporal run-plan workflow entrypoint',
    'TemporalRunPlanWorkflowEntrypoint',
    'ExecuteTemporalRunPlanWorkflow;ReadTemporalRunPlanWorkflowResult',
    'Owns the deterministic Temporal workflow entrypoint and workflow input/result type boundary.',
    'Coordinate the run-plan workflow through named child boundaries while keeping provider mapping, cursor, lifecycle, and layer semantics explicit.',
    'Workflow entrypoint, workflow input/result type, workflow literal parity, or orchestration handoff changes.',
    'The entrypoint must remain deterministic and may only delegate side effects through Temporal activities and governed child workflow leaves.',
    'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts',
    'Temporal run-plan workflow entrypoint and input/result contract.',
    'process_manager',
    array['runPlanWorkflow', 'RunPlanWorkflowInput', 'RunPlanWorkflowResult']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts',
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts',
      'packages/@dvt/adapter-temporal/test/workflow-literals.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-temporal/test/workflow-literals.test.ts'
    ]::text[],
    'architecture',
    'boundary',
    'pnpm --filter @dvt/adapter-temporal test -- workflow-literals.test.ts',
    'ExecuteTemporalRunPlanWorkflow',
    'command',
    array['non-deterministic import', 'unowned signal literal', 'provider-owned lifecycle branch']::text[],
    84,
    'critical',
    'ENTRYPOINT'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LIFECYCLE-CONTROL',
    'Temporal workflow lifecycle control',
    'TemporalWorkflowLifecycleControl',
    'ControlTemporalRunPlanWorkflow;SettleTemporalWorkflowCancellation',
    'Owns pause, resume, cancellation, terminal settlement, signal registration, and bounded control-signal dedupe policy.',
    'Settle workflow lifecycle control transitions while keeping DVT run events authoritative over Temporal provider state.',
    'Pause, resume, cancel, signal, terminal lifecycle, native cancellation, or control-signal retention changes.',
    'Lifecycle control must emit canonical DVT run events and must not make Temporal the semantic lifecycle authority.',
    'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts',
    'Temporal workflow lifecycle control and cancellation settlement boundary.',
    'state_pattern',
    array['handlePreLayerLifecycle', 'finalizeCancellationIfRequested', 'registerSignalHandlers', 'retainRecentControlSignalIds']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.cancellation.ts',
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts',
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.signals.ts',
      'packages/@dvt/adapter-temporal/src/workflows/workflowControlSignalRetentionPolicy.ts',
      'packages/@dvt/adapter-temporal/test/runPlanWorkflow.cancellation.test.ts',
      'packages/@dvt/adapter-temporal/test/runPlanWorkflow.signals.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-temporal/test/runPlanWorkflow.cancellation.test.ts',
      'packages/@dvt/adapter-temporal/test/runPlanWorkflow.signals.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/adapter-temporal test -- runPlanWorkflow.cancellation.test.ts runPlanWorkflow.signals.test.ts',
    'ControlTemporalRunPlanWorkflow',
    'command',
    array['duplicate control signal', 'cancel while paused', 'native Temporal cancellation interruption']::text[],
    88,
    'critical',
    'LIFECYCLE-CONTROL'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-CURSOR-STATE',
    'Temporal workflow cursor and payload state',
    'TemporalWorkflowCursorState',
    'ManageTemporalWorkflowCursorState;BuildTemporalWorkflowRuntimePayload',
    'Owns workflow control input parsing, continue-as-new cursor state, runtime event payload shaping, failure reason policy, and deterministic error formatting.',
    'Keep long-running workflow continuation and terminal payload state explicit, bounded, and portable across Temporal executions.',
    'Workflow cursor, input parsing, continue-as-new payload, runtime terminal payload, failure reason, or error normalization changes.',
    'Cursor and payload state must be deterministic, bounded, and serializable before Temporal continuation or terminal events are emitted.',
    'packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts',
    'Temporal workflow cursor, input parsing, terminal payload, and failure reason policy boundary.',
    'event_carried_state_transfer',
    array['parseWorkflowControlInput', 'buildContinueAsNewInput', 'buildWorkflowFailedPayload', 'resolveContinuationFailureReason']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.state.ts',
      'packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers.ts',
      'packages/@dvt/adapter-temporal/src/workflows/workflowErrorHelpers.ts',
      'packages/@dvt/adapter-temporal/src/workflows/workflowFailureReasonPolicy.ts',
      'packages/@dvt/adapter-temporal/src/workflows/workflowInputParsingHelpers.ts',
      'packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts',
      'packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts',
      'packages/@dvt/adapter-temporal/test/workflowRuntimePayloadHelpers.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts',
      'packages/@dvt/adapter-temporal/test/workflowRuntimePayloadHelpers.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/adapter-temporal test -- workflow-continue-as-new.test.ts workflowRuntimePayloadHelpers.test.ts',
    'ManageTemporalWorkflowCursorState',
    'command',
    array['cursor payload too large', 'invalid continue-as-new threshold', 'unknown continuation failure reason']::text[],
    88,
    'critical',
    'CURSOR-STATE'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LAYER-EXECUTION',
    'Temporal workflow layer execution',
    'TemporalWorkflowLayerExecution',
    'ExecuteTemporalWorkflowLayer;RouteTemporalWorkflowStepActivity;ReadTemporalGatewayDependencyContext',
    'Owns activity proxies, layer loop orchestration, layer result application, step execution, gateway context, retry routing tests, and step-routing evidence.',
    'Execute workflow layers through DVT-owned step, gateway, retry, and activity-routing semantics without embedding provider-specific plan interpretation.',
    'Layer loop, step activity routing, gateway dependency context, layer result, DAG order, retry policy evidence, or compiled-code ref routing changes.',
    'Layer execution must route side effects through activities and must not parse gateway DSL or plugin-specific step semantics inside workflow code.',
    'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts',
    'Temporal workflow layer execution, step routing, gateway context, and activity proxy boundary.',
    'application_service',
    array['createStepActivities', 'executePlanLayers', 'executeLayerSteps', 'buildGatewayContext']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.activities.ts',
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerHelpers.ts',
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts',
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts',
      'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.stepExecution.ts',
      'packages/@dvt/adapter-temporal/src/workflows/workflowGatewayHelpers.ts',
      'packages/@dvt/adapter-temporal/test/runPlanWorkflow.layers.order.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-dag-scheduler.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-retry-policy.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-step-activity-routing.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-temporal/test/runPlanWorkflow.layers.order.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-dag-scheduler.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-retry-policy.test.ts',
      'packages/@dvt/adapter-temporal/test/workflow-step-activity-routing.test.ts'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/adapter-temporal test -- runPlanWorkflow.layers.order.test.ts workflow-compiled-code-ref.test.ts workflow-dag-scheduler.test.ts workflow-retry-policy.test.ts workflow-step-activity-routing.test.ts',
    'ExecuteTemporalWorkflowLayer',
    'command',
    array['gateway dependency fact missing', 'self dependency cycle', 'activity task queue route missing']::text[],
    86,
    'critical',
    'LAYER-EXECUTION'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-SEGMENT-RESOLUTION',
    'Temporal workflow execution segment resolution',
    'TemporalWorkflowSegmentResolution',
    'ResolveTemporalWorkflowExecutionSegment',
    'Owns bounded execution-segment resolution from canonical plans for Temporal workflow layer execution.',
    'Expose only the requested layer and bounded metadata needed by the workflow while preventing full-plan payload growth.',
    'Execution segment resolver, layer segment bounds, gateway downstream metadata, or segment-size tests change.',
    'Segment resolution must reject out-of-range layers and must not pass full execution plans through Temporal workflow payloads.',
    'packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts',
    'Temporal workflow bounded execution-segment query boundary.',
    'bounded_context_query',
    array['resolveExecutionSegmentFromPlan']::text[],
    array[
      'packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts',
      'packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts'
    ]::text[],
    'unit',
    'negative',
    'pnpm --filter @dvt/adapter-temporal test -- workflow-execution-segment.test.ts',
    'ResolveTemporalWorkflowExecutionSegment',
    'query',
    array['out-of-range layer index', 'full-plan payload leakage', 'missing gateway segment metadata']::text[],
    86,
    'critical',
    'SEGMENT-RESOLUTION'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-INTEGRATION-HARNESS',
    'Temporal workflow integration harness',
    'TemporalWorkflowIntegrationHarness',
    'ValidateTemporalWorkflowTimeSkippingHarness;ReadTemporalWorkflowIntegrationFixture',
    'Owns time-skipping workflow harness fixtures, runtime state helpers, integration plans, wait helpers, workflow artifact path helpers, and component-guide support.',
    'Validate workflow runtime behavior through governed integration harnesses without making test fixtures part of runtime semantics.',
    'Time-skipping integration harness, runtime fixture, contract fixture, workflow artifact path, wait helper, or component-guide support changes.',
    'Harness files must support validation only; they must not become production workflow behavior or hidden runtime adapters.',
    'packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts',
    'Temporal workflow integration and time-skipping evidence harness boundary.',
    'test_harness',
    array['buildTemporalContractFixtures', 'createRuntimeStateHarness', 'runTemporalTimeSkippingSharedTests']::text[],
    array[
      'packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts',
      'packages/@dvt/adapter-temporal/test/helpers/integration/runtimeState.ts',
      'packages/@dvt/adapter-temporal/test/helpers/integration/testPlans.ts',
      'packages/@dvt/adapter-temporal/test/helpers/integration/waitForCondition.ts',
      'packages/@dvt/adapter-temporal/test/helpers/integration/workflowArtifacts.ts',
      'packages/@dvt/adapter-temporal/test/helpers/workflowComponentGuideSupport.ts',
      'packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts',
      'packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts',
      'packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts',
      'packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts'
    ]::text[],
    array[
      'packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts',
      'packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts',
      'packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts'
    ]::text[],
    'integration',
    'flow',
    'pnpm --filter @dvt/adapter-temporal test:integration:time-skipping',
    'ValidateTemporalWorkflowTimeSkippingHarness',
    'query',
    array['time-skipping environment unavailable', 'runtime state fixture mismatch', 'workflow artifact path missing']::text[],
    84,
    'high',
    'INTEGRATION-HARNESS'
  );

insert into temporal_workflow_runtime_dependency_map (
  source_component_id,
  target_component_id,
  relation_id,
  contract_id,
  failure_mode
)
values
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LIFECYCLE-CONTROL',
    'REL-TEMPORAL-WORKFLOW-ENTRYPOINT-DEPENDS-ON-LIFECYCLE-CONTROL',
    'CONTRACT-SYS-ADAPTERS-TEMPORAL-WORKFLOW-LIFECYCLE-CONTROL-SURFACE',
    'Workflow entrypoint cannot settle pause, resume, cancellation, or terminal transitions if lifecycle control semantics drift.'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-CURSOR-STATE',
    'REL-TEMPORAL-WORKFLOW-ENTRYPOINT-DEPENDS-ON-CURSOR-STATE',
    'CONTRACT-SYS-ADAPTERS-TEMPORAL-WORKFLOW-CURSOR-STATE-SURFACE',
    'Workflow entrypoint cannot continue-as-new or emit terminal payloads safely if cursor state semantics drift.'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LAYER-EXECUTION',
    'REL-TEMPORAL-WORKFLOW-ENTRYPOINT-DEPENDS-ON-LAYER-EXECUTION',
    'CONTRACT-SYS-ADAPTERS-TEMPORAL-WORKFLOW-LAYER-EXECUTION-SURFACE',
    'Workflow entrypoint cannot execute plan layers if layer execution routing or gateway semantics drift.'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LAYER-EXECUTION',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-SEGMENT-RESOLUTION',
    'REL-TEMPORAL-WORKFLOW-LAYER-EXECUTION-DEPENDS-ON-SEGMENT-RESOLUTION',
    'CONTRACT-SYS-ADAPTERS-TEMPORAL-WORKFLOW-SEGMENT-RESOLUTION-SURFACE',
    'Layer execution cannot stay bounded if execution-segment resolution starts leaking full-plan payloads.'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LAYER-EXECUTION',
    'SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS',
    'REL-TEMPORAL-WORKFLOW-LAYER-EXECUTION-DEPENDS-ON-WORKFLOW-ARTIFACT-HELPERS',
    null,
    'Step-started payloads, retry policy evidence, and materialization references drift if workflow artifact helpers change without runtime dependency review.'
  ),
  (
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-INTEGRATION-HARNESS',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT',
    'REL-TEMPORAL-WORKFLOW-INTEGRATION-HARNESS-DEPENDS-ON-ENTRYPOINT',
    'CONTRACT-SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT-SURFACE',
    'Integration harness evidence becomes misleading if it no longer exercises the canonical run-plan workflow entrypoint.'
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
  'PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Temporal workflow runtime leaf component mapping',
  'Architecture / Planning DB / Adapters',
  'review',
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME owned 43 active Temporal workflow runtime and validation files directly. This migration keeps the existing component as the aggregate Temporal run-plan workflow boundary and maps concrete files into run mapping, entrypoint, lifecycle control, cursor state, layer execution, segment resolution, and integration harness leaves with component graph relations, command/query ports, contracts, tests, observability, and Fowler/DDD basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ExecuteTemporalRunPlanWorkflow',
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
  'PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME'::text, 'may_update'::text
  union all
  select 'component', 'SYS-ADAPTERS-ROOT', 'may_reference'
  union all
  select 'component', 'SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS', 'may_reference'
  union all
  select 'path', 'packages/@dvt/adapter-temporal/src/workflows/**', 'may_update'
  union all
  select 'path', 'packages/@dvt/adapter-temporal/test/**', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from temporal_workflow_runtime_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from temporal_workflow_runtime_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'ExecuteTemporalRunPlanWorkflow;MapTemporalRunReference;ReadTemporalProviderRunStatus;ControlTemporalRunPlanWorkflow;ManageTemporalWorkflowCursorState;ExecuteTemporalWorkflowLayer;ResolveTemporalWorkflowExecutionSegment;ValidateTemporalWorkflowTimeSkippingHarness',
  fowler_signals = jsonb_build_array('responsibility_overload', 'component_split', 'process_manager', 'anti_corruption_layer'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'ExecuteTemporalRunPlanWorkflow;MapTemporalRunReference;ReadTemporalProviderRunStatus;ControlTemporalRunPlanWorkflow;ManageTemporalWorkflowCursorState;ExecuteTemporalWorkflowLayer;ResolveTemporalWorkflowExecutionSegment;ValidateTemporalWorkflowTimeSkippingHarness',
    'reconciledBy',
    '213_temporal_workflow_runtime_leaf_components',
    'ownedConcern',
    'Owns the aggregate Temporal run-plan workflow runtime boundary; concrete workflow runtime files resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME';

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
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  'tools/planning-db/migrations/213_temporal_workflow_runtime_leaf_components.sql',
  md5('SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME:213') || md5('temporal-workflow-runtime-parent:213'),
  0,
  'Temporal run-plan workflow runtime',
  'component',
  'SYS-ADAPTERS-ROOT',
  'SYS-DVT',
  'SYS-ADAPTERS',
  'review',
  true,
  'Owns the aggregate Temporal run-plan workflow runtime boundary; concrete workflow runtime files resolve to responsibility-owned child components.',
  'TemporalRunPlanWorkflow',
  'ExecuteTemporalRunPlanWorkflow;MapTemporalRunReference;ReadTemporalProviderRunStatus;ControlTemporalRunPlanWorkflow;ManageTemporalWorkflowCursorState;ExecuteTemporalWorkflowLayer;ResolveTemporalWorkflowExecutionSegment;ValidateTemporalWorkflowTimeSkippingHarness',
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
  'tools/planning-db/migrations/213_temporal_workflow_runtime_leaf_components.sql',
  md5(component_id || ':213') || md5(repo_path || cq_rails || ':temporal-workflow-runtime-leaf'),
  0,
  name,
  'component',
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  'SYS-DVT',
  'SYS-ADAPTERS',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from temporal_workflow_runtime_leaf_map
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
from temporal_workflow_runtime_leaf_map
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
      'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
      'responsibility',
      'Own the aggregate Temporal run-plan workflow runtime boundary and delegate concrete workflow runtime and validation files to run mapping, entrypoint, lifecycle control, cursor state, layer execution, segment resolution, and integration harness leaves.',
      0
    ),
    (
      'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
      'reason_to_change',
      'Temporal run-plan workflow taxonomy, workflow runtime ownership, adapter lifecycle boundary, or component hierarchy changes.',
      0
    ),
    (
      'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
      'invariant',
      'The aggregate must own no concrete Temporal workflow runtime files directly once runtime leaves are applied.',
      0
    ),
    (
      'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
      'non_goal',
      'Do not deprecate active Temporal workflow runtime or test files merely to reduce direct-file count; nonfunctional files require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
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
  from temporal_workflow_runtime_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from temporal_workflow_runtime_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from temporal_workflow_runtime_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME owns no direct files and leaf validation commands pass.', 0
  from temporal_workflow_runtime_leaf_map
  union all
  select component_id, 'consumer', 'Adapter maintainers, Temporal workflow runtime reviewers, Planning DB component-profile readers, component-integrity, and changed-slice checks', 0
  from temporal_workflow_runtime_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from temporal_workflow_runtime_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from temporal_workflow_runtime_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from temporal_workflow_runtime_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'workflow',
  layer = 'adapter',
  owner = 'Architecture / Adapters',
  repo_path = 'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts',
  public_contract = 'Aggregate Temporal run-plan workflow runtime boundary; concrete workflow responsibilities are owned by child components.',
  runtime = 'temporal',
  criticality = 'critical',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 86),
  parent_component_id = 'SYS-ADAPTERS-ROOT',
  updated_at = now()
where component_id = 'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME';

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
  'workflow',
  'adapter',
  ddd_owner,
  repo_path,
  public_contract,
  'temporal',
  criticality,
  'review',
  maturity_score,
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME'
from temporal_workflow_runtime_leaf_map
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
from temporal_workflow_runtime_leaf_map
union all
select
  'RESP-SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  'Own the aggregate Temporal run-plan workflow runtime boundary and delegate concrete runtime files to responsibility leaves.',
  'Temporal run-plan workflow runtime taxonomy, runtime ownership, adapter lifecycle boundary, or component hierarchy changes.',
  'TemporalRunPlanWorkflow',
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
from temporal_workflow_runtime_leaf_map
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
  'REL-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME-CONTAINS-' || relation_suffix,
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this Temporal workflow runtime leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local Temporal adapter governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from temporal_workflow_runtime_leaf_map
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
  'Temporal adapter workflow runtime',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/213_temporal_workflow_runtime_leaf_components.sql'
  ),
  'implemented'
from temporal_workflow_runtime_dependency_map
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
from temporal_workflow_runtime_leaf_map
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
from temporal_workflow_runtime_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME-COMPONENT-PROFILE',
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME --no-refresh --limit 20'
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
  'OBS-' || component_id || '-COMPONENT-PROFILE',
  component_id,
  name || ' is observable through component-profile, component-quality, component-integrity, and focused Temporal workflow runtime tests.',
  'dashboard',
  true,
  'implemented'
from temporal_workflow_runtime_leaf_map
union all
select
  'OBS-SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME-COMPONENT-QUALITY',
  'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME',
  'The aggregate Temporal workflow runtime component is observable through component-quality direct-file count and child coverage.',
  'dashboard',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
