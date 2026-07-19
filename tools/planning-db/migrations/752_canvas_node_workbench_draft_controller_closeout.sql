-- Close the node-workbench draft-controller extraction and correct the
-- presentation ownership exposed by that extraction. The broader Inspector
-- authoring aggregate remains in review; only these proven leaves are closed.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'component', 'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION', 'may_create', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'component', 'web.component.canvas.CanvasInspectorAuthoringSection', 'may_create', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'relation', 'REL-WEB-NODE-WORKBENCH-TO-INSPECTOR-AUTHORING-SECTION', 'may_create', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'relation', 'REL-WEB-INSPECTOR-AUTHORING-SECTION-TO-DRAFT-CONTROLLER', 'may_create', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'evidence', 'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-UNIT', 'must_prove', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'evidence', 'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-ARCHITECTURE', 'must_prove', true),
  ('CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719', 'evidence', 'EV-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  parent_component_id = 'SYS-WEB-CANVAS-INSPECTOR-AUTHORING',
  status = 'implemented',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER';

update architecture.component_responsibility
set status = 'implemented'
where responsibility_id = 'RESP-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER';

update architecture.component_port
set status = 'implemented'
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER';

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id = 'REL-WEB-NODE-WORKBENCH-TO-DRAFT-CONTROLLER';

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
  'Canvas inspector authoring section',
  'ui-view',
  'ui',
  'Frontend / Canvas authoring',
  'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
  'CanvasInspectorAuthoringSection',
  'browser',
  'high',
  'implemented',
  'SYS-WEB-CANVAS-INSPECTOR-AUTHORING'
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
values (
  'RESP-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
  'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
  'Render the controlled common Inspector authoring form and compose plugin-specific field leaves without owning draft lifecycle, graph persistence, or artifact projection.',
  'The controlled authoring form composition or presentation contract changes.',
  'CanvasInspectorAuthoringSection',
  'implemented'
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
    'PORT-WEB-CANVAS-INSPECTOR-AUTHORING-DRAFT',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'CanvasNodeWorkbenchDraftController',
    'query',
    'inbound',
    array[
      'the form creates a second local draft',
      'the form resets against a stale node snapshot',
      'tag text and normalized tags diverge'
    ],
    'implemented'
  ),
  (
    'PORT-WEB-CANVAS-INSPECTOR-AUTHORING-ACTIONS',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'applyOrCancelNodeDraft',
    'ui-action',
    'outbound',
    array[
      'apply bypasses CanvasInspectorAuthoringContract',
      'cancel persists graph state',
      'read-only posture exposes mutation controls'
    ],
    'implemented'
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
    'REL-WEB-NODE-WORKBENCH-TO-INSPECTOR-AUTHORING-SECTION',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'contains',
    'outbound',
    'sync',
    'The workbench remains factual and read-only when authoring is unavailable.',
    'Already-authorized selected Canvas node.',
    jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'),
    'implemented'
  ),
  (
    'REL-WEB-INSPECTOR-AUTHORING-SECTION-TO-DRAFT-CONTROLLER',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'depends_on',
    'outbound',
    'sync',
    'The form does not render without a caller-owned controlled draft.',
    'Already-authorized selected Canvas node.',
    jsonb_build_array('apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx'),
    'implemented'
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

insert into architecture.component_transformation (
  transformation_id, component_id, transformation_kind, lossiness,
  test_requirement
)
values (
  'TRANS-WEB-NODE-AUTHORITY-TO-WORKBENCH-DRAFT',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
  'projection',
  'lossless',
  'Prove clean refresh, dirty preservation, explicit reset, tag coherence, and node-switch reset.'
)
on conflict (transformation_id) do update set
  component_id = excluded.component_id,
  transformation_kind = excluded.transformation_kind,
  lossiness = excluded.lossiness,
  test_requirement = excluded.test_requirement;

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-NODE-WORKBENCH-DRAFT-ARCHITECTURE',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-NODE-WORKBENCH-DRAFT-INTEGRATION',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'integration',
    'boundary',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION-ARCHITECTURE',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION-INTEGRATION',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'integration',
    'boundary',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-NODE-WORKBENCH-DRAFT-LIVE',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'e2e',
    'flow',
    true,
    'pnpm --filter @dvt/web test:e2e:source-import:live'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'Transient UI reconciliation emits no duplicate operational signal; graph draft commands own persistence outcomes.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'Controlled form presentation emits no duplicate operational signal; ConfigureCanvasDbtNode and ConfigureCanvasDvtNode own outcomes.',
    'log',
    true,
    'not_applicable'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  reuse_decision = 'extract',
  plugin_scope = null,
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'implementationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'pluginScopeAuthority', 'planning_query_store.frontend_component_plugin_scopes',
    'evidenceAuthority', 'planning_query_store.frontend_component_validation_evidence',
    'fileAuthority', 'planning_query_store.frontend_component_file_query',
    'cqRails', jsonb_build_array(),
    'cqExemptionReason', 'Transient local UI-state controller with no application effect.'
  ),
  source_path = 'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
  source_content_sha256 = md5('component:CanvasNodeWorkbenchDraftController:current:752'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController';

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasInspectorAuthoringSection',
  'CanvasInspectorAuthoringSection',
  'form',
  'current',
  'extract',
  'Frontend / Canvas authoring',
  'Render one controlled common Inspector authoring form and compose plugin field leaves without owning draft lifecycle or persistence.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'dbFirst', true,
    'architectureComponentId', 'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION',
    'dddObject', 'CanvasInspectorAuthoringSection',
    'pluginScopeAuthority', 'planning_query_store.frontend_component_plugin_scopes',
    'evidenceAuthority', 'planning_query_store.frontend_component_validation_evidence',
    'invariants', jsonb_build_array(
      'the form is fully controlled by CanvasNodeWorkbenchDraftController',
      'the form never persists graph or workspace state directly',
      'read-only posture does not render mutation controls',
      'plugin-specific fields remain delegated leaves'
    )
  ),
  'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
  md5('component:CanvasInspectorAuthoringSection:current:752')
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
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'delegatesDraftLifecycleTo', 'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'delegatesAuthoringFormTo', 'web.component.canvas.CanvasInspectorAuthoringSection',
    'ownsDraftLifecycle', false,
    'ownsAuthoringForm', false
  ),
  source_path = 'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
  source_content_sha256 = md5('component:CanvasNodeWorkbenchPanel:delegation:752'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchPanel';

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.CanvasNodeWorkbenchPanel'
  and file_path = 'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.ts',
    'state-controller',
    'useCanvasNodeWorkbenchDraftController',
    jsonb_build_object('ownership', 'exclusive', 'effects', false, 'renders', false),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('file:CanvasNodeWorkbenchDraftController:source:752')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx',
    'unit-test',
    null,
    jsonb_build_object('proves', 'clean refresh, dirty preservation, tag coherence, cancel, and node switch'),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('file:CanvasNodeWorkbenchDraftController:unit:752')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object('proves', 'draft lifecycle remains outside presentation and persistence'),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('file:CanvasNodeWorkbenchDraftController:architecture:752')
  ),
  (
    'web.component.canvas.CanvasInspectorAuthoringSection',
    'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
    'component',
    'CanvasInspectorAuthoringSection',
    jsonb_build_object('ownership', 'exclusive', 'presentationOnly', true, 'controlled', true),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('file:CanvasInspectorAuthoringSection:source:752')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_plugin_scopes (
  component_id, plugin_id, scope_status, raw_scope, source_path,
  source_content_sha256
)
values
  ('web.component.canvas.CanvasNodeWorkbenchDraftController', 'dbt', 'current', jsonb_build_object('scopeReason', 'Shared controlled DBT node draft.'), 'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql', md5('scope:CanvasNodeWorkbenchDraftController:dbt:752')),
  ('web.component.canvas.CanvasNodeWorkbenchDraftController', 'dvt', 'current', jsonb_build_object('scopeReason', 'Shared controlled DVT node draft.'), 'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql', md5('scope:CanvasNodeWorkbenchDraftController:dvt:752')),
  ('web.component.canvas.CanvasInspectorAuthoringSection', 'dbt', 'current', jsonb_build_object('scopeReason', 'Composes DBT authoring field leaves.'), 'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql', md5('scope:CanvasInspectorAuthoringSection:dbt:752')),
  ('web.component.canvas.CanvasInspectorAuthoringSection', 'dvt', 'current', jsonb_build_object('scopeReason', 'Composes DVT authoring field leaves.'), 'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql', md5('scope:CanvasInspectorAuthoringSection:dvt:752'))
on conflict (component_id, plugin_id) do update set
  scope_status = excluded.scope_status,
  raw_scope = excluded.raw_scope,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasInspectorAuthoringSection',
    'ConfigureCanvasDbtNode',
    'command',
    'implemented',
    jsonb_build_object('role', 'controlled form adapter', 'ownsPersistence', false),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('rail:CanvasInspectorAuthoringSection:ConfigureCanvasDbtNode:752')
  ),
  (
    'web.component.canvas.CanvasInspectorAuthoringSection',
    'ConfigureCanvasDvtNode',
    'command',
    'implemented',
    jsonb_build_object('role', 'controlled form adapter', 'ownsPersistence', false),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('rail:CanvasInspectorAuthoringSection:ConfigureCanvasDvtNode:752')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_capability_gaps
set
  gap_status = 'closed',
  raw_gap = coalesce(raw_gap, '{}'::jsonb) || jsonb_build_object(
    'closedBy', 'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    'controller', 'web.component.canvas.CanvasNodeWorkbenchDraftController'
  ),
  source_path = 'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
  source_content_sha256 = md5('gap:CanvasNodeWorkbenchDraftController:srp:closed:752'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController'
  and gap_id = 'GAP-NODE-WORKBENCH-DRAFT-SRP';

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx',
    null,
    'selected-node-draft',
    'The controller preserves dirty input, updates clean authority, resets on cancel or node switch, and keeps tag text coherent.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('evidence:CanvasNodeWorkbenchDraftController:unit:752')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-ARCHITECTURE',
    'architecture-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts',
    null,
    'component-boundary',
    'The controller owns transient reconciliation while panel and form own presentation only.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts'),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('evidence:CanvasNodeWorkbenchDraftController:architecture:752')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-INTEGRATION',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    null,
    'node-workbench',
    'The workbench preserves one DBT or DVT draft across section and authoritative graph updates.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('evidence:CanvasNodeWorkbenchDraftController:integration:752')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'EV-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'ConfigureCanvasDbtNode',
    'strict-live-canvas',
    'A real browser edits model SQL, persists the draft, previews the exact file, and reopens it from Project code.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:e2e:source-import:live', 'draftIntercept', false, 'directDraftSeed', false),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('evidence:CanvasNodeWorkbenchDraftController:live:752')
  ),
  (
    'web.component.canvas.CanvasInspectorAuthoringSection',
    'EV-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION-ARCHITECTURE',
    'architecture-test',
    'current',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    null,
    'controlled-form-boundary',
    'The authoring section composes plugin leaves and no longer creates or reconciles draft state.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts'),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('evidence:CanvasInspectorAuthoringSection:architecture:752')
  ),
  (
    'web.component.canvas.CanvasInspectorAuthoringSection',
    'EV-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION-INTEGRATION',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'ConfigureCanvasDbtNode',
    'node-workbench-form',
    'The controlled form renders once in the logical workbench section and applies through the existing authoring contract.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'),
    'tools/planning-db/migrations/752_canvas_node_workbench_draft_controller_closeout.sql',
    md5('evidence:CanvasInspectorAuthoringSection:integration:752')
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

