-- Close the DBT model-code authority correction only after implementation and
-- strict live proof. The pure projection owns SQL derivation; the form adapts
-- edits to the existing ConfigureCanvasDbtNode command.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'evidence', 'EV-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE', 'must_prove', true),
  ('CANVAS-NODE-PRESENTATION-TRUTH-20260717', 'test', 'TEST-WEB-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
  'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING'
);

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
  'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING'
);

update architecture.component_port
set status = 'implemented'
where component_id in (
  'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
  'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-WEB-DBT-MODEL-ARTIFACT-TO-NODE-TRUTH',
  'REL-WEB-DBT-MODEL-CODE-TO-ARTIFACT-PROJECTION',
  'REL-WEB-DBT-MODEL-CODE-TO-NODE-WORKBENCH'
);

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-WEB-CANVAS-GRAPH-USES-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'depends_on',
    'outbound',
    'sync',
    'Preview is blocked with the projection reason when no compatible origin exists.',
    'Already-authorized visible Canvas graph and execution scope.',
    jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts',
      'apps/web/src/app/views/canvas/canvasNodePresentationProjection.ts',
      'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts'
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

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-DBT-MODEL-ARTIFACT-INTEGRATION',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts',
    'integration',
    'boundary',
    true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts'
  ),
  (
    'TEST-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-DBT-MODEL-CODE-WORKBENCH',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'integration',
    'boundary',
    true,
    'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'e2e',
    'flow',
    true,
    'pnpm --filter @dvt/web test:e2e:source-import:live'
  ),
  (
    'TEST-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING-LIVE',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'e2e',
    'flow',
    true,
    'pnpm --filter @dvt/web test:e2e:source-import:live'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'Pure projection emits no duplicate runtime signal; Preview and workspace-file rails own operational evidence.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING',
    'Presentation emits no duplicate runtime signal; the governed draft command owns write outcomes.',
    'log',
    true,
    'not_applicable'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  reuse_decision = case
    when component_id = 'web.component.canvas.DbtModelArtifactProjection' then 'extract'
    else 'create'
  end,
  capability_gaps = '[]'::jsonb,
  evidence_refs = case component_id
    when 'web.component.canvas.DbtModelArtifactProjection' then jsonb_build_array(
      'EV-DBT-MODEL-ARTIFACT-PROJECTION-UNIT',
      'EV-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE'
    )
    else jsonb_build_array(
      'EV-DBT-MODEL-CODE-AUTHORING-UNIT',
      'EV-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE'
    )
  end,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'implementationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'strictBrowserProof', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
  source_content_sha256 = md5(component_id || ':current:750'),
  updated_at = now()
where component_id in (
  'web.component.canvas.DbtModelArtifactProjection',
  'web.component.canvas.DbtModelCodeAuthoringSection'
);

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  capability_gaps = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'delegatesCodeProjectionTo', 'web.component.canvas.DbtModelArtifactProjection',
    'delegatesCodePresentationTo', 'web.component.canvas.DbtModelCodeAuthoringSection',
    'ownsArtifactProjection', false
  ),
  source_path = 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
  source_content_sha256 = md5('component:DbtAuthoringFields:current:750'),
  updated_at = now()
