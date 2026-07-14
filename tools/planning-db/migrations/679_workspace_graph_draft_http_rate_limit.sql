-- Keep the existing workspace graph-draft rails fail-closed at the HTTP
-- boundary. This migration enriches the canonical command instead of
-- introducing a parallel security command.

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-HTTP-RUNTIME-ROUTE-REGISTRY',
    'invariant',
    'Protected route groups receive the runtime rate-limit policy from typed environment composition; route handlers do not invent local limits.',
    20
  ),
  (
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'invariant',
    'Workspace graph-draft read and save routes apply the protected runtime rate limit before authorization and use-case dispatch.',
    20
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  'TEST-WORKSPACE-GRAPH-DRAFT-HTTP-RATE-LIMIT',
  'SYS-API-HTTP-WORKSPACE-ROUTES',
  'apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts',
  'integration',
  'negative',
  true,
  'pnpm --filter dvt-api exec vitest run test/entrypoints/http/workspaceGraphDraftRoutes.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

do $$
declare
  updated_rail_count integer;
begin
  update planning_query_store.feature_mechanization_local_rails rail
  set
    implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb) || jsonb_build_array(
      'apps/api/src/entrypoints/http/protectedRuntimeWorkspaceGraphDraftRouteGroup.ts',
      'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts',
      'apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts',
      'apps/api/test/entrypoints/http/workspaceGraphDraftRoutes.test.ts'
    ),
    architecture_guards = coalesce(rail.architecture_guards, '[]'::jsonb) || jsonb_build_array(
      'Graph-draft HTTP requests are rate-limited before authorization is repeated.'
    ),
    completion_gate = coalesce(rail.completion_gate, '[]'::jsonb) || jsonb_build_array(
      'pnpm --filter dvt-api exec vitest run test/entrypoints/http/workspaceGraphDraftRoutes.test.ts'
    ),
    raw_rail = jsonb_set(
      jsonb_set(
        coalesce(rail.raw_rail, '{}'::jsonb),
        '{authorizationScope}',
        to_jsonb('workspace:graph-draft:save in tenant/project/environment scope; protected runtime rate limit applies before authorization'::text),
        true
      ),
      '{negativeTests}',
      coalesce(rail.raw_rail -> 'negativeTests', '[]'::jsonb) || jsonb_build_array(
        'rate limited before repeated authorization'
      ),
      true
    ),
    raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb) || jsonb_build_object(
      'httpRateLimit', 'protected_runtime_policy_before_authorization'
    ),
    source_path = 'tools/planning-db/migrations/679_workspace_graph_draft_http_rate_limit.sql',
    source_content_sha256 = repeat(md5('SaveWorkspaceGraphDraft:http-rate-limit:679'), 2),
    revision = rail.revision + 1,
    updated_at = now()
  where rail.rail_name = 'SaveWorkspaceGraphDraft'
    and rail.rail_type = 'command'
    and lower(coalesce(rail.rail_status, '')) not in ('deprecated', 'retired');

  get diagnostics updated_rail_count = row_count;
  if updated_rail_count <> 1 then
    raise exception 'Expected one active local SaveWorkspaceGraphDraft rail, updated %', updated_rail_count;
  end if;
end
$$;
