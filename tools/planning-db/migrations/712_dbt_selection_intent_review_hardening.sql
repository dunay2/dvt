-- Close review findings without creating a parallel execution-selection rail.
-- Explicit intent survives presentation reconciliation, and preview identity
-- includes requested-root semantics even when dependency closure is unchanged.

update architecture.design
set
  rationale = 'CollectCanvasExecutionSelection remains the single policy seam. Raw explicit DBT intent reaches validation before presentation reconciliation, invalid hidden members fail closed, and draft identity includes selection mode plus requested roots as well as the derived executable closure.',
  updated_at = now()
where design_id = 'AD-DBT-SELECTION-INTENT-INTEGRITY-20260716';

update architecture.component_port
set
  negative_tests = array[
    'explicit DBT selection contains a non-executable resource',
    'explicit DBT selection contains an unavailable resource',
    'mixed explicit DBT selection must not be filtered to a successful subset',
    'unavailable explicit selection must survive visible-scope reconciliation until validation',
    'same dependency closure with different requested roots must invalidate preview identity',
    'duplicate selected node ids',
    'cyclic executable dependency input',
    'browser selection differs from server-authorized resource set'
  ]::text[],
  status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and port_name = 'CollectCanvasExecutionSelection';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'public_api';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'public_api',
    'collectPreviewSelection;collectPlanSelection;isDbtExecutionSelectableNode;canOfferDbtExecutionSelectionToggle;resolveDbtExecutionScope;buildDbtExecutionIntentDraftSignature;buildCanvasDbtExecutionProjection',
    0
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'invariant',
    'Raw non-empty DBT selection intent is validated before visible-scope or file-projection reconciliation can remove unavailable members.',
    6
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'invariant',
    'DBT draft identity includes selection mode and requested roots; equal executable closure does not make distinct caller intent equivalent.',
    7
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:review-hardening:712'), 2),
  owned_concern = 'Preserve complete generic and DBT execution-selection intent through presentation reconciliation, classify executable roots, and derive deterministic requested-root and dependency-closure identity without widening or filtering explicit intent.',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  responsibility = 'Preserve complete caller selection intent through presentation reconciliation, classify executable DBT roots, and derive requested-root plus dependency-closure read models and draft identity for Preview and readiness.',
  raw_component = raw_component || jsonb_build_object(
    'selectionIdentity', jsonb_build_object(
      'validatedBeforePresentationReconciliation', true,
      'signatureMembers', jsonb_build_array('selection mode', 'requested roots', 'executable closure')
    )
  ),
  source_path = 'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:review-hardening:712'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-SELECTION-HIDDEN-INTENT',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx',
    'integration', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx'
  ),
  (
    'TEST-WEB-DBT-AUTHORED-ROOT-SIGNATURE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts'
  ),
  (
    'TEST-WEB-DBT-FILE-ROOT-SIGNATURE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-HIDDEN-SELECTION-INTENT',
    'integration-test', 'current',
    'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx',
    'CollectCanvasExecutionSelection',
    'authored-dbt-visible-scope-reconciliation',
    'A selected DBT id outside the current visible projection reaches execution validation and is not converted into workspace fallback.',
    jsonb_build_object('rawIntentPreserved', true, 'presentationSelectionReconciledSeparately', true),
    'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql',
    md5('validation:dbt-hidden-selection-intent:712')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-AUTHORED-ROOT-SIGNATURE',
    'unit-test', 'current',
    'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts',
    'CollectCanvasExecutionSelection',
    'authored-dbt-preview-identity',
    'Authored DBT projections with equal executable closure and different requested roots have different draft signatures.',
    jsonb_build_object('selectionModeInSignature', true, 'requestedRootsInSignature', true),
    'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql',
    md5('validation:dbt-authored-root-signature:712')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'VAL-WEB-DBT-FILE-ROOT-SIGNATURE',
    'unit-test', 'current',
    'apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts',
    'CollectCanvasExecutionSelection',
    'file-backed-dbt-preview-identity',
    'File-backed DBT projections with equal executable closure and different requested roots have different draft signatures.',
    jsonb_build_object('selectionModeInSignature', true, 'requestedRootsInSignature', true),
    'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql',
    md5('validation:dbt-file-root-signature:712')
  )
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = symbol_refs || jsonb_build_array(
    'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#buildDbtExecutionIntentDraftSignature'
  ),
  implementation_refs = implementation_refs || jsonb_build_array(
    'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql'
  ),
  allowed_implementation_surfaces = allowed_implementation_surfaces || jsonb_build_array(
    'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql'
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      raw_manifest,
      '{allowedImplementationSurfaces}',
      coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb) || jsonb_build_array(
        'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql'
      )
    ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'name', 'buildDbtExecutionIntentDraftSignature',
        'path', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts',
        'dddOwner', 'CanvasExecutionSelection',
        'cqRails', jsonb_build_array('CollectCanvasExecutionSelection', 'PreviewExecutionPlan', 'ObservePlanRunReadiness'),
        'fowlerSignals', jsonb_build_array('divergent change', 'data clump'),
        'architectureGuard', 'canvasExecutionSelection.architecture.test.ts',
        'cypressCoverage', 'dbt-project-preview-run-live.cy.ts',
        'unitTests', jsonb_build_array('canvasDbtPlannerGraphSource.test.ts', 'dbtProjectFileExecutionStrategy.test.ts')
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/712_dbt_selection_intent_review_hardening.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:review-hardening:712'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
declare
  review_invariant_count integer;
  review_evidence_count integer;
  signature_symbol_count integer;
begin
  select count(*) into review_invariant_count
  from planning_query_store.governance_component_local_semantic_items
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and item_kind = 'invariant'
    and item_order in (6, 7);

  select count(*) into review_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id in (
      'VAL-WEB-DBT-HIDDEN-SELECTION-INTENT',
      'VAL-WEB-DBT-AUTHORED-ROOT-SIGNATURE',
      'VAL-WEB-DBT-FILE-ROOT-SIGNATURE'
    )
    and evidence_status = 'current';

  select count(*) into signature_symbol_count
  from planning_query_store.feature_mechanization_local_rails rail
  cross join lateral jsonb_array_elements(rail.raw_manifest->'symbols') symbol
  where rail.rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed'
    and symbol->>'name' = 'buildDbtExecutionIntentDraftSignature';

  if review_invariant_count <> 2 then
    raise exception 'Selection review hardening requires two semantic invariants, found %', review_invariant_count;
  end if;

  if review_evidence_count <> 3 then
    raise exception 'Selection review hardening requires three relational evidence rows, found %', review_evidence_count;
  end if;

  if signature_symbol_count <> 1 then
    raise exception 'Selection intent signature helper must have exactly one manifest symbol, found %', signature_symbol_count;
  end if;
end $$;
