-- Reconcile the hard-Fowler DBT YAML description split before closeout.
-- The retired transaction remains only as a tombstone: every live source,
-- port, test, and relation is owned by one cohesive replacement component.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  (
    'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
    'DBT YAML description application ports',
    'port',
    'application',
    'API / DBT project authoring',
    'apps/api/src/application/ports/dbtYamlDescriptionEdit.ts',
    'IDbtYamlDescriptionResourceResolver;IProposeDbtYamlDescriptionEditQuery;IApplyDbtYamlDescriptionEditCommand;IRevertDbtYamlDescriptionEditCommand;IDbtYamlDescriptionReceiptStore;IDbtYamlDescriptionMutator',
    'node',
    'high',
    'review',
    'SYS-API-APPLICATION-SERVICES'
  ),
  (
    'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
    'DBT YAML description integrity policy',
    'module',
    'application',
    'API / DBT project authoring',
    'apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts',
    'DbtYamlDescriptionIntegrityPolicy',
    'node',
    'high',
    'review',
    'SYS-API-APPLICATION-SERVICES'
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
    'RESP-DBT-YAML-DESCRIPTION-PORTS',
    'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
    'Define the application-facing command, query, resolver, mutator, and receipt-store boundaries and their typed failure vocabulary.',
    'The application boundary or typed failure language of DBT YAML description editing changes.',
    'DbtYamlDescriptionApplicationPorts',
    'approved'
  ),
  (
    'RESP-DBT-YAML-DESCRIPTION-INTEGRITY',
    'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
    'Derive and verify content-addressed proposal, request, idempotency, receipt, analysis, and focused-diff identities.',
    'The deterministic integrity or addressing policy of DBT YAML description operations changes.',
    'DbtYamlDescriptionIntegrityPolicy',
    'approved'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

-- A deprecated aggregate must not retain executable boundaries or imply that
-- its removed transaction source remains authoritative.
update architecture.component
set status = 'deprecated', updated_at = now()
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

delete from architecture.component_port
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

delete from architecture.component_test
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

delete from architecture.component_relation
where source_component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
   or target_component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

delete from architecture.component_relation
where relation_id = 'REL-WEB-NODE-WORKBENCH-USES-POSITION';

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, contract_id, failure_mode, authorization_scope,
  source_refs, status
)
values
  ('REL-API-DBT-YAML-PORTS-USES-CONTRACT', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'depends_on', 'outbound', 'sync', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Application vocabulary diverges from the versioned cross-process contract.', 'internal application boundary', jsonb_build_array('dbtYamlDescriptionEdit.ts'), 'approved'),
  ('REL-API-DBT-YAML-RESOLVER-IMPLEMENTS-PORT', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'implements_port', 'outbound', 'sync', null, 'Resource authority bypasses the application port.', 'workspace:files:view', jsonb_build_array('IDbtYamlDescriptionResourceResolver'), 'approved'),
  ('REL-API-DBT-YAML-RESOLVER-CALLS-PROJECT-GRAPH', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'calls', 'outbound', 'async', null, 'Resource identity is resolved without the authoritative root-package projection.', 'workspace:files:view', jsonb_build_array('ProjectDbtGraphFromFilesUseCase.execute'), 'approved'),
  ('REL-API-DBT-YAML-PROPOSAL-IMPLEMENTS-PORT', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'implements_port', 'outbound', 'sync', null, 'The query acquires a parallel public vocabulary.', 'workspace:files:view', jsonb_build_array('IProposeDbtYamlDescriptionEditQuery'), 'approved'),
  ('REL-API-DBT-YAML-PROPOSAL-CALLS-CST', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'calls', 'outbound', 'sync', null, 'Proposal serializes unrelated YAML bytes.', 'workspace:files:view', jsonb_build_array('IDbtYamlDescriptionMutator.mutate'), 'approved'),
  ('REL-API-DBT-YAML-PROPOSAL-USES-INTEGRITY', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'calls', 'outbound', 'sync', null, 'Proposal bytes and digest are not deterministically addressed.', 'workspace:files:view', jsonb_build_array('proposalDigest', 'buildFocusedUnifiedDiff'), 'approved'),
  ('REL-API-DBT-YAML-PROPOSAL-READS-WORKSPACE', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-APPLICATION-SERVICES-WORKSPACE', 'reads', 'outbound', 'async', null, 'Proposal is built from stale or non-authoritative bytes.', 'workspace:files:view', jsonb_build_array('IWorkspaceFileRepository.getFileContent'), 'approved'),
  ('REL-API-DBT-YAML-APPLY-IMPLEMENTS-PORT', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'implements_port', 'outbound', 'sync', null, 'The command acquires a parallel public vocabulary.', 'workspace:files:save', jsonb_build_array('IApplyDbtYamlDescriptionEditCommand'), 'approved'),
  ('REL-API-DBT-YAML-APPLY-CALLS-CST', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'calls', 'outbound', 'sync', null, 'Apply trusts proposal bytes without deterministic recomputation.', 'workspace:files:save', jsonb_build_array('IDbtYamlDescriptionMutator.mutate'), 'approved'),
  ('REL-API-DBT-YAML-APPLY-USES-INTEGRITY', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'calls', 'outbound', 'sync', null, 'Apply accepts forged proposal or idempotency identities.', 'workspace:files:save', jsonb_build_array('assertProposalIntegrity', 'operationRequestHash'), 'approved'),
  ('REL-API-DBT-YAML-APPLY-WRITES-WORKSPACE', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-APPLICATION-SERVICES-WORKSPACE', 'writes', 'outbound', 'async', null, 'Apply bypasses revision-guarded batch mutation.', 'workspace:files:save', jsonb_build_array('IWorkspaceFileBatchMutationPort.apply'), 'approved'),
  ('REL-API-DBT-YAML-APPLY-CALLS-PROJECT-GRAPH', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'calls', 'outbound', 'async', null, 'Apply reports success before authoritative DBT re-analysis.', 'workspace:files:save', jsonb_build_array('ProjectDbtGraphFromFilesUseCase.execute'), 'approved'),
  ('REL-API-DBT-YAML-REVERT-IMPLEMENTS-PORT', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'implements_port', 'outbound', 'sync', null, 'The command accepts mutable caller-supplied receipt data.', 'workspace:files:save', jsonb_build_array('IRevertDbtYamlDescriptionEditCommand'), 'approved'),
  ('REL-API-DBT-YAML-REVERT-CALLS-CST', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'calls', 'outbound', 'sync', null, 'Revert serializes unrelated YAML bytes.', 'workspace:files:save', jsonb_build_array('IDbtYamlDescriptionMutator.mutate'), 'approved'),
  ('REL-API-DBT-YAML-REVERT-USES-INTEGRITY', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'calls', 'outbound', 'sync', null, 'Revert accepts forged request or receipt identities.', 'workspace:files:save', jsonb_build_array('operationRequestHash', 'operationReceiptId'), 'approved'),
  ('REL-API-DBT-YAML-REVERT-WRITES-WORKSPACE', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-APPLICATION-SERVICES-WORKSPACE', 'writes', 'outbound', 'async', null, 'Revert bypasses revision-guarded batch mutation.', 'workspace:files:save', jsonb_build_array('IWorkspaceFileBatchMutationPort.apply'), 'approved'),
  ('REL-API-DBT-YAML-REVERT-CALLS-PROJECT-GRAPH', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'calls', 'outbound', 'async', null, 'Revert reports success before authoritative DBT re-analysis.', 'workspace:files:save', jsonb_build_array('ProjectDbtGraphFromFilesUseCase.execute'), 'approved'),
  ('REL-API-DBT-YAML-CST-IMPLEMENTS-MUTATOR-PORT', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'implements_port', 'outbound', 'sync', null, 'CST mutation leaks concrete YAML syntax into commands.', 'internal application boundary', jsonb_build_array('IDbtYamlDescriptionMutator'), 'approved'),
  ('REL-API-DBT-YAML-RECEIPTS-IMPLEMENT-STORE-PORT', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'implements_port', 'outbound', 'sync', null, 'Receipt persistence leaks workspace metadata details into commands.', 'workspace:files:save', jsonb_build_array('IDbtYamlDescriptionReceiptStore'), 'approved'),
  ('REL-API-DBT-YAML-REVERT-WRITES-RECEIPT', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'writes', 'outbound', 'async', null, 'A revert is not replay-safe or auditable.', 'workspace:files:save', jsonb_build_array('saveReverted'), 'approved'),
  ('REL-API-WORKSPACE-ROUTES-CALLS-DBT-YAML-PROPOSAL', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Protected query route bypasses authorization or typed decoding.', 'workspace:files:view', jsonb_build_array('registerDbtYamlDescriptionEditRoutes'), 'approved'),
  ('REL-API-WORKSPACE-ROUTES-CALLS-DBT-YAML-APPLY', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Protected command route bypasses authorization or typed decoding.', 'workspace:files:save', jsonb_build_array('registerDbtYamlDescriptionEditRoutes'), 'approved'),
  ('REL-API-WORKSPACE-ROUTES-CALLS-DBT-YAML-REVERT', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Protected command route bypasses authorization or trusted receipt lookup.', 'workspace:files:save', jsonb_build_array('registerDbtYamlDescriptionEditRoutes'), 'approved'),
  ('REL-WEB-NODE-WORKBENCH-OVERLAY-USES-POSITION', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'calls', 'outbound', 'sync', null, 'The overlay owns pointer geometry or becomes unreachable after movement.', 'authenticated Canvas UI', jsonb_build_array('useCanvasNodeWorkbenchPosition'), 'approved')
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
  ('TEST-API-DBT-YAML-DESCRIPTION-PORTS', 'SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'packages/@dvt/contracts/test/dbt-yaml-description-edit.contract.test.ts', 'contract', 'boundary', true, 'pnpm --filter @dvt/contracts test -- dbt-yaml-description-edit.contract.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'apps/api/test/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/api test -- DbtYamlDescriptionResourceResolver.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'apps/api/test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/api test -- ProposeDbtYamlDescriptionEditQuery.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'apps/api/test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/api test -- ApplyDbtYamlDescriptionEditCommand.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'apps/api/test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/api test -- RevertDbtYamlDescriptionEditCommand.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'apps/api/test/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/api test -- WorkspaceMetadataDbtYamlDescriptionReceiptStore.test.ts'),
  ('TEST-WEB-NODE-WORKBENCH-POSITION-MODEL', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.test.ts', 'unit', 'boundary', true, 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasNodeWorkbenchPositionModel.test.ts'),
  ('TEST-WEB-NODE-WORKBENCH-POSITION-INTEGRATION', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx', 'integration', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx')
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
  ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-PORTS:741'), 2), 0, 'DBT YAML description application ports', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API', 'review', false, 'Own the application boundary and typed failure vocabulary for DBT YAML description operations.', 'DbtYamlDescriptionApplicationPorts', 'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER:741'), 2), 0, 'DBT YAML description resource resolver', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API', 'review', false, 'Resolve one editable root-project DBT YAML resource from authoritative project-file projection.', 'DbtYamlDescriptionResource', 'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY:741'), 2), 0, 'Propose DBT YAML description edit query', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API', 'review', false, 'Build one content-addressed focused description proposal without mutating workspace state.', 'ProposeDbtYamlDescriptionEdit', 'ProposeDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND:741'), 2), 0, 'Apply DBT YAML description edit command', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API', 'review', false, 'Conditionally apply one trusted proposal, reconcile it, and persist one immutable applied receipt.', 'ApplyDbtYamlDescriptionEdit', 'ApplyDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND:741'), 2), 0, 'Revert DBT YAML description edit command', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API', 'review', false, 'Resolve a trusted applied receipt and conditionally restore the previous description.', 'RevertDbtYamlDescriptionEdit', 'RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY:741'), 2), 0, 'DBT YAML description integrity policy', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API', 'review', false, 'Derive and verify deterministic proposal, request, receipt, analysis, and focused-diff identities.', 'DbtYamlDescriptionIntegrityPolicy', 'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE:741'), 2), 0, 'DBT YAML description receipt store', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API', 'review', false, 'Persist and retrieve immutable scoped DBT YAML description command receipts.', 'DbtYamlDescriptionReceipt', 'ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', repeat(md5('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION:741'), 2), 0, 'Canvas Node Workbench position controller', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'SYS-DVT', 'SYS-WEB', 'review', false, 'Own bounded pointer, keyboard, and resize behavior for the contextual Node Workbench.', 'CanvasNodeWorkbenchPosition', 'InspectCanvasNodeProperties', 'codex')
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
  cq_rails = excluded.cq_rails,
  created_by = excluded.created_by;

