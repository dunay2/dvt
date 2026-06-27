-- Split DBT authoring field presentation into governed source/model sections
-- plus a pure projection model. This keeps DbtAuthoringFields as the thin
-- authoring orchestrator for the existing ConfigureCanvasDbtNode rail.

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
  'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'DBT authoring field section components',
  'Frontend / Canvas',
  'implemented',
  'DbtAuthoringFields mixed graph-origin projection, generated SQL derivation, form controls, validation copy, and DBT source/model markup in one React file. The split keeps the component DB-first under web.component.canvas.DbtAuthoringFields while extracting pure model logic and source/model presentation leaves so later Canvas-first UX changes can target explicit components instead of ad hoc JSX blocks.',
  'responsibility_overload',
  'ConfigureCanvasDbtNode',
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
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'component',
    'web.component.canvas.DbtAuthoringFields',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'query',
    'ConfigureCanvasDbtNode',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts',
    'may_create',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'may_update',
    true
  ),
  (
    'WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-20260627',
    'path',
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.frontend_component_local_components
set
  reuse_decision = 'extract',
  responsibility = 'Owns DBT node authoring presentation through a thin field orchestrator, source/model section components, and pure graph-origin projection logic while the route controller owns DBT node state transitions.',
  evidence_refs = jsonb_build_array(
    'EV-WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-ARCHITECTURE',
    'EV-WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-MODEL',
    'EV-WEB-CANVAS-DBT-AUTHORING-FIELDS-PRESENTATION'
  ),
  source_path = 'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
  source_content_sha256 = md5('web.component.canvas.DbtAuthoringFields:336'),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'responsibility_overload',
      'sectionComponents', jsonb_build_array(
        'DbtSourceAuthoringSection',
        'DbtModelAuthoringSection'
      ),
      'projectionModel', 'dbtAuthoringFieldsModel',
      'rail', 'ConfigureCanvasDbtNode'
    ),
  updated_at = now()
