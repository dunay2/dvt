-- Keep explicit local edits distinct from canonical persistence while allowing
-- the existing node-authoring commands to acknowledge a submitted draft.

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select jsonb_agg(symbol_ref order by symbol_ref)
    from (
      select distinct value as symbol_ref
      from jsonb_array_elements_text(coalesce(rails.symbol_refs, '[]'::jsonb))
      union
      select 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts#areCanvasInspectorNodeDraftsCanonicallyEqual'
    ) normalized_symbol_refs
  ),
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(coalesce(rails.implementation_refs, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/755_canvas_node_submitted_draft_authority.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/755_canvas_node_submitted_draft_authority.sql'
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      rails.raw_manifest,
      '{symbols}',
      coalesce(
        (
          select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
          from (
            select existing as symbol
            from jsonb_array_elements(
              coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)
            ) symbols(existing)
            where not (
              existing ->> 'path' = 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts'
              and existing ->> 'name' = 'areCanvasInspectorNodeDraftsCanonicallyEqual'
            )
            union all
            select jsonb_build_object(
              'name', 'areCanvasInspectorNodeDraftsCanonicallyEqual',
              'path', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts',
              'dddOwner', 'CanvasInspectorNodeDraft',
              'cqRails', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'),
              'fowlerSignals', jsonb_build_array('single_responsibility', 'explicit_authority'),
              'architectureGuard', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts',
              'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
              'unitTests', jsonb_build_array(
                'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
                'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'
              )
            )
          ) normalized_symbols
        ),
        '[]'::jsonb
      ),
      true
    ),
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(
          coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)
        )
        union
        select 'tools/planning-db/migrations/755_canvas_node_submitted_draft_authority.sql'
      ) normalized_manifest_surfaces
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/755_canvas_node_submitted_draft_authority.sql',
  source_content_sha256 = repeat(md5(rails.rail_id || ':submitted-draft-authority:755'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1';

update planning_query_store.frontend_component_local_components
set
  raw_component = jsonb_set(
    coalesce(raw_component, '{}'::jsonb),
    '{invariants}',
    (
      select jsonb_agg(invariant order by invariant)
      from (
        select distinct value as invariant
        from jsonb_array_elements_text(coalesce(raw_component -> 'invariants', '[]'::jsonb))
        union
        select 'An explicit local edit remains dirty until a submitted draft is confirmed by canonical authority.'
      ) normalized_invariants
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/755_canvas_node_submitted_draft_authority.sql',
  source_content_sha256 = md5('component:CanvasNodeWorkbenchDraftController:submitted-authority:755'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController';

update planning_query_store.frontend_component_validation_evidence
set
  proves = 'The controller preserves unsubmitted empty SQL, records command submission, and accepts the canonical no-SQL authority only after confirmation.',
  raw_evidence = jsonb_build_object(
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
  ),
  source_path = 'tools/planning-db/migrations/755_canvas_node_submitted_draft_authority.sql',
  source_content_sha256 = md5('evidence:CanvasNodeWorkbenchDraftController:submitted-authority:755'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController'
  and evidence_id = 'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-UNIT';

update architecture.component_transformation
set
  test_requirement = 'Prove clean refresh, unsubmitted dirty preservation, submitted canonical confirmation, explicit reset, tag coherence, and node-switch reset.'
where transformation_id = 'TRANS-WEB-NODE-AUTHORITY-TO-WORKBENCH-DRAFT';

do $$
declare
  incomplete_rail_count integer;
  component_invariant_count integer;
  evidence_count integer;
begin
  select count(*) into incomplete_rail_count
  from planning_query_store.feature_mechanization_local_rails rails
  where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
    and (
      not coalesce(rails.symbol_refs, '[]'::jsonb) ?
        'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts#areCanvasInspectorNodeDraftsCanonicallyEqual'
      or not coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb) ?
        'tools/planning-db/migrations/755_canvas_node_submitted_draft_authority.sql'
      or (
        select count(*)
        from jsonb_array_elements(coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)) symbol
        where symbol ->> 'path' = 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts'
          and symbol ->> 'name' = 'areCanvasInspectorNodeDraftsCanonicallyEqual'
          and coalesce(symbol -> 'cqRails', '[]'::jsonb) ? 'ConfigureCanvasDbtNode'
          and coalesce(symbol -> 'cqRails', '[]'::jsonb) ? 'ConfigureCanvasDvtNode'
      ) <> 1
    );

  if incomplete_rail_count <> 0 then
    raise exception 'Canvas node presentation has % rails without canonical submitted-draft authority', incomplete_rail_count;
  end if;

  select count(*) into component_invariant_count
  from planning_query_store.frontend_component_local_components component,
    jsonb_array_elements_text(coalesce(component.raw_component -> 'invariants', '[]'::jsonb)) invariant
  where component.component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController'
    and invariant = 'An explicit local edit remains dirty until a submitted draft is confirmed by canonical authority.';

  if component_invariant_count <> 1 then
    raise exception 'Draft controller submitted-authority invariant is missing';
  end if;

  select count(*) into evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController'
    and evidence_id = 'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-UNIT'
    and evidence_status = 'current'
    and proves like '%submitted%canonical%';

  if evidence_count <> 1 then
    raise exception 'Draft controller submitted-authority evidence is missing';
  end if;
end
$$;
