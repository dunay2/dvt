-- Reconcile node-authoring submission with the exact command projection and
-- register the complete Canvas draft session state component. This migration
-- reuses the existing ConfigureCanvas* and SaveWorkspaceGraphDraft rails.

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
  'Canvas draft session state',
  'state-view',
  'current',
  'harden',
  'Frontend / Canvas draft lifecycle',
  'Own deterministic local draft-session transitions, working-set state, baseline state, and in-flight save reconciliation without owning transport or presentation.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'dbFirst', true,
    'architectureComponentId', 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'dddObject', 'CanvasDraftSessionState',
    'pluginScopeAuthority', 'plugin-agnostic shared Canvas state',
    'fileAuthority', 'planning_query_store.frontend_component_file_query',
    'evidenceAuthority', 'planning_query_store.frontend_component_validation_evidence',
    'cqRails', jsonb_build_array(
      'AdoptExternalCanvasDraftRevision',
      'SaveWorkspaceGraphDraft'
    ),
    'invariants', jsonb_build_array(
      'the session state is deterministic and independent from React presentation',
      'the session state never performs repository or HTTP effects',
      'a save acknowledgement cannot discard local node content edited while that save was in flight',
      'external revisions clear stale save-attempt snapshots without replacing dirty local authoring'
    )
  ),
  'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
  md5('component:CanvasDraftSessionState:current:756')
)
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

delete from planning_query_store.frontend_component_local_files
where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftLayoutHydrationPolicy.ts', 'policy', 'canvasDraftLayoutHydrationPolicy', jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:layout-hydration:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftLifecycleSnapshot.ts', 'value-model', 'canvasDraftLifecycleSnapshot', jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:lifecycle-snapshot:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftLifecycle.types.ts', 'type-contract', null, jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:lifecycle-types:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts', 'architecture-test', null, jsonb_build_object('proves', 'state machine remains free of React, repository, and presentation authority'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:architecture-test:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftSessionBaseline.ts', 'state-helper', 'canvasDraftSessionBaseline', jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:baseline:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts', 'state-machine', 'canvasDraftSessionMachine', jsonb_build_object('ownership', 'exclusive', 'effects', false), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:machine:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftSession.test.ts', 'unit-test', null, jsonb_build_object('proves', 'session transitions and concurrent save reconciliation'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:unit-test:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftSession.ts', 'facade', 'canvasDraftSession', jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:facade:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftSession.types.ts', 'type-contract', null, jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:session-types:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftSessionWorkingSet.ts', 'state-helper', 'canvasDraftSessionWorkingSet', jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:working-set:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftStatusState.test.ts', 'unit-test', null, jsonb_build_object('proves', 'status projection from session facts'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:status-test:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/canvasDraftStatusState.ts', 'state-model', 'canvasDraftStatusState', jsonb_build_object('ownership', 'exclusive'), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:status:756')),
  ('SYS-WEB-CANVAS-DRAFT-SESSION-STATE', 'apps/web/src/app/views/canvas/useCanvasDraftBaseline.ts', 'state-adapter', 'useCanvasDraftBaseline', jsonb_build_object('ownership', 'exclusive', 'effects', false), 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql', md5('file:CanvasDraftSessionState:baseline-adapter:756'));

delete from planning_query_store.frontend_component_plugin_scopes
where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE';

delete from planning_query_store.frontend_component_capability_gaps
where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'AdoptExternalCanvasDraftRevision',
    'command',
    'implemented',
    jsonb_build_object('role', 'local revision transition', 'ownsTransport', false),
    'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
    md5('rail:CanvasDraftSessionState:AdoptExternalCanvasDraftRevision:756')
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'SaveWorkspaceGraphDraft',
    'command',
    'implemented',
    jsonb_build_object('role', 'save acknowledgement state adapter', 'ownsTransport', false),
    'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
    md5('rail:CanvasDraftSessionState:SaveWorkspaceGraphDraft:756')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'EV-WEB-CANVAS-DRAFT-SESSION-STATE-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
    'SaveWorkspaceGraphDraft',
    'draft-save-acknowledgement',
    'An older save acknowledgement preserves node content edited while the save was in flight and advances only the durable revision.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/canvasDraftSession.test.ts'),
    'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
    md5('evidence:CanvasDraftSessionState:unit:756')
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'EV-WEB-CANVAS-DRAFT-SESSION-STATE-ARCHITECTURE',
    'architecture-test',
    'current',
    'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts',
    null,
    'state-boundary',
    'The state component remains deterministic and does not own repository, HTTP, or React presentation effects.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/canvasDraftSession.architecture.test.ts'),
    'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
    md5('evidence:CanvasDraftSessionState:architecture:756')
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'EV-WEB-CANVAS-DRAFT-SESSION-STATUS-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasDraftStatusState.test.ts',
    null,
    'draft-status',
    'Draft status is projected from explicit session facts without becoming a second authority.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/canvasDraftStatusState.test.ts'),
    'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
    md5('evidence:CanvasDraftSessionState:status:756')
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'EV-WEB-CANVAS-DRAFT-SESSION-STRICT-LIVE',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'SaveWorkspaceGraphDraft',
    'strict-live-canvas',
    'A real browser imports a source, edits model SQL, persists the draft, previews it, and reopens project code without draft interception or direct seeding.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:e2e:source-import:live', 'draftIntercept', false, 'directDraftSeed', false),
    'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
    md5('evidence:CanvasDraftSessionState:strict-live:756')
  )
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update architecture.component
set
  status = 'implemented',
  public_contract = 'Deterministic Canvas draft-session state, baseline, working set, status, and in-flight save reconciliation.',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE';

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
  source_content_sha256 = md5('SYS-WEB-CANVAS-DRAFT-SESSION-STATE:756') || md5('canvas-draft-session-state:implemented:756'),
  cq_rails = 'AdoptExternalCanvasDraftRevision;SaveWorkspaceGraphDraft'
