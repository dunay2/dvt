-- Replace the monolithic DBT YAML description transaction with one inbound
-- port per CQ rail, a shared authority resolver, and a server-owned immutable
-- receipt store. Harden Code reconciliation and Node Workbench interaction as
-- separate browser responsibilities. This is a design migration: components
-- remain in review until implementation evidence closes them.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717',
  'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1',
  'DBT YAML description integrity and CQ decomposition',
  'DBT project authoring',
  'approved',
  'Current state couples one query and two commands to a concrete transaction, trusts a caller-supplied revert receipt, loses package authority, and reports file persistence as synchronized before DBT reconciliation is valid. Target state routes HTTP through one inbound port per CQ rail; a shared resolver admits only root-project resources whose read model advertises yaml_description; apply and revert use server-owned immutable receipts; CST mutation validates its candidate; Code synchronization distinguishes persistence from analysis; and Node Workbench movement is bounded and keyboard operable.',
  'responsibility_overload',
  'ProposeDbtYamlDescriptionEdit;ApplyDbtYamlDescriptionEdit;RevertDbtYamlDescriptionEdit;ProjectDbtGraphFromFiles;SaveWorkspaceFileContent',
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
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-EDIT', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-API-DBT-YAML-DESCRIPTION-CST-ADAPTER', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-WEB-CODE-WORKING-TREE-SYNC', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'may_create', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'component', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'query', 'ProposeDbtYamlDescriptionEdit', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'flow', 'ApplyDbtYamlDescriptionEdit', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'flow', 'RevertDbtYamlDescriptionEdit', 'may_update', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'test', 'TEST-API-DBT-YAML-DESCRIPTION-SECURITY', 'must_prove', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'test', 'TEST-WEB-DBT-CODE-RECONCILIATION', 'must_prove', true),
  ('DBT-YAML-DESCRIPTION-HARD-FOWLER-20260717', 'test', 'TEST-WEB-NODE-WORKBENCH-ACCESSIBILITY', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set status = 'deprecated', updated_at = now()
where component_id = 'SYS-API-DBT-YAML-DESCRIPTION-EDIT';

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  ('SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'DBT YAML description resource resolver', 'service', 'application', 'API / DBT project authoring', 'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.ts', 'IDbtYamlDescriptionResourceResolver', 'node', 'high', 'review', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'Propose DBT YAML description edit query', 'service', 'application', 'API / DBT project authoring', 'apps/api/src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.ts', 'IProposeDbtYamlDescriptionEditQuery', 'node', 'high', 'review', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'Apply DBT YAML description edit command', 'service', 'application', 'API / DBT project authoring', 'apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts', 'IApplyDbtYamlDescriptionEditCommand', 'node', 'high', 'review', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'Revert DBT YAML description edit command', 'service', 'application', 'API / DBT project authoring', 'apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts', 'IRevertDbtYamlDescriptionEditCommand', 'node', 'high', 'review', 'SYS-API-APPLICATION-SERVICES'),
  ('SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'DBT YAML description receipt store', 'adapter', 'adapter', 'API / DBT project authoring', 'apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts', 'IDbtYamlDescriptionReceiptStore', 'node', 'high', 'review', 'SYS-API-INFRASTRUCTURE'),
  ('SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'Canvas Node Workbench position controller', 'module', 'application', 'Frontend / Canvas workbench', 'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts', 'CanvasNodeWorkbenchPositionModel', 'browser', 'medium', 'review', 'SYS-WEB-CANVAS-NODE-WORKBENCH')
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
  ('RESP-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'Resolve one editable root-project DBT YAML resource from file authority and the canonical projection.', 'Root-package identity, visual editability, or project-contained path policy changes.', 'DbtYamlDescriptionResource', 'approved'),
  ('RESP-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'Build one content-addressed and byte-focused description proposal without mutating workspace state.', 'Description proposal, digest, or focused-diff policy changes.', 'ProposeDbtYamlDescriptionEdit', 'approved'),
  ('RESP-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'Apply one validated proposal conditionally, reconcile the exact written revision, and persist one immutable receipt.', 'Apply concurrency, idempotency, reconciliation, or receipt policy changes.', 'ApplyDbtYamlDescriptionEdit', 'approved'),
  ('RESP-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'Resolve a trusted applied receipt server-side and conditionally restore its previous description.', 'Revert authorization, receipt lookup, or conditional restoration policy changes.', 'RevertDbtYamlDescriptionEdit', 'approved'),
  ('RESP-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'Persist and retrieve immutable scoped command receipts outside project-authoritative files.', 'Receipt persistence, parsing, immutability, or scoped storage policy changes.', 'DbtYamlDescriptionReceipt', 'approved'),
  ('RESP-WEB-NODE-WORKBENCH-POSITION', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'Calculate bounded pointer and keyboard movement for the contextual Node Workbench.', 'Workbench movement bounds, keyboard step, or viewport resize policy changes.', 'CanvasNodeWorkbenchPosition', 'approved')
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction,
  input_contract_id, output_contract_id, negative_tests, status
)
values
  ('PORT-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'ResolveEditableDbtYamlDescriptionResource', 'query', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['dependency package resource', 'read model does not advertise yaml_description', 'package-owned path escapes project root'], 'approved'),
  ('PORT-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'ProposeDbtYamlDescriptionEdit', 'query', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['multiline candidate is invalid YAML', 'flow-style structural mutation', 'unrelated bytes change'], 'approved'),
  ('PORT-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'ApplyDbtYamlDescriptionEdit', 'command', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['proposal digest mismatch', 'revision changes during analysis', 'idempotent replay returns different receipt'], 'approved'),
  ('PORT-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'RevertDbtYamlDescriptionEdit', 'command', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['caller fabricates receipt body', 'receipt belongs to another scope', 'intervening file mutation'], 'approved'),
  ('PORT-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'IDbtYamlDescriptionReceiptStore', 'storage', 'inbound', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', array['malformed stored receipt', 'immutable receipt overwrite', 'cross-scope receipt lookup'], 'approved'),
  ('PORT-WEB-NODE-WORKBENCH-POSITION', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'ResolveCanvasNodeWorkbenchPosition', 'ui-action', 'inbound', null, null, array['drag beyond right or bottom bound', 'viewport resize loses close control', 'keyboard cannot move workbench'], 'approved')
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
  ('REL-API-DBT-YAML-PROPOSAL-USES-RESOLVER', 'SYS-API-DBT-YAML-DESCRIPTION-PROPOSAL-QUERY', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Proposal targets an external package or non-editable resource.', 'workspace:files:view', jsonb_build_array('IProposeDbtYamlDescriptionEditQuery'), 'approved'),
  ('REL-API-DBT-YAML-APPLY-USES-RESOLVER', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-RESOURCE-RESOLVER', 'calls', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Apply widens authority beyond the reviewed proposal.', 'workspace:files:save', jsonb_build_array('IApplyDbtYamlDescriptionEditCommand'), 'approved'),
  ('REL-API-DBT-YAML-APPLY-WRITES-RECEIPT', 'SYS-API-DBT-YAML-DESCRIPTION-APPLY-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'writes', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Apply succeeds without a trusted immutable revert authority.', 'workspace:files:save', jsonb_build_array('IDbtYamlDescriptionReceiptStore'), 'approved'),
  ('REL-API-DBT-YAML-REVERT-READS-RECEIPT', 'SYS-API-DBT-YAML-DESCRIPTION-REVERT-COMMAND', 'SYS-API-DBT-YAML-DESCRIPTION-RECEIPT-STORE', 'reads', 'outbound', 'async', 'CONTRACT-DBT-YAML-DESCRIPTION-EDIT-V1', 'Caller-supplied data becomes an alternate write rail.', 'workspace:files:save', jsonb_build_array('IDbtYamlDescriptionReceiptStore'), 'approved'),
  ('REL-WEB-NODE-WORKBENCH-USES-POSITION', 'SYS-WEB-CANVAS-NODE-WORKBENCH', 'SYS-WEB-CANVAS-NODE-WORKBENCH-POSITION', 'calls', 'outbound', 'sync', null, 'Workbench can be moved outside the recoverable viewport or is pointer-only.', 'authenticated Canvas UI', jsonb_build_array('CanvasNodeWorkbenchOverlay'), 'approved')
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

do $$
begin
  if not exists (
    select 1 from planning_query_store.command_query_rail_query
    where rail_name = 'ProposeDbtYamlDescriptionEdit' and rail_type = 'query'
  ) then
    raise exception 'Canonical ProposeDbtYamlDescriptionEdit query is missing';
  end if;
  if not exists (
    select 1 from planning_query_store.command_query_rail_query
    where rail_name = 'ApplyDbtYamlDescriptionEdit' and rail_type = 'command'
  ) then
    raise exception 'Canonical ApplyDbtYamlDescriptionEdit command is missing';
  end if;
  if not exists (
    select 1 from planning_query_store.command_query_rail_query
    where rail_name = 'RevertDbtYamlDescriptionEdit' and rail_type = 'command'
  ) then
    raise exception 'Canonical RevertDbtYamlDescriptionEdit command is missing';
  end if;
end
$$;
