-- Reopen the selected-node presentation feature around the remaining DBT code
-- contradiction before implementation. The graph-derived artifact projection is
-- a query; editing the node remains the existing ConfigureCanvasDbtNode command.

update architecture.design
set
  status = 'implementing',
  rationale = rationale || E'\n\nRemaining contradiction: dbtAuthoringFieldsModel and canvasDbtWorkspaceArtifacts independently derive model SQL while CanvasNodePresentationTruth reports pathless authored models as unavailable. Target correction: one DbtModelArtifactProjection supplies generated or authored SQL with explicit provenance to artifact generation, card truth, and workbench inspection. DbtModelCodeAuthoringSection adapts the existing ConfigureCanvasDbtNode command and owns no projection policy.',
  fowler_signal = 'hidden_authority',
  rail_ref = 'ConfigureCanvasDbtNode;GenerateDbtWorkspaceArtifacts;ProjectCanvasNodePresentationTruth;InspectCanvasNodeProperties',
  updated_at = now()
where design_id = 'CANVAS-NODE-PRESENTATION-TRUTH-20260717';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'component', 'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING', 'may_create', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'query', 'GenerateDbtWorkspaceArtifacts', 'may_update', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'command', 'ConfigureCanvasDbtNode', 'may_reference', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'test', 'TEST-WEB-CANVAS-DBT-MODEL-CODE-AUTHORITY', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  (
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'Canvas DBT model artifact projection',
    'module',
    'application',
    'Frontend / Canvas DBT projection',
    'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts',
    'DbtModelArtifactProjection;projectDbtModelArtifact',
    'browser',
    'high',
    'review',
    'SYS-WEB-CANVAS-GRAPH-SURFACE'
  ),
  (
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'Canvas DBT model code authoring section',
    'ui-view',
    'ui',
    'Frontend / Canvas DBT authoring',
    'apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx',
    'DbtModelCodeAuthoringSection',
    'browser',
    'high',
    'review',
    'SYS-WEB-CANVAS-NODE-WORKBENCH'
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
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values
  (
    'RESP-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'Project one DBT model artifact from canonical graph state, selected origin, materialization, and optional authored SQL while preserving generated versus authored provenance.',
    'DBT model artifact semantics, origin resolution, or code provenance changes.',
    'DbtModelArtifactProjection',
    'approved'
  ),
  (
    'RESP-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'Render and edit the DBT model SQL body through the existing node-authoring draft contract without deriving artifacts or persisting workspace files.',
    'The workbench code-editing interaction or its localized presentation changes.',
    'DbtModelCodeAuthoringSection',
    'approved'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction, negative_tests, status
)
values
  (
    'PORT-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'projectDbtModelArtifact',
    'query',
    'inbound',
    array[
      'do not report generated SQL as persisted workspace-file content',
      'do not derive a model artifact without one compatible connected origin',
      'do not let preview and workbench use different model SQL'
    ],
    'approved'
  ),
  (
    'PORT-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'onChange',
    'ui-action',
    'outbound',
    array[
      'do not persist generated fallback SQL unless the user edits it',
      'do not mutate graph state while the editor remains unchanged',
      'do not duplicate passive code output beside the editor'
    ],
    'approved'
  )
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-WEB-DBT-MODEL-ARTIFACT-TO-NODE-TRUTH',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-NODE-PRESENTATION-TRUTH',
    'transforms',
    'outbound',
    'sync',
    'Blocked projection remains unavailable with an explicit reason.',
    'Already-authorized visible Canvas graph.',
    jsonb_build_array('apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts'),
    'approved'
  ),
  (
    'REL-WEB-DBT-MODEL-CODE-TO-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'reads',
    'outbound',
    'sync',
    'Blocked projection renders an actionable unavailable state.',
    'Node edit posture supplied by the Canvas authoring boundary.',
    jsonb_build_array('apps/web/src/app/views/canvas/DbtAuthoringFields.tsx'),
    'approved'
  ),
  (
    'REL-WEB-DBT-MODEL-CODE-TO-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'depends_on',
    'outbound',
    'sync',
    'Workbench retains passive read-only code when editing is not authorized.',
    'Node edit posture supplied by the Canvas authoring boundary.',
    jsonb_build_array('apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx'),
    'approved'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DbtModelArtifactProjection',
    'DbtModelArtifactProjection',
    'query-view',
    'planned',
    'extract',
    'Frontend / Canvas DBT projection',
    'Project the one model SQL artifact consumed by authoring, presentation, Preview, and Run without presentation markup or graph mutation.',
    '@dvt/web',
    '/canvas',
    'dbt',
    jsonb_build_array('single projection is not implemented yet'),
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
      'dddObject', 'DbtModelArtifactProjection',
      'plannedFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts',
        'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts'
      ),
      'invariants', jsonb_build_array(
        'one graph state produces one model artifact for all consumers',
        'generated and authored SQL provenance remain distinguishable',
        'generated path is not represented as persisted file authority'
      )
    ),
    'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
    md5('component:DbtModelArtifactProjection:planned:749')
  ),
  (
    'web.component.canvas.DbtModelCodeAuthoringSection',
    'DbtModelCodeAuthoringSection',
    'form',
    'planned',
    'create',
    'Frontend / Canvas DBT authoring',
    'Present editable model SQL in the Code section and adapt changes to ConfigureCanvasDbtNode without owning projection or persistence.',
    '@dvt/web',
    '/canvas',
    'dbt',
    jsonb_build_array('code editor component is not implemented yet'),
    '[]'::jsonb,
    jsonb_build_object(
      'dbFirst', true,
      'architectureComponentId', 'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
      'dddObject', 'DbtModelCodeAuthoringSection',
      'plannedFiles', jsonb_build_array(
        'apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx',
        'apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx'
      ),
      'presentationOnly', true,
      'commandRail', 'ConfigureCanvasDbtNode'
    ),
    'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
    md5('component:DbtModelCodeAuthoringSection:planned:749')
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
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  component_status = 'partial',
  capability_gaps = jsonb_build_array('DBT model code is derived independently by General, Code, and Preview/Run consumers.'),
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'delegatesCodeProjectionTo', 'web.component.canvas.DbtModelArtifactProjection',
    'delegatesCodePresentationTo', 'web.component.canvas.DbtModelCodeAuthoringSection'
  ),
  source_path = 'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
  source_content_sha256 = md5('component:DbtAuthoringFields:partial:749'),
  updated_at = now()
