-- DB-first review backlog for buzon/TAREA.TXT. The source document is treated
-- as intake evidence; this view is the operator-facing Planning DB read model
-- used to review one canonical task owner per UX/DB criterion before UI work.

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
  'CANVAS-UXDB-TRACEABILITY-REVIEW-20260626',
  'E-CANVAS-UXDB-TRACEABILITY-REVIEW-1',
  'Canvas UX DB-first traceability review backlog',
  'Frontend / Planning DB',
  'review',
  'TAREA.TXT defines a large graph-first UX and DB-first specification. The implementation must proceed through canonical Planning DB tasks, components, and command/query rails instead of ad hoc Markdown or duplicate UI slices.',
  'hidden_authority',
  'ListCanvasUxdbTraceability',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

create or replace view planning_query_store.canvas_uxdb_traceability_query as
with criteria as (
  select *
  from (
    values
      ('UX-001', 'ux_rule', 'Graph is the base mode, not a tab.', 'E-CANVAS-TOPBAR-MINIMAL-1', 'P0', 10, 'buzon/TAREA.TXT', 'Remove view-tab thinking from the base Canvas shell and keep graph as the permanent work surface.'),
      ('UX-002', 'ux_rule', 'Graph, Code and Log must not be top-level navigation tabs.', 'E-CANVAS-TOPBAR-MINIMAL-1', 'P0', 20, 'buzon/TAREA.TXT', 'Retire Graph|Code|Log navigation and route Code/Log into contextual surfaces.'),
      ('UX-003', 'ux_rule', 'Code opens contextually while the graph remains visible.', 'E-CANVAS-SQL-CONTEXT-WORKBENCH-1', 'P0', 30, 'buzon/TAREA.TXT', 'Implement graph plus SQL split workbench through the node/project code rails.'),
      ('UX-004', 'ux_rule', 'Log lives in the bottom operational drawer.', 'E-CANVAS-BOTTOM-DRAWER-OPS-1', 'P0', 40, 'buzon/TAREA.TXT', 'Move log, readiness and sync details into the bottom drawer.'),
      ('UX-005', 'ux_rule', 'The base state must not have a fixed left resource panel.', 'E-CANVAS-LEGACY-PALETTE-RETIRE-1', 'P0', 50, 'buzon/TAREA.TXT', 'Retire the permanent palette/resource panel after contextual insertion and Add Source are authoritative.'),
      ('UX-006', 'ux_rule', 'The base state must not have a fixed right multiuse inspector.', 'E-CANVAS-NODE-WORKBENCH-1', 'P0', 60, 'buzon/TAREA.TXT', 'Move node detail into contextual workbench surfaces and keep global diagnostics in the drawer.'),
      ('UX-007', 'ux_rule', 'Insertion actions originate from the canvas coordinate.', 'E-CANVAS-SPATIAL-ADD-NODES-1', 'P0', 70, 'buzon/TAREA.TXT', 'Create source/model/transformation/test/output nodes from canvas context coordinates.'),
      ('UX-008', 'ux_rule', 'Node actions originate from the node.', 'E-CANVAS-NODE-WORKBENCH-1', 'P0', 80, 'buzon/TAREA.TXT', 'Keep node editing and run-from-node commands tied to selected node context.'),
      ('UX-009', 'ux_rule', 'CanvasContextMenu and NodeContextMenu are different grammars.', 'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1', 'P0', 90, 'buzon/TAREA.TXT', 'Implement CanvasContextMenu and NodeContextMenu through separate governed rails.'),
      ('UX-010', 'ux_rule', 'Execution readiness is not a permanent top banner.', 'E-CANVAS-EXECUTION-PREVIEW-READINESS-1', 'P0', 100, 'buzon/TAREA.TXT', 'Keep top readiness compact and move details to Problems and Preview.'),
      ('UX-011', 'ux_rule', 'Plan is renamed to Preview execution plan.', 'E-CANVAS-EXECUTION-PREVIEW-READINESS-1', 'P0', 110, 'buzon/TAREA.TXT', 'Rename ambiguous Plan actions and expose execution preview scope/order/blockers.'),
      ('UX-012', 'ux_rule', 'Sources appear only inside the Add Source flow.', 'E-CANVAS-LEGACY-PALETTE-RETIRE-1', 'P0', 120, 'buzon/TAREA.TXT', 'Remove fixed source explorer chrome and open source browsing contextually.'),
      ('UX-013', 'ux_rule', 'Insert appears from canvas context or command palette, not permanent chrome.', 'E-CANVAS-SPATIAL-ADD-NODES-1', 'P0', 130, 'buzon/TAREA.TXT', 'Route insertion through spatial canvas rails and later command palette entries.'),
      ('UX-014', 'ux_rule', 'Project becomes File or Workspace, not a loose toolbar button.', 'E-CANVAS-GLOBAL-MENU-BAR-1', 'P0', 140, 'buzon/TAREA.TXT', 'Move project-level actions under global File/Workspace menus.'),
      ('UX-015', 'ux_rule', 'Node Workbench is contextual to the active node.', 'E-CANVAS-NODE-WORKBENCH-1', 'P0', 150, 'buzon/TAREA.TXT', 'Create typed node workbench sections instead of persistent mixed inspector UI.'),
      ('UX-016', 'ux_flow', 'Add Source opens as a contextual dialog with Connections, Browse, Metadata and Selected.', 'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1', 'P0', 160, 'buzon/TAREA.TXT', 'Use the existing Add Source live-flow task and finish any remaining browser-proof source selection regressions through follow-up criteria.'),
      ('UX-017', 'ux_flow', 'Project Explorer opens on demand.', 'E-CANVAS-PROJECT-EXPLORER-CONTEXTUAL-1', 'P1', 170, 'buzon/TAREA.TXT', 'Keep project exploration contextual and out of base graph chrome.'),
      ('UX-018', 'ux_flow', 'Command palette reuses the same rails as contextual menus.', 'E-CANVAS-COMMAND-PALETTE-1', 'P1', 180, 'buzon/TAREA.TXT', 'Add command palette as an accelerator after canonical menu rails exist.'),
      ('UX-019', 'ux_flow', 'Bottom drawer exposes Log, Problems, Runs and Preview.', 'E-CANVAS-BOTTOM-DRAWER-OPS-1', 'P0', 190, 'buzon/TAREA.TXT', 'Make the operational drawer the single home for diagnostic and run surfaces.'),
      ('UX-020', 'ux_flow', 'Execution preview shows scope, order, affected nodes, skipped nodes, blockers and estimates.', 'E-CANVAS-EXECUTION-PREVIEW-READINESS-1', 'P0', 200, 'buzon/TAREA.TXT', 'Implement the Preview rail before enabling governed Run.'),
      ('UX-021', 'ux_flow', 'Source/model/transform nodes show columns, types, constraints and metadata.', 'E-CANVAS-COLUMN-METADATA-SELECTION-1', 'P0', 210, 'buzon/TAREA.TXT', 'Expose available metadata in workbench sections and cards without placeholder unknowns when data exists.'),
      ('UX-022', 'ux_flow', 'Supported transforms allow column selection.', 'E-CANVAS-COLUMN-METADATA-SELECTION-1', 'P0', 220, 'buzon/TAREA.TXT', 'Add selectable column state only through the owning rail when supported.'),
      ('UX-023', 'ux_flow', 'DBT tests explain target model, target column, severity and assertion meaning.', 'E-CANVAS-DBT-TEST-SEMANTICS-WORKBENCH-1', 'P0', 230, 'buzon/TAREA.TXT', 'Move test semantics into the workbench and avoid duplicating test property actions in node menus.'),
      ('UX-024', 'ux_flow', 'Output/Sink requires exact database, schema, table and write strategy.', 'E-CANVAS-SINK-TARGET-WORKBENCH-1', 'P0', 240, 'buzon/TAREA.TXT', 'Implement exact sink target configuration and readiness validation.'),
      ('UX-025', 'ux_flow', 'Node cards show professional runtime metrics.', 'E-CANVAS-NODE-CARD-METRICS-P0-1', 'P0', 250, 'buzon/TAREA.TXT', 'Add records, bytes, state, last execution, duration and warnings where available.'),
      ('UX-026', 'ux_flow', 'DBT and DVT surfaces use strategy boundaries.', 'E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1', 'P0', 260, 'buzon/TAREA.TXT', 'Select cards and workbench sections by DBT/DVT strategy instead of route-level ad hoc JSX.'),
      ('UX-027', 'ux_flow', 'Presentation components must be real components, not ad hoc JSX and embedded styles.', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1', 'P0', 270, 'buzon/TAREA.TXT', 'Extract templates, presenters and tested presentational components before broad UI iteration.'),
      ('UX-028', 'ux_test', 'DVT flow must be browser-proven end to end without fake draft intercepts.', 'E-DVT-FLOW-E2E-PROOF-1', 'P0', 280, 'buzon/TAREA.TXT', 'Prove DVT source, column selection, SQL transform, sink, preview, readiness and run gating in browser.'),
      ('UX-029', 'ux_test', 'DBT flow must be browser-proven end to end.', 'E-DBT-FLOW-E2E-PROOF-1', 'P0', 290, 'buzon/TAREA.TXT', 'Prove DBT source/model/test/output authoring with metadata and preview/run behavior.'),
      ('DB-001', 'db_rule', 'Planning DB is the source of truth for specification, analysis, components, C&Q, tests and evidence.', 'E-CANVAS-UXDB-SPEC-PERSISTENCE-1', 'P0', 300, 'buzon/TAREA.TXT', 'Persist the UX specification as queryable Planning DB records before closing UI slices.'),
      ('DB-002', 'db_rule', 'Markdown in buzon is an intake/export surface, not primary authority.', 'E-CANVAS-UXDB-SPEC-PERSISTENCE-1', 'P0', 310, 'buzon/TAREA.TXT', 'Keep buzon/TAREA.TXT as source evidence while DB rows own review and implementation state.'),
      ('DB-003', 'db_rule', 'AI task plan, decisions, changes, evidence and results must be persisted.', 'E-CANVAS-UXDB-TRACEABILITY-REVIEW-1', 'P0', 320, 'buzon/TAREA.TXT', 'Use Planning DB task operations and traceability queries instead of free-form progress notes.'),
      ('DB-004', 'db_rule', 'UI components must have DB representation.', 'E-CANVAS-UXDB-SPEC-PERSISTENCE-1', 'P0', 330, 'buzon/TAREA.TXT', 'Register component surfaces and ownership in Planning DB before claiming completion.'),
      ('DB-005', 'db_rule', 'Commands and queries must be explicitly modeled.', 'E-CANVAS-UXDB-SPEC-PERSISTENCE-1', 'P0', 340, 'buzon/TAREA.TXT', 'Represent externally visible actions through command/query rails before implementation.'),
      ('DB-006', 'db_rule', 'Tests and acceptance criteria must be persisted.', 'E-CANVAS-UXDB-ACCEPTANCE-CATALOG-1', 'P0', 350, 'buzon/TAREA.TXT', 'Persist the acceptance catalog and test definitions before closing Canvas P0.'),
      ('DB-007', 'db_rule', 'External references and UX patterns must be traceable.', 'E-CANVAS-UXDB-SPEC-PERSISTENCE-1', 'P0', 360, 'buzon/TAREA.TXT', 'Keep references as DB facts tied to decisions and component tasks.'),
      ('DB-008', 'db_rule', 'Human documentation must be generated/exported from DB.', 'E-CANVAS-UXDB-EXPORT-1', 'P1', 370, 'buzon/TAREA.TXT', 'Generate reports/manuals from Planning DB records and register export provenance.'),
      ('DB-009', 'db_rule', 'Decisions need state, justification and links to components/tasks/tests.', 'E-CANVAS-UXDB-SPEC-PERSISTENCE-1', 'P0', 380, 'buzon/TAREA.TXT', 'Make each UX decision inspectable through task and component traceability.'),
      ('DB-010', 'db_rule', 'No important specification may live only in Markdown.', 'E-CANVAS-UXDB-TRACEABILITY-REVIEW-1', 'P0', 390, 'buzon/TAREA.TXT', 'Expose this criterion map as a Planning DB query and keep follow-up implementation DB-first.')
  ) as criterion(
    criterion_code,
    criterion_kind,
    criterion_title,
    canonical_task_id,
    task_priority,
    priority_rank,
    source_path,
    action_hint
  )
),
criteria_with_owner_counts as (
  select
    criteria.*,
    count(*) over (partition by criterion_code)::int as duplicate_owner_count
  from criteria
),
tasks as (
  select
    task_id,
    priority,
    status,
    progress_pct,
    claimed_by,
    objective,
    evidence_refs
  from planning_query_store.planning_effective_tasks
)
select
  criteria.criterion_code,
  criteria.criterion_kind,
  criteria.criterion_title,
  criteria.canonical_task_id,
  coalesce(tasks.priority, criteria.task_priority) as task_priority,
  coalesce(tasks.status, 'missing-task') as task_status,
  case
    when tasks.task_id is null then 'missing-task'
    when criteria.duplicate_owner_count > 1 then 'duplicate-owner'
    when tasks.status = 'done' then 'closed'
    when tasks.status = 'review' then 'review'
    when tasks.status = 'in_progress' then 'in-progress'
    when tasks.status = 'queued' then 'not-started'
    when tasks.status = 'blocked' then 'blocked'
    else 'needs-review'
  end as coverage_state,
  criteria.duplicate_owner_count,
  case
    when criteria.duplicate_owner_count > 1 then 'duplicate-owner'
    else 'single-owner'
  end as duplicate_state,
  criteria.source_path,
  criteria.action_hint,
  jsonb_build_object(
    'source_path', 'buzon/TAREA.TXT',
    'criterionTitle', criteria.criterion_title,
    'priorityRank', criteria.priority_rank,
    'taskObjective', coalesce(tasks.objective, ''),
    'progressPct', tasks.progress_pct,
    'claimedBy', tasks.claimed_by,
    'evidenceRefs', coalesce(tasks.evidence_refs, '[]'::jsonb)
  ) as metadata
from criteria_with_owner_counts criteria
left join tasks
  on tasks.task_id = criteria.canonical_task_id;

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
  'local#E-CANVAS-UXDB-TRACEABILITY-REVIEW-1#query#listcanvasuxdbtraceability',
  'E-CANVAS-UXDB-TRACEABILITY-REVIEW-1',
  'implemented',
  'ListCanvasUxdbTraceability',
  'listcanvasuxdbtraceability',
  'query',
  'CanvasUxdbTraceabilityReadModel',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/292_canvas_uxdb_traceability_review_query.sql#canvas_uxdb_traceability_query',
    'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs#readCanvasUxdbTraceabilityRows',
    'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs#buildCanvasUxdbTraceabilityRows'
  ),
  jsonb_build_array(
    'tools/planning-db/migrations/292_canvas_uxdb_traceability_review_query.sql',
    'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
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
    'tools/planning-db/migrations/292_canvas_uxdb_traceability_review_query.sql',
    'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs',
    'scripts/planning-db-query.cjs',
    'scripts/planning-db-query.test.cjs',
    'scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "CanvasUxdbTraceability|canvas-uxdb-traceability|root help" scripts/planning-db-query.test.cjs',
    'node --test --test-name-pattern "Canvas UX DB-first traceability review" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query canvas-uxdb-traceability --limit 50'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test --test-name-pattern "CanvasUxdbTraceability|canvas-uxdb-traceability|root help" scripts/planning-db-query.test.cjs',
    'node --test --test-name-pattern "Canvas UX DB-first traceability review" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query canvas-uxdb-traceability --limit 50',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/292_canvas_uxdb_traceability_review_query.sql',
  md5('E-CANVAS-UXDB-TRACEABILITY-REVIEW-1:ListCanvasUxdbTraceability:292')
    || md5('canvas-uxdb-traceability-review'),
  jsonb_build_object(
    'name', 'ListCanvasUxdbTraceability',
    'type', 'query',
    'dddOwner', 'CanvasUxdbTraceabilityReadModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-UXDB-TRACEABILITY-REVIEW-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Expose TAREA.TXT criteria as a DB-owned traceability backlog keyed by canonical Planning DB tasks so implementation proceeds through one owner per criterion.',
    'componentGuides', jsonb_build_array(
      'planning-db:query/canvas-uxdb-traceability',
      'buzon/TAREA.TXT'
    ),
    'userStories', jsonb_build_array(
      jsonb_build_object(
        'role', 'Canvas product reviewer',
        'need', 'Review TAREA.TXT as a DB-owned backlog instead of a free-form Markdown checklist.',
        'acceptance', 'canvas-uxdb-traceability lists each UX/DB criterion, canonical task owner, coverage state and duplicate state.'
      ),
      jsonb_build_object(
        'role', 'Frontend implementer',
        'need', 'Know the next canonical task before changing Canvas UI code.',
        'acceptance', 'The query returns one canonical task per criterion and exposes missing or duplicate owners before implementation.'
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
      'tools/planning-db/migrations/292_canvas_uxdb_traceability_review_query.sql',
      'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs',
      'scripts/planning-db-query.cjs',
      'scripts/planning-db-query.test.cjs',
      'scripts/planning-db-migrate.test.cjs'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/**',
      'packages/**',
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml',
      'buzon/**#primary_backlog'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test --test-name-pattern "CanvasUxdbTraceability|canvas-uxdb-traceability|root help" scripts/planning-db-query.test.cjs',
      'node --test --test-name-pattern "Canvas UX DB-first traceability review" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query canvas-uxdb-traceability --state missing-task --limit 20',
      'pnpm planning:db:query canvas-uxdb-traceability --state duplicate-owner --limit 20',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:planning_db_traceability_read_model'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test --test-name-pattern "CanvasUxdbTraceability|canvas-uxdb-traceability|root help" scripts/planning-db-query.test.cjs',
      'node --test --test-name-pattern "Canvas UX DB-first traceability review" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:query canvas-uxdb-traceability --state missing-task --limit 20',
      'pnpm planning:db:query canvas-uxdb-traceability --state duplicate-owner --limit 20',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ListCanvasUxdbTraceability',
        'type', 'query',
        'dddOwner', 'CanvasUxdbTraceabilityReadModel',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      'CanvasUxdbTraceabilityReadModel'
    ),
    'fowlerSignals', jsonb_build_array(
      'duplicate_semantics',
      'documentation_drift',
      'hidden_authority'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-uxdb-traceability-query',
        'redTest',
        'node --test --test-name-pattern "CanvasUxdbTraceability|canvas-uxdb-traceability|root help" scripts/planning-db-query.test.cjs',
        'expectedFailure',
        'Planning DB query CLI help and reader did not expose canvas-uxdb-traceability.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs',
          'scripts/planning-db-query.cjs',
          'scripts/planning-db-query.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "CanvasUxdbTraceability|canvas-uxdb-traceability|root help" scripts/planning-db-query.test.cjs'
      ),
      jsonb_build_object(
        'id', 'canvas-uxdb-traceability-migration',
        'redTest',
        'node --test --test-name-pattern "Canvas UX DB-first traceability review" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'Migration 292 and canvas_uxdb_traceability_query were absent.',
        'patchSurfaces', jsonb_build_array(
          'tools/planning-db/migrations/292_canvas_uxdb_traceability_review_query.sql',
          'scripts/planning-db-migrate.test.cjs'
        ),
        'greenTest',
        'node --test --test-name-pattern "Canvas UX DB-first traceability review" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'createCanvasUxdbTraceabilityReadModelComponent',
        'path', 'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs',
        'dddOwner', 'CanvasUxdbTraceabilityReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbTraceability'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'documentation_drift'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_traceability_read_model',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "CanvasUxdbTraceability|canvas-uxdb-traceability|root help" scripts/planning-db-query.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'readCanvasUxdbTraceabilityRows',
        'path', 'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs',
        'dddOwner', 'CanvasUxdbTraceabilityReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbTraceability'),
        'fowlerSignals', jsonb_build_array('hidden_authority'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_traceability_read_model',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "readCanvasUxdbTraceabilityRows" scripts/planning-db-query.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'buildCanvasUxdbTraceabilityRows',
        'path', 'scripts/planning-db/queries/canvas-uxdb-traceability-query.cjs',
        'dddOwner', 'CanvasUxdbTraceabilityReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbTraceability'),
        'fowlerSignals', jsonb_build_array('hidden_authority'),
        'architectureGuard', 'scripts/planning-db-query.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_traceability_read_model',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "buildCanvasUxdbTraceabilityRows" scripts/planning-db-query.test.cjs'
        )
      ),
      jsonb_build_object(
        'name', 'canvas_uxdb_traceability_query',
        'path', 'tools/planning-db/migrations/292_canvas_uxdb_traceability_review_query.sql',
        'dddOwner', 'CanvasUxdbTraceabilityReadModel',
        'cqRails', jsonb_build_array('ListCanvasUxdbTraceability'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'documentation_drift'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_traceability_read_model',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "Canvas UX DB-first traceability review" scripts/planning-db-migrate.test.cjs'
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