update planning_query_store.governance_component_local_definitions
set
  status = 'superseded',
  owned_concern = 'Superseded transaction aggregate retained only as an architecture tombstone.',
  cq_rails = 'none - superseded by one component per canonical command or query rail',
  source_path = 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql',
  source_content_sha256 = repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-EDIT:superseded:741'), 2),
  revision = revision + 1
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
  'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
  'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
  'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'owns', 'apps/api/src/application/ports/dbtYamlDescriptionEdit.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'owns', 'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'owns', 'apps/api/test/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.test.ts', 1),
  ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'owns', 'apps/api/src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'owns', 'apps/api/test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts', 1),
  ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'owns', 'apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'owns', 'apps/api/test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts', 1),
  ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'owns', 'apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'owns', 'apps/api/test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts', 1),
  ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'owns', 'apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'owns', 'apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'owns', 'apps/api/test/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.test.ts', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'owns', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts', 0),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'owns', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.test.ts', 1),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'owns', 'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts', 2),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'owns', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisualTokens.ts', 50),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.ts', 50),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.test.ts', 51)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
  'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
  'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
  'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
  'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
  'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
  'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
select component_id, item_kind, item_value, item_order
from (
  values
    ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'non_goal', 'Own executable source, tests, ports, or CQ relations after decomposition.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'fowler_signal', 'superseded responsibility overload', 0),

    ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'responsibility', 'Define application boundaries and typed failures for DBT YAML description operations.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'reason_to_change', 'Application boundary or typed failure vocabulary changes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'public_api', 'IDbtYamlDescriptionResourceResolver;IProposeDbtYamlDescriptionEditQuery;IApplyDbtYamlDescriptionEditCommand;IRevertDbtYamlDescriptionEditCommand;IDbtYamlDescriptionReceiptStore;IDbtYamlDescriptionMutator', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'invariant', 'Each canonical rail has one inbound interface and adapters depend on interfaces rather than concrete commands.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'transition', 'Versioned contract request or receipt becomes an application input, result, or typed failure.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'consumer', 'Protected HTTP routes, CQ components, CST adapter, and receipt-store adapter.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PORTS', 'fowler_signal', 'published interface boundary', 0),

    ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'responsibility', 'Resolve one editable root-project resource and contained YAML path.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'reason_to_change', 'Root-package authority or visual editability policy changes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'public_api', 'DbtYamlDescriptionResourceResolver.resolve', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'invariant', 'Dependency-package, path-escaping, ambiguous, or non-editable resources fail closed.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'transition', 'Canvas and unique resource identity become one authorized project-contained YAML resource context.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'consumer', 'Proposal query and apply command.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'fowler_signal', 'domain authority service', 0),

    ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'responsibility', 'Build one focused content-addressed proposal without mutation.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'reason_to_change', 'Proposal composition or focused review evidence changes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'public_api', 'ProposeDbtYamlDescriptionEditQuery.propose', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'invariant', 'A query never writes and its candidate is derived from current authoritative bytes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'transition', 'Authorized resource plus description intent becomes a digest-bound candidate and focused diff.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'consumer', 'Protected proposal HTTP route and browser description editor.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'fowler_signal', 'query object', 0),

    ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'responsibility', 'Conditionally apply one trusted proposal and persist its immutable receipt after reconciliation.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'reason_to_change', 'Apply concurrency, idempotency, reconciliation, or receipt policy changes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'public_api', 'ApplyDbtYamlDescriptionEditCommand.apply', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'invariant', 'Success requires exact candidate persistence, authoritative re-analysis, retained target hash, and immutable receipt.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'transition', 'Trusted proposal becomes one applied receipt or a typed conflict.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'consumer', 'Protected apply HTTP route and browser description editor.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'fowler_signal', 'command object', 0),

    ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'responsibility', 'Resolve a trusted applied receipt and conditionally restore its previous description.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'reason_to_change', 'Revert authorization, receipt lookup, concurrency, or reconciliation policy changes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'public_api', 'RevertDbtYamlDescriptionEditCommand.revert', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'invariant', 'Caller input contains only a receipt identity; trusted receipt content is resolved server-side.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'transition', 'Trusted applied receipt plus matching authoritative revision becomes one reverted receipt.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'consumer', 'Protected revert HTTP route and browser description editor.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'fowler_signal', 'command object', 0),

    ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'responsibility', 'Derive and verify deterministic operation identities and focused review evidence.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'reason_to_change', 'Hash domain, idempotency, receipt, analysis, or focused-diff identity policy changes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'public_api', 'assertProposalIntegrity;proposalDigest;operationRequestHash;operationReceiptId;batchIdempotencyKey;analysisReceipt;buildFocusedUnifiedDiff', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'invariant', 'Equal canonical inputs yield equal identities while scope, operation, revision, or description changes alter the relevant identity.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'transition', 'Canonical operation values become deterministic hashes, receipts, idempotency keys, and focused diff evidence.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'consumer', 'Proposal query, apply command, and revert command.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY', 'fowler_signal', 'value object policy', 0),

    ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'responsibility', 'Persist and retrieve immutable scoped applied and reverted receipts.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'reason_to_change', 'Receipt storage, parsing, immutability, or scope isolation changes.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'public_api', 'WorkspaceMetadataDbtYamlDescriptionReceiptStore', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'invariant', 'A receipt cannot be overwritten and cannot be read across workspace scope.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'transition', 'Validated command receipt becomes immutable workspace metadata or a scoped lookup result.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'consumer', 'Apply and revert commands.', 0),
    ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'fowler_signal', 'repository adapter', 0),

    ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'responsibility', 'Own bounded pointer, keyboard, and resize behavior for the contextual Node Workbench.', 0),
    ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'reason_to_change', 'Workbench geometry, movement step, input modality, or resize policy changes.', 0),
    ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'public_api', 'useCanvasNodeWorkbenchPosition;CanvasNodeWorkbenchPositionModel', 0),
    ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'invariant', 'Every edge remains inside the active Canvas work surface and movement is available by pointer and keyboard.', 0),
    ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'transition', 'Pointer, keyboard, or resize input becomes one clamped workbench position.', 0),
    ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'consumer', 'Canvas Node Workbench overlay.', 0),
    ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'fowler_signal', 'presentation model and DOM adapter split', 0)
) as items(component_id, item_kind, item_value, item_order);

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.CanvasNodeWorkbenchPanel'
  and file_path in (
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx'
  );

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, source_path,
  source_content_sha256, raw_component
)
values
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'Canvas Node Workbench overlay', 'context-panel', 'current', 'harden', 'Frontend / Canvas presentation', 'Render the movable contextual Node Workbench surface without owning position policy.', '@dvt/web', '/canvas', null, '[]'::jsonb, jsonb_build_array('TEST-WEB-NODE-WORKBENCH-POSITION-INTEGRATION'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('frontend:node-workbench-overlay:741'), jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'presentationOwner', true)),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'Canvas Node Workbench position controller', 'state-view', 'partial', 'extract', 'Frontend / Canvas interaction', 'Adapt pointer, keyboard, and resize input to the bounded workbench position model.', '@dvt/web', '/canvas', null, jsonb_build_array('strict browser movement proof pending'), jsonb_build_array('TEST-WEB-NODE-WORKBENCH-POSITION-MODEL', 'TEST-WEB-NODE-WORKBENCH-POSITION-INTEGRATION'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('frontend:node-workbench-position:741'), jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'presentationOwner', false))
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

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx', 'presentation', 'CanvasNodeWorkbenchOverlay', jsonb_build_object('ownership', 'owned', 'positionPolicy', 'delegated'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:node-workbench-overlay:741')),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx', 'integration-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'visibility and position-controller integration'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:node-workbench-overlay-test:741')),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchVisualTokens.ts', 'visual-tokens', 'canvasNodeWorkbenchVisualTokens', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:node-workbench-overlay-tokens:741')),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts', 'model', 'CanvasNodeWorkbenchPositionModel', jsonb_build_object('ownership', 'owned', 'pure', true), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:node-workbench-position-model:741')),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'geometry invariants'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:node-workbench-position-model-test:741')),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts', 'interaction-adapter', 'useCanvasNodeWorkbenchPosition', jsonb_build_object('ownership', 'owned', 'adapts', jsonb_build_array('pointer', 'keyboard', 'resize')), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:node-workbench-position-hook:741')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.ts', 'presentation-model', 'resolveDbtYamlDescriptionAnalysisPresentation', jsonb_build_object('ownership', 'owned'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:dbt-description-analysis-presentation:741')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.test.ts', 'unit-test', null, jsonb_build_object('ownership', 'owned', 'coverage', 'fresh stale invalid and unavailable receipt posture'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('file:dbt-description-analysis-presentation-test:741'))
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id, surface_id, route_path, placement_kind, placement_order,
  raw_link, source_path, source_content_sha256
)
values
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY', 'web.canvas.graph', '/canvas', 'selected-node-workbench-overlay', 49, jsonb_build_object('host', 'CanvasShellMainPanel', 'visibleWhen', 'one node is selected'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('surface:node-workbench-overlay:741')),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'web.canvas.graph', '/canvas', 'node-workbench-position-controller', 50, jsonb_build_object('visible', false, 'host', 'CanvasNodeWorkbenchOverlay'), 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql', md5('surface:node-workbench-position:741'))
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

