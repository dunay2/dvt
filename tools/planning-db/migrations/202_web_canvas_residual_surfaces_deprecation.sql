-- Deprecate the zero-file Web Canvas residual surfaces component. The live
-- Canvas controller and route files now resolve to concrete child components.

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
  'PLANNING-DB-WEB-CANVAS-RESIDUAL-SURFACES-DEPRECATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas residual surfaces component deprecation',
  'Architecture / Planning DB / Frontend',
  'review',
  'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES owns no files, has no children, exposes no ports, and has no contract evidence after the Web Canvas leaf splits. Keeping it active duplicates the Canvas directory repo_path and weakens component-profile answers. The component is deprecated as a historical residual bucket; live files remain mapped to concrete Canvas child components.',
  'boundary_drift',
  'ValidateComponentIntegrity;ReadComponentProfile',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
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
    'PLANNING-DB-WEB-CANVAS-RESIDUAL-SURFACES-DEPRECATION-20260619',
    'component',
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-RESIDUAL-SURFACES-DEPRECATION-20260619',
    'relation',
    'REL-WEB-CANVAS-VIEW-CONTAINS-RESIDUAL-SURFACES',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-RESIDUAL-SURFACES-DEPRECATION-20260619',
    'component',
    'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-RESIDUAL-SURFACES-DEPRECATION-20260619',
    'path',
    'tools/planning-db/migrations/202_web_canvas_residual_surfaces_deprecation.sql',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'tools/planning-db/migrations/202_web_canvas_residual_surfaces_deprecation.sql',
  public_contract = 'Deprecated zero-file Canvas residual route bucket retained only as historical Planning DB deprecation evidence.',
  criticality = 'low',
  status = 'deprecated',
  maturity_score = 0,
  updated_at = now()
where component_id = 'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/202_web_canvas_residual_surfaces_deprecation.sql',
  source_content_sha256 = md5('SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES:202') || md5('deprecated-zero-file-residual:202'),
  status = 'superseded',
  children_required = false,
  owned_concern = 'Deprecated zero-file Canvas residual route bucket. Live files are owned by concrete Canvas child components.',
  ddd_owner = 'DeprecatedCanvasResidualSurfaces',
  cq_rails = 'ReadComponentProfile;ValidateComponentIntegrity'
where component_id = 'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'transition',
    'review -> superseded because component-quality shows zero files, zero children, zero ports, and zero contracts after Canvas leaf component splits.',
    0
  ),
  (
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'non_goal',
    'Do not recreate residual placeholder files; live Canvas files must map to concrete child components.',
    0
  ),
  (
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'fowler_signal',
    'boundary_drift',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component_relation
set
  failure_mode = 'Historical relation retained for traceability; target component is deprecated because live Canvas residual files now resolve to concrete child components.',
  source_refs = jsonb_build_array(
    'tools/planning-db/migrations/202_web_canvas_residual_surfaces_deprecation.sql',
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES'
  ),
  status = 'implemented',
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-VIEW-CONTAINS-RESIDUAL-SURFACES';
