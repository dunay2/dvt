-- Reconcile Web Canvas Planning DB component facts after parallel test
-- modularization reached main. Removed monolithic test files are deprecated as
-- ownership excludes; real split tests and the context-menu view test receive
-- concrete leaf components and evidence.

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
values
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas parallel test drift reconciliation',
    'Architecture / Planning DB / Frontend',
    'implemented',
    'Parallel Web Canvas work replaced the monolithic viewport graph-model and legacy-guide tests with split, tracked test files after earlier Planning DB migrations had repointed to the old surfaces. This design reconciles the DB authority to the real filesystem and records old paths as deprecated excludes instead of recreating stub files.',
    'hidden_authority',
    'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;DetectGovernedSourceDrift;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-VIEW-TEST-LEAF-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas context menu view test leaf',
    'Architecture / Planning DB / Frontend',
    'implemented',
    'CanvasContextMenuView.test.tsx is a real view-level test that was still owned by the broad Canvas parent. This design creates a focused test leaf under the existing Canvas context-menu component.',
    'responsibility_overload',
    'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;ReadComponentProfile',
    now()
  )
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'component',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'component',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'path',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'path',
    'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'relation',
    'REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-MODEL-TESTS',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'test',
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'test',
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-EDGES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'test',
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-NODE-DATA',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'test',
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-LAYOUT',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-PARALLEL-TEST-DRIFT-20260618',
    'test',
    'TEST-WEB-CANVAS-SHELL-LEGACY-GUIDES',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-VIEW-TEST-LEAF-20260618',
    'component',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-VIEW-TEST-LEAF-20260618',
    'component',
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-VIEW-TEST-LEAF-20260618',
    'path',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-VIEW-TEST-LEAF-20260618',
    'relation',
    'REL-WEB-CANVAS-CONTEXT-MENU-CONTAINS-VIEW-TESTS',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-CONTEXT-MENU-VIEW-TEST-LEAF-20260618',
    'test',
    'TEST-WEB-CANVAS-CONTEXT-MENU-VIEW',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