where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'invariant',
    'A save acknowledgement must compare both the submitted graph working set and submitted local node catalog before clearing local authoring.',
    20
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'non_goal',
    'Do not perform HTTP persistence or render UI from the draft session state component.',
    20
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'public_api',
    'canvasDraftSession; canvasDraftSessionMachine; canvasDraftSessionWorkingSet; canvasDraftStatusState',
    20
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'transition',
    'review -> canonical after complete file ownership, canonical rail relations, focused tests, and strict live browser evidence pass.',
    20
  ),
  (
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'consumer',
    'Canvas draft autosave, persistence adapters, presentation read models, and authoring handlers.',
    20
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component_transformation (
  transformation_id, component_id, transformation_kind, lossiness,
  test_requirement
)
values (
  'TRANS-WEB-CANVAS-DRAFT-SAVE-ACKNOWLEDGEMENT',
  'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
  'mapping',
  'lossless',
  'Prove that a save acknowledgement advances the durable revision without dropping graph-scope or node-content edits made after submission.'
)
on conflict (transformation_id) do update set
  component_id = excluded.component_id,
  transformation_kind = excluded.transformation_kind,
  lossiness = excluded.lossiness,
  test_requirement = excluded.test_requirement;

update architecture.component_test
set test_kind = case
  when test_path = 'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts' then 'architecture'
  else 'unit'
end,
coverage_level = case
  when test_path = 'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts' then 'boundary'
  else 'behavior'
end
where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE'
  and test_path in (
    'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
    'apps/web/src/app/views/canvas/canvasDraftStatusState.test.ts'
  );

update planning_query_store.frontend_component_local_components
set
  raw_component = jsonb_set(
    jsonb_set(
      coalesce(raw_component, '{}'::jsonb),
      '{invariants}',
      (
        select jsonb_agg(invariant order by invariant)
        from (
          select distinct value as invariant
          from jsonb_array_elements_text(coalesce(raw_component -> 'invariants', '[]'::jsonb))
          union
          select 'A submitted draft is canonicalized through the same apply-and-project path as the node authoring command.'
        ) normalized_invariants
      ),
      true
    ),
    '{retiredSymbols}',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'areCanvasInspectorNodeDraftsCanonicallyEqual',
        'replacement', 'canonicalizeCanvasInspectorNodeDraft',
        'reason', 'Partial SQL-only comparison duplicated and weakened command normalization.'
      )
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
  source_content_sha256 = md5('component:CanvasNodeWorkbenchDraftController:canonical-submission:756'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController';

update planning_query_store.frontend_component_validation_evidence
set
  proves = 'The controller preserves unsubmitted edits, canonicalizes every submitted field through the authoring command projection, and becomes clean only after matching canonical authority arrives.',
  raw_evidence = jsonb_build_object(
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'
  ),
  source_path = 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
  source_content_sha256 = md5('evidence:CanvasNodeWorkbenchDraftController:canonical-submission:756'),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasNodeWorkbenchDraftController'
  and evidence_id = 'EV-WEB-NODE-WORKBENCH-DRAFT-CONTROLLER-UNIT';

update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = (
    select coalesce(jsonb_agg(symbol_ref order by symbol_ref), '[]'::jsonb)
    from (
      select distinct value as symbol_ref
      from jsonb_array_elements_text(coalesce(rails.symbol_refs, '[]'::jsonb))
      where value <> 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts#areCanvasInspectorNodeDraftsCanonicallyEqual'
      union
      select 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts#canonicalizeCanvasInspectorNodeDraft'
      where rails.rail_name = 'CoordinateCanvasNodeContextSurface'
        and rails.rail_type = 'command'
    ) normalized_symbol_refs
  ),
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(coalesce(rails.implementation_refs, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(coalesce(rails.allowed_implementation_surfaces, '[]'::jsonb))
      union
      select 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql'
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(rails.raw_manifest, '{}'::jsonb),
        '{symbols}',
        coalesce(
          (
            select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
            from (
              select existing as symbol
              from jsonb_array_elements(coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)) symbols(existing)
              where not (
                existing ->> 'path' = 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts'
                and existing ->> 'name' in (
                  'areCanvasInspectorNodeDraftsCanonicallyEqual',
                  'canonicalizeCanvasInspectorNodeDraft'
                )
              )
              union all
              select jsonb_build_object(
                'name', 'canonicalizeCanvasInspectorNodeDraft',
                'path', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts',
                'dddOwner', 'CanvasInspectorNodeDraft',
                'cqRails', jsonb_build_array('ConfigureCanvasDbtNode', 'ConfigureCanvasDvtNode'),
                'fowlerSignals', jsonb_build_array('single_source_of_truth', 'explicit_authority'),
                'architectureGuard', 'apps/web/src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts',
                'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
                'unitTests', jsonb_build_array(
                  'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
                  'apps/web/src/app/views/canvas/useCanvasNodeWorkbenchDraftController.test.tsx'
                )
              )
              where rails.rail_name = 'CoordinateCanvasNodeContextSurface'
                and rails.rail_type = 'command'
            ) normalized_symbols
          ),
          '[]'::jsonb
        ),
        true
      ),
      '{retiredSymbols}',
      jsonb_build_array(
        jsonb_build_object(
          'name', 'areCanvasInspectorNodeDraftsCanonicallyEqual',
          'replacement', 'canonicalizeCanvasInspectorNodeDraft',
          'reason', 'Partial SQL-only canonical comparison retired in favor of command projection.'
        )
      ),
      true
    ),
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(coalesce(rails.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb))
        union
        select 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql'
      ) normalized_manifest_surfaces
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/756_canvas_node_draft_canonical_save_reconciliation.sql',
  source_content_sha256 = repeat(md5(rails.rail_id || ':canonical-draft-save-reconciliation:756'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1';

do $$
declare
  component_file_count integer;
  component_rail_count integer;
  component_evidence_count integer;
  stale_symbol_count integer;
  replacement_symbol_count integer;
  test_kind_drift_count integer;
begin
  select count(*) into component_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE';

  if component_file_count <> 13 then
    raise exception 'Canvas draft session state file ownership is incomplete: %', component_file_count;
  end if;

  select count(*) into component_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE'
    and rail_name in ('AdoptExternalCanvasDraftRevision', 'SaveWorkspaceGraphDraft')
    and rail_status = 'implemented';

  if component_rail_count <> 2 then
    raise exception 'Canvas draft session state rail mapping is incomplete: %', component_rail_count;
  end if;

  select count(*) into component_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE'
    and evidence_status = 'current';

  if component_evidence_count <> 4 then
    raise exception 'Canvas draft session state evidence is incomplete: %', component_evidence_count;
  end if;

  select count(*) into stale_symbol_count
  from planning_query_store.feature_mechanization_local_rails rails
  where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
    and (
      coalesce(rails.symbol_refs, '[]'::jsonb) ?
        'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts#areCanvasInspectorNodeDraftsCanonicallyEqual'
      or exists (
        select 1
        from jsonb_array_elements(coalesce(rails.raw_manifest -> 'symbols', '[]'::jsonb)) symbol
        where symbol ->> 'path' = 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts'
          and symbol ->> 'name' = 'areCanvasInspectorNodeDraftsCanonicallyEqual'
      )
    );

  if stale_symbol_count <> 0 then
    raise exception 'Retired partial draft comparator remains active in % feature rails', stale_symbol_count;
  end if;

  select count(*) into replacement_symbol_count
  from planning_query_store.feature_mechanization_local_rails rails
  where rails.feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
    and rails.rail_name = 'CoordinateCanvasNodeContextSurface'
    and rails.rail_type = 'command'
    and coalesce(rails.symbol_refs, '[]'::jsonb) ?
      'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts#canonicalizeCanvasInspectorNodeDraft';

  if replacement_symbol_count <> 1 then
    raise exception 'Canonical draft projection symbol is not mapped exactly once';
  end if;

  select count(*) into test_kind_drift_count
  from architecture.component_test
  where component_id = 'SYS-WEB-CANVAS-DRAFT-SESSION-STATE'
    and (
      (test_path = 'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts' and test_kind <> 'architecture')
      or (test_path in (
        'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
        'apps/web/src/app/views/canvas/canvasDraftStatusState.test.ts'
      ) and test_kind <> 'unit')
    );

  if test_kind_drift_count <> 0 then
    raise exception 'Canvas draft session test kinds retain drift: %', test_kind_drift_count;
  end if;
end
$$;