where component_id = 'web.component.canvas.DbtAuthoringFields';

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DbtModelArtifactProjection',
    'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.ts',
    'query',
    'projectDbtModelArtifact',
    jsonb_build_object('ownership', 'exclusive', 'effects', false),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('file:DbtModelArtifactProjection:source:750')
  ),
  (
    'web.component.canvas.DbtModelArtifactProjection',
    'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts',
    'unit-test',
    null,
    jsonb_build_object('proves', 'origin, provenance, exact authored body, generated fallback, and negative projection'),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('file:DbtModelArtifactProjection:test:750')
  ),
  (
    'web.component.canvas.DbtModelCodeAuthoringSection',
    'apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.tsx',
    'presentation',
    'DbtModelCodeAuthoringSection',
    jsonb_build_object('ownership', 'exclusive', 'presentationOnly', true),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('file:DbtModelCodeAuthoringSection:source:750')
  ),
  (
    'web.component.canvas.DbtModelCodeAuthoringSection',
    'apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx',
    'unit-test',
    null,
    jsonb_build_object('proves', 'generated display, authored edit, empty reset, and disabled posture'),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('file:DbtModelCodeAuthoringSection:test:750')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_plugin_scopes (
  component_id, plugin_id, scope_status, raw_scope, source_path,
  source_content_sha256
)
values
  ('web.component.canvas.DbtModelArtifactProjection', 'dbt', 'current', jsonb_build_object('scopeReason', 'DBT model SQL artifact semantics.'), 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql', md5('scope:DbtModelArtifactProjection:dbt:750')),
  ('web.component.canvas.DbtModelCodeAuthoringSection', 'dbt', 'current', jsonb_build_object('scopeReason', 'DBT model SQL authoring presentation.'), 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql', md5('scope:DbtModelCodeAuthoringSection:dbt:750'))
on conflict (component_id, plugin_id) do update set
  scope_status = excluded.scope_status,
  raw_scope = excluded.raw_scope,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  rail_status = 'implemented',
  source_path = 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
  source_content_sha256 = md5(component_id || ':' || rail_name || ':implemented:750'),
  updated_at = now()
where component_id in (
  'web.component.canvas.DbtModelArtifactProjection',
  'web.component.canvas.DbtModelCodeAuthoringSection'
);

update planning_query_store.frontend_component_capability_gaps
set
  gap_status = 'closed',
  raw_gap = coalesce(raw_gap, '{}'::jsonb) || jsonb_build_object(
    'closedBy', 'E-CANVAS-NODE-PRESENTATION-TRUTH-1',
    'strictBrowserProof', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
  source_content_sha256 = md5(component_id || ':' || gap_id || ':closed:750'),
  updated_at = now()
where component_id in (
  'web.component.canvas.DbtModelArtifactProjection',
  'web.component.canvas.DbtModelCodeAuthoringSection'
);

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DbtModelArtifactProjection',
    'EV-DBT-MODEL-ARTIFACT-PROJECTION-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts',
    'GenerateDbtWorkspaceArtifacts',
    'dbt-model-artifact',
    'One deterministic projection preserves generated or authored provenance and rejects missing compatible origins.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDbtModelArtifactProjection.test.ts'),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('evidence:DbtModelArtifactProjection:unit:750')
  ),
  (
    'web.component.canvas.DbtModelCodeAuthoringSection',
    'EV-DBT-MODEL-CODE-AUTHORING-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx',
    'ConfigureCanvasDbtNode',
    'node-workbench-code',
    'The Code section edits the same SQL body consumed by artifact projection without owning persistence.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/DbtModelCodeAuthoringSection.test.tsx'),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('evidence:DbtModelCodeAuthoringSection:unit:750')
  ),
  (
    'web.component.canvas.DbtModelArtifactProjection',
    'EV-CANVAS-DBT-MODEL-CODE-ROUNDTRIP-LIVE',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'GenerateDbtWorkspaceArtifacts',
    'strict-live-canvas',
    'A clean browser session imports a real warehouse source, connects a DBT model, edits SQL, persists the draft, creates Preview, materializes the exact SQL file, and opens it from Project code.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:e2e:source-import:live', 'draftIntercept', false, 'directDraftSeed', false),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('evidence:DbtModelCodeRoundtrip:live:750')
  ),
  (
    'web.component.canvas.DbtModelCodeAuthoringSection',
    'EV-CANVAS-DBT-MODEL-CODE-AUTHORING-LIVE',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
    'ConfigureCanvasDbtNode',
    'strict-live-canvas',
    'The selected model opens the correct workbench, exposes generated provenance, accepts authored SQL, and closes before global Project code interaction.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:e2e:source-import:live', 'forcedClicks', false),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('evidence:DbtModelCodeAuthoring:live:750')
  ),
  (
    'web.component.canvas.NodePropertiesTabs',
    'EV-NODE-PROPERTY-SECTION-CONTEXTUAL-BODY',
    'unit-test',
    'current',
    'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx',
    'RenderNodePropertiesTabs',
    'node-property-section',
    'A contextual editor replaces the passive empty state instead of rendering contradictory duplicate content.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/components/inspector/NodePropertySectionView.test.tsx'),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('evidence:NodePropertySectionView:contextual-body:750')
  ),
  (
    'web.component.canvas.NodeFloatingToolbar',
    'EV-NODE-FLOATING-TOOLBAR-SELECTED-IDENTITY',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx',
    'RenderCanvasNodeFloatingToolbar',
    'selected-node-context',
    'The floating toolbar exposes the selected node identity used by strict browser proof and cannot be mistaken for another card.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web exec vitest run src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'),
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    md5('evidence:NodeFloatingToolbar:selected-identity:750')
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