values (
  'local#CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618#command#validatecanvasviewportgraphmodelcomponenttests',
  'CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618',
  'implemented',
  'ValidateCanvasViewportGraphModelComponentTests',
  'validatecanvasviewportgraphmodelcomponenttests',
  'command',
  'CanvasGraphViewportPresentation',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#ViewportGraphModelArgs',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#ViewportGraphModelState',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#buildCanonicalNode',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#buildViewportGraphModelArgs',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts#renderViewportGraphModel'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-layout-persistence-component.md',
    'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md',
    'docs/architecture/components/web/graph/canvas-workspace-explorer-user-stories.md',
    'docs/planning/status/canonical-doc-code-matrix.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    'tools/planning-db/migrations/124_reconcile_web_canvas_parallel_test_drift.sql',
    'scripts/planning-db-migrate.test.cjs',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
    'pnpm planning:db:integrity:check'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
  '3fe92aa9e7c9f358921d1409acc2e914e9acadee8d9d35a01931d0fb1fd00961',
  jsonb_build_object(
    'name',
    'ValidateCanvasViewportGraphModelComponentTests',
    'type',
    'command',
    'dddOwner',
    'CanvasGraphViewportPresentation',
    'status',
    'implemented',
    'sourceRepointReason',
    'Repointed after merge to the tracked split support file and split component tests.',
    'deprecatedSourcePaths',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx'
    )
  ),
  jsonb_build_object(
    'version',
    1,
    'featureId',
    'CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618',
    'mechanizationStatus',
    'implemented',
    'noHumanDecisionsRemaining',
    true,
    'implementationPlan',
    'DB-first Canvas viewport graph-model test modularization owns the tracked split support, edge, node-data, and layout tests; removed monolithic tests are deprecated as DB evidence rather than recreated.',
    'componentGuides',
    jsonb_build_array(
      'docs/architecture/components/web/graph/canvas-layout-persistence-component.md',
      'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md',
      'docs/architecture/components/web/graph/canvas-workspace-explorer-user-stories.md'
    ),
    'governingSources',
    jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
      'tools/planning-db/migrations/124_reconcile_web_canvas_parallel_test_drift.sql',
      'scripts/planning-db-migrate.test.cjs',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
    ),
    'forbiddenImplementationSurfaces',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx'
    ),
    'deprecatedSourcePaths',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
      'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx'
    ),
    'domainObjects',
    jsonb_build_array(
      'CanvasGraphViewportPresentation',
      'CanvasViewportGraphModelTestHarness'
    ),
    'fowlerSignals',
    jsonb_build_array(
      'test_harness_overload',
      'documentation_drift'
    ),
    'architectureGuards',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
      'pnpm planning:db:integrity:check'
    ),
    'cypressFlows',
    jsonb_build_array('not_applicable:component_test_modularization'),
    'completionGate',
    jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm planning:db:integrity:check',
      'pnpm verify:prepush'
    ),
    'commandQueryRails',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'ValidateCanvasViewportGraphModelComponentTests',
        'type',
        'command',
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'status',
        'implemented'
      )
    ),
    'redGreenCycles',
    jsonb_build_array(
      jsonb_build_object(
        'id',
        'validatecanvasviewportgraphmodelcomponenttests-reconcile-parallel-drift',
        'redTest',
        'pnpm planning:db:query source-drift --limit 20 --no-refresh',
        'expectedFailure',
        'The rail source_path pointed at removed useCanvasViewportGraphModel.test.tsx after parallel test modularization merged.',
        'patchSurfaces',
        jsonb_build_array(
          'tools/planning-db/migrations/124_reconcile_web_canvas_parallel_test_drift.sql'
        ),
        'greenTest',
        'pnpm planning:db:integrity:check'
      )
    ),
    'symbols',
    jsonb_build_array(
      jsonb_build_object(
        'name',
        'ViewportGraphModelArgs',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'fowlerSignals',
        jsonb_build_array('test_harness_overload', 'documentation_drift'),
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
        )
      ),
      jsonb_build_object(
        'name',
        'ViewportGraphModelState',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'fowlerSignals',
        jsonb_build_array('test_harness_overload', 'documentation_drift'),
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
        )
      ),
      jsonb_build_object(
        'name',
        'buildCanonicalNode',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'fowlerSignals',
        jsonb_build_array('test_harness_overload', 'documentation_drift'),
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
        )
      ),
      jsonb_build_object(
        'name',
        'buildViewportGraphModelArgs',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'fowlerSignals',
        jsonb_build_array('test_harness_overload', 'documentation_drift'),
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
        )
      ),
      jsonb_build_object(
        'name',
        'renderViewportGraphModel',
        'path',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
        'dddOwner',
        'CanvasGraphViewportPresentation',
        'cqRails',
        jsonb_build_array('ValidateCanvasViewportGraphModelComponentTests'),
        'fowlerSignals',
        jsonb_build_array('test_harness_overload', 'documentation_drift'),
        'architectureGuard',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.architecture.test.ts',
        'cypressCoverage',
        'not_applicable:component_test_modularization',
        'unitTests',
        jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx'
        )
      )
    )
  ),
  0,
  'codex',
  now(),
  now()
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
  created_by,
  created_at
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'planning_query_store.governance_component_local_definitions',
    'ef1c713dc11f29a3cf76dc04fb5040af5cb8ec4bc3f4ae9e85ef0e760bb6aeae',
    1,
    'Canvas graph viewport model tests',
    'component',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns the split support, edge, node-data, and layout component tests that validate Canvas graph viewport model projection behavior.',
    'CanvasGraphViewportPresentationTestContract',
    'ValidateCanvasViewportGraphModelComponentTests',
    'codex',
    now()
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'planning_query_store.governance_component_local_definitions',
    '55151a1688df26d2dc05dd2de1b975c2283f3fc214ab6ce58058a4178747e332',
    0,
    'Canvas context menu view tests',
    'component',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns CanvasContextMenuView view-level rendering and action routing tests.',
    'CanvasContextMenuViewTests',
    'ResolveCanvasContextMenu',
    'codex',
    now()
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = excluded.revision,
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

update planning_query_store.governance_component_local_ownership_patterns pattern
set pattern_kind = 'excludes'
where pattern.component_id = 'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS'
  and pattern.pattern_kind = 'owns'
  and pattern.pattern = 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx'
  and not exists (
    select 1
    from planning_query_store.governance_component_local_ownership_patterns existing_exclude
    where existing_exclude.component_id = pattern.component_id
      and existing_exclude.pattern_kind = 'excludes'
      and existing_exclude.pattern = pattern.pattern
  );

