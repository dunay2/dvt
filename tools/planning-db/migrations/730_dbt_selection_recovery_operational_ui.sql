-- Close Phase 4 DBT execution-selection recovery as a DB-first component pair.
-- Recovery is an explicit command over caller intent; presentation consumes a
-- supplied read model and never derives or widens execution scope.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'AD-DBT-SELECTION-RECOVERY-20260717',
  'E-DBT-PROJECT-ROUNDTRIP-P4-SELECTION-RECOVERY-UX-1',
  'DBT execution selection recovery',
  'Frontend / Canvas execution selection',
  'implemented',
  'Unavailable or non-executable requested DBT roots remain visible and fail closed. The user must choose one named recovery strategy; only RecoverCanvasExecutionSelection may discard unavailable roots, replace explicit intent with workspace scope, or preserve intent while refreshing file authority.',
  'boundary_drift',
  'CollectCanvasExecutionSelection;RecoverCanvasExecutionSelection',
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

delete from architecture.design_scope
where design_id = 'AD-DBT-SELECTION-RECOVERY-20260717'
  and subject_kind = 'component'
  and subject_id = 'SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'component', 'SYS-WEB-CANVAS-EXECUTION-SELECTION', 'may_reference', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'component', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'may_create', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'component', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'may_create', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'component', 'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE', 'may_reference', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'component', 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION', 'may_reference', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'query', 'CollectCanvasExecutionSelection', 'may_reference', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'flow', 'RecoverCanvasExecutionSelection', 'may_create', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'contract', 'CanvasExecutionSelectionRecovery', 'may_create', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'test', 'TEST-WEB-DBT-SELECTION-RECOVERY-MODEL', 'must_prove', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'test', 'TEST-WEB-DBT-SELECTION-RECOVERY-LIVE', 'must_prove', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'path', 'docs/architecture/components/web/graph/canvas-execution-selection-component.md', 'may_update', true),
  ('AD-DBT-SELECTION-RECOVERY-20260717', 'path', 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'Canvas DBT execution selection recovery',
    'module',
    'application',
    'Frontend / Canvas execution selection',
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts',
    'CanvasExecutionSelectionRecovery',
    'browser',
    'high',
    'implemented',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'Canvas DBT execution selection recovery view',
    'ui-view',
    'ui',
    'Frontend / Canvas presentation',
    'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx',
    'CanvasExecutionSelectionRecoveryReadModel',
    'browser',
    'high',
    'implemented',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
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
    'RESP-WEB-DBT-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'Classify blocked DBT selection and execute one explicit recovery strategy with an exact receipt.',
    'Selection recovery set algebra, strategy vocabulary, authority refresh behavior, or receipt contract changes.',
    'CanvasExecutionSelectionRecovery',
    'implemented'
  ),
  (
    'RESP-WEB-DBT-SELECTION-RECOVERY-VIEW',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'Render supplied requested, unavailable, non-executable, dependency, admitted, revision, action, receipt, and failure state.',
    'Localized selection recovery operational presentation changes.',
    'CanvasExecutionSelectionRecoveryView',
    'implemented'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id, contract_kind, owner_component_id, contract_ref,
  compatibility, status, validation_command
)
values (
  'CONTRACT-WEB-DBT-SELECTION-RECOVERY',
  'type',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
  'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts',
  'internal',
  'implemented',
  'pnpm --filter @dvt/web typecheck'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values
  (
    'PORT-WEB-DBT-SELECTION-RECOVERY-COMMAND',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'RecoverCanvasExecutionSelection',
    'command',
    'inbound',
    'CONTRACT-WEB-DBT-SELECTION-RECOVERY',
    'CONTRACT-WEB-DBT-SELECTION-RECOVERY',
    array[
      'implicit replacement of unavailable explicit intent',
      'workspace replacement without executable workspace scope',
      'refresh query resolves with an error result',
      'late refresh completion overwrites newer intent'
    ]::text[],
    'implemented'
  ),
  (
    'PORT-WEB-DBT-SELECTION-RECOVERY-QUERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'CollectCanvasExecutionSelection',
    'query',
    'outbound',
    null,
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-SELECTION-SURFACE',
    array[
      'authority node outside workspace scope',
      'non-executable requested root admitted as partial scope'
    ]::text[],
    'implemented'
  ),
  (
    'PORT-WEB-DBT-SELECTION-RECOVERY-VIEW-IN',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'PresentCanvasExecutionSelectionRecovery',
    'ui-action',
    'inbound',
    'CONTRACT-WEB-DBT-SELECTION-RECOVERY',
    null,
    array[
      'presentation derives execution scope',
      'action labels bypass localized copy',
      'failure fabricates a success receipt'
    ]::text[],
    'implemented'
  )
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  (
    'REL-WEB-DBT-SELECTION-CONTAINS-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'contains', 'outbound', 'sync',
    'CONTRACT-SYS-WEB-CANVAS-EXECUTION-SELECTION-SURFACE',
    'Blocked intent would remain invisible or be widened implicitly.',
    'workspace:graph-draft:view',
    jsonb_build_array('CollectCanvasExecutionSelection'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-SELECTION-RECOVERY-CONTAINS-VIEW',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'contains', 'outbound', 'sync',
    'CONTRACT-WEB-DBT-SELECTION-RECOVERY',
    'Presentation could derive policy or issue an ungoverned mutation.',
    'workspace:graph-draft:view',
    jsonb_build_array('CanvasExecutionSelectionRecoveryReadModel'),
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-COMMAND-SURFACE-DEPENDS-ON-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'depends_on', 'outbound', 'sync',
    'CONTRACT-WEB-DBT-SELECTION-RECOVERY',
    'Authored Canvas can silently discard hidden requested roots.',
    'workspace:graph-draft:save',
    jsonb_build_array('useCanvasExecutionSelectionRecovery'),
    'implemented'
  ),
  (
    'REL-WEB-DBT-FILE-EXECUTION-DEPENDS-ON-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-DBT-FILE-EXECUTION',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'depends_on', 'outbound', 'async',
    'CONTRACT-WEB-DBT-SELECTION-RECOVERY',
    'A stale file projection can be presented as refreshed authority.',
    'workspace:dbt-project:read',
    jsonb_build_array('ProjectDbtGraphFromFiles', 'refreshCanvasExecutionSelectionAuthority'),
    'implemented'
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
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  ('TEST-WEB-DBT-SELECTION-RECOVERY-MODEL', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasExecutionSelectionRecovery.test.ts'),
  ('TEST-WEB-DBT-SELECTION-RECOVERY-AUTHORITY', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts'),
  ('TEST-WEB-DBT-SELECTION-RECOVERY-HOOK', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.test.tsx', 'integration', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasExecutionSelectionRecovery.test.tsx'),
  ('TEST-WEB-DBT-SELECTION-RECOVERY-ARCHITECTURE', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.architecture.test.ts', 'architecture', 'boundary', true, 'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasExecutionSelectionRecovery.architecture.test.ts'),
  ('TEST-WEB-DBT-SELECTION-RECOVERY-VIEW', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx'),
  ('TEST-WEB-DBT-SELECTION-RECOVERY-COPY', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/shell/operationalDrawerSelectionRecoveryCopy.test.ts'),
  ('TEST-WEB-DBT-SELECTION-RECOVERY-DRAWER', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx', 'integration', 'boundary', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx'),
  ('TEST-WEB-DBT-SELECTION-RECOVERY-LIVE', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'e2e', 'flow', true, 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql',
    repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY:730'), 2),
    0,
    'Canvas DBT execution selection recovery',
    'component',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'SYS-DVT',
    'SYS-WEB',
    'canonical',
    true,
    'Classify unavailable DBT selection and execute explicit recovery without widening caller intent.',
    'CanvasExecutionSelectionRecovery',
    'CollectCanvasExecutionSelection;RecoverCanvasExecutionSelection',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql',
    repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW:730'), 2),
    0,
    'Canvas DBT execution selection recovery view',
    'component',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'SYS-DVT',
    'SYS-WEB',
    'canonical',
    false,
    'Render the supplied localized selection recovery contract through shared operational drawer primitives.',
    'CanvasExecutionSelectionRecoveryView',
    'CollectCanvasExecutionSelection;RecoverCanvasExecutionSelection',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.governance_component_local_definitions.revision + 1,
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 1),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.ts', 2),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 3),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.test.ts', 4),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts', 5),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.test.tsx', 6),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'owns', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.architecture.test.ts', 7),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'owns', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'owns', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.ts', 1),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'owns', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx', 2),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'owns', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.test.ts', 3);

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'responsibility', 'Classify blocked DBT selection and execute explicit recovery strategies.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'reason_to_change', 'Selection recovery algebra, strategy vocabulary, or authority refresh behavior changes.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'public_api', 'buildCanvasExecutionSelectionRecoveryGraph;buildCanvasExecutionSelectionRecoveryReadModel;recoverCanvasExecutionSelection;useCanvasExecutionSelectionRecovery', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'invariant', 'Unavailable or non-executable explicit roots fail closed and never admit a partial scope.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'invariant', 'Replacing explicit intent with workspace scope requires a named command and at least one executable workspace root.', 1),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'invariant', 'Refresh success requires authoritative query success; errors never fabricate receipts.', 2),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'transition', 'Blocked selection plus one strategy becomes a receipt and next intent, or remains blocked with failure.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'consumer', 'Authored Canvas controller;DBT file authority controller;operational drawer recovery view', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'fowler_signal', 'separated_interface and published_language replace hidden recovery mutation', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'responsibility', 'Render a supplied localized recovery contract.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'reason_to_change', 'Operational selection recovery presentation or localized copy changes.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'public_api', 'OperationalDrawerSelectionRecoveryView;resolveOperationalDrawerSelectionRecoveryCopy', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'invariant', 'The presentation template contains no store access, business derivation, or ad hoc CSS.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'transition', 'Recovery read model becomes visible scope, available actions, receipt, or failure.', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'consumer', 'BottomOperationalPreviewPanel', 0),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'fowler_signal', 'presentation_model with single responsibility', 0);

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, source_path,
  source_content_sha256, raw_component
)
values
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'Canvas DBT execution selection recovery',
    'query-view',
    'current',
    'harden',
    'Frontend / Canvas execution selection',
    'Classify blocked DBT selection and execute explicit recovery strategies with exact receipts.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql',
    md5('frontend:CanvasDbtExecutionSelectionRecovery:730'),
    jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'presentationOwner', false)
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'Canvas DBT execution selection recovery view',
    'context-panel',
    'current',
    'create',
    'Frontend / Canvas presentation',
    'Render the supplied localized recovery contract through shared operational drawer primitives.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql',
    md5('frontend:CanvasDbtExecutionSelectionRecoveryView:730'),
    jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'presentationOwner', true)
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
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_plugin_scopes (
  component_id, plugin_id, scope_status, raw_scope, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'dbt', 'current', jsonb_build_object('scopeReason', 'DBT execution roots and file authority define recovery semantics.'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('scope:selection-recovery:dbt:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'dbt', 'current', jsonb_build_object('scopeReason', 'The view presents DBT execution-selection recovery state.'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('scope:selection-recovery-view:dbt:730'))
on conflict (component_id, plugin_id) do update set
  scope_status = excluded.scope_status,
  raw_scope = excluded.raw_scope,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id, surface_id, route_path, placement_kind, placement_order,
  raw_link, source_path, source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'web.canvas.graph', '/canvas', 'execution-selection-recovery-policy', 31, jsonb_build_object('visible', false, 'host', 'Canvas execution selection'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('surface:selection-recovery:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'web.canvas.graph', '/canvas', 'bottom-operational-preview-recovery', 32, jsonb_build_object('visible', true, 'host', 'BottomOperationalPreviewPanel'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('surface:selection-recovery-view:730'))
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_local_files
where component_id in (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
);

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts', 'contract', 'CanvasExecutionSelectionRecoveryReadModel;CanvasExecutionSelectionRecoveryCommands', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-contract:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 'domain-policy', 'buildCanvasExecutionSelectionRecoveryGraph;buildCanvasExecutionSelectionRecoveryReadModel;recoverCanvasExecutionSelection', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-model:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.ts', 'authority-adapter', 'refreshCanvasExecutionSelectionAuthority', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-authority-adapter:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 'application-adapter', 'useCanvasExecutionSelectionRecovery', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-hook:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-model-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts', 'adapter-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-authority-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.test.tsx', 'application-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-hook-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.architecture.test.ts', 'architecture-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-architecture-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'shared-policy', 'buildDbtExecutionScopeGraph;resolveDbtExecutionScope', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-shared-policy:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasDbtPlannerGraphSource.ts', 'authority-projector', 'buildCanvasDbtPlannerGraphSource', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-projector:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/useCanvasController.ts', 'authored-controller-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-authored-controller:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'file-controller-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-file-controller:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/useCanvasAuthoringRuntimeDraftFlow.ts', 'state-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-draft-flow:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/canvasControllerViewModel.ts', 'controller-read-model-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-controller-view-model:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/src/app/views/canvas/useCanvasController.draftLifecycle.scopeAndProjection.test.tsx', 'controller-integration-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-controller-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'strict-e2e-test', null, jsonb_build_object('ownership', 'evidence', 'draftIntercept', false, 'directDraftSeed', false), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-live:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx', 'presentation', 'OperationalDrawerSelectionRecoveryView', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-view:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.ts', 'copy-adapter', 'resolveOperationalDrawerSelectionRecoveryCopy;formatOperationalDrawerSelectionRecoveryReceipt', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-copy:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx', 'presentation-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-view-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryCopy.test.ts', 'copy-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-copy-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx', 'primitive-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-primitives:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx', 'drawer-host', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-drawer:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/components/shell/operationalDrawerContributionStore.ts', 'drawer-contract', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-drawer-contract:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.ts', 'drawer-projector', 'buildCanvasOperationalDrawerContribution', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-drawer-projector:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx', 'drawer-integration-test', null, jsonb_build_object('ownership', 'evidence'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-drawer-test:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx', 'drawer-registrar', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-registrar:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/CanvasShell.tsx', 'shell-host', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-shell:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'file-shell-host', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-file-shell:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasShell.types.ts', 'shell-contract', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-shell-contract:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasShellBuilder.types.ts', 'shell-builder-contract', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-shell-builder-contract:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts', 'shell-command-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-shell-command:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasShellChromeStateBuilder.ts', 'shell-state-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-shell-state:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'apps/web/src/app/views/canvas/canvasShellPropsBuilder.tsx', 'shell-props-adapter', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('file:selection-recovery-shell-props:730'));

delete from planning_query_store.frontend_component_local_cq_rails
where component_id in (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
  'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
);

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'CollectCanvasExecutionSelection', 'query', 'implemented', jsonb_build_object('ownership', 'consumed', 'reuse', true), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('rail:selection-recovery:collect:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'RecoverCanvasExecutionSelection', 'command', 'implemented', jsonb_build_object('ownership', 'owned', 'strategies', jsonb_build_array('discard_unavailable', 'use_workspace_scope', 'refresh_analysis')), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('rail:selection-recovery:recover:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'CollectCanvasExecutionSelection', 'query', 'implemented', jsonb_build_object('ownership', 'consumed', 'deriveBusinessState', false), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('rail:selection-recovery-view:collect:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'RecoverCanvasExecutionSelection', 'command', 'implemented', jsonb_build_object('ownership', 'consumed', 'issuesMutationDirectly', false), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('rail:selection-recovery-view:recover:730'));

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'VAL-WEB-DBT-SELECTION-RECOVERY-MODEL', 'unit-test', 'current', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.test.ts', 'RecoverCanvasExecutionSelection', 'selection-recovery-policy', 'Set classification, fail-closed admission, executable workspace replacement, and exact strategy receipts.', jsonb_build_object('partialScopeRejected', true, 'workspaceNoOpRejected', true), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('validation:selection-recovery-model:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'VAL-WEB-DBT-SELECTION-RECOVERY-AUTHORITY', 'unit-test', 'current', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts', 'RecoverCanvasExecutionSelection', 'selection-recovery-authority', 'React Query refresh error results reject and cannot fabricate success.', jsonb_build_object('falseSuccessRejected', true), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('validation:selection-recovery-authority:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'VAL-WEB-DBT-SELECTION-RECOVERY-VIEW', 'unit-test', 'current', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx', 'RecoverCanvasExecutionSelection', 'bottom-operational-preview', 'The passive view renders supplied scope, commands, receipt, and failure through shared primitives.', jsonb_build_object('businessDerivation', false, 'adHocCss', false), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('validation:selection-recovery-view:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'VAL-WEB-DBT-SELECTION-RECOVERY-DRAWER', 'integration-test', 'current', 'apps/web/src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx', 'CollectCanvasExecutionSelection', 'bottom-operational-preview', 'Blocked recovery disables Preview and contributes one actionable operational problem.', jsonb_build_object('previewFailClosed', true), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('validation:selection-recovery-drawer:730')),
  ('SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'VAL-WEB-DBT-SELECTION-RECOVERY-LIVE', 'e2e-test', 'current', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'RecoverCanvasExecutionSelection', 'live-protected-canvas', 'A user creates two DBT models, deletes a selected root, sees exact blocked scope, explicitly adopts workspace scope, and regains Preview.', jsonb_build_object('strictBrowserProof', true, 'draftIntercept', false, 'directDraftSeed', false), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('validation:selection-recovery-live:730'))
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

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id, component_id, evidence_kind, evidence_ref, evidence_status,
  raw_evidence, source_path, source_content_sha256
)
values
  ('EV-WEB-DBT-SELECTION-RECOVERY-POLICY', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'unit-test', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.test.ts', 'passing', jsonb_build_object('rail', 'RecoverCanvasExecutionSelection'), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('evidence:selection-recovery-policy:730')),
  ('EV-WEB-DBT-SELECTION-RECOVERY-PRESENTATION', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'presentation-test', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx', 'passing', jsonb_build_object('passiveTemplate', true), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('evidence:selection-recovery-presentation:730')),
  ('EV-WEB-DBT-SELECTION-RECOVERY-LIVE', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY', 'e2e-test', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'passing', jsonb_build_object('strictBrowserProof', true), 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql', md5('evidence:selection-recovery-live:730'))
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
values (
  'local#E-DBT-PROJECT-ROUNDTRIP-1#command#recovercanvasexecutionselection#explicit',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'implemented',
  'RecoverCanvasExecutionSelection',
  'recovercanvasexecutionselection',
  'command',
  'CanvasExecutionSelectionRecovery',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts#recoverCanvasExecutionSelection',
    'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts#useCanvasExecutionSelectionRecovery'
  ),
  jsonb_build_array(
    'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.ts',
    'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts',
    'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx',
    'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts',
    'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-execution-selection-component.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.test.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.ts',
    'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts',
    'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts',
    'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.test.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx',
    'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts',
    'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasExecutionSelectionRecovery.architecture.test.ts'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql',
  repeat(md5('RecoverCanvasExecutionSelection:explicit:730'), 2),
  jsonb_build_object(
    'name', 'RecoverCanvasExecutionSelection',
    'type', 'command',
    'boundedContext', 'Canvas execution selection',
    'dddObject', 'CanvasExecutionSelectionRecovery',
    'applicationPort', 'CanvasExecutionSelectionRecoveryCommands',
    'adapterSurface', 'useCanvasExecutionSelectionRecovery',
    'authorization', 'Uses the already authorized route-local Canvas selection and workspace authority; server Preview revalidates scope.',
    'negativeTests', jsonb_build_array(
      'implicit selection replacement',
      'workspace replacement without executable scope',
      'refresh error presented as success',
      'late refresh result overwrites newer intent'
    )
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-PROJECT-ROUNDTRIP-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'domainObjects', jsonb_build_array('CanvasExecutionSelectionRecovery', 'CanvasExecutionSelectionRecoveryReadModel'),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object('name', 'CollectCanvasExecutionSelection', 'type', 'query', 'status', 'implemented'),
      jsonb_build_object('name', 'RecoverCanvasExecutionSelection', 'type', 'command', 'status', 'implemented')
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts',
      'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts',
      'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts',
      'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx',
      'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts',
      'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql'
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

-- Remove the obsolete implicit replacement semantics introduced by migration
-- 720 without mutating migration history.
update architecture.design
set
  rationale = 'CollectCanvasExecutionSelection remains the single query seam. Workspace fallback and explicit empty intent are distinct states; gestures and graph lifecycle updates preserve the complete requested set; unavailable roots remain visible; and only RecoverCanvasExecutionSelection may explicitly discard or replace that intent.',
  updated_at = now()
where design_id = 'AD-DBT-SELECTION-INTENT-INTEGRITY-20260716';

update planning_query_store.governance_component_local_semantic_items
set item_value = 'DBT selection gestures and graph lifecycle updates preserve the complete requested-id set; unavailable members may be discarded or replaced only by RecoverCanvasExecutionSelection.'
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'invariant'
  and item_order = 9;

update planning_query_store.governance_component_local_semantic_items
set item_value = case
  when position('buildDbtExecutionScopeGraph' in item_value) > 0 then item_value
  else item_value || ';buildDbtExecutionScopeGraph'
end
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and item_kind = 'public_api';

update planning_query_store.frontend_component_local_files
set
  exported_symbol = 'buildDbtExecutionScopeGraph;resolveDbtExecutionScope;applyDbtExecutionSelectionToggle;reconcileDbtExecutionSelectionVisibleSubset',
  raw_file = jsonb_build_object(
    'ownership', 'owned',
    'purpose', 'derive the shared executable DBT graph, fail-closed scope, and complete-intent gesture reconciliation'
  ),
  source_path = 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql',
  source_content_sha256 = md5('selection:shared-executable-graph:730'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
  and file_path = 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts';

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(symbol_refs)
      union
      select 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts#buildDbtExecutionScopeGraph'
    ) refs
  ),
  implementation_refs = (
    select jsonb_agg(value order by value)
    from (
      select distinct value
      from jsonb_array_elements_text(implementation_refs)
      union
      select 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql'
    ) refs
  ),
  source_path = 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:shared-graph:730'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

do $$
declare
  architecture_component_count integer;
  relation_count integer;
  recovery_owned_file_count integer;
  view_owned_file_count integer;
  duplicate_file_role_count integer;
  local_rail_count integer;
  canonical_command_count integer;
  required_test_count integer;
  current_evidence_count integer;
  plugin_scope_count integer;
begin
  select count(*) into architecture_component_count
  from architecture.component
  where component_id in (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  ) and status = 'implemented';

  select count(*) into relation_count
  from architecture.component_relation
  where relation_id in (
    'REL-WEB-DBT-SELECTION-CONTAINS-RECOVERY',
    'REL-WEB-DBT-SELECTION-RECOVERY-CONTAINS-VIEW',
    'REL-WEB-CANVAS-COMMAND-SURFACE-DEPENDS-ON-SELECTION-RECOVERY',
    'REL-WEB-DBT-FILE-EXECUTION-DEPENDS-ON-SELECTION-RECOVERY'
  ) and status = 'implemented';

  select count(*) into recovery_owned_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
    and pattern_kind = 'owns';

  select count(*) into view_owned_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    and pattern_kind = 'owns';

  select count(*) into duplicate_file_role_count
  from (
    select component_id, file_path
    from planning_query_store.frontend_component_local_files
    where component_id in (
      'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
      'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
    )
    group by component_id, file_path
    having count(*) > 1
  ) duplicates;

  select count(*) into local_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id in (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  ) and rail_status = 'implemented';

  select count(*) into canonical_command_count
  from planning_query_store.command_query_rail_query
  where rail_name = 'RecoverCanvasExecutionSelection'
    and rail_type = 'command'
    and rail_status = 'implemented';

  select count(*) into required_test_count
  from architecture.component_test
  where test_id like 'TEST-WEB-DBT-SELECTION-RECOVERY-%'
    and required;

  select count(*) into current_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id in (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  ) and evidence_status = 'current';

  select count(*) into plugin_scope_count
  from planning_query_store.frontend_component_plugin_scopes
  where component_id in (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW'
  ) and plugin_id = 'dbt' and scope_status = 'current';

  if architecture_component_count <> 2 then
    raise exception 'Selection recovery requires two implemented architecture components, found %', architecture_component_count;
  end if;
  if relation_count <> 4 then
    raise exception 'Selection recovery requires four implemented component relations, found %', relation_count;
  end if;
  if recovery_owned_file_count <> 8 then
    raise exception 'Selection recovery application component requires eight owned files, found %', recovery_owned_file_count;
  end if;
  if view_owned_file_count <> 4 then
    raise exception 'Selection recovery view requires four owned files, found %', view_owned_file_count;
  end if;
  if duplicate_file_role_count <> 0 then
    raise exception 'Selection recovery has % duplicate component file roles', duplicate_file_role_count;
  end if;
  if local_rail_count <> 4 then
    raise exception 'Selection recovery component pair requires four owned/consumed local rail rows, found %', local_rail_count;
  end if;
  if canonical_command_count <> 1 then
    raise exception 'RecoverCanvasExecutionSelection must have exactly one canonical command rail, found %', canonical_command_count;
  end if;
  if required_test_count <> 8 then
    raise exception 'Selection recovery requires eight mandatory tests, found %', required_test_count;
  end if;
  if current_evidence_count <> 5 then
    raise exception 'Selection recovery requires five current relational evidence rows, found %', current_evidence_count;
  end if;
  if plugin_scope_count <> 2 then
    raise exception 'Selection recovery requires two relational DBT plugin scopes, found %', plugin_scope_count;
  end if;
  if exists (
    select 1 from architecture.design_scope
    where design_id = 'AD-DBT-SELECTION-RECOVERY-20260717'
      and subject_id = 'SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION'
  ) then
    raise exception 'Selection recovery design still references a nonexistent operational drawer architecture component';
  end if;
  if exists (
    select 1 from architecture.design
    where design_id = 'AD-DBT-SELECTION-INTENT-INTEGRITY-20260716'
      and rationale like '%deliberately replaces%'
  ) then
    raise exception 'Obsolete implicit DBT selection replacement semantics remain active';
  end if;
end $$;