where component_id = 'web.component.canvas.DbtAuthoringFields';

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
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
    'component',
    'DbtAuthoringFields',
    jsonb_build_object(
      'role', 'thin DBT authoring orchestrator',
      'rail', 'ConfigureCanvasDbtNode',
      'delegatesTo', jsonb_build_array('DbtSourceAuthoringSection', 'DbtModelAuthoringSection'),
      'model', 'buildDbtAuthoringModelProjection'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('DbtAuthoringFields.tsx:336')
  ),
  (
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
    'component',
    'DbtSourceAuthoringSection',
    jsonb_build_object(
      'role', 'DBT source package/source/schema/table authoring presentation leaf',
      'rail', 'ConfigureCanvasDbtNode',
      'fowlerSignal', 'extract_component'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('DbtSourceAuthoringSection.tsx:336')
  ),
  (
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
    'component',
    'DbtModelAuthoringSection',
    jsonb_build_object(
      'role', 'DBT model package/materialization/origin/generated-SQL authoring presentation leaf',
      'rail', 'ConfigureCanvasDbtNode',
      'fowlerSignal', 'extract_component'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('DbtModelAuthoringSection.tsx:336')
  ),
  (
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
    'model',
    'buildDbtAuthoringModelProjection',
    jsonb_build_object(
      'role', 'pure DBT authoring origin-option and generated-SQL projection',
      'rail', 'ConfigureCanvasDbtNode',
      'exports', jsonb_build_array(
        'buildDbtAuthoringModelProjection',
        'buildGeneratedDbtModelSqlPreview',
        'buildDbtOriginOptions',
        'resolveDbtModelOrigin',
        'normalizeDbtIdentifier'
      )
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('dbtAuthoringFieldsModel.ts:336')
  ),
  (
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'DBT source and model authoring behavior remains stable after section extraction',
      'rail', 'ConfigureCanvasDbtNode'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('DbtAuthoringFields.test.tsx:336')
  ),
  (
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'DBT authoring graph-origin projection stays pure and deterministic',
      'rail', 'ConfigureCanvasDbtNode'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('dbtAuthoringFieldsModel.test.ts:336')
  ),
  (
    'web.component.canvas.DbtAuthoringFields',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage', 'DBT authoring container delegates source/model presentation and pure projection seams',
      'rail', 'ConfigureCanvasDbtNode'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('canvasInspectorAuthoringComponent.architecture.test.ts:336')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
    'EV-WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-ARCHITECTURE',
    'web.component.canvas.DbtAuthoringFields',
    'test',
    'pnpm --filter @dvt/web test:architecture:run -- canvasInspectorAuthoringComponent.architecture.test.ts',
    'passing',
    jsonb_build_object(
      'scope', 'DbtAuthoringFields delegates source/model rendering and keeps pure projection logic outside React',
      'redGreenCycle', 'expected failure: dbtAuthoringFieldsModel.ts, DbtSourceAuthoringSection.tsx, and DbtModelAuthoringSection.tsx were absent'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('EV-WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-ARCHITECTURE:336')
  ),
  (
    'EV-WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-MODEL',
    'web.component.canvas.DbtAuthoringFields',
    'test',
    'pnpm --filter @dvt/web test:unit:run -- dbtAuthoringFieldsModel.test.ts',
    'passing',
    jsonb_build_object(
      'scope', 'DBT origin selection and generated model SQL projection are deterministic and React-free'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('EV-WEB-CANVAS-DBT-AUTHORING-FIELD-SECTIONS-MODEL:336')
  ),
  (
    'EV-WEB-CANVAS-DBT-AUTHORING-FIELDS-PRESENTATION',
    'web.component.canvas.DbtAuthoringFields',
    'test',
    'pnpm --filter @dvt/web test:presentation:run -- DbtAuthoringFields.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'DBT source/model form behavior remains stable after section extraction'
    ),
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    md5('EV-WEB-CANVAS-DBT-AUTHORING-FIELDS-PRESENTATION:336')
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
  'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#command#configurecanvasdbtnode',
  'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
  'implemented',
  'ConfigureCanvasDbtNode',
  'configurecanvasdbtnode',
  'command',
  'web.component.canvas.DbtAuthoringFields',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx#DbtAuthoringFields',
    'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx#DbtSourceAuthoringSection',
    'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx#DbtModelAuthoringSection',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts#buildDbtAuthoringModelProjection',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts#buildGeneratedDbtModelSqlPreview'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql'
  ),
  jsonb_build_array(
    'planning-db:component/web.component.canvas.DbtAuthoringFields',
    'planning-db:task/E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'planning-db:rail/ConfigureCanvasDbtNode'
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
    'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
    'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
    'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts',
    'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx',
    'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
    'docs/planning/status/generated-code-state.md'
  ),
  jsonb_build_array(
    'canvasInspectorAuthoringComponent.architecture.test.ts',
    'dbtAuthoringFieldsModel.test.ts',
    'DbtAuthoringFields.test.tsx',
    'useCanvasContextMenuPresenter.lifecycle.test.tsx'
  ),
  jsonb_build_object(
    'tests', jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- dbtAuthoringFieldsModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- DbtAuthoringFields.test.tsx',
      'pnpm --filter @dvt/web test:presentation:run -- useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'pnpm --filter @dvt/web test:architecture:run -- canvasInspectorAuthoringComponent.architecture.test.ts',
      'node --test scripts/planning-db-migrate.test.cjs'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
  md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:ConfigureCanvasDbtNode:336'),
  jsonb_build_object(
    'purpose', 'Configure DBT node authoring through a thin container, source/model sections and pure projection model.',
    'owner', 'web.component.canvas.DbtAuthoringFields',
    'contextMenuRepair', 'Document pointer echo suppression now only applies at the original context-menu point.'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extract DBT authoring source/model sections and pure projection model before continuing Canvas-first UI behavior slices.',
    'componentGuides', jsonb_build_array('planning-db:component/web.component.canvas.DbtAuthoringFields'),
    'userStories', jsonb_build_array(
      'As a frontend maintainer, I can change DBT source authoring presentation without editing DBT model-origin projection logic.',
      'As a reviewer, I can see DBT authoring source/model sections and graph projection symbols in Planning DB before UI behavior changes continue.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ConfigureCanvasDbtNode',
        'type', 'command',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields'
      )
    ),
    'domainObjects', jsonb_build_array(
      'DbtAuthoringFields',
      'DbtSourceAuthoringSection',
      'DbtModelAuthoringSection',
      'DbtAuthoringModelProjection',
      'DbtOriginOption'
    ),
    'fowlerSignals', jsonb_build_array(
      'responsibility_overload',
      'presentation_logic_mixing',
      'extract_component',
      'extract_function'
    ),
    'architectureGuards', jsonb_build_array(
      'canvasInspectorAuthoringComponent.architecture.test.ts',
      'dbtAuthoringFieldsModel.test.ts',
      'DbtAuthoringFields.test.tsx',
      'useCanvasContextMenuPresenter.lifecycle.test.tsx'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable: component-boundary and context-menu lifecycle slice; existing Add Source and Canvas browser flows remain covered by their dedicated P0 tasks'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'DBT-AUTHORING-SECTIONS-ARCH-001',
        'redTest', 'pnpm --filter @dvt/web test:architecture:run -- canvasInspectorAuthoringComponent.architecture.test.ts',
        'expectedFailure', 'dbtAuthoringFieldsModel.ts, DbtSourceAuthoringSection.tsx and DbtModelAuthoringSection.tsx were absent.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
          'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
          'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
          'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:architecture:run -- canvasInspectorAuthoringComponent.architecture.test.ts'
      ),
      jsonb_build_object(
        'id', 'DBT-AUTHORING-SECTIONS-MODEL-001',
        'redTest', 'pnpm --filter @dvt/web test:unit:run -- dbtAuthoringFieldsModel.test.ts',
        'expectedFailure', 'dbtAuthoringFieldsModel import could not resolve.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
          'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:unit:run -- dbtAuthoringFieldsModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'CANVAS-CONTEXT-MENU-LIFECYCLE-001',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- useCanvasContextMenuPresenter.lifecycle.test.tsx',
        'expectedFailure', 'Immediate outside document pointerdown was suppressed as browser echo even away from the context point.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
          'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- useCanvasContextMenuPresenter.lifecycle.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'DbtSourceAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_component'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: DBT authoring presentation component extraction preserves existing rendered behavior',
        'unitTests', jsonb_build_array('DbtAuthoringFields.test.tsx')
      ),
      jsonb_build_object(
        'name', 'DbtModelAuthoringSection',
        'path', 'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_component'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: DBT authoring presentation component extraction preserves existing rendered behavior',
        'unitTests', jsonb_build_array('DbtAuthoringFields.test.tsx')
      ),
      jsonb_build_object(
        'name', 'DbtAuthoringModelProjection',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: projection type has no browser behavior',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'DbtOriginNode',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: projection type has no browser behavior',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'DbtOriginOption',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: projection type has no browser behavior',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildDbtOriginOptions',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: pure projection function covered by unit tests',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildDbtAuthoringModelProjection',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: pure projection function covered by unit tests',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'buildGeneratedDbtModelSqlPreview',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: pure projection function covered by unit tests',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'isDbtOriginNode',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: pure projection function covered by unit tests',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'normalizeDbtIdentifier',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: pure projection function covered by unit tests',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      ),
      jsonb_build_object(
        'name', 'resolveDbtModelOrigin',
        'path', 'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
        'dddOwner', 'web.component.canvas.DbtAuthoringFields',
        'cqRails', jsonb_build_array('ConfigureCanvasDbtNode'),
        'fowlerSignals', jsonb_build_array('extract_function'),
        'architectureGuard', 'canvasInspectorAuthoringComponent.architecture.test.ts',
        'cypressCoverage', 'not_applicable: pure projection function covered by unit tests',
        'unitTests', jsonb_build_array('dbtAuthoringFieldsModel.test.ts')
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/DbtAuthoringFields.tsx',
      'apps/web/src/app/views/canvas/DbtSourceAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/DbtModelAuthoringSection.tsx',
      'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.ts',
      'apps/web/src/app/views/canvas/dbtAuthoringFieldsModel.test.ts',
      'apps/web/src/app/views/canvas/DbtAuthoringFields.test.tsx',
      'apps/web/src/app/views/canvas/canvasInspectorAuthoringComponent.architecture.test.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
      'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'tools/planning-db/migrations/336_dbt_authoring_field_section_components.sql',
      'docs/planning/status/generated-code-state.md'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts',
      'apps/web/src/app/views/canvas/canvasDbtAuthoringModel.ts',
      'apps/web/cypress/e2e/canvas/**'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:unit:run -- dbtAuthoringFieldsModel.test.ts',
      'pnpm --filter @dvt/web test:presentation:run -- DbtAuthoringFields.test.tsx',
      'pnpm --filter @dvt/web test:presentation:run -- useCanvasContextMenuPresenter.lifecycle.test.tsx',
      'pnpm --filter @dvt/web test:architecture:run -- canvasInspectorAuthoringComponent.architecture.test.ts',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    )
  ),
  1,
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
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision),
  updated_at = now();
