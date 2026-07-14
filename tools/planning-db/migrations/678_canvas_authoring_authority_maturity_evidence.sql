-- Align the implemented Canvas authority family with executable maturity
-- evidence. The policy and composition own no independent telemetry stream;
-- their typed outcomes and startup failures are observed by the command and
-- protected-runtime boundaries that call them.

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/678_canvas_authoring_authority_maturity_evidence.sql',
  source_content_sha256 = repeat(md5(component_id || ':maturity-evidence:678'), 2),
  revision = revision + 1
where component_id in (
  'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
  'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
  'SYS-API-RUNTIME-CANVAS-AUTHORITY'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'public_api', 'CanvasAuthoringAuthorityPolicy.resolve', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'invariant', 'A missing persisted binding resolves only to graph-draft authority.', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'invariant', 'A persisted binding is returned without caller-selected authority overrides.', 1),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'transition', 'unbound -> graph-draft default', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'transition', 'persisted binding -> persisted authority', 1),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'consumer', 'ProjectDbtGraphFromFiles', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'consumer', 'ImportWarehouseSources', 1),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'responsibility', 'Resolve the canonical authority for one scoped Canvas.', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'non_goal', 'Persist bindings', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'non_goal', 'Authorize HTTP requests', 1),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'reason_to_change', 'Authority default or resolution policy changes.', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'fowler_signal', 'Service Layer', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'fowler_signal', 'Separated Interface', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'public_api', 'ICanvasAuthoringAuthorityStore.read', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'public_api', 'ICanvasAuthoringAuthorityStore.bind', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'public_api', 'ICanvasAuthoringAuthorityStore.release', 2),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'invariant', 'One tenant/project/environment/Canvas key has at most one persisted file authority.', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'invariant', 'Graph-draft ownership and file-backed ownership are mutually exclusive under one shared transaction lock.', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'invariant', 'An idempotency key cannot represent two request hashes.', 2),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'transition', 'unbound -> dbt-project-files binding', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'transition', 'bound -> released', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'transition', 'graph-draft occupied -> bind rejected', 2),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'consumer', 'ImportDbtProject', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'consumer', 'ProjectDbtGraphFromFiles', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'consumer', 'ImportWarehouseSources', 2),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'consumer', 'SaveWorkspaceGraphDraft', 3),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'responsibility', 'Persist authority bindings and enforce cross-authority exclusion.', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'non_goal', 'Choose the default authority', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'non_goal', 'Translate HTTP errors', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'reason_to_change', 'Persistence, idempotency, or transaction exclusion changes.', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'fowler_signal', 'Repository', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'fowler_signal', 'Data Mapper', 1),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'public_api', 'buildCanvasAuthoringAuthorityRuntime', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'invariant', 'The runtime exposes one store instance and a policy bound to that same store.', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'invariant', 'Production composition uses the PostgreSQL authority adapter.', 1),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'transition', 'configuration -> composed authority runtime', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'consumer', 'buildProtectedRuntimeModule', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'consumer', 'buildDbtProjectImportRuntime', 1),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'responsibility', 'Compose the authority policy with its production persistence adapter.', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'non_goal', 'Implement authority policy', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'non_goal', 'Own command telemetry', 1),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'reason_to_change', 'Protected runtime dependency composition changes.', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'fowler_signal', 'Composition Root', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'governance_ref', 'docs/adr/ADR-0060-dbt-project-authoring-authority.md', 0),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'governance_ref', 'docs/adr/ADR-0060-dbt-project-authoring-authority.md', 0),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'governance_ref', 'docs/adr/ADR-0060-dbt-project-authoring-authority.md', 0),
  ('SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY', 'governance_ref', 'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md', 1),
  ('SYS-API-INFRA-CANVAS-AUTHORITY-STORE', 'governance_ref', 'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md', 1),
  ('SYS-API-RUNTIME-CANVAS-AUTHORITY', 'governance_ref', 'docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md', 1)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-DBT-IMPORT-USES-AUTHORITY-POLICY',
  'REL-DBT-IMPORT-RUNTIME-COMPOSES-AUTHORITY'
);

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
  'TEST-CANVAS-AUTHORITY-RUNTIME-COMPOSITION',
  'SYS-API-RUNTIME-CANVAS-AUTHORITY',
  'apps/api/test/app/protectedRuntimeComposition.test.ts',
  'integration',
  'flow',
  true,
  'pnpm --filter dvt-api exec vitest run test/app/protectedRuntimeComposition.test.ts'
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
values
  (
    'OBS-CANVAS-AUTHORITY-POLICY-OUTCOME',
    'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
    'The pure policy returns typed authority outcomes; command audit and HTTP boundaries own their logs and metrics.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-CANVAS-AUTHORITY-STORE-OUTCOME',
    'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
    'The adapter returns typed conflict and idempotency outcomes; owning commands record them and PostgreSQL failures fail the request.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-CANVAS-AUTHORITY-RUNTIME-COMPOSITION',
    'SYS-API-RUNTIME-CANVAS-AUTHORITY',
    'The composition has no independent runtime decision; protected-runtime startup and command boundaries own readiness and outcome signals.',
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

with target as (
  select
    rail_id,
    (
      select jsonb_agg(to_jsonb(value) order by value)
      from (
        select value
        from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb))
        union
        select unnest(array[
          'apps/api/test/app/protectedRuntimeComposition.test.ts',
          'tools/planning-db/migrations/678_canvas_authoring_authority_maturity_evidence.sql'
        ]::text[])
      ) surfaces
    ) as surfaces
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.raw_manifest ->> 'featureId' = 'E-DBT-PROJECT-ROUNDTRIP-1'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = target.surfaces,
  allowed_implementation_surfaces = target.surfaces,
  raw_manifest = jsonb_set(
    rail.raw_manifest,
    '{allowedImplementationSurfaces}',
    target.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from target
where rail.rail_id = target.rail_id;
