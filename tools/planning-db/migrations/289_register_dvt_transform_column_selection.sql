-- DB-first registration for DVT transform input-column selection. This slice
-- makes upstream source columns visible and selectable from the DVT SQL
-- transform authoring section without claiming that the full DVT P0 flow is
-- complete.

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
  'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'DVT transform input column selection',
  'Frontend / Canvas',
  'implemented',
  'DVT transform authoring could edit SQL but could not inspect or select columns from connected source nodes. The professional canvas flow needs the transform section to query upstream source metadata from the graph and persist selected input-column refs through the existing node draft command path.',
  'hidden_authority',
  'ReadDvtTransformInputColumns;ConfigureDvtTransformInputColumns',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
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
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'component',
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'query',
    'ReadDvtTransformInputColumns',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'flow',
    'ConfigureDvtTransformInputColumns',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'scripts/planning-db-migrate.test.cjs',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DVT-TRANSFORM-COLUMN-SELECTION-20260625',
    'path',
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
    'model',
    'buildDvtTransformColumnOptions',
    jsonb_build_object(
      'role', 'DVT transform upstream input-column read model',
      'rail', 'ReadDvtTransformInputColumns',
      'source', 'connected CanonicalEdge source nodes with recorded metadata.columns'
    ),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('canvasDvtTransformColumnModel.ts:ReadDvtTransformInputColumns:289')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'projects connected source metadata columns and refuses to fabricate absent metadata'
    ),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('canvasDvtTransformColumnModel.test.tsx:289')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'component',
    'DvtSqlTransformAuthoringSection',
    jsonb_build_object(
      'role', 'DVT SQL transform authoring view with selectable upstream columns',
      'rails', jsonb_build_array(
        'ReadDvtTransformInputColumns',
        'ConfigureDvtTransformInputColumns'
      )
    ),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('DvtSqlTransformAuthoringSection.tsx:ConfigureDvtTransformInputColumns:289')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'integration',
    'DvtAuthoringFields',
    jsonb_build_object(
      'role', 'passes graph nodes and edges into the DVT transform authoring section'
    ),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('DvtAuthoringFields.tsx:DVT transform graph context:289')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
    'model',
    'applyDvtNodeAuthoringMetadata',
    jsonb_build_object(
      'role', 'persists selected DVT transform input-column refs into metadata.config.selectedColumns'
    ),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('canvasDvtAuthoringModel.ts:selectedColumns:289')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'ReadDvtTransformInputColumns',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Projects selectable input-column options from connected upstream source node metadata.',
      'owner', 'canvasDvtTransformColumnModel',
      'negativeTests', jsonb_build_array(
        'canvasDvtTransformColumnModel.test.tsx refuses to fabricate columns when source metadata has no columns'
      )
    ),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('DvtSqlTransformAuthoringSection:ReadDvtTransformInputColumns:289')
  ),
  (
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'ConfigureDvtTransformInputColumns',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Updates the route-owned DVT SQL transform draft and persists selected input-column refs through the existing node authoring apply path.',
      'owner', 'DvtSqlTransformAuthoringSection',
      'negativeTests', jsonb_build_array(
        'canvasInspectorAuthoringModel.test.ts proves selectedColumns are written into metadata.config.selectedColumns'
      )
    ),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('DvtSqlTransformAuthoringSection:ConfigureDvtTransformInputColumns:289')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'EV-WEB-CANVAS-DVT-TRANSFORM-COLUMNS-PRESENTATION',
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'passing',
    jsonb_build_object('scope', 'DVT transform upstream input-column read model and visible selector'),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('EV-WEB-CANVAS-DVT-TRANSFORM-COLUMNS-PRESENTATION:289')
  ),
  (
    'EV-WEB-CANVAS-DVT-TRANSFORM-COLUMNS-UNIT',
    'web.component.canvas.DvtSqlTransformAuthoringSection',
    'test',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'passing',
    jsonb_build_object('scope', 'DVT transform selectedColumns persistence into metadata.config'),
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    md5('EV-WEB-CANVAS-DVT-TRANSFORM-COLUMNS-UNIT:289')
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#DVT-CANVAS-P0-PRO-FLOW-1#command#configuredvttransforminputcolumns',
  'DVT-CANVAS-P0-PRO-FLOW-1',
  'implemented',
  'ConfigureDvtTransformInputColumns',
  'configuredvttransforminputcolumns',
  'command',
  'DvtSqlTransformAuthoringSection',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts#DvtTransformColumnOption',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts#readDvtSelectedColumnRefs',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts#buildDvtTransformColumnOptions',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx#DvtSqlTransformAuthoringSection',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts#DvtSqlTransformAuthoringMetadata',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts#applyDvtNodeAuthoringMetadata'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
    'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
    'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
    'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
    'docs/planning/status/generated-code-state.md',
    'docs/planning/status/system-governance-file-index-20260501.md',
    'docs/planning/status/system-governance-file-index.files.yaml',
    'docs/planning/status/system-governance-component-index-20260501.md',
    'docs/planning/status/system-governance-component-index.components.yaml',
    'docs/planning/status/system-governance-component-file-map-20260503.md',
    'docs/planning/status/system-governance-component-file-map.components.yaml',
    'docs/planning/status/governance-components/**'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'node --test --test-name-pattern "tracked migrations register DVT transform column selection" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
    'node --test --test-name-pattern "tracked migrations register DVT transform column selection" scripts/planning-db-migrate.test.cjs',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
  md5('DVT-CANVAS-P0-PRO-FLOW-1:ConfigureDvtTransformInputColumns:289')
    || md5('ReadDvtTransformInputColumns:canvasDvtTransformColumnModel'),
  jsonb_build_object(
    'name', 'ConfigureDvtTransformInputColumns',
    'type', 'command',
    'dddOwner', 'DvtSqlTransformAuthoringSection',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'DVT-CANVAS-P0-PRO-FLOW-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'p0FlowClosed', false,
    'implementationPlan',
    'Expose connected DVT source columns inside SQL transform authoring and persist selected input-column refs into node metadata. This is a product P0 slice, not full completion of TAREA.TXT.',
    'componentGuides', jsonb_build_array(
      'web.component.canvas.DvtSqlTransformAuthoringSection'
    ),
    'userStories', jsonb_build_array(
      'As a DVT author, when a SQL transform is connected to source nodes with recorded columns, I can see those upstream columns in the transform authoring surface.',
      'As a DVT author, I can select the columns the transform intends to consume and the selection is persisted on the transform node.',
      'As a maintainer, missing upstream metadata does not create fake column choices.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
      'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
      'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
      'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
      'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql',
      'docs/planning/status/generated-code-state.md',
      'docs/planning/status/system-governance-file-index-20260501.md',
      'docs/planning/status/system-governance-file-index.files.yaml',
      'docs/planning/status/system-governance-component-index-20260501.md',
      'docs/planning/status/system-governance-component-index.components.yaml',
      'docs/planning/status/system-governance-component-file-map-20260503.md',
      'docs/planning/status/system-governance-component-file-map.components.yaml',
      'docs/planning/status/governance-components/**'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'packages/@dvt/contracts/**',
      'packages/@dvt/planner/**',
      'apps/web/cypress/e2e/**#fake_canvas_success',
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'DvtTransformColumnOption',
      'DvtSqlTransformAuthoringSection',
      'CanvasInspectorNodeDraft',
      'CanonicalNode',
      'CanonicalEdge'
    ),
    'fowlerSignals', jsonb_build_array(
      'hidden_authority',
      'presentation_logic_extraction',
      'dbfirst_component_mapping'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ReadDvtTransformInputColumns',
        'type', 'query',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'ConfigureDvtTransformInputColumns',
        'type', 'command',
        'dddOwner', 'DvtSqlTransformAuthoringSection',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'dvt-transform-column-read-model',
        'redTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'expectedFailure',
        'The DVT transform column projection model does not exist.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
          'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
      ),
      jsonb_build_object(
        'id', 'dvt-transform-column-authoring-view',
        'redTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx',
        'expectedFailure',
        'The DVT transform authoring section does not render selectable input columns from connected source metadata.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/DvtAuthoringFields.tsx',
          'apps/web/src/app/views/canvas/CanvasInspectorAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
      ),
      jsonb_build_object(
        'id', 'dvt-transform-column-persistence',
        'redTest',
        'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'expectedFailure',
        'Selected DVT transform input-column refs are not persisted into metadata.config.selectedColumns.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
          'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        ),
        'greenTest',
        'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'dbfirst-dvt-transform-column-registration',
        'redTest',
        'node --test --test-name-pattern "tracked migrations register DVT transform column selection" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'Planning DB has no local component, rail, and feature-mechanization registration for transform column selection.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/289_register_dvt_transform_column_selection.sql'
        ),
        'greenTest',
        'node --test --test-name-pattern "tracked migrations register DVT transform column selection" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'DvtTransformColumnOption',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'BuildDvtTransformColumnOptionsArgs',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'DvtTransformColumn',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'isRecord',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'readString',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'readBoolean',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'readStringArray',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns', 'ConfigureDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'readMetadataConfig',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns', 'ConfigureDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'readColumns',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'readDvtSelectedColumnRefs',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns', 'ConfigureDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'buildDvtTransformColumnOptions',
        'path', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.ts',
        'dddOwner', 'canvasDvtTransformColumnModel',
        'cqRails', jsonb_build_array('ReadDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'DvtSqlTransformAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/DvtSqlTransformAuthoringSection.tsx',
        'dddOwner', 'DvtAuthoringFields',
        'cqRails', jsonb_build_array(
          'ReadDvtTransformInputColumns',
          'ConfigureDvtTransformInputColumns'
        ),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/DvtAuthoringFields.test.tsx',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/DvtAuthoringFields.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'DvtSqlTransformAuthoringMetadata',
        'path', 'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'normalizeSelectedColumnRefs',
        'path', 'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'readConfigFromMetadata',
        'path', 'apps/web/src/app/views/canvas/canvasDvtAuthoringModel.ts',
        'dddOwner', 'CanvasInspectorAuthoringModel',
        'cqRails', jsonb_build_array('ConfigureDvtTransformInputColumns'),
        'fowlerSignals', jsonb_build_array('hidden_authority', 'presentation_logic_extraction'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
        'cypressCoverage', 'covered_by_existing_canvas_source_import_contextual_flow',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts'
        )
      )
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
      'node --test --test-name-pattern "tracked migrations register DVT transform column selection" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'covered_by_existing_canvas_source_import_contextual_flow; no fake intercepts added'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/canvasDvtTransformColumnModel.test.tsx src/app/views/canvas/DvtAuthoringFields.test.tsx',
      'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/views/canvas/canvasInspectorAuthoringModel.test.ts',
      'node --test --test-name-pattern "tracked migrations register DVT transform column selection" scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
