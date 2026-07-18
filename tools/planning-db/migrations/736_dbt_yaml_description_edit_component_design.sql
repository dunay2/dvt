-- Govern Phase 5.1 as a lossless DBT YAML description transaction and two
-- contextual workbench surfaces. File authority remains canonical; views do
-- not own mutation policy and adapters do not invent parallel CQ vocabulary.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717',
  'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1',
  'Lossless DBT YAML description edit and contextual code workbench',
  'DBT project authoring',
  'review',
  'A description edit is a content-addressed proposal, conditional file mutation, authoritative DBT re-analysis, exact receipt, and conditional revert. The selected-node Code action resolves one authoritative file while project Code resolves the project file set. Transaction policy, CST mutation, HTTP adaptation, browser orchestration, passive presentation, and code-target adaptation remain separate reasons to change.',
  'hidden_authority',
  'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit;GetWorkspaceFileContent;ListWorkspaceFiles;SaveWorkspaceFileContent',
  null
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

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS', 'may_reference', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'contract', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'query', 'ProposeDbtYamlDescriptionEdit', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'flow', 'ApplyDbtYamlDescriptionEdit', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'flow', 'RevertDbtYamlDescriptionEdit', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'test', 'TEST-WEB-DBT-YAML-DESCRIPTION-LIVE', 'must_prove', true),
  ('DBT-YAML-DESCRIPTION-EDIT-PHASE5-20260717', 'path', 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'DBT YAML description edit contract', 'module', 'contracts', 'Architecture / Contracts', 'packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts', 'DbtYamlDescriptionEdit.v1', 'build', 'high', 'review', 'SYS-CONTRACTS-ROOT'),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'DBT YAML description edit transaction', 'service', 'application', 'API / DBT project authoring', 'apps/api/src/application/services/dbtYamlDescriptionEdit', 'DbtYamlDescriptionEditTransaction', 'node', 'high', 'review', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'DBT YAML description CST adapter', 'adapter', 'adapter', 'API / DBT project authoring', 'apps/api/src/infrastructure/dbtYamlDescriptionEdit', 'IDbtYamlDescriptionMutator', 'node', 'high', 'review', 'SYS-API-INFRASTRUCTURE'),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'Web DBT YAML description edit service', 'adapter', 'adapter', 'Frontend / DBT project services', 'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts', 'IDbtYamlDescriptionEditPort', 'browser', 'high', 'review', 'SYS-WEB-APP-SERVICES'),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'DBT YAML description editor controller', 'module', 'application', 'Frontend / Canvas DBT authoring', 'apps/web/src/app/components/dbtYamlDescriptionEditor', 'DbtYamlDescriptionEditorState', 'browser', 'high', 'review', 'SYS-WEB-CANVAS-NODE-WORKBENCH'),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'DBT YAML description editor view', 'ui-view', 'ui', 'Frontend / Canvas presentation', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.tsx', 'DbtYamlDescriptionEditorView', 'browser', 'high', 'review', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR'),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'Canvas SQL contextual workbench', 'ui-view', 'ui', 'Frontend / Canvas presentation', 'apps/web/src/app/views/canvas/SqlContextWorkbench.tsx', 'SqlContextWorkbench', 'browser', 'high', 'review', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH'),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'DBT project code workbench target adapter', 'adapter', 'application', 'Frontend / Canvas DBT authoring', 'apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.tsx', 'SqlContextWorkbenchTarget', 'browser', 'high', 'review', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH')
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
  ('RESP-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'Version strict proposal, apply receipt, analysis receipt, and conditional revert language for one DBT resource description.', 'The cross-process DBT description transaction vocabulary or compatibility policy changes.', 'DbtYamlDescriptionEdit', 'implemented'),
  ('RESP-DBT-YAML-DESCRIPTION-TRANSACTION', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'Coordinate authoritative resource resolution, content-addressed proposal, conditional batch mutation, re-analysis, receipt, and revert.', 'The DBT description transaction, concurrency policy, or authoritative re-analysis sequence changes.', 'DbtYamlDescriptionEditTransaction', 'implemented'),
  ('RESP-DBT-YAML-DESCRIPTION-CST', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'Locate one DBT YAML resource and patch only its description token while preserving unrelated bytes.', 'DBT YAML resource location or lossless CST mutation rules change.', 'DbtYamlDescriptionCstMutation', 'implemented'),
  ('RESP-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'Adapt the three governed DBT description HTTP rails to the browser application port.', 'HTTP route, payload decoding, or browser API error adaptation changes.', 'DbtYamlDescriptionEditClient', 'implemented'),
  ('RESP-WEB-DBT-YAML-DESCRIPTION-EDITOR', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'Own the browser state machine and selected-node contribution for propose, review, apply, conflict reload, and revert.', 'DBT description editor state transitions or Node Workbench eligibility changes.', 'DbtYamlDescriptionEditor', 'implemented'),
  ('RESP-WEB-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'Render localized description draft, focused diff, confirmation, receipt, conflict, and revert controls from supplied state.', 'DBT description edit presentation, copy, or visual tokens change.', 'DbtYamlDescriptionEditorView', 'implemented'),
  ('RESP-WEB-SQL-CONTEXT-WORKBENCH', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'Render the canonical Code workbench for an optional governed file scope without deriving DBT target policy.', 'Contextual Code workbench loading or presentation composition changes.', 'SqlContextWorkbench', 'implemented'),
  ('RESP-WEB-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'Map an exact selected DBT file or project scope to the generic contextual workbench contract and fail closed when file authority is absent.', 'DBT project or selected-node code target resolution changes.', 'DbtProjectCodeWorkbenchTarget', 'implemented')
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
  'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1',
  'api',
  'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
  'packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts',
  'additive',
  'implemented',
  'pnpm --filter @dvt/contracts test -- dbt-yaml-description-edit.contract.test.ts'
)
on conflict (contract_id) do update set
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
  ('PORT-API-DBT-YAML-DESCRIPTION-PROPOSE', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'ProposeDbtYamlDescriptionEdit', 'query', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['resource missing or ambiguous', 'resource lacks file authority', 'invalid YAML', 'proposal mutates unrelated bytes'], 'implemented'),
  ('PORT-API-DBT-YAML-DESCRIPTION-APPLY', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'ApplyDbtYamlDescriptionEdit', 'command', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['proposal digest mismatch', 'revision conflict', 'idempotency conflict', 'analysis receipt omitted'], 'implemented'),
  ('PORT-API-DBT-YAML-DESCRIPTION-REVERT', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'RevertDbtYamlDescriptionEdit', 'command', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['receipt identity mismatch', 'intervening file mutation', 'revert bypasses re-analysis'], 'implemented'),
  ('PORT-API-DBT-YAML-CST-MUTATOR', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'MutateDbtYamlDescriptionCst', 'command', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['duplicate resource identity', 'non-scalar description', 'unrelated YAML serialization'], 'implemented'),
  ('PORT-WEB-DBT-YAML-DESCRIPTION-CLIENT', 'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'IDbtYamlDescriptionEditPort', 'api', 'outbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['malformed success payload', 'authorization rejection shown as success'], 'implemented'),
  ('PORT-WEB-DBT-YAML-DESCRIPTION-EDITOR', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'EditDbtYamlDescription', 'ui-action', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['apply before review', 'late response overwrites newer draft', 'passive description row remains duplicated'], 'implemented'),
  ('PORT-WEB-DBT-YAML-DESCRIPTION-VIEW', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'PresentDbtYamlDescriptionEdit', 'ui-action', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', null, array['view calls transport directly', 'copy bypasses locale catalog', 'conflict hides reload action'], 'implemented'),
  ('PORT-WEB-SQL-CONTEXT-WORKBENCH', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'PresentSqlContextWorkbench', 'ui-action', 'inbound', null, null, array['selected-node target opens project default', 'parallel editor state'], 'implemented'),
  ('PORT-WEB-DBT-CODE-TARGET', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'ResolveDbtProjectCodeTarget', 'query', 'inbound', null, null, array['missing file path falls back to inspector code', 'node target widens to project target'], 'implemented')
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
  ('REL-CONTRACTS-ROOT-CONTAINS-DBT-YAML-DESCRIPTION-EDIT', 'SYS-CONTRACTS-ROOT', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'contains', 'outbound', 'build_time', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Transaction DTOs lose a canonical owner.', 'not_applicable', jsonb_build_array('DbtYamlDescriptionEdit.v1'), 'implemented'),
  ('REL-API-DBT-YAML-EDIT-USES-CONTRACT', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'depends_on', 'outbound', 'sync', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'API and browser transaction vocabulary diverges.', 'workspace:dbt-project:write', jsonb_build_array('DbtYamlDescriptionEditTransaction'), 'implemented'),
  ('REL-API-DBT-YAML-EDIT-CALLS-CST', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'calls', 'outbound', 'sync', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Unrelated YAML bytes may be rewritten.', 'workspace:dbt-project:write', jsonb_build_array('IDbtYamlDescriptionMutator'), 'implemented'),
  ('REL-API-DBT-YAML-EDIT-CALLS-PROJECT-GRAPH', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'SYS-API-APPLICATION-DBT-PROJECT-GRAPH', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Resource identity or post-mutation analysis becomes stale.', 'workspace:dbt-project:read', jsonb_build_array('ProjectDbtGraphFromFilesUseCase'), 'implemented'),
  ('REL-API-DBT-YAML-EDIT-WRITES-WORKSPACE', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'SYS-API-APPLICATION-SERVICES-WORKSPACE', 'writes', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Conditional mutation and idempotency guarantees are bypassed.', 'workspace:files:write', jsonb_build_array('IWorkspaceFileBatchMutationPort', 'IWorkspaceFileRepository'), 'implemented'),
  ('REL-API-WORKSPACE-ROUTES-CALLS-DBT-YAML-EDIT', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Route authorization or failure vocabulary diverges from the application transaction.', 'workspace:dbt-project:write', jsonb_build_array('dbtYamlDescriptionEditRouteGroup', 'dbtYamlDescriptionEditRoutes'), 'implemented'),
  ('REL-WEB-DBT-YAML-SERVICE-USES-CONTRACT', 'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'depends_on', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Browser accepts malformed transaction receipts.', 'workspace:dbt-project:write', jsonb_build_array('createDbtYamlDescriptionEditApi'), 'implemented'),
  ('REL-WEB-DBT-YAML-EDITOR-CALLS-SERVICE', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'UI fabricates or loses transaction state.', 'workspace:dbt-project:write', jsonb_build_array('useDbtYamlDescriptionEditor'), 'implemented'),
  ('REL-WEB-DBT-YAML-EDITOR-CONTAINS-VIEW', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'contains', 'outbound', 'sync', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Presentation begins owning transport or mutation policy.', 'workspace:dbt-project:write', jsonb_build_array('DbtYamlDescriptionEditorView'), 'implemented'),
  ('REL-WEB-NODE-WORKBENCH-CONTAINS-DBT-YAML-EDITOR', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'contains', 'outbound', 'sync', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Description editor becomes a global or duplicated inspector surface.', 'workspace:dbt-project:write', jsonb_build_array('buildDbtYamlDescriptionWorkbenchContributions'), 'implemented'),
  ('REL-WEB-CONTEXTUAL-WORKBENCH-CONTAINS-SQL', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'contains', 'outbound', 'sync', null, 'Code becomes a top-level competing Canvas mode.', 'workspace:files:read', jsonb_build_array('SqlContextWorkbench'), 'implemented'),
  ('REL-WEB-DBT-CODE-ADAPTER-CALLS-SQL-WORKBENCH', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'calls', 'outbound', 'sync', null, 'Selected-node and project targets become ambiguous.', 'workspace:files:read', jsonb_build_array('buildDbtProjectFileCodeWorkbench'), 'implemented'),
  ('REL-WEB-SQL-WORKBENCH-USES-CODE-VIEW', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'SYS-WEB-VIEWS-CODE', 'depends_on', 'outbound', 'async', null, 'A second file editor or sync state is introduced.', 'workspace:files:read;workspace:files:write', jsonb_build_array('CodeView', 'CodeViewFileScope'), 'implemented')
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
  ('TEST-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'packages/@dvt/contracts/test/dbt-yaml-description-edit.contract.test.ts', 'contract', 'boundary', true, 'pnpm --filter @dvt/contracts test -- dbt-yaml-description-edit.contract.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-TRANSACTION', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'apps/api/test/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/api test -- DbtYamlDescriptionEditTransaction.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-CST', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'apps/api/test/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.test.ts', 'property', 'negative', true, 'pnpm --filter @dvt/api test -- YamlCstDbtDescriptionMutator.test.ts'),
  ('TEST-API-DBT-YAML-DESCRIPTION-ROUTES', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'apps/api/test/entrypoints/http/dbtYamlDescriptionEditRoutes.test.ts', 'integration', 'boundary', true, 'pnpm --filter @dvt/api test -- dbtYamlDescriptionEditRoutes.test.ts'),
  ('TEST-WEB-DBT-YAML-DESCRIPTION-CLIENT', 'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.test.ts', 'unit', 'negative', true, 'pnpm --filter @dvt/web test:unit:run -- src/app/services/dbtProject/dbtYamlDescriptionEdit.api.test.ts'),
  ('TEST-WEB-DBT-YAML-DESCRIPTION-MODEL', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.test.ts', 'unit', 'behavior', true, 'pnpm --filter @dvt/web test:unit:run -- src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.test.ts'),
  ('TEST-WEB-DBT-YAML-DESCRIPTION-CONTROLLER', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.test.tsx', 'integration', 'negative', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.test.tsx'),
  ('TEST-WEB-DBT-YAML-DESCRIPTION-CONTRIBUTION', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.test.tsx', 'integration', 'boundary', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.test.tsx'),
  ('TEST-WEB-DBT-YAML-DESCRIPTION-VIEW', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.test.tsx'),
  ('TEST-WEB-SQL-CONTEXT-WORKBENCH', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'apps/web/src/app/views/canvas/SqlContextWorkbench.test.tsx', 'unit', 'behavior', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/SqlContextWorkbench.test.tsx'),
  ('TEST-WEB-DBT-CODE-WORKBENCH-ADAPTER', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx', 'unit', 'negative', true, 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-presentation.config.ts src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx'),
  ('TEST-WEB-DBT-YAML-DESCRIPTION-LIVE', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts', 'e2e', 'flow', true, 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts')
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
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT:736'), 2), 0, 'DBT YAML description edit contract', 'component', 'SYS-CONTRACTS-ROOT', 'SYS-DVT', 'SYS-CONTRACTS', 'canonical', false, 'Version strict description transaction DTOs and receipts.', 'DbtYamlDescriptionEdit', 'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-EDIT:736'), 2), 0, 'DBT YAML description edit transaction', 'component', 'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API', 'canonical', false, 'Coordinate proposal, conditional mutation, re-analysis, receipt, and revert.', 'DbtYamlDescriptionEditTransaction', 'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER:736'), 2), 0, 'DBT YAML description CST adapter', 'component', 'SYS-API-INFRASTRUCTURE', 'SYS-DVT', 'SYS-API', 'canonical', false, 'Patch one resource description without serializing unrelated YAML.', 'DbtYamlDescriptionCstMutation', 'none - internal adapter port', 'codex'),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT:736'), 2), 0, 'Web DBT YAML description edit service', 'component', 'SYS-WEB-APP-SERVICES', 'SYS-DVT', 'SYS-WEB', 'canonical', false, 'Adapt governed description HTTP rails to the browser port.', 'DbtYamlDescriptionEditClient', 'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR:736'), 2), 0, 'DBT YAML description editor controller', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'SYS-DVT', 'SYS-WEB', 'canonical', true, 'Own description edit state and Node Workbench contribution.', 'DbtYamlDescriptionEditor', 'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit', 'codex'),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW:736'), 2), 0, 'DBT YAML description editor view', 'component', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'SYS-DVT', 'SYS-WEB', 'canonical', false, 'Render localized transaction state without owning policy.', 'DbtYamlDescriptionEditorView', 'none - passive presentation', 'codex'),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH:736'), 2), 0, 'Canvas SQL contextual workbench', 'component', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-DVT', 'SYS-WEB', 'canonical', false, 'Render canonical CodeView for a supplied file scope.', 'SqlContextWorkbench', 'GetWorkspaceFileContent;ListWorkspaceFiles;SaveWorkspaceFileContent', 'codex'),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', repeat(md5('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER:736'), 2), 0, 'DBT project code workbench target adapter', 'component', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH', 'SYS-DVT', 'SYS-WEB', 'canonical', false, 'Resolve exact selected DBT file or project scope.', 'DbtProjectCodeWorkbenchTarget', 'GetWorkspaceFileContent;ListWorkspaceFiles;SaveWorkspaceFileContent', 'codex')
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
  'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
  'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts', 0),
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'packages/@dvt/contracts/test/dbt-yaml-description-edit.contract.test.ts', 1),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'apps/api/src/application/ports/dbtYamlDescriptionEdit.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts', 1),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'apps/api/test/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.test.ts', 2),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'owns', 'apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'owns', 'apps/api/test/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.test.ts', 1),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'apps/web/src/app/ports/dbtYamlDescriptionEdit.ts', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts', 1),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'owns', 'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.test.ts', 2),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.tsx', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.test.tsx', 1),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.ts', 2),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.test.ts', 3),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts', 4),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'owns', 'apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.tsx', 5),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'owns', 'apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.test.tsx', 6),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.tsx', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.test.tsx', 1),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorCopy.ts', 2),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorCopy.test.ts', 3),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'owns', 'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorVisualTokens.ts', 4),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'owns', 'apps/web/src/app/views/canvas/SqlContextWorkbench.tsx', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'owns', 'apps/web/src/app/views/canvas/SqlContextWorkbench.test.tsx', 1),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'owns', 'apps/web/src/app/views/canvas/sqlContextWorkbenchVisualTokens.ts', 2),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'owns', 'apps/web/src/app/views/canvas/sqlContextWorkbenchModel.ts', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.tsx', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'owns', 'apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx', 2);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/src/entrypoints/http/dbtProjectFileRouteAuthorization.ts', 90),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/src/entrypoints/http/dbtYamlDescriptionEditRouteGroup.ts', 91),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts', 92),
  ('SYS-API-HTTP-WORKSPACE-ROUTES', 'owns', 'apps/api/test/entrypoints/http/dbtYamlDescriptionEditRoutes.test.ts', 93),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH', 'owns', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.ts', 90),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH', 'owns', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.test.ts', 91)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
  'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
  'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'responsibility', 'Version the strict description transaction language shared by API and browser.', 0),
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'reason_to_change', 'Request, proposal, receipt, analysis, or compatibility vocabulary changes.', 0),
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'public_api', 'DbtYamlDescriptionEditProposalSchema;DbtYamlDescriptionAppliedReceiptSchema;DbtYamlDescriptionRevertedReceiptSchema', 0),
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'invariant', 'Every write is content-addressed and every revert is conditional on the applied receipt.', 0),
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'transition', 'description intent -> proposal -> applied receipt -> optional reverted receipt', 0),
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'consumer', 'API DBT description transaction and web DBT description service.', 0),
  ('SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT', 'fowler_signal', 'published_language', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'responsibility', 'Coordinate authoritative proposal, conditional mutation, re-analysis, receipt, and revert.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'reason_to_change', 'Description transaction sequencing, concurrency, idempotency, or re-analysis policy changes.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'public_api', 'DbtYamlDescriptionEditTransaction.propose;DbtYamlDescriptionEditTransaction.apply;DbtYamlDescriptionEditTransaction.revert', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'invariant', 'The transaction resolves current file authority before every operation and never mutates a stale revision.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'transition', 'authoritative projection -> proposal or conditional apply/revert -> authoritative re-analysis receipt', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'consumer', 'Protected workspace DBT description HTTP routes.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'fowler_signal', 'service_layer with optimistic concurrency', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'responsibility', 'Patch one located DBT YAML description token without serializing unrelated YAML.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'reason_to_change', 'DBT YAML resource location, scalar formatting, or CST preservation behavior changes.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'public_api', 'YamlCstDbtDescriptionMutator.mutate', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'invariant', 'All bytes outside the targeted description insertion, replacement, or removal range remain unchanged.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'transition', 'YAML bytes plus resource identity and description intent -> patched YAML bytes plus previous description', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'consumer', 'DbtYamlDescriptionEditTransaction.', 0),
  ('SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'fowler_signal', 'data_mapper over concrete YAML syntax', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'responsibility', 'Adapt the three governed description rails to the browser port.', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'reason_to_change', 'HTTP route, request encoding, response validation, or API error mapping changes.', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'public_api', 'IDbtYamlDescriptionEditPort;createDbtYamlDescriptionEditApi', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'invariant', 'Malformed or rejected HTTP responses never become successful transaction receipts.', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'transition', 'browser command/query DTO -> protected HTTP rail -> validated contract receipt', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'consumer', 'DbtYamlDescriptionEditor controller through AppServicesContext.', 0),
  ('SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT', 'fowler_signal', 'gateway adapter', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'responsibility', 'Coordinate one selected DBT resource description transaction.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'reason_to_change', 'Editor state transitions, selected-node eligibility, or transaction command orchestration changes.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'invariant', 'The passive description row and generic inspector Code section are superseded when authoritative DBT edit and file workbench contributions exist.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'public_api', 'DbtYamlDescriptionEditor;buildDbtYamlDescriptionWorkbenchContributions', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'transition', 'editing -> proposing -> reviewing -> applying -> applied -> optional reverting or conflict reload', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'consumer', 'Canvas Node Workbench for selected file-backed DBT resources.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'fowler_signal', 'presentation_model with explicit transaction state', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'responsibility', 'Render supplied localized DBT description transaction state.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'reason_to_change', 'Description editor visual hierarchy, accessibility, localized copy, or visual-token changes.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'invariant', 'No API, store, file mutation, or business-state derivation occurs in the view.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'public_api', 'DbtYamlDescriptionEditorView', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'transition', 'supplied editor state -> deterministic accessible controls and evidence', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'consumer', 'DbtYamlDescriptionEditor controller.', 0),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'fowler_signal', 'passive view', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'responsibility', 'Host canonical CodeView in the contextual Canvas workbench.', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'reason_to_change', 'Contextual workbench loading or canonical CodeView composition changes.', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'invariant', 'No parallel editor state, save command, or project-file transport is introduced.', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'public_api', 'SqlContextWorkbench', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'transition', 'governed file scope -> lazy canonical CodeView workbench', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'consumer', 'Canvas shell contextual workbench.', 0),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'fowler_signal', 'composite view reusing canonical editor', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'responsibility', 'Resolve exact selected-file and project code targets.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'reason_to_change', 'DBT selected-node or project file-target resolution changes.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'invariant', 'Missing selected-node file authority fails closed instead of opening passive inspector code or project scope.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'public_api', 'buildDbtProjectFileCodeWorkbench;SqlContextWorkbenchTarget', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'transition', 'selected DBT node path or project root -> CanvasShellContextualWorkbench', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'consumer', 'DbtProjectFileCanvasView and DBT node floating-toolbar Code action.', 0),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'fowler_signal', 'anti_corruption adapter', 0);

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, source_path,
  source_content_sha256, raw_component
)
values
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'DBT YAML description editor controller', 'query-view', 'partial', 'create', 'Frontend / Canvas DBT authoring', 'Coordinate one selected-resource description transaction and contribute it to Node Workbench.', '@dvt/web', '/canvas', null, jsonb_build_array('strict live browser proof pending'), '[]'::jsonb, 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('frontend:dbt-yaml-editor:736'), jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'presentationOwner', false)),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'DBT YAML description editor view', 'context-panel', 'current', 'create', 'Frontend / Canvas presentation', 'Render localized draft, review, receipt, conflict, and revert state.', '@dvt/web', '/canvas', null, '[]'::jsonb, '[]'::jsonb, 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('frontend:dbt-yaml-editor-view:736'), jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'presentationOwner', true)),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'Canvas SQL contextual workbench', 'route-workbench', 'current', 'reuse', 'Frontend / Canvas presentation', 'Render canonical CodeView beside the graph for a supplied governed file scope.', '@dvt/web', '/canvas', null, '[]'::jsonb, '[]'::jsonb, 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('frontend:sql-context-workbench:736'), jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'reuses', 'SYS-WEB-VIEWS-CODE')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'DBT project code workbench target adapter', 'query-view', 'current', 'extract', 'Frontend / Canvas DBT authoring', 'Resolve exact selected DBT file or complete project scope for the contextual Code workbench.', '@dvt/web', '/canvas', null, '[]'::jsonb, '[]'::jsonb, 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('frontend:dbt-code-target:736'), jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'presentationOwner', false))
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
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'dbt', 'current', jsonb_build_object('scopeReason', 'DBT file authority and resource identity govern the edit.'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('scope:dbt-yaml-editor:736')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'dbt', 'current', jsonb_build_object('scopeReason', 'The view presents a DBT description transaction.'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('scope:dbt-yaml-editor-view:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'dbt', 'current', jsonb_build_object('scopeReason', 'The adapter resolves DBT project-file targets.'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('scope:dbt-code-target:736'))
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
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'web.canvas.graph', '/canvas', 'selected-node-general-contribution', 41, jsonb_build_object('host', 'CanvasNodeWorkbench', 'visibleWhen', 'selected DBT node has descriptionFilePath'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('surface:dbt-yaml-editor:736')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'web.canvas.graph', '/canvas', 'selected-node-description-editor', 42, jsonb_build_object('host', 'DbtYamlDescriptionEditor'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('surface:dbt-yaml-editor-view:736')),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'web.canvas.graph', '/canvas', 'contextual-code-workbench', 43, jsonb_build_object('host', 'CanvasShellContextualWorkbench'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('surface:sql-context-workbench:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'web.canvas.graph', '/canvas', 'dbt-code-target-adapter', 44, jsonb_build_object('visible', false, 'host', 'DbtProjectFileCanvasView'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('surface:dbt-code-target:736'))
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_local_files
where component_id in (
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
  'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
);

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
select component_id, pattern, 'owned-source', null, jsonb_build_object('ownership', 'owned'),
  'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql',
  md5(component_id || ':' || pattern || ':736')
from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
  'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
)
  and pattern_kind = 'owns';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx', 'workbench-host', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('consumed:dbt-yaml-editor:workbench:736')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.ts', 'contribution-port', 'CanvasNodeWorkbenchContribution', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('consumed:dbt-yaml-editor:contribution:736')),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'apps/web/src/app/views/CodeView.tsx', 'canonical-editor', 'CodeView', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('consumed:sql-context:code-view:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'apps/web/src/app/views/canvas/useDbtProjectFileCanvasController.ts', 'target-controller', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('consumed:dbt-code-target:controller:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'apps/web/src/app/views/canvas/DbtProjectFileCanvasView.tsx', 'route-host', null, jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('consumed:dbt-code-target:view:736'));

delete from planning_query_store.frontend_component_local_cq_rails
where component_id in (
  'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
  'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
);

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'ProposeDbtYamlDescriptionEdit', 'query', 'implemented', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:web-editor:propose:736')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'ApplyDbtYamlDescriptionEdit', 'command', 'implemented', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:web-editor:apply:736')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'RevertDbtYamlDescriptionEdit', 'command', 'implemented', jsonb_build_object('ownership', 'consumed'), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:web-editor:revert:736')),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'GetWorkspaceFileContent', 'query', 'implemented', jsonb_build_object('ownership', 'consumed', 'reuse', true), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:sql-context:get:736')),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'ListWorkspaceFiles', 'query', 'implemented', jsonb_build_object('ownership', 'consumed', 'reuse', true), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:sql-context:list:736')),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'SaveWorkspaceFileContent', 'command', 'implemented', jsonb_build_object('ownership', 'consumed', 'reuse', true), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:sql-context:save:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'GetWorkspaceFileContent', 'query', 'implemented', jsonb_build_object('ownership', 'consumed', 'exactTarget', true), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:dbt-code-target:get:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'ListWorkspaceFiles', 'query', 'implemented', jsonb_build_object('ownership', 'consumed', 'projectTarget', true), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:dbt-code-target:list:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'SaveWorkspaceFileContent', 'command', 'implemented', jsonb_build_object('ownership', 'consumed', 'genericCodeViewOnly', true), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('rail:dbt-code-target:save:736'));

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'VAL-WEB-DBT-YAML-EDITOR-CONTROLLER', 'integration-test', 'current', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.test.tsx', 'ApplyDbtYamlDescriptionEdit', 'selected-node-workbench', 'State transitions, conflict handling, idempotency-key reuse, refresh failure, and conditional revert.', jsonb_build_object('fakeSuccess', false), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('validation:dbt-yaml-editor:736')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW', 'VAL-WEB-DBT-YAML-EDITOR-VIEW', 'unit-test', 'current', 'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.test.tsx', null, 'selected-node-workbench', 'Passive localized presentation of draft, diff, receipt, conflict, and revert controls.', jsonb_build_object('transportAccess', false, 'adHocCss', false), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('validation:dbt-yaml-view:736')),
  ('SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH', 'VAL-WEB-SQL-CONTEXT-WORKBENCH', 'unit-test', 'current', 'apps/web/src/app/views/canvas/SqlContextWorkbench.test.tsx', 'GetWorkspaceFileContent', 'canvas-contextual-workbench', 'Canonical CodeView receives the governed file scope and remains the only editor state owner.', jsonb_build_object('parallelEditor', false), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('validation:sql-context:736')),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'VAL-WEB-DBT-CODE-TARGET', 'unit-test', 'current', 'apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx', 'GetWorkspaceFileContent', 'canvas-node-floating-toolbar', 'Selected-node code opens the exact path; project code keeps project scope.', jsonb_build_object('missingPathFailsClosed', true), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('validation:dbt-code-target:736')),
  ('SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR', 'VAL-WEB-DBT-YAML-DESCRIPTION-LIVE', 'e2e-test', 'gap', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts', 'ApplyDbtYamlDescriptionEdit', 'live-protected-canvas', 'Real browser proposal, apply, authoritative refresh, exact node Code, project Code, preview/run, revisit, and revert.', jsonb_build_object('strictBrowserProof', true, 'draftIntercept', false, 'directDraftSeed', false), 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql', md5('validation:dbt-yaml-live-gap:736'))
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

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name,
  normalized_rail_name, rail_type, ddd_owner, rail_status, symbol_refs,
  implementation_refs, documentation_refs, governing_sources,
  allowed_implementation_surfaces, architecture_guards, completion_gate,
  source_path, source_content_sha256, raw_rail, raw_manifest, revision,
  created_by
)
select
  'local#E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1#' || rail_type || '#' || lower(rail_name) || '#implemented',
  'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1',
  'implemented',
  rail_name,
  lower(rail_name),
  rail_type,
  'DbtYamlDescriptionEditTransaction',
  'implemented',
  symbol_refs,
  implementation_refs,
  jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'),
  jsonb_build_array('AGENTS.md', 'docs/architecture/command-query-rail-governance.md', 'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md'),
  implementation_refs || jsonb_build_array('tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql'),
  jsonb_build_array('pnpm --filter @dvt/contracts test', 'pnpm --filter @dvt/api test', 'pnpm --filter @dvt/web typecheck'),
  jsonb_build_array('node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts', 'pnpm verify:prepush'),
  'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql',
  repeat(md5(rail_name || ':736'), 2),
  jsonb_build_object(
    'name', rail_name,
    'type', rail_type,
    'boundedContext', 'DBT project authoring',
    'dddObject', 'DbtYamlDescriptionEditTransaction',
    'applicationPort', case when rail_type = 'query' then 'propose' else lower(replace(rail_name, 'DbtYamlDescriptionEdit', '')) end,
    'adapterSurface', 'dbtYamlDescriptionEditRoutes;createDbtYamlDescriptionEditApi',
    'authorization', 'workspaceId and DBT project file authority are revalidated by the protected route and application transaction.',
    'negativeTests', negative_tests
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1',
    'mechanizationStatus', 'partial',
    'noHumanDecisionsRemaining', false,
    'remainingGate', 'strict live browser proof',
    'domainObjects', jsonb_build_array('DbtYamlDescriptionEditTransaction', 'DbtYamlDescriptionEditProposal', 'DbtYamlDescriptionAppliedReceipt')
  ),
  0,
  'codex'