where component_id = 'web.component.canvas.DbtAuthoringFields';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  ('web.component.canvas.DbtModelArtifactProjection', 'GenerateDbtWorkspaceArtifacts', 'query', 'planned', jsonb_build_object('role', 'projection', 'effects', false), 'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql', md5('rail:DbtModelArtifactProjection:GenerateDbtWorkspaceArtifacts:749')),
  ('web.component.canvas.DbtModelArtifactProjection', 'ProjectCanvasNodePresentationTruth', 'query', 'planned', jsonb_build_object('role', 'consumer-adapter'), 'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql', md5('rail:DbtModelArtifactProjection:ProjectCanvasNodePresentationTruth:749')),
  ('web.component.canvas.DbtModelCodeAuthoringSection', 'ConfigureCanvasDbtNode', 'command', 'planned', jsonb_build_object('role', 'command-adapter'), 'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql', md5('rail:DbtModelCodeAuthoringSection:ConfigureCanvasDbtNode:749')),
  ('web.component.canvas.DbtModelCodeAuthoringSection', 'GenerateDbtWorkspaceArtifacts', 'query', 'planned', jsonb_build_object('role', 'read-model-input'), 'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql', md5('rail:DbtModelCodeAuthoringSection:GenerateDbtWorkspaceArtifacts:749'))
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values
  (
    'web.component.canvas.DbtModelArtifactProjection',
    'GAP-DBT-MODEL-ARTIFACT-SINGLE-AUTHORITY',
    'semantic-drift',
    'open',
    'General, Code, and Preview/Run do not yet consume one DBT model artifact projection.',
    'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    jsonb_build_object('requiredProof', 'unit identity plus strict live browser preview'),
    'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
    md5('gap:DbtModelArtifactProjection:single-authority:749')
  ),
  (
    'web.component.canvas.DbtModelCodeAuthoringSection',
    'GAP-DBT-MODEL-CODE-EDITING',
    'product-capability',
    'open',
    'A pathless authored DBT model cannot yet inspect and edit the same SQL consumed by Preview/Run.',
    'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    jsonb_build_object('requiredProof', 'component edit test and strict live browser roundtrip'),
    'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
    md5('gap:DbtModelCodeAuthoringSection:editing:749')
  )