update planning_query_store.governance_component_local_ownership_patterns pattern
set pattern_kind = 'excludes'
where pattern.component_id = 'SYS-WEB-CANVAS-SHELL-TEST-HARNESS'
  and pattern.pattern_kind = 'owns'
  and pattern.pattern = 'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx'
  and not exists (
    select 1
    from planning_query_store.governance_component_local_ownership_patterns existing_exclude
    where existing_exclude.component_id = pattern.component_id
      and existing_exclude.pattern_kind = 'excludes'
      and existing_exclude.pattern = pattern.pattern
  );

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    1
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    2
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    3
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'excludes',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.tsx',
    4
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'excludes',
    'apps/web/src/app/views/canvas/CanvasShell.legacyGuides.test.tsx',
    3
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'owns',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
    0
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'responsibility',
    'Validate Canvas graph viewport model edge projection, node data projection, layout behavior, and shared test support.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'reason_to_change',
    'Canvas graph viewport projection behavior, split test harness, or projection contract changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'public_api',
    'renderViewportGraphModel',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'public_api',
    'buildViewportGraphModelArgs',
    1
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'invariant',
    'The removed monolithic useCanvasViewportGraphModel.test.tsx stays deprecated; split tests are the active evidence.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'transition',
    'review -> implemented after component-quality and source-drift show no stale Web Canvas graph-model test paths.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'consumer',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'fowler_signal',
    'test_harness_overload',
    0
  ),
  (
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'invariant',
    'CanvasShell.legacyGuides.test.tsx is a deprecated removed test path; CanvasShell contextual behavior is validated by current shell tests and architecture guards.',
    2
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'responsibility',
    'Validate CanvasContextMenuView rendering, item visibility, and action routing without owning the presenter timing model.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'reason_to_change',
    'Canvas context menu view rendering, menu item vocabulary, or action routing changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'public_api',
    'CanvasContextMenuView',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'invariant',
    'View tests validate rendered commands; presenter timing remains owned by SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'transition',
    'review -> implemented after component-profile connects CanvasContextMenuView.test.tsx and context-menu contains relation evidence.',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'consumer',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'fowler_signal',
    'responsibility_overload',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  repo_path = 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.test.support.ts',
  public_contract = 'Canvas viewport graph-model split test support and behavior evidence',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS';

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
  parent_component_id,
  created_at,
  updated_at
)
values (
  'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
  'Canvas context menu view tests',
  'ui-view',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
  'CanvasContextMenuView rendering and action-routing test contract',
  'browser',
  'medium',
  'review',
  'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
  now(),
  now()
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
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status,
  created_at
)
values
  (
    'RESP-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'Validate the Canvas viewport graph-model projection contract through split support, edge, node-data, and layout component tests.',
    'Canvas viewport graph-model projection behavior, fixture contract, or split test harness changes.',
    'CanvasGraphViewportPresentationTestContract',
    'implemented',
    now()
  ),
  (
    'RESP-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'Validate CanvasContextMenuView rendering and command routing as a view-level test leaf.',
    'Canvas context-menu view rendering, item vocabulary, or action routing changes.',
    'CanvasContextMenuViewTests',
    'implemented',
    now()
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
  status,
  created_at,
  updated_at
)
values
  (
    'REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-MODEL-TESTS',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'contains',
    'outbound',
    'sync',
    null,
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array(
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
    ),
    'implemented',
    now(),
    now()
  ),
  (
    'REL-WEB-CANVAS-CONTEXT-MENU-CONTAINS-VIEW-TESTS',
    'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU',
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'contains',
    'outbound',
    'sync',
    null,
    'not_applicable',
    'web_canvas_component_ownership',
    jsonb_build_array(
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
    ),
    'implemented',
    now(),
    now()
  )
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

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command,
  created_at
)
values
  (
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-EDGES',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasViewportGraphModel.edges.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-NODE-DATA',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-LAYOUT',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasViewportGraphModel.layout.test.tsx',
    now()
  ),
  (
    'TEST-WEB-CANVAS-SHELL-LEGACY-GUIDES',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'apps/web/src/app/views/canvas/CanvasShell.contextualDialogs.test.tsx',
    'integration',
    'negative',
    false,
    'retired: CanvasShell.legacyGuides.test.tsx was removed; contextual dialog and shell architecture tests are the active evidence.',
    now()
  ),
  (
    'TEST-WEB-CANVAS-CONTEXT-MENU-VIEW',
    'SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasContextMenuView.test.tsx',
    now()
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
