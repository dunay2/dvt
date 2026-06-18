-- Complete Outbox worker host lifecycle test ownership after the worker root
-- split. These files are active host-boundary evidence, not root-owned files.

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'owns',
    'apps/outbox-worker/test/host/**',
    20
  ),
  (
    'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'owns',
    'apps/outbox-worker/test/lifecycle/**',
    21
  ),
  (
    'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'owns',
    'apps/outbox-worker/test/plugins/**',
    22
  ),
  (
    'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'owns',
    'apps/outbox-worker/test/tsconfig.json',
    23
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-SYS-WORKERS-OUTBOX-HOST-LIFECYCLE-HOST-TESTS',
    'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/outbox-worker test -- host/runOutboxWorkerHost.test.ts lifecycle/stopRuntimeAndOperationalServer.test.ts plugins/env.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
