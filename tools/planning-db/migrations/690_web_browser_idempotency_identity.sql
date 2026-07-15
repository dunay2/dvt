-- Model the browser idempotency identity generator before replacing duplicated
-- randomUUID-only implementations. This is a deterministic technical service,
-- not a new product command/query rail.

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
  parent_component_id
)
values (
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'Browser idempotency identity service',
  'service',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts',
  'createBrowserIdempotencyKey',
  'browser',
  'critical',
  'proposed',
  'SYS-WEB-CANVAS-GRAPH-SURFACE'
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
  status
)
values (
  'RESP-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'Create one cryptographically random browser command identity in secure and non-secure HTTP contexts.',
  'Browser Web Crypto support or the opaque command identity format changes.',
  'BrowserCommandIdentity',
  'proposed'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'tools/planning-db/migrations/690_web_browser_idempotency_identity.sql',
  repeat(md5('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY:690'), 2),
  0,
  'Browser idempotency identity service',
  'component',
  'SYS-WEB-CANVAS-GRAPH-SURFACE',
  'SYS-DVT',
  'SYS-WEB',
  'review',
  false,
  'Create opaque retry identities from browser Web Crypto without weak time or Math.random fallbacks.',
  'BrowserCommandIdentity',
  '',
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
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'owns', 'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts', 0),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'owns', 'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

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
values
  (
    'REL-WEB-DBT-IMPORT-USES-BROWSER-IDEMPOTENCY',
    'SYS-WEB-CANVAS-DBT-PROJECT-IMPORT-CONTROLLER',
    'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
    'depends_on',
    'outbound',
    'sync',
    'An import command is sent without a cryptographically random retry identity.',
    'browser session',
    jsonb_build_array('apps/web/src/app/components/dbtProjectImport/useDbtProjectImportController.ts'),
    'proposed'
  ),
  (
    'REL-WEB-SOURCE-IMPORT-USES-BROWSER-IDEMPOTENCY',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
    'depends_on',
    'outbound',
    'sync',
    'Equivalent Source Import retries cannot retain a strong command identity.',
    'browser session',
    jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCommandModel.ts'),
    'proposed'
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
  'TEST-WEB-BROWSER-IDEMPOTENCY-IDENTITY',
  'SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY',
  'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.test.ts',
  'unit',
  'negative',
  true,
  'pnpm --filter @dvt/web exec vitest run src/app/services/idempotency/createBrowserIdempotencyKey.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'invariant', 'Use crypto.randomUUID when available and Web Crypto random bytes otherwise.', 0),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'invariant', 'Fail closed when browser cryptographic entropy is unavailable.', 1),
  ('SYS-WEB-CANVAS-BROWSER-IDEMPOTENCY-IDENTITY', 'non_goal', 'Own retry policy, command signatures, or any product command/query rail.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
