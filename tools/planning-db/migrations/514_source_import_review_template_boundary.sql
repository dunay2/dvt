-- DB-first mapping for the Add Source selected-review presentation boundary.
-- This is a presentation extraction under the existing wizard-steps component;
-- it does not introduce a new product command or query.

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
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'presentation-template',
    'SourceImportReviewView',
    jsonb_build_object(
      'responsibility', 'Render the selected-source review surface from prepared wizard state without owning source discovery, selection policy, or import submission.',
      'rail', 'ImportWarehouseSources',
      'collaborators', jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
        'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx',
        'apps/web/src/app/components/sourceImportWizard/copy.ts'
      ),
      'exports', jsonb_build_array(
        'SourceImportReviewView',
        'SourceImportReviewSummaryCard',
        'SourceImportAttachmentPreview',
        'sourceImportReviewViewClassNames'
      ),
      'fowlerSignal', 'presentation_template_extraction',
      'negativeTests', jsonb_build_array(
        'ReviewStep does not import card or scroll primitives',
        'ReviewStep does not own selected-source review copy literals',
        'selected-source review continues to render the SourceImportSelectionBasket'
      )
    ),
    'tools/planning-db/migrations/514_source_import_review_template_boundary.sql',
    md5('file:source-import-review-view-template:514')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'container',
    'ReviewStep',
    jsonb_build_object(
      'responsibility', 'Prepare review view models and delegate selected-source review rendering to SourceImportReviewView.',
      'rail', 'ImportWarehouseSources',
      'collaborators', jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'
      ),
      'fowlerSignal', 'container_presentation_split'
    ),
    'tools/planning-db/migrations/514_source_import_review_template_boundary.sql',
    md5('file:source-import-review-step-container:514')
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'copy-contract',
    'sourceImportWizardCopy.review',
    jsonb_build_object(
      'responsibility', 'Own selected-source review labels and destination-posture copy for Add Source.',
      'rail', 'ImportWarehouseSources',
      'tokens', jsonb_build_array(
        'connectionLabel',
        'tablesSelectedLabel',
        'dataObjectGroupsLabel',
        'groupingStrategyLabel',
        'enabledLabel',
        'disabledLabel',
        'destinationPosture',
        'dataObjectGroupPrefix',
        'moreTablesPrefix',
        'moreTablesSuffix'
      ),
      'fowlerSignal', 'presentation_copy_contract'
    ),
    'tools/planning-db/migrations/514_source_import_review_template_boundary.sql',
    md5('file:source-import-review-copy-contract:514')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
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
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'ImportWarehouseSources',
  'command',
  'implemented-ui',
  jsonb_build_object(
    'kind', 'command',
    'dddObject', 'WarehouseSourceImportSelection',
    'applicationPort', 'IWarehouseSourceImportPort.importSources',
    'adapterSurface', 'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'scope', 'canvas_add_source_dialog_selected_review',
    'authorization', 'inherits_workspace_source_import_permissions',
    'collaborators', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
      'apps/web/src/app/components/sourceImportWizard/SourceImportSelectionBasket.tsx'
    ),
    'negativeTests', jsonb_build_array(
      'review step cannot proceed with zero selected tables',
      'selected sources can be removed before ImportWarehouseSources runs',
      'destination posture remains visible before attach'
    )
  ),
  'tools/planning-db/migrations/514_source_import_review_template_boundary.sql',
  md5('rail:ImportWarehouseSources:review-template-boundary:514')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = coalesce(planning_query_store.frontend_component_local_cq_rails.raw_rail, '{}'::jsonb)
    || excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'EV-SOURCE-IMPORT-REVIEW-TEMPLATE-BOUNDARY',
  'architecture-test',
  'current',
  'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
  'ImportWarehouseSources',
  'source-import-review-template-boundary',
  'ReviewStep delegates selected-source review presentation to SourceImportReviewView and does not own card, scroll, separator, or review copy literals.',
  jsonb_build_object(
    'redGreen', true,
    'componentOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'symbols', jsonb_build_array(
      'SourceImportReviewView',
      'SourceImportReviewSummaryCard',
      'SourceImportAttachmentPreview'
    )
  ),
  'tools/planning-db/migrations/514_source_import_review_template_boundary.sql',
  md5('evidence:source-import-review-template-boundary:514')
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
  'local#E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1#command#importwarehousesources',
  'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1',
  'implemented',
  'ImportWarehouseSources',
  'importwarehousesources',
  'command',
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx#SourceImportReviewView',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx#SourceImportReviewSummaryCard',
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx#SourceImportAttachmentPreview',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx#ReviewStep',
    'apps/web/src/app/components/sourceImportWizard/copy.ts#sourceImportWizardCopy.review'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
    'tools/planning-db/migrations/514_source_import_review_template_boundary.sql'
  ),
  jsonb_build_array(
    'planning-db:component/SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
    'planning-db:rail/ImportWarehouseSources'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'buzon/TAREA.TXT'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
    'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
    'apps/web/src/app/components/sourceImportWizard/copy.ts',
    'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
    'tools/planning-db/migrations/514_source_import_review_template_boundary.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx'
  ),
  jsonb_build_object(
    'tests',
    jsonb_build_array(
      'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'noHumanDecisionsRemaining',
    true
  ),
  'tools/planning-db/migrations/514_source_import_review_template_boundary.sql',
  md5('E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1:importwarehousesources:514'),
  jsonb_build_object(
    'purpose', 'Keep Add Source selected-source review presentation separate from wizard flow state while preserving the existing ImportWarehouseSources command rail.',
    'owner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Extract selected-source review UI into a dedicated presentation template and move visible review labels into sourceImportWizardCopy.review.',
    'userStories', jsonb_build_array(
      'As a demanding Canvas user, I can review selected source objects in a stable selected-source surface before attaching them to the graph.',
      'As a DVT/Raven maintainer, ReviewStep stays a small container and the selected-source review HTML lives in a dedicated presentation template.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'buzon/TAREA.TXT'
    ),
    'componentGuides', jsonb_build_array('SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'),
    'architectureGuards', jsonb_build_array(
      'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
      'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ImportWarehouseSources',
        'type', 'command',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS'
      )
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
      'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
      'apps/web/src/app/components/sourceImportWizard/copy.ts',
      'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
      'tools/planning-db/migrations/514_source_import_review_template_boundary.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/api/**#source_import_review_presentation',
      'apps/web/cypress/e2e/canvas/**#cy.intercept_workspace_graph_draft',
      'docs/planning/**#manual_primary_source'
    ),
    'domainObjects', jsonb_build_array(
      'SourceImportReviewView',
      'SourceImportSelectionBasket',
      'WarehouseSourceImportSelection'
    ),
    'fowlerSignals', jsonb_build_array(
      'presentation_template_extraction',
      'container_presentation_split',
      'copy_contract'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'SOURCE-IMPORT-REVIEW-TEMPLATE-ARCH-001',
        'redTest', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
        'expectedFailure', 'SourceImportReviewView.tsx does not exist',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
          'apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx',
          'apps/web/src/app/components/sourceImportWizard/copy.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'sourceImportReviewViewClassNames',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('presentation_token_contract'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportReviewViewProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportReviewView',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('presentation_template'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportReviewSummaryCardProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportReviewSummaryCard',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportReviewSummaryRow',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('private_presentation_row'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportAttachmentPreviewProps',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('explicit_interface'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportAttachmentPreview',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('presentation_component'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'SourceImportReviewSourceTableRow',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('private_presentation_row'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      ),
      jsonb_build_object(
        'name', 'formatReviewTableCount',
        'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportReviewView.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array('copy_backed_formatter'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'not_applicable:review_presentation_template_boundary',
        'unitTests', jsonb_build_array(
          'pnpm --filter @dvt/web test:architecture:run -- src/app/components/SourceImportWizard.architecture.test.tsx',
          'pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.metadata.test.tsx src/app/components/SourceImportWizard.test.tsx'
        )
      )
    )
  ),
  1,
  'codex'
)
on conflict (rail_id) do update set
  mechanization_status = excluded.mechanization_status,
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();