do $$
declare
  replacement_file_count integer;
  duplicate_file_count integer;
begin
  if exists (
    select 1
    from planning_query_store.governance_component_local_ownership_patterns
    where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) then
    raise exception 'Superseded DBT YAML description transaction still owns files';
  end if;

  if exists (
    select 1 from architecture.component_port
    where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) or exists (
    select 1 from architecture.component_relation
    where source_component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
       or target_component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT'
  ) then
    raise exception 'Superseded DBT YAML description transaction still exposes executable architecture';
  end if;

  select count(*) into replacement_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id in (
    'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
    'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
    'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
    'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
    'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
    'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
    'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
  ) and pattern_kind = 'owns';

  if replacement_file_count <> 15 then
    raise exception 'Expected 15 exactly owned replacement files, found %', replacement_file_count;
  end if;

  select count(*) into duplicate_file_count
  from (
    select pattern
    from planning_query_store.governance_component_local_ownership_patterns
    where component_id in (
      'SYS-API-DBT-YAML-DESCRIPTION-PORTS',
      'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER',
      'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY',
      'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND',
      'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND',
      'SYS-API-DBT-YAML-DESCRIPTION-INTEGRITY',
      'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE',
      'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION'
    ) and pattern_kind = 'owns'
    group by pattern
    having count(*) > 1
  ) duplicates;

  if duplicate_file_count <> 0 then
    raise exception 'Replacement components contain % duplicate file claims', duplicate_file_count;
  end if;
end
$$;
