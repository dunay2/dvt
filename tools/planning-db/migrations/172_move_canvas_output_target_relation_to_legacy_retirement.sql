-- Move the deprecated output-target relation out of live node/edge authoring.
-- The retired catalog relationship belongs to the legacy add-node palette
-- retirement evidence component.

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'component',
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION-20260618',
    'relation',
    'REL-WEB-CANVAS-LEGACY-ADD-NODE-RETIREMENT-CONTAINS-OUTPUT-TARGET-TEMPLATES',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'Canvas legacy add-node palette retirement evidence',
  'module',
  'application',
  'Frontend / Canvas',
  'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
  'Deprecated evidence boundary for removed fixed add-node palette and template catalog files.',
  'none',
  'low',
  'deprecated',
  'SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU'
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
  'RESP-SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'Keep removed Canvas fixed-palette files represented only as deprecated evidence.',
  'Only changes when retired Canvas palette or template catalog paths need explicit governance evidence.',
  'CanvasLegacyAddNodePaletteRetirement',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.component_relation
set
  relation_id = 'REL-WEB-CANVAS-LEGACY-ADD-NODE-RETIREMENT-CONTAINS-OUTPUT-TARGET-TEMPLATES',
  source_component_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  failure_mode = 'not_applicable_retired_evidence',
  authorization_scope = 'retired-canvas-palette-evidence',
  source_refs = (
    select jsonb_agg(distinct ref.value order by ref.value)
    from jsonb_array_elements_text(
      coalesce(
        architecture.component_relation.source_refs,
        '[]'::jsonb
      ) || jsonb_build_array(
        'tools/planning-db/migrations/172_move_canvas_output_target_relation_to_legacy_retirement.sql'
      )
    ) as ref(value)
  ),
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-NODE-EDGE-AUTHORING-CONTAINS-OUTPUT-TARGET-TEMPLATES';