from (
  values
    (
      'ProposeDbtYamlDescriptionEdit',
      'query',
      jsonb_build_array('apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts#propose', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#review'),
      jsonb_build_array('packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts', 'apps/api/src/application/ports/dbtYamlDescriptionEdit.ts', 'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts', 'apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts', 'apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts', 'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts'),
      jsonb_build_array('missing or ambiguous resource', 'missing file authority', 'invalid YAML', 'unrelated byte mutation')
    ),
    (
      'ApplyDbtYamlDescriptionEdit',
      'command',
      jsonb_build_array('apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts#apply', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#apply'),
      jsonb_build_array('packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts', 'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts', 'apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts', 'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts'),
      jsonb_build_array('proposal digest mismatch', 'revision conflict', 'idempotency conflict', 're-analysis failure')
    ),
    (
      'RevertDbtYamlDescriptionEdit',
      'command',
      jsonb_build_array('apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts#revert', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts#revert'),
      jsonb_build_array('packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts', 'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts', 'apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts', 'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts', 'apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts'),
      jsonb_build_array('invalid receipt', 'intervening file mutation', 'revert re-analysis failure')
    )
) as rails(rail_name, rail_type, symbol_refs, implementation_refs, negative_tests)
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

do $$
declare
  component_count integer;
  responsibility_count integer;
  owned_file_count integer;
  duplicate_owned_file_count integer;
  implemented_rail_count integer;
  live_gap_count integer;
  obsolete_field_component_count integer;
begin
  select count(*) into component_count
  from architecture.component
  where component_id in (
    'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
    'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
    'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
  );

  select count(*) into responsibility_count
  from architecture.component_responsibility
  where component_id in (
    'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
    'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
    'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
  );

  select count(*) into owned_file_count
  from planning_query_store.governance_component_local_ownership_patterns
  where component_id in (
    'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
    'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
    'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
    'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
  ) and pattern_kind = 'owns';

  select count(*) into duplicate_owned_file_count
  from (
    select pattern
    from planning_query_store.governance_component_local_ownership_patterns
    where component_id in (
      'SYS-CONTRACTS-DBT-YAML-DESCRIPTION-EDIT',
      'SYS-API-DBT-YAML-DESCRIPTION-EDIT',
      'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER',
      'SYS-WEB-SERVICES-DBT-YAML-DESCRIPTION-EDIT',
      'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR',
      'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR-VIEW',
      'SYS-WEB-CANVAS-SQL-CONTEXT-WORKBENCH',
      'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
    ) and pattern_kind = 'owns'
    group by pattern
    having count(*) > 1
  ) duplicate_files;

  select count(*) into implemented_rail_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
    and rail_status = 'implemented'
    and rail_name in ('ProposeDbtYamlDescriptionEdit', 'ApplyDbtYamlDescriptionEdit', 'RevertDbtYamlDescriptionEdit');

  select count(*) into live_gap_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-DBT-YAML-DESCRIPTION-EDITOR'
    and evidence_id = 'VAL-WEB-DBT-YAML-DESCRIPTION-LIVE'
    and evidence_status = 'gap';

  select count(*) into obsolete_field_component_count
  from architecture.component
  where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS'
    and status = 'deprecated';

  if component_count <> 8 then
    raise exception 'Phase 5.1 requires eight cohesive components, found %', component_count;
  end if;
  if responsibility_count <> 8 then
    raise exception 'Phase 5.1 requires eight single responsibilities, found %', responsibility_count;
  end if;
  if owned_file_count <> 28 then
    raise exception 'Phase 5.1 requires 28 owned implementation and test files, found %', owned_file_count;
  end if;
  if duplicate_owned_file_count <> 0 then
    raise exception 'Phase 5.1 has % files with duplicate ownership', duplicate_owned_file_count;
  end if;
  if implemented_rail_count <> 3 then
    raise exception 'Phase 5.1 requires three implemented rails, found %', implemented_rail_count;
  end if;
  if live_gap_count <> 1 then
    raise exception 'Phase 5.1 must remain review until one strict live proof gap is closed, found %', live_gap_count;
  end if;
  if obsolete_field_component_count <> 1 then
    raise exception 'The superseded Node Workbench fields split must remain deprecated';
  end if;
end $$;
