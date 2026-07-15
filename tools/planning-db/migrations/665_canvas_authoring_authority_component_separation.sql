-- Separate Canvas authority policy, persistence, and runtime composition before
-- implementing them. The application policy owns default resolution and the
-- outbound port; PostgreSQL owns only persistence mechanics.

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
    'tools/planning-db/migrations/665_canvas_authoring_authority_component_separation.sql',
    repeat(md5('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY:665'), 2),
    0, 'Canvas authoring authority policy', 'component',
    'SYS-API-APPLICATION-SERVICES', 'SYS-DVT', 'SYS-API-ROOT', 'review', false,
    'Resolve one persisted Canvas authority or the canonical graph-draft default through an outbound persistence port.',
    'CanvasAuthoringAuthorityPolicy',
    'ImportDbtProject;ProjectDbtGraphFromFiles;ImportWarehouseSources',
    'codex'
  ),
  (
    'SYS-API-RUNTIME-CANVAS-AUTHORITY',
    'tools/planning-db/migrations/665_canvas_authoring_authority_component_separation.sql',
    repeat(md5('SYS-API-RUNTIME-CANVAS-AUTHORITY:665'), 2),
    0, 'Canvas authoring authority runtime composition', 'component',
    'SYS-API-RUNTIME-COMPOSITION', 'SYS-DVT', 'SYS-API-ROOT', 'review', false,
    'Bind the Canvas authority application policy to its production PostgreSQL adapter in protected runtime.',
    'CanvasAuthoringAuthorityRuntime',
    'ImportDbtProject;ProjectDbtGraphFromFiles;ImportWarehouseSources',
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

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id in (
  'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
  'SYS-API-RUNTIME-CANVAS-AUTHORITY'
);

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'owns', 'apps/api/src/application/ports/canvasAuthoringAuthority.ts', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'owns', 'apps/api/src/application/services/canvasAuthoringAuthorityPolicy.ts', 1),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'owns', 'apps/api/test/application/canvasAuthoringAuthorityPolicy.test.ts', 2),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'owns', 'apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'owns', 'apps/api/test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts', 1),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'owns', 'apps/api/src/modules/canvasAuthoringAuthority/buildCanvasAuthoringAuthorityRuntime.ts', 0)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  (
    'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
    'Canvas authoring authority policy', 'service', 'application', 'Canvas Authoring',
    'apps/api/src/application/services/canvasAuthoringAuthorityPolicy.ts',
    'CanvasAuthoringAuthorityPolicy', 'node', 'critical', 'proposed',
    'SYS-API-APPLICATION-SERVICES'
  ),
  (
    'SYS-API-RUNTIME-CANVAS-AUTHORITY',
    'Canvas authoring authority runtime composition', 'module', 'infra',
    'Canvas Authoring',
    'apps/api/src/modules/canvasAuthoringAuthority/buildCanvasAuthoringAuthorityRuntime.ts',
    'buildCanvasAuthoringAuthorityRuntime', 'node', 'critical', 'proposed',
    'SYS-API-RUNTIME-COMPOSITION'
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
    'RESP-CANVAS-AUTHORITY-POLICY',
    'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
    'Resolve exactly one persisted Canvas authority or the graph-draft default.',
    'Canvas authority default or transition policy changes.',
    'CanvasAuthoringAuthorityPolicy', 'proposed'
  ),
  (
    'RESP-CANVAS-AUTHORITY-RUNTIME',
    'SYS-API-RUNTIME-CANVAS-AUTHORITY',
    'Compose the authority policy and production persistence adapter.',
    'Protected runtime composition changes.',
    'CanvasAuthoringAuthorityRuntime', 'proposed'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-CANVAS-AUTHORITY-POLICY-USES-STORE',
    'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
    'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
    'calls', 'outbound', 'async',
    'Authority policy bypasses persisted state or invents transport state.',
    'tenant/project/environment/canvas',
    jsonb_build_array('apps/api/src/application/ports/canvasAuthoringAuthority.ts'),
    'proposed'
  ),
  (
    'REL-CANVAS-AUTHORITY-RUNTIME-COMPOSES-POLICY',
    'SYS-API-RUNTIME-CANVAS-AUTHORITY',
    'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
    'depends_on', 'outbound', 'sync',
    'Protected runtime exposes an unbound authority policy.',
    'not_applicable',
    jsonb_build_array('apps/api/src/modules/canvasAuthoringAuthority/buildCanvasAuthoringAuthorityRuntime.ts'),
    'proposed'
  ),
  (
    'REL-CANVAS-AUTHORITY-RUNTIME-COMPOSES-STORE',
    'SYS-API-RUNTIME-CANVAS-AUTHORITY',
    'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
    'depends_on', 'outbound', 'sync',
    'Protected runtime does not migrate or close authority persistence.',
    'not_applicable',
    jsonb_build_array('apps/api/src/modules/canvasAuthoringAuthority/buildCanvasAuthoringAuthorityRuntime.ts'),
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
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-CANVAS-AUTHORITY-POLICY',
  'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
  'apps/api/test/application/canvasAuthoringAuthorityPolicy.test.ts',
  'unit', 'negative', true,
  'pnpm --filter dvt-api exec vitest run test/application/canvasAuthoringAuthorityPolicy.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
