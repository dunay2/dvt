-- Record the accepted dbt project authority decision before behavior or rails
-- are implemented. Missing implementation remains explicit task-gap state.

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
  'DBT-PROJECT-AUTHORITY-20260711',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Mutually exclusive dbt project authoring authority',
  'Web / API / Project Workspace I/O / dbt Integration',
  'approved',
  'Graph-authored and file-backed dbt projects cannot both own semantic nodes and edges. WorkspaceGraphAuthoringDraft.v1 remains graph-draft authority; file-backed Canvas requires a separate authority binding, server projection, and route-local layout.',
  'hidden_authority',
  'none - authority decision precedes rail implementation',
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
  approved_at = excluded.approved_at,
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
    'DBT-PROJECT-AUTHORITY-20260711',
    'decision',
    'ADR-0060',
    'must_prove',
    true
  ),
  (
    'DBT-PROJECT-AUTHORITY-20260711',
    'contract',
    'WorkspaceGraphAuthoringDraft.v1',
    'may_reference',
    true
  ),
  (
    'DBT-PROJECT-AUTHORITY-20260711',
    'path',
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'must_prove',
    true
  ),
  (
    'DBT-PROJECT-AUTHORITY-20260711',
    'path',
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.decision (
  decision_id,
  decision_kind,
  title,
  status,
  source_ref,
  applies_to,
  rationale
)
values (
  'ADR-0060',
  'adr',
  'dbt project authoring authority',
  'accepted',
  'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
  jsonb_build_array(
    'SYS-WEB-VIEW-CANVAS',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-API-INFRA-WORKSPACE-FILES',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES'
  ),
  'Each Canvas has exactly one semantic authority. Graph-draft and dbt-project-files use separate aggregates or projections and never persist ignored shadow graph semantics.'
)
on conflict (decision_id) do update set
  decision_kind = excluded.decision_kind,
  title = excluded.title,
  status = excluded.status,
  source_ref = excluded.source_ref,
  applies_to = excluded.applies_to,
  rationale = excluded.rationale;
