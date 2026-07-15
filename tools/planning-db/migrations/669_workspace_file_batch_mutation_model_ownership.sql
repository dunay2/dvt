-- Keep pure request/receipt invariants outside the filesystem orchestration
-- class while retaining one cohesive batch-mutation component.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'owns', 'apps/api/src/infrastructure/workspaceFiles/localWorkspaceFileBatchMutationModel.ts', 1),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'owns', 'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts', 2)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update architecture.component_responsibility
set
  responsibility = 'Validate and normalize one scoped batch request, persist its idempotent receipt, and coordinate atomic publication through the mutation coordinator.',
  reason_to_change = 'Scoped workspace multi-file transaction or receipt semantics change.'
where responsibility_id = 'RESP-WORKSPACE-FILE-BATCH-MUTATION';
