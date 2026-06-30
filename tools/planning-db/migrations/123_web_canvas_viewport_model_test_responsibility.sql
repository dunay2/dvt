-- Complete architecture maturity evidence for the Web Canvas viewport model
-- test leaf created during ownership canonicalization.

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status,
  created_at
)
values (
  'RESP-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
  'SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS',
  'Validate the Canvas viewport graph-model projection contract through the canonical component test.',
  'Canvas viewport graph-model projection behavior, fixture contract, or test harness changes.',
  'CanvasGraphViewportPresentationTestContract',
  'implemented',
  now()
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;