on conflict (component_id, gap_id) do update set
  gap_kind = excluded.gap_kind,
  gap_status = excluded.gap_status,
  description = excluded.description,
  owning_task_id = excluded.owning_task_id,
  raw_gap = excluded.raw_gap,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

-- Keep the original imported command declaration as an explicit tombstone and
-- establish the same intent as a query. A pure deterministic projection must
-- not be governed as a state-changing command.
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name,
  rail_type, ddd_owner, rail_status, symbol_refs, implementation_refs,
  documentation_refs, governing_sources, allowed_implementation_surfaces,
  architecture_guards, completion_gate, source_path, source_content_sha256,
  raw_rail, raw_manifest, revision, created_by
)
values
  (
    'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#command#generatedbtworkspaceartifacts-retired',
    'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    'implemented',
    'GenerateDbtWorkspaceArtifacts',
    'generatedbtworkspaceartifacts',
    'command',
    'DbtWorkspaceArtifactProjection',
    'retired',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array('docs/architecture/command-query-rail-governance.md'),
    jsonb_build_array('AGENTS.md', 'docs/architecture/command-query-rail-governance.md'),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
    repeat(md5('retired-command:GenerateDbtWorkspaceArtifacts:749'), 2),
    jsonb_build_object('retiredReason', 'Pure deterministic artifact projection has no command effect.'),
    jsonb_build_object('featureId', 'E-CANVAS-NODE-PRESENTATION-TRUTH-1', 'mechanizationStatus', 'implemented', 'implementationStatus', 'partial', 'noHumanDecisionsRemaining', false),
    0,
    'codex'
  ),
  (
    'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts',
    'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    'implemented',
    'GenerateDbtWorkspaceArtifacts',
    'generatedbtworkspaceartifacts',
    'query',
    'DbtWorkspaceArtifactProjection',
    'declared',
    jsonb_build_array(
      jsonb_build_object('name', 'projectDbtModelArtifact', 'path', 'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts', 'dddOwner', 'DbtModelArtifactProjection'),
      jsonb_build_object('name', 'buildDbtWorkspaceArtifacts', 'path', 'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts', 'dddOwner', 'DbtWorkspaceArtifactProjection')
    ),
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts',
      'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts'
    ),
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-authoring-code-run-vertical-plan-20260526.md'),
    jsonb_build_array('AGENTS.md', 'docs/architecture/command-query-rail-governance.md', 'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md'),
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts',
      'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts',
      'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts',
      'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts'
    ),
    jsonb_build_array('pnpm test:planning:db:migrations'),
    jsonb_build_array('pnpm --filter @dvt/web typecheck', 'pnpm --filter @dvt/web lint', 'pnpm verify:prepush'),
    'tools/planning-db/migrations/749_canvas_dbt_model_code_authority_design.sql',
    repeat(md5('query:GenerateDbtWorkspaceArtifacts:749'), 2),
    jsonb_build_object(
      'name', 'GenerateDbtWorkspaceArtifacts',
      'type', 'query',
      'boundedContext', 'Canvas DBT authoring',
      'dddObject', 'DbtWorkspaceArtifactProjection',
      'applicationPort', 'projectDbtModelArtifact;buildDbtWorkspaceArtifacts',
      'adapterSurface', 'Canvas execution actions and node workbench',
      'scopeAndAuthorization', 'Already-authorized visible Canvas graph and execution scope.',
      'negativeTests', jsonb_build_array(
        'no compatible origin blocks projection',
        'generated SQL is not reported as persisted file content',
        'authored SQL must be consumed unchanged by Preview and Run'
      )
    ),
    jsonb_build_object(
      'featureId', 'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
      'mechanizationStatus', 'implemented',
      'implementationStatus', 'partial',
      'noHumanDecisionsRemaining', false,
      'implementationPlan', 'Replace divergent DBT SQL projections with one provenance-preserving artifact query and one command-adapter presentation component.'
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision),
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'implemented',
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'mechanizationStatus', 'implemented',
    'implementationStatus', 'partial',
    'noHumanDecisionsRemaining', false,
    'reopenedReason', 'Strict live proof found divergent DBT model code authorities.'
  ),
  updated_at = now()
where feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1';
