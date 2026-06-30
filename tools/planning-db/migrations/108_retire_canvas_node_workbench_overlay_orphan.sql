-- Retire the DB-local CanvasNodeWorkbench overlay split created against a
-- non-existent file, and fold its relation back to the canonical Node workbench
-- component. The source code owns this presentation through CanvasShellMainPanel,
-- InspectorPanel, and the NodeWorkbench read model; there is no
-- CanvasNodeWorkbenchOverlay.tsx implementation to own as a component.

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'web.component.canvas.NodeWorkbench',
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'docs/architecture/components/web/frontend-component-inventory.md',
  source_content_sha256 = '2692a51d366ce20ea8cfc08ad03b390003d806e4b05c4922f05e035a532b82d9',
  implementation_refs = jsonb_build_array(
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts#buildNodePropertiesReadModel',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx#NodePropertiesTabs',
    'apps/web/src/app/components/InspectorPanel.tsx#InspectorPanel'
  ),
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md#NodeWorkbench',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md#ResolveCanvasContextMenu'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/architecture/components/web/frontend-component-inventory.md'
  ),
  allowed_implementation_surfaces = jsonb_build_array(
    'apps/web/src/app/components/InspectorPanel.tsx',
    'apps/web/src/app/components/inspector/nodePropertiesReadModel.ts',
    'apps/web/src/app/components/inspector/NodePropertiesTabs.tsx'
  ),
  architecture_guards = jsonb_build_array(
    'planning:db:integrity:check must report zero source_drift rows',
    'planning:db:integrity:check must report zero exact_duplicate rail_vocabulary errors'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:integrity:check',
    'pnpm verify:prepush'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"retired"'::jsonb,
        true
      ),
      '{dddOwner}',
      '"web.component.canvas.NodeWorkbench"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Retired orphan CanvasNodeWorkbenchOverlay rail: CanvasNodeWorkbenchOverlay.tsx does not exist, and InspectCanvasNodeProperties is canonically owned by NodeWorkbench.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_manifest, '{}'::jsonb),
        '{mechanizationStatus}',
        '"closed"'::jsonb,
        true
      ),
      '{implementationPlan}',
      '"docs/architecture/components/web/frontend-component-inventory.md"'::jsonb,
      true
    ),
    '{duplicateRetirementReason}',
    to_jsonb(
      'Retired because it duplicated InspectCanvasNodeProperties and pointed to a non-existent CanvasNodeWorkbenchOverlay.tsx source.'::text
    ),
    true
  ),
  revision = greatest(revision, 2) + 1,
  updated_at = now()
where feature_id = 'CANVAS-NODE-WORKBENCH-PRESENTATION-BOUNDARY-20260617'
  and normalized_rail_name = 'inspectcanvasnodeproperties'
  and rail_type = 'query';

update planning_query_store.feature_mechanization_local_rails
set
  ddd_owner = 'web.component.canvas.CanvasContextMenu',
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
  source_content_sha256 = '975dfb4aee882596b94891f6b4ebf622c3a59d3c087f9cc95badba74fcde9edb',
  documentation_refs = jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md#ResolveCanvasContextMenu',
    'docs/architecture/components/web/frontend-command-query-rail-inventory.md#ResolveCanvasContextMenu'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"retired"'::jsonb,
        true
      ),
      '{dddOwner}',
      '"web.component.canvas.CanvasContextMenu"'::jsonb,
      true
    ),
    '{retirementReason}',
    to_jsonb(
      'Retired duplicate of canonical ResolveCanvasContextMenu owned by the Canvas workbench command/query catalog.'::text
    ),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{mechanizationStatus}',
      '"closed"'::jsonb,
      true
    ),
    '{duplicateRetirementReason}',
    to_jsonb(
      'Retired because ResolveCanvasContextMenu already has one canonical active declaration.'::text
    ),
    true
  ),
  revision = greatest(revision, 2) + 1,
  updated_at = now()
where feature_id = 'CANVAS-CONTEXT-MENU-STABLE-RIGHT-CLICK-20260617'
  and normalized_rail_name = 'resolvecanvascontextmenu'
  and rail_type = 'query';

update architecture.component
set
  status = 'deprecated',
  public_contract = 'Deprecated false split: CanvasNodeWorkbenchOverlay.tsx does not exist. Presentation ownership remains with SYS-WEB-CANVAS-SHELL-MAIN-PANEL and SYS-WEB-CANVAS-NODE-WORKBENCH.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY';

update architecture.component_relation
set
  relation_id = 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-DEPENDS-ON-NODE-WORKBENCH',
  target_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH',
  status = 'implemented',
  source_refs = jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx',
    'apps/web/src/app/components/InspectorPanel.tsx'
  ),
  updated_at = now()
where relation_id = 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-DEPENDS-ON-NODE-WORKBENCH-OVERLAY'
  and not exists (
    select 1
    from architecture.component_relation existing_relation
    where existing_relation.relation_id = 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-DEPENDS-ON-NODE-WORKBENCH'
  );

update architecture.design_scope
set subject_id = 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-DEPENDS-ON-NODE-WORKBENCH'
where subject_kind = 'relation'
  and subject_id = 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-DEPENDS-ON-NODE-WORKBENCH-OVERLAY'
  and not exists (
    select 1
    from architecture.design_scope existing_scope
    where existing_scope.design_id = architecture.design_scope.design_id
      and existing_scope.subject_kind = architecture.design_scope.subject_kind
      and existing_scope.subject_id = 'REL-WEB-CANVAS-SHELL-MAIN-PANEL-DEPENDS-ON-NODE-WORKBENCH'
      and existing_scope.scope_kind = architecture.design_scope.scope_kind
  );

update architecture.design
set
  status = 'superseded',
  rationale = concat(
    rationale,
    E'\n\nSuperseded by migration 108: the overlay component was a false split with no source file; presentation ownership remains with the canonical Node workbench and shell main panel components.'
  ),
  updated_at = now()
where design_id in (
  'CANVAS-NODE-WORKBENCH-PRESENTATION-BOUNDARY-20260617-V2',
  'CANVAS-NODE-WORKBENCH-PRESENTATION-BOUNDARY-20260617-V3'
)
  and status <> 'superseded';
