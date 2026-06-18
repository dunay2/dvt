-- Map the source import frame files introduced by parallel frontend slices to
-- concrete Planning DB components. No source file is deleted here; old or
-- nonfunctional paths remain candidates for explicit deprecation only when
-- source-drift queries identify them.

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
values
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas source import section tabs test leaf',
    'Architecture / Planning DB / Frontend',
    'review',
    'SourceImportSectionTabs.test.tsx was introduced by a parallel Web Canvas/source-import slice and initially resolved to the composite source import wizard. This design creates a focused test leaf under the source import frame so component quality can answer ownership without broad parent claims.',
    'hidden_authority',
    'CreateArchitectureDesign;CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TEST-EVIDENCE-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas source import section tabs test evidence',
    'Architecture / Planning DB / Frontend',
    'review',
    'The SourceImportSectionTabs test leaf needs explicit architecture test evidence after the ownership leaf is created, so component-profile and component-integrity can answer which executable test validates the leaf.',
    'hidden_authority',
    'RecordArchitectureTestEvidence;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-COMPOSITE-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas source import frame composite',
    'Architecture / Planning DB / Frontend',
    'review',
    'The source import frame is a composite boundary under the source import wizard. Fresh Planning DB migrations need this parent component before creating frame presentation and test leaves, otherwise child architecture rows depend on local operate-only state.',
    'responsibility_overload',
    'CreateArchitectureDesign;CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618',
    'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
    'Web Canvas source import frame presentation leaf',
    'Architecture / Planning DB / Frontend',
    'review',
    'Once SourceImportSectionTabs tests became a child leaf, the source import frame could no longer own presentation files directly. This design moves its real UI widgets into a presentation leaf while keeping the frame as the composite component.',
    'responsibility_overload',
    'CreateArchitectureDesign;CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;CheckPlanningDbComponentIntegrity',
    now()
  )
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-COMPOSITE-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-COMPOSITE-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-COMPOSITE-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-COMPOSITE-20260618', 'path', 'apps/web/src/app/components/sourceImportWizard', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-COMPOSITE-20260618', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-FRAME', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-COMPOSITE-20260618', 'test', 'TEST-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS-20260618', 'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS-20260618', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-FRAME-CONTAINS-SECTION-TABS-TESTS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS-20260618', 'test', 'TEST-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TEST-EVIDENCE-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TEST-EVIDENCE-20260618', 'test', 'TEST-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TEST-EVIDENCE-20260618', 'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'component', 'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'may_reference', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'path', 'apps/web/src/app/components/sourceImportWizard/WizardProgress.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'path', 'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.tsx', 'may_update', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'relation', 'REL-WEB-CANVAS-SOURCE-IMPORT-FRAME-CONTAINS-PRESENTATION', 'may_create', true),
  ('PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION-20260618', 'test', 'TEST-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'planning_query_store.governance_component_local_definitions',
    '5a3ccc05f77a8389ce3d0cf442d6d8a752173b6fbed7b0133ad067d766338d24',
    0,
    'Canvas source import frame',
    'component',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    true,
    'Composite source import frame boundary; runtime presentation files and focused tests are owned by child leaves.',
    'SourceImportWizardFrameComposite',
    'ListWarehouseConnections;ListWarehouseConnectionTables;ImportWarehouseSources',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS',
    'planning_query_store.governance_component_local_definitions',
    'c5de8a480c9571d6b571de32614288e1995eb3d1e48bc7af851f6076546e0f40',
    0,
    'Canvas source import section tabs tests',
    'component',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns focused tests for SourceImportSectionTabs section switching and tab presentation behavior.',
    'SourceImportSectionTabsPresentationTests',
    'ListWarehouseConnections;ListWarehouseConnectionTables;ImportWarehouseSources',
    'codex'
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'planning_query_store.governance_component_local_definitions',
    '6c8ea4814179f16302a629fdf03892dd6134f7f7ea68ece7dc569c7c9fef12a7',
    0,
    'Canvas source import frame presentation',
    'component',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'SYS-DVT',
    'SYS-DVT',
    'review',
    false,
    'Owns source import frame presentation widgets: wizard frame layout, progress, metadata panel, and section tabs runtime UI.',
    'SourceImportWizardFramePresentation',
    'ListWarehouseConnections;ListWarehouseConnectionTables;ImportWarehouseSources',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  revision = excluded.revision,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'owns', 'apps/web/src/app/components/sourceImportWizard/WizardProgress.tsx', 1),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx', 2),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'owns', 'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.tsx', 3)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'responsibility', 'Coordinate the source import wizard frame boundary while delegating presentation widgets and focused tests to child leaves.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'reason_to_change', 'Source import frame composition, child ownership, or wizard-frame boundary changes.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'public_api', 'SourceImportWizardFrame', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'invariant', 'The frame remains a composite owner; direct source files must be owned by leaf presentation or test components.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'consumer', 'SourceImportWizard', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME', 'fowler_signal', 'responsibility_overload', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'responsibility', 'Validate SourceImportSectionTabs tab selection and accessible section navigation behavior.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'reason_to_change', 'Source import section tab presentation, accessibility, or section switching behavior changes.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'public_api', 'SourceImportSectionTabs', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'invariant', 'Section tab tests stay under the source import frame component and do not become a wizard-level ownership leaf.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'consumer', 'SourceImportWizardFrame', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS', 'fowler_signal', 'hidden_authority', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'responsibility', 'Render the source import wizard frame, metadata panel, progress, and section-tab presentation from the source import workflow read models.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'reason_to_change', 'Source import frame layout, progress display, metadata presentation, or section-tab runtime UI changes.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'public_api', 'SourceImportWizardFrame', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'public_api', 'WizardProgress', 1),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'public_api', 'SourceImportMetadataPanel', 2),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'public_api', 'SourceImportSectionTabs', 3),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'invariant', 'Frame presentation components remain UI adapters for source import rails and do not own warehouse import semantics.', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'consumer', 'SourceImportSelectionWorkflow', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0),
  ('SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION', 'fowler_signal', 'responsibility_overload', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'Canvas source import frame',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/sourceImportWizard',
    'Composite SourceImportWizard frame boundary; presentation widgets and focused tests are owned by child components.',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD'
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS',
    'Canvas source import section tabs tests',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx',
    'SourceImportSectionTabs presentation test boundary in apps/web',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME'
  ),
  (
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'Canvas source import frame presentation',
    'ui-view',
    'ui',
    'Frontend / Canvas',
    'apps/web/src/app/components/sourceImportWizard/SourceImportWizardFrame.tsx',
    'SourceImportWizard frame presentation boundary in apps/web',
    'browser',
    'medium',
    'review',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME'
  )
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values
  (
    'RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'Coordinate the source import wizard frame boundary while delegating presentation widgets and focused tests to child leaves.',
    'Source import frame composition, child ownership, or wizard-frame boundary changes.',
    'SourceImportWizardFrameComposite',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS',
    'Validate SourceImportSectionTabs tab selection and accessible section navigation behavior.',
    'Source import section tab presentation, accessibility, or section switching behavior changes.',
    'SourceImportSectionTabsPresentationTests',
    'proposed'
  ),
  (
    'RESP-SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'Render the source import wizard frame, metadata panel, progress, and section-tab presentation from the source import workflow read models.',
    'Source import frame layout, progress display, metadata presentation, or section-tab runtime UI changes.',
    'SourceImportWizardFramePresentation',
    'proposed'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  (
    'REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-FRAME',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'contains',
    'outbound',
    'sync',
    null,
    'not_applicable',
    'internal-ui-component-ownership',
    '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb,
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-SOURCE-IMPORT-FRAME-CONTAINS-SECTION-TABS-TESTS',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS',
    'contains',
    'outbound',
    'sync',
    null,
    'not_applicable',
    'internal-ui-component-ownership',
    '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb,
    'implemented'
  ),
  (
    'REL-WEB-CANVAS-SOURCE-IMPORT-FRAME-CONTAINS-PRESENTATION',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'contains',
    'outbound',
    'sync',
    null,
    'not_applicable',
    'internal-ui-component-ownership',
    '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb,
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx'
  ),
  (
    'TEST-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'apps/web/src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/sourceImportWizard/SourceImportSectionTabs.test.tsx'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
