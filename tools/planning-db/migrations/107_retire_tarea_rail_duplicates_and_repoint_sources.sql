-- Repoint historical local rail source refs away from removed prompts and
-- retire local slice declarations that duplicate canonical command/query rails.

with source_repoints(source_path, target_path, target_sha256) as (
  values
    (
      'buzon/TAREA.TXT',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md',
      '154ff0acdea4ae3f9d998586b719e38c784ddd20d97867b5a8c2842f3373e760'
    ),
    (
      'agent-prompt:21-component-architecture-fitness-dbfirst',
      'docs/planning/proposals/mandatory/governance-and-docs/db-first-architecture-authority-plan-20260515.md',
      '0123601fa08c1733b0cea2d66c30fe94e09d38bf5e6e526d363d45e90cba7dc9'
    ),
    (
      'planning-db:task:E/DBT-CANVAS-P0-PRO-FLOW-1',
      'docs/planning/proposals/mandatory/frontend-and-ux/sql-canvas-demanding-user-flow-review-plan-20260608.md',
      '26b5c033f11423ccbf3d15e2e50145ed8fd3b934c6edf072fb5004bb37816a0f'
    ),
    (
      'planning-db:task:E/DVT-CANVAS-P0-PRO-FLOW-1',
      'docs/planning/proposals/mandatory/frontend-and-ux/sql-canvas-demanding-user-flow-review-plan-20260608.md',
      '26b5c033f11423ccbf3d15e2e50145ed8fd3b934c6edf072fb5004bb37816a0f'
    ),
    (
      'planning-db:task:E/E-MS-GAP-012-TRANSFORM-SELECTION-1',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
      'ad58d88f54542fe170c3c66851558effde514a9f3205a6108e1c75227f2aca45'
    ),
    (
      'planning-db:task:E/E-MS-GAP-013-OUTPUT-TARGET-1',
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md',
      'ad58d88f54542fe170c3c66851558effde514a9f3205a6108e1c75227f2aca45'
    )
)
update planning_query_store.feature_mechanization_local_rails rail
set
  source_path = source_repoints.target_path,
  source_content_sha256 = source_repoints.target_sha256,
  documentation_refs = (
    select jsonb_agg(ref order by ref)
    from (
      select value as ref
      from jsonb_array_elements_text(coalesce(rail.documentation_refs, '[]'::jsonb))
      where value <> source_repoints.source_path
      union
      select source_repoints.target_path
    ) refs
  ),
  governing_sources = (
    select jsonb_agg(ref order by ref)
    from (
      select value as ref
      from jsonb_array_elements_text(coalesce(rail.governing_sources, '[]'::jsonb))
      where value <> source_repoints.source_path
      union
      select source_repoints.target_path
    ) refs
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(rail.raw_manifest, '{}'::jsonb),
      '{implementationPlan}',
      to_jsonb(source_repoints.target_path),
      true
    ),
    '{sourceRepointReason}',
    to_jsonb(
      concat(
        'Repointed from removed local prompt source ',
        source_repoints.source_path,
        ' to tracked governing document ',
        source_repoints.target_path,
        '.'
      )
    ),
    true
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from source_repoints
where rail.source_path = source_repoints.source_path;

update planning_query_store.feature_mechanization_local_rails
set
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md',
  source_content_sha256 = '154ff0acdea4ae3f9d998586b719e38c784ddd20d97867b5a8c2842f3373e760',
  documentation_refs = (
    select jsonb_agg(ref order by ref)
    from (
      select value as ref
      from jsonb_array_elements_text(coalesce(documentation_refs, '[]'::jsonb))
      where value <> 'buzon/TAREA.TXT'
      union
      select 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md'
    ) refs
  ),
  governing_sources = (
    select jsonb_agg(ref order by ref)
    from (
      select value as ref
      from jsonb_array_elements_text(coalesce(governing_sources, '[]'::jsonb))
      where value <> 'buzon/TAREA.TXT'
      union
      select 'docs/architecture/command-query-rail-governance.md'
      union
      select 'docs/architecture/fowler-opportunity-planning-governance.md'
      union
      select 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md'
    ) refs
  ),
  raw_rail = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(raw_rail, '{}'::jsonb),
        '{status}',
        '"retired"'::jsonb,
        true
      ),
      '{retirementReason}',
      to_jsonb(
        'Local slice declaration duplicates an active canonical command/query rail; implementation evidence remains on this retired local record.'::text
      ),
      true
    ),
    '{canonicalRailSource}',
    to_jsonb(
      case normalized_rail_name
        when 'importwarehousesources' then 'docs/adr/ADR-0058-warehouse-source-import-rails.md'
        when 'inspectcanvasnodeproperties' then 'docs/architecture/components/web/frontend-component-inventory.md'
        when 'resolvecanvascontextmenu' then 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
        else 'docs/architecture/command-query-rail-governance.md'
      end
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
      'Retired by migration 107 because the rail name already has a canonical active command/query declaration.'::text
    ),
    true
  ),
  revision = greatest(revision, 2) + 1,
  updated_at = now()
where (
    feature_id = 'CANVAS-SOURCE-IMPORT-CONTEXT-PLACEMENT-20260617'
    and normalized_rail_name = 'importwarehousesources'
  )
  or (
    feature_id = 'CANVAS-DBT-TEST-METADATA-WORKBENCH-20260616'
    and normalized_rail_name = 'inspectcanvasnodeproperties'
  )
  or (
    feature_id in (
      'CANVAS-EMPTY-CONTEXT-MENU-PASSTHROUGH-20260616',
      'CANVAS-CONTEXT-MENU-STABLE-RIGHT-CLICK-20260617'
    )
    and normalized_rail_name = 'resolvecanvascontextmenu'
  );
