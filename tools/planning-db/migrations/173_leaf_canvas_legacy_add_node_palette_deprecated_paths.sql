-- Keep the legacy add-node palette retirement component as an aggregate only.
-- The concrete deprecated-path evidence is a leaf component so component
-- quality can distinguish the retirement container from the obsolete file set.

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
  'PLANNING-DB-CANVAS-LEGACY-ADD-NODE-PALETTE-LEAF-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB Canvas legacy add-node palette deprecated path leaf',
  'Frontend / Canvas / Planning DB',
  'review',
  'component-quality showed SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT as both a parent and direct file owner. The retired add-node palette path evidence belongs to the existing deprecated SYS-WEB-CANVAS-ADD-NODE-PALETTE leaf component.',
  'boundary_drift',
  'RetireCanvasFixedAddNodePalette;ReadComponentProfile;CheckPlanningDbComponentIntegrity;ValidateComponentFilesystemCoverage',
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
    'PLANNING-DB-CANVAS-LEGACY-ADD-NODE-PALETTE-LEAF-20260618',
    'component',
    'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CANVAS-LEGACY-ADD-NODE-PALETTE-LEAF-20260618',
    'component',
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-CANVAS-LEGACY-ADD-NODE-PALETTE-LEAF-20260618',
    'relation',
    'REL-WEB-CANVAS-LEGACY-ADD-NODE-RETIREMENT-CONTAINS-ADD-NODE-PALETTE',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-CANVAS-LEGACY-ADD-NODE-PALETTE-LEAF-20260618',
    'path',
    'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  children_required = true,
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT'
  and pattern_kind = 'owns'
  and pattern = 'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql';

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
  'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'tools/planning-db/migrations/173_leaf_canvas_legacy_add_node_palette_deprecated_paths.sql',
  md5('SYS-WEB-CANVAS-ADD-NODE-PALETTE:173')
    || md5('Canvas legacy add-node palette deprecated paths:173'),
  0,
  'Canvas legacy add-node palette deprecated paths',
  'component',
  'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'SYS-DVT',
  'SYS-DVT',
  'legacy',
  false,
  'Owns deprecated evidence for removed Canvas fixed add-node palette paths; active node creation remains with Canvas context-menu and authoring-node rails.',
  'CanvasLegacyAddNodePaletteDeprecatedPaths',
  'RetireCanvasFixedAddNodePalette;ReadComponentProfile;CheckPlanningDbComponentIntegrity;DetectGovernedSourceDrift',
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
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'owns',
  'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
  0
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'responsibility',
    'Represent the removed fixed add-node palette and template catalog paths as deprecated evidence.',
    0
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'reason_to_change',
    'Only changes when retired Canvas palette path evidence or its deprecation policy changes.',
    0
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'invariant',
    'Retired fixed add-node palette paths must not be recreated as active Canvas UI files.',
    0
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'transition',
    'legacy retirement aggregate direct file -> deprecated path leaf after component-quality found file_without_leaf_component.',
    0
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'non_goal',
    'Do not recreate apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx.',
    0
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'non_goal',
    'Do not recreate apps/web/src/app/views/canvas/CanvasAddNodePalette.test.tsx.',
    1
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'non_goal',
    'Do not recreate apps/web/src/app/views/canvas/canvasTransformationTemplateCatalog.ts.',
    2
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'consumer',
    'Planning DB component-quality, component-profile, and source-drift query rails.',
    0
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'governance_ref',
    'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
    0
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md',
    1
  ),
  (
    'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
    'fowler_signal',
    'duplicate_semantics',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  name = 'Canvas legacy add-node palette deprecated paths',
  repo_path = 'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
  public_contract = 'Deprecated path evidence for the removed fixed add-node palette. Active node creation is owned by Canvas context-menu and authoring-node rails.',
  status = 'deprecated',
  parent_component_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-ADD-NODE-PALETTE';

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'Keep retired fixed add-node palette paths visible only as deprecated evidence.',
  'Only changes when the Canvas fixed-palette deprecation evidence changes.',
  'CanvasLegacyAddNodePaletteDeprecatedPaths',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
values (
  'REL-WEB-CANVAS-LEGACY-ADD-NODE-RETIREMENT-CONTAINS-ADD-NODE-PALETTE',
  'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT',
  'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'contains',
  'outbound',
  'sync',
  'not_applicable_retired_evidence',
  'retired-canvas-palette-evidence',
  jsonb_build_array(
    'tools/planning-db/migrations/149_web_canvas_legacy_palette_deprecated_paths.sql',
    'tools/planning-db/migrations/173_leaf_canvas_legacy_add_node_palette_deprecated_paths.sql'
  ),
  'implemented'
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

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values (
  'OBS-SYS-WEB-CANVAS-ADD-NODE-PALETTE-COMPONENT-TELEMETRY',
  'SYS-WEB-CANVAS-ADD-NODE-PALETTE',
  'Deprecated path evidence component; no runtime telemetry is required after fixed palette retirement.',
  'dashboard',
  false,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
