-- Canonicalize frontend inventory Markdown table helpers under the Planning DB
-- catalog component without merging the frontend read models themselves.

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
  'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Canonical Planning DB frontend inventory table helper component',
  'Architecture / Planning DB / Frontend Inventory',
  'implemented',
  'Frontend mechanical-truth and component-reflection inventories repeated Markdown table parsing and count formatting helpers while remaining separate read models. A focused helper removes the duplicate mechanics without collapsing their DDD owners.',
  'hidden_authority',
  'ListFrontendMechanicalTruthSurfaces;ListFrontendComponentReflection;DetectCodeSymbolDuplicates',
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
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'path',
    'scripts/planning-db/frontend-inventory-table.cjs',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'path',
    'scripts/planning-db/frontend-component-inventory.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'path',
    'scripts/planning-db/frontend-mechanical-truth-inventory.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'test',
    'scripts/planning-db-frontend-component-inventory.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'test',
    'scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-FRONTEND-INVENTORY-TABLE-HELPER-COMPONENT-20260619',
    'query',
    'DetectCodeSymbolDuplicates',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'scripts/planning-db/frontend-inventory-table.cjs',
  md5('SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE:252')
    || md5('planning db frontend inventory table helper:252'),
  0,
  'Planning DB frontend inventory table helper',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
  'SYS-DVT',
  'SYS-DVT',
  'canonical',
  false,
  'Owns shared Markdown table cell normalization, header lookup, row projection, and count formatting for frontend inventory read models.',
  'FrontendInventoryTableParser',
  'ListFrontendMechanicalTruthSurfaces;ListFrontendComponentReflection;DetectCodeSymbolDuplicates',
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'owns',
  'scripts/planning-db/frontend-inventory-table.cjs',
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
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'responsibility',
    'Provide one canonical Markdown table parsing and row-count utility surface for Planning DB frontend inventory read models.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'reason_to_change',
    'Frontend inventory Markdown table syntax, row normalization, or duplicate helper policy changes.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'public_api',
    'normalizeCell;markdownCells;isSeparatorRow;headerIndexes;rowValue;rawRow;countField',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'invariant',
    'Frontend inventory read models must import table mechanics from this helper instead of defining local markdownCells, headerIndexes, or countField copies.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'transition',
    'active frontend inventory table duplicate helpers -> canonical helper import covered by frontend inventory unit tests and code-symbol duplicate query.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'consumer',
    'Frontend mechanical-truth and component-reflection Planning DB inventory read models.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
    'fowler_signal',
    'duplicate_semantics',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'Planning DB frontend inventory table helper',
  'module',
  'infra',
  'FrontendInventoryTableParser',
  'scripts/planning-db/frontend-inventory-table.cjs',
  'normalizeCell;markdownCells;isSeparatorRow;headerIndexes;rowValue;rawRow;countField',
  'node',
  'medium',
  'implemented',
  84,
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS'
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
values (
  'RESP-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'Normalize frontend inventory Markdown table rows and field counts for Planning DB catalog read models.',
  'Frontend inventory Markdown table syntax, row normalization, or duplicate helper policy changes.',
  'FrontendInventoryTableParser',
  'implemented'
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
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-CONTAINS-FRONTEND-INVENTORY-TABLE',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'contains',
  'outbound',
  'sync',
  'frontend inventory read models drift into repeated Markdown table parsing if the helper is bypassed',
  'repository_governance',
  jsonb_build_array(
    'scripts/planning-db/frontend-inventory-table.cjs',
    'scripts/planning-db-frontend-component-inventory.test.cjs'
  ),
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  negative_tests,
  status
)
values (
  'PORT-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE-PARSE',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'ParsePlanningDbFrontendInventoryMarkdownTable',
  'query',
  'inbound',
  array[
    'missing required headers returns null',
    'separator rows do not become inventory records',
    'none-like list values stay empty in owning read models'
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

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'scripts/planning-db-frontend-component-inventory.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/planning-db-frontend-component-inventory.test.cjs scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs'
)
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
values (
  'OBS-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE-TEST-EVIDENCE',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE',
  'Helper behavior is observable through frontend inventory unit tests and code-symbol duplicate query output; runtime telemetry is not applicable.',
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