update architecture.design
set
  status = 'implemented',
  rationale = rationale || E'\n\nCloseout: CanvasNodeWorkbenchDraftController now owns the authoritative-snapshot to transient-draft state machine. CanvasInspectorAuthoringSection is a controlled form leaf with exclusive source ownership. CanvasNodeWorkbenchPanel composes both without owning draft state. The controller has no CQ rail because it has no application effect; the form references the existing ConfigureCanvasDbtNode and ConfigureCanvasDvtNode commands.',
  updated_at = now()
where design_id = 'CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER-20260719';

do $$
declare
  incomplete_component_count integer;
  controller_file_count integer;
  section_file_count integer;
  stale_panel_ownership_count integer;
  open_gap_count integer;
  controller_rail_count integer;
  section_rail_count integer;
  plugin_scope_count integer;
  evidence_count integer;
  relation_count integer;
begin
  select count(*) into incomplete_component_count
  from architecture.component
  where component_id in (
    'SYS-WEB-CANVAS-NODE-WORKBENCH-DRAFT-CONTROLLER',
    'SYS-WEB-CANVAS-INSPECTOR-AUTHORING-SECTION'
  )
    and status <> 'implemented';

  if incomplete_component_count <> 0 then
    raise exception 'Node workbench draft leaves are not implemented';
  end if;

  select count(*) into controller_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController';

  if controller_file_count <> 3 then
    raise exception 'Draft controller file ownership is incomplete: %', controller_file_count;
  end if;

  select count(*) into section_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'web.component.canvas.CanvasInspectorAuthoringSection';

  if section_file_count <> 1 then
    raise exception 'Authoring section exclusive file ownership is incomplete: %', section_file_count;
  end if;

  select count(*) into stale_panel_ownership_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'web.component.canvas.CanvasNodeWorkbenchPanel'
    and file_path = 'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx';

  if stale_panel_ownership_count <> 0 then
    raise exception 'CanvasNodeWorkbenchPanel still owns CanvasInspectorAuthoringSection';
  end if;

  select count(*) into open_gap_count
  from planning_query_store.frontend_component_capability_gaps
  where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController'
    and gap_status in ('open', 'planned');

  if open_gap_count <> 0 then
    raise exception 'Draft controller retains open capability gaps';
  end if;

  select count(*) into controller_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController';

  if controller_rail_count <> 0 then
    raise exception 'Transient draft controller must not declare CQ rails';
  end if;

  select count(*) into section_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.CanvasInspectorAuthoringSection'
    and rail_name in ('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode');

  if section_rail_count <> 2 then
    raise exception 'Authoring section must reference both canonical configure commands';
  end if;

  select count(*) into plugin_scope_count
  from planning_query_store.frontend_component_plugin_scopes
  where component_id in (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'web.component.canvas.CanvasInspectorAuthoringSection'
  )
    and plugin_id in ('dbt', 'dvt')
    and scope_status = 'current';

  if plugin_scope_count <> 4 then
    raise exception 'Draft controller and authoring section plugin scopes are incomplete';
  end if;

  select count(*) into evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id in (
    'web.component.canvas.CanvasNodeWorkbenchDraftController',
    'web.component.canvas.CanvasInspectorAuthoringSection'
  )
    and evidence_status = 'current';

  if evidence_count < 6 then
    raise exception 'Draft-controller closeout evidence is incomplete: %', evidence_count;
  end if;

  select count(*) into relation_count
  from architecture.component_relation
  where relation_id in (
    'REL-WEB-NODE-WORKBENCH-TO-DRAFT-CONTROLLER',
    'REL-WEB-NODE-WORKBENCH-TO-INSPECTOR-AUTHORING-SECTION',
    'REL-WEB-INSPECTOR-AUTHORING-SECTION-TO-DRAFT-CONTROLLER'
  )
    and status = 'implemented';

  if relation_count <> 3 then
    raise exception 'Draft-controller component relations are incomplete';
  end if;
end
$$;
