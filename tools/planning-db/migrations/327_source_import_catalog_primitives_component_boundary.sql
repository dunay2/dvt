-- Register the Source Import catalog presentation primitives as a DB-first
-- component boundary. This keeps SourceImportCatalogView as a thin template
-- and moves table/schema/column presentation into a governed primitive layer.

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
  'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
  'E-CANVAS-UXDB-COMPONENT-SLICES-1',
  'Source Import catalog primitives component boundary',
  'Frontend / Source Import',
  'implemented',
  'SourceImportCatalogView must remain a presentational composition over the catalog read model. The extracted SourceImportCatalogPrimitives component owns schema headers, table cards, column preview rows and class tokens so the view does not accumulate ad hoc JSX/CSS while preserving the existing warehouse source import rails.',
  'responsibility_overload',
  'RenderSourceImportCatalogView',
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
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'component',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'may_update',
    true
  ),
  (
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'component',
    'web.component.canvas.SourceImportDialog',
    'may_reference',
    true
  ),
  (
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'query',
    'RenderSourceImportCatalogView',
    'may_update',
    true
  ),
  (
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'path',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'may_update',
    true
  ),
  (
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'path',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'may_create',
    true
  ),
  (
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'path',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
    'may_create',
    true
  ),
  (
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'path',
    'scripts/planning-db-migrate.test.cjs',
    'may_update',
    true
  ),
  (
    'SOURCE-IMPORT-CATALOG-PRIMITIVES-BOUNDARY-20260626',
    'path',
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'Canvas source import catalog view',
  'query-view',
  'current',
  'extract',
  'SourceImportCatalogViewPresentation',
  'Render warehouse schemas, table metrics, column previews and selection callbacks from the source import catalog read model through component-owned presentation primitives.',
  '@dvt/web',
  '/canvas',
  'canvas',
  '[]'::jsonb,
  jsonb_build_array(
    'EV-WEB-SOURCE-IMPORT-CATALOG-PRIMITIVES-ARCHITECTURE',
    'EV-WEB-SOURCE-IMPORT-CATALOG-VIEW-PRESENTATION'
  ),
  'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
  md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:327'),
  jsonb_build_object(
    'fowlerSignal', 'responsibility_overload',
    'parentComponent', 'web.component.canvas.SourceImportDialog',
    'ownedPrimitiveLayer', 'SourceImportCatalogPrimitives',
    'rail', 'RenderSourceImportCatalogView'
  )
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
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'component',
    'SourceImportCatalogView',
    jsonb_build_object(
      'role', 'thin catalog view template over SourceImportCatalogViewModel',
      'rail', 'RenderSourceImportCatalogView',
      'presentationBoundary', 'delegates schema, table and column rendering to SourceImportCatalogPrimitives'
    ),
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    md5('SourceImportCatalogView.tsx:primitives-boundary:327')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'component',
    'SourceImportCatalogPrimitives',
    jsonb_build_object(
      'role', 'catalog schema/table/column presentation primitives and class-token map',
      'rail', 'RenderSourceImportCatalogView',
      'exports', jsonb_build_array(
        'sourceImportCatalogClassNames',
        'SourceImportCatalogEmptyState',
        'SourceImportSchemaGroups',
        'SourceImportSchemaHeader',
        'SourceImportSchemaTableList',
        'SourceImportColumnPreviewList',
        'SourceImportTableCard'
      )
    ),
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    md5('SourceImportCatalogPrimitives.tsx:327')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'coverage', 'catalog rendering remains behaviorally stable after primitive extraction',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    md5('SourceImportCatalogView.test.tsx:327')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage', 'catalog view delegates UI imports and class tokens to SourceImportCatalogPrimitives',
      'rail', 'RenderSourceImportCatalogView'
    ),
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    md5('SourceImportCatalogView.architecture.test.ts:327')
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
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'RenderSourceImportCatalogView',
  'query',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Render the Add Source catalog read model with governed schema, table and column presentation primitives.',
    'owner', 'SourceImportCatalogViewPresentation',
    'negativeTests', jsonb_build_array(
      'SourceImportCatalogView.architecture.test.ts rejects direct UI imports in SourceImportCatalogView.tsx',
      'SourceImportCatalogView.architecture.test.ts rejects className usage in SourceImportCatalogView.tsx'
    )
  ),
  'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
  md5('SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW:RenderSourceImportCatalogView:327')
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
    'EV-WEB-SOURCE-IMPORT-CATALOG-PRIMITIVES-ARCHITECTURE',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'test',
    'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
    'passing',
    jsonb_build_object(
      'scope', 'SourceImportCatalogView delegates UI primitives and class tokens to SourceImportCatalogPrimitives',
      'redGreenCycle', 'expected failure: SourceImportCatalogPrimitives.tsx was absent and SourceImportCatalogView owned direct UI imports/className strings'
    ),
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    md5('EV-WEB-SOURCE-IMPORT-CATALOG-PRIMITIVES-ARCHITECTURE:327')
  ),
  (
    'EV-WEB-SOURCE-IMPORT-CATALOG-VIEW-PRESENTATION',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'test',
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'passing',
    jsonb_build_object(
      'scope', 'SourceImportCatalogView behavior remains stable after primitive extraction'
    ),
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    md5('EV-WEB-SOURCE-IMPORT-CATALOG-VIEW-PRESENTATION:327')
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
  'local#E-CANVAS-UXDB-COMPONENT-SLICES-1#query#rendersourceimportcatalogview',
  'E-CANVAS-UXDB-COMPONENT-SLICES-1',
  'implemented',
  'RenderSourceImportCatalogView',
  'rendersourceimportcatalogview',
  'query',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#sourceImportCatalogClassNames',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportSchemaHeaderProps',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportTableCardProps',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportCatalogEmptyState',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportSchemaGroups',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportSchemaHeader',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportSchemaTableList',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportColumnPreviewList',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx#SourceImportTableCard',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx#SourceImportCatalogView'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql'
  ),
  jsonb_build_array(
    'planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'planning-db:task/E-CANVAS-UXDB-COMPONENT-SLICES-1',
    'planning-db:rail/RenderSourceImportCatalogView'
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
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
    'docs/planning/status/generated-code-state.md'
  ),
  jsonb_build_array(
    'SourceImportCatalogView.architecture.test.ts',
    'SourceImportCatalogView.test.tsx',
    'node --test scripts/planning-db-migrate.test.cjs'
  ),
  jsonb_build_object(
    'tests', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'node --test scripts/planning-db-migrate.test.cjs'
    ),
    'dbQueries', jsonb_build_array(
      'pnpm planning:db:query component-profile --component SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW --no-refresh --limit 120',
      'pnpm planning:db:query frontend-component-files --limit 500'
    ),
    'noHumanDecisionsRemaining', true
  ),
  'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
  md5('E-CANVAS-UXDB-COMPONENT-SLICES-1:RenderSourceImportCatalogView:327'),
  jsonb_build_object(
    'purpose', 'Render Source Import catalog presentation through governed primitives.',
    'owner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
    'componentId', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-UXDB-COMPONENT-SLICES-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extract Source Import catalog table/schema/column presentation into component primitives before continuing TAREA.TXT product behavior slices.',
    'componentGuides', jsonb_build_array('planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'),
    'userStories', jsonb_build_array(
      'As a frontend maintainer, I can change Source Import catalog card presentation without editing catalog read-model composition.',
      'As a reviewer, I can see Source Import catalog primitives, tests and rails in Planning DB instead of inferring ownership from JSX.'
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
        'name', 'RenderSourceImportCatalogView',
        'type', 'query',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SI-CATALOG-PRIMITIVES-ARCH-001',
        'redTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
        'expectedFailure', 'SourceImportCatalogPrimitives.tsx did not exist and SourceImportCatalogView owned UI imports/className strings.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts'
      ),
      jsonb_build_object(
        'id', 'SI-CATALOG-PRIMITIVES-DB-001',
        'redTest', 'node --test scripts/planning-db-migrate.test.cjs',
        'expectedFailure', 'Migration 327 was absent, so the new primitive file had no Planning DB component boundary.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql'
        ),
        'greenTest', 'node --test scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'sourceImportCatalogClassNames',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_token_boundary'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportSchemaHeaderProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: internal presentation prop type only',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportTableCardProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: internal presentation prop type only',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportCatalogEmptyState',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportSchemaGroups',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportSchemaHeader',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportSchemaTableList',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportColumnPreviewList',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportTableCard',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      ),
      jsonb_build_object(
        'name', 'SourceImportCatalogView',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('thin_view_template'),
        'architectureGuard', 'SourceImportCatalogView.architecture.test.ts',
        'cypressCoverage', 'not_applicable: presentation primitive extraction keeps existing Source Import browser flow unchanged',
        'unitTests', jsonb_build_array('SourceImportCatalogView.test.tsx')
      )
    ),
    'domainObjects', jsonb_build_array(
      'SourceImportCatalogView',
      'SourceImportCatalogPrimitives',
      'SourceImportTableCard',
      'SourceImportColumnPreviewList'
    ),
    'fowlerSignals', jsonb_build_array('presentation_logic_mixing', 'large_class', 'primitive_obsession'),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogPrimitives.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/327_source_import_catalog_primitives_component_boundary.sql',
      'docs/planning/status/generated-code-state.md'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
      'apps/web/src/app/components/SourceImportWizard.tsx',
      'apps/web/cypress/e2e/canvas/**'
    ),
    'architectureGuards', jsonb_build_array(
      'SourceImportCatalogView.architecture.test.ts',
      'node --test scripts/planning-db-migrate.test.cjs'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable: component-boundary extraction only; existing Add Source browser flow is not changed in this slice'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
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