-- Override the imported command declaration in its own feature. The same
-- product intent is a deterministic query, not a state-changing operation.
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name,
  rail_type, ddd_owner, rail_status, symbol_refs, implementation_refs,
  documentation_refs, governing_sources, allowed_implementation_surfaces,
  architecture_guards, completion_gate, source_path, source_content_sha256,
  raw_rail, raw_manifest, revision, created_by
)
values
  (
    'local#E-DBT-AUTHOR-RUN-20260526#command#generatedbtworkspaceartifacts-retired',
    'E-DBT-AUTHOR-RUN-20260526',
    'implemented',
    'GenerateDbtWorkspaceArtifacts',
    'generatedbtworkspaceartifacts',
    'command',
    'DbtWorkspaceArtifactProjection',
    'retired',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/dbt-authoring-code-run-vertical-plan-20260526.md'),
    jsonb_build_array('AGENTS.md', 'docs/architecture/command-query-rail-governance.md'),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    repeat(md5('retired-command:GenerateDbtWorkspaceArtifacts:E-DBT-AUTHOR-RUN-20260526:750'), 2),
    jsonb_build_object('retiredReason', 'The operation is a pure deterministic projection and has no command effect.'),
    jsonb_build_object('featureId', 'E-DBT-AUTHOR-RUN-20260526', 'mechanizationStatus', 'implemented', 'implementationStatus', 'implemented', 'noHumanDecisionsRemaining', true),
    1,
    'codex'
  ),
  (
    'local#CANVAS-INSPECTOR-PLUGIN-AUTHORING-FIELDS-20260604#command#generatedbtworkspaceartifacts-retired',
    'CANVAS-INSPECTOR-PLUGIN-AUTHORING-FIELDS-20260604',
    'implemented',
    'GenerateDbtWorkspaceArtifacts',
    'generatedbtworkspaceartifacts',
    'command',
    'DbtWorkspaceArtifactProjection',
    'retired',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_array('docs/planning/proposals/mandatory/frontend-and-ux/canvas-inspector-plugin-authoring-fields-plan-20260604.md'),
    jsonb_build_array('AGENTS.md', 'docs/architecture/command-query-rail-governance.md'),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
    repeat(md5('retired-command:GenerateDbtWorkspaceArtifacts:CANVAS-INSPECTOR-PLUGIN-AUTHORING-FIELDS-20260604:750'), 2),
    jsonb_build_object('retiredReason', 'The operation is a pure deterministic projection and has no command effect.'),
    jsonb_build_object('featureId', 'CANVAS-INSPECTOR-PLUGIN-AUTHORING-FIELDS-20260604', 'mechanizationStatus', 'implemented', 'implementationStatus', 'implemented', 'noHumanDecisionsRemaining', true),
    1,
    'codex'
  )
on conflict (rail_id) do update set
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision),
  updated_at = now();

