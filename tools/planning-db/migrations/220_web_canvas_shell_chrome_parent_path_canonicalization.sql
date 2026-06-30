-- Canonicalize aggregate repo_path anchors after splitting shell chrome leaves.
-- The new leaves own concrete files; parent/aggregate components must point at
-- unique canonical architecture documents to avoid duplicate_repo_path drift.

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
  'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web Canvas shell chrome parent path canonicalization',
  'Architecture / Planning DB / Web Canvas',
  'implemented',
  'Migration 219 moved concrete CanvasCenterSurface.tsx and CanvasShell.tsx ownership to shell chrome leaves. Existing aggregate architecture rows for SYS-WEB-CANVAS-GRAPH-SURFACE and SYS-WEB-CANVAS-SHELL-MAIN-PANEL still used those concrete files as repo_path anchors, producing duplicate_repo_path findings. Aggregates now point at unique canonical architecture documents while leaves own concrete files.',
  'boundary_drift',
  'ValidateComponentIntegrity;ReadComponentProfile;ReadCanvasShellCenterSurface;ComposeCanvasShellChrome',
  now()
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
    'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619',
    'component',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619',
    'component',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619',
    'component',
    'SYS-WEB-CANVAS-SHELL-CENTER-SURFACE',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619',
    'component',
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619',
    'path',
    'docs/architecture/components/web/graph/canvas-fowler-canon-component.md',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619',
    'path',
    'docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'docs/architecture/components/web/graph/canvas-fowler-canon-component.md',
  public_contract = 'Aggregate Canvas graph surface boundary; concrete center surface and viewport files are owned by graph/shell child components.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-GRAPH-SURFACE';

update architecture.component
set
  repo_path = 'docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md',
  public_contract = 'Aggregate Canvas shell main panel boundary; concrete shell files are owned by shell chrome and shell child components.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-SHELL-MAIN-PANEL';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'invariant',
    'Aggregate repo_path is the Canvas Fowler canon document; concrete CanvasCenterSurface.tsx is owned by SYS-WEB-CANVAS-SHELL-CENTER-SURFACE to avoid duplicate_repo_path drift.',
    0
  ),
  (
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-fowler-canon-component.md',
    0
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'invariant',
    'Aggregate repo_path is the Canvas component modernization map; concrete CanvasShell.tsx is owned by SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS to avoid duplicate_repo_path drift.',
    0
  ),
  (
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'governance_ref',
    'docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
