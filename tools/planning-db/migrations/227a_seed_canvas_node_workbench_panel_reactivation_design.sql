-- Seed the external Canvas node workbench panel reactivation design only as a
-- superseded audit anchor. Migration 228 supersedes this design, but fresh CI
-- databases do not have the local-only reactivation migration that originally
-- created it.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  supersedes_id,
  approved_at
)
values (
  'PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REACTIVATION-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Superseded Canvas node workbench panel reactivation anchor',
  'Architecture / Planning DB / Frontend',
  'superseded',
  'Compatibility anchor for the superseded CanvasNodeWorkbenchPanel reactivation design. Fresh databases need this design row before the governed retirement migration can reference it; no component ownership, files, rails, ports, or active relations are reactivated here.',
  'boundary_drift',
  'RecordArchitectureComponent;ValidateComponentIntegrity',
  null,
  null
)
on conflict (design_id) do nothing;