-- A feature can retain more than one historical local row for the same
-- normalized intent. Retire the complete command set so the effective
-- projection cannot select a newer stale alias over the canonical query.
update planning_query_store.feature_mechanization_local_rails
set
  rail_status = 'retired',
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'retiredReason', 'The operation is a pure deterministic projection and has no command effect.'
  ),
  source_path = 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
  source_content_sha256 = repeat(md5(rail_id || ':retired:750'), 2),
  revision = revision + 1,
  updated_at = now()
where feature_id in (
    'E-DBT-AUTHOR-RUN-20260526',
    'CANVAS-INSPECTOR-PLUGIN-AUTHORING-FIELDS-20260604'
  )
  and rail_type = 'command'
  and normalized_rail_name = 'generatedbtworkspaceartifacts';

update planning_query_store.feature_mechanization_local_rails
set
  rail_status = 'implemented',
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'implementationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'strictBrowserProof', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/750_canvas_dbt_model_code_authority_closeout.sql',
  source_content_sha256 = repeat(md5(rail_id || ':implemented:750'), 2),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-NODE-PRESENTATION-TRUTH-1'
  and rail_type = 'query'
  and normalized_rail_name = 'generatedbtworkspaceartifacts';

update architecture.design
set
  status = 'implemented',
  rationale = rationale || E'\n\nCloseout: one pure DBT model artifact projection now supplies General, Code, Preview, and workspace materialization. The Code workbench adapts edits through ConfigureCanvasDbtNode, generated and authored provenance remain explicit, passive empty content is suppressed when the contextual editor owns the section, and strict live browser proof exercises the complete warehouse-source to project-file roundtrip.',
  updated_at = now()
where design_id = 'CANVAS-NODE-PRESENTATION-TRUTH-20260717';

do $$
declare
  incomplete_component_count integer;
  open_gap_count integer;
  mapped_file_count integer;
  live_evidence_count integer;
  active_command_count integer;
  active_query_count integer;
begin
  select count(*) into incomplete_component_count
  from architecture.component
  where component_id in (
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-DBT-MODEL-CODE-AUTHORING'
  )
    and status <> 'implemented';

  if incomplete_component_count <> 0 then
    raise exception 'DBT model code authority architecture components are not implemented';
  end if;

  select count(*) into open_gap_count
  from planning_query_store.frontend_component_capability_gaps
  where component_id in (
    'web.component.canvas.DbtModelArtifactProjection',
    'web.component.canvas.DbtModelCodeAuthoringSection'
  )
    and gap_status in ('open', 'planned');

  if open_gap_count <> 0 then
    raise exception 'DBT model code authority components retain open gaps';
  end if;

  select count(*) into mapped_file_count
  from planning_query_store.frontend_component_local_files
  where component_id in (
    'web.component.canvas.DbtModelArtifactProjection',
    'web.component.canvas.DbtModelCodeAuthoringSection'
  );

  if mapped_file_count <> 4 then
    raise exception 'DBT model code authority file ownership is incomplete: %', mapped_file_count;
  end if;

  select count(*) into live_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id in (
    'web.component.canvas.DbtModelArtifactProjection',
    'web.component.canvas.DbtModelCodeAuthoringSection'
  )
    and evidence_kind = 'e2e-test'
    and evidence_status = 'current';

  if live_evidence_count <> 2 then
    raise exception 'DBT model code authority strict live evidence is incomplete';
  end if;

  select count(*) into active_command_count
  from planning_query_store.command_query_rail_manifest_query
  where normalized_rail_name = 'generatedbtworkspaceartifacts'
    and rail_type = 'command'
    and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

  if active_command_count <> 0 then
    raise exception 'GenerateDbtWorkspaceArtifacts remains active as a command';
  end if;

  select count(*) into active_query_count
  from planning_query_store.command_query_rail_manifest_query
  where normalized_rail_name = 'generatedbtworkspaceartifacts'
    and rail_type = 'query'
    and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

  if active_query_count <> 1 then
    raise exception 'GenerateDbtWorkspaceArtifacts must have one active query authority, found %', active_query_count;
  end if;
end
$$;
