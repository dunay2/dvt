-- Close the DBT model SQL authority containment only after the protected
-- browser flow proves node-code authoring, graph publication, Project Code
-- read-only posture, and fail-closed handling of a newer file revision.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'evidence', 'EVIDENCE-WEB-DBT-GRAPH-SQL-AUTHORITY-LIVE', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'test', 'TEST-WEB-DBT-GRAPH-SQL-AUTHORITY-LIVE', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.design
set
  status = 'implemented',
  rationale = rationale || E'\n\nCloseout: graph-derived DBT model SQL now carries a payload-integrity marker, all artifacts complete preflight before the first write, and every save retains the exact revision observed during preflight. A newer unmarked or malformed model file stops Preview without writing any artifact. Project Code renders graph-owned files read-only, while file-authoritative DBT projects retain revision-guarded editing. Protected browser evidence exercises the node Code affordance, Preview, Run, Project Code, an external file edit, and byte-for-byte preservation after the rejected Preview.',
  approved_at = coalesce(approved_at, now()),
  updated_at = now()
where design_id = 'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722';

update architecture.component
set status = 'implemented', updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
  'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
  'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
  'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE'
);

update architecture.component_responsibility
set status = 'implemented'
where component_id in (
  'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
  'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
  'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
  'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE'
);

update architecture.component_port
set status = 'implemented'
where component_id in (
  'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
  'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
  'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
  'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE'
);

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-WEB-DBT-SQL-PUBLICATION-GUARDS-ARTIFACT-PROJECTION',
  'REL-WEB-CODE-VIEW-CONTAINS-WORKSPACE-FILE-SURFACE',
  'REL-WEB-GRAPH-SURFACE-USES-DBT-ARTIFACT-PUBLISHER',
  'REL-WEB-DBT-ARTIFACT-PUBLISHER-USES-SQL-POLICY',
  'REL-WEB-DBT-ARTIFACT-PUBLISHER-CONSUMES-PROJECTION',
  'REL-WEB-CODE-VIEW-USES-FILE-EDIT-POSTURE',
  'REL-WEB-CODE-FILE-SURFACE-RENDERS-POSTURE'
);

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  (
    'OBS-WEB-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'The publisher returns typed written paths or the exact conflicting path; Canvas Preview and protected workspace-file commands own user-visible and audit signals.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'The deterministic policy is pure; the invoking publisher exposes its typed decision.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'The total edit-posture query is pure and emits no duplicate runtime signal.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'The passive file surface emits no duplicate signal; working-tree status and command ports own persistence outcomes.',
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

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts',
    'unit',
    'negative',
    true,
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'
  ),
  (
    'TEST-WEB-DBT-GRAPH-MANAGED-WORKSPACE-ARTIFACTS',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts',
    'integration',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts'
  ),
  (
    'TEST-WEB-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
    'unit',
    'negative',
    true,
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'
  ),
  (
    'TEST-WEB-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-INTEGRATION',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts',
    'integration',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts'
  ),
  (
    'TEST-WEB-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-ARCHITECTURE',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'
  ),
  (
    'TEST-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/code/codeWorkspaceFileEditPosture.test.ts'
  ),
  (
    'TEST-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx',
    'unit',
    'behavior',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/code/CodeWorkspaceFileSurface.test.tsx'
  ),
  (
    'TEST-WEB-CODE-WORKSPACE-FILE-SURFACE-INTEGRATION',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'apps/web/src/app/views/CodeView.test.tsx',
    'integration',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/CodeView.test.tsx'
  ),
  (
    'TEST-WEB-CODE-WORKSPACE-FILE-SURFACE-ARCHITECTURE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'apps/web/src/app/views/code/codeMonacoEditableAccess.architecture.test.ts',
    'architecture',
    'boundary',
    true,
    'pnpm --filter @dvt/web test:architecture:run -- src/app/views/code/codeMonacoEditableAccess.architecture.test.ts'
  ),
  (
    'TEST-WEB-DBT-GRAPH-SQL-AUTHORITY-LIVE',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'e2e',
    'flow',
    true,
    'pnpm test:web:e2e:dbt-author-code-run:live'
  ),
  (
    'TEST-WEB-CODE-GRAPH-OWNED-FILE-SURFACE-LIVE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'e2e',
    'flow',
    true,
    'pnpm test:web:e2e:dbt-author-code-run:live'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, source_content_sha256
)
values
  ('EVIDENCE-WEB-DBT-GRAPH-SQL-POLICY-UNIT', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'test', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'pass', repeat(md5('dbt-graph-model-sql-policy:unit:799'), 2)),
  ('EVIDENCE-WEB-DBT-GRAPH-ARTIFACT-PUBLISHER-UNIT', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'test', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'pass', repeat(md5('dbt-graph-artifact-publisher:unit:799'), 2)),
  ('EVIDENCE-WEB-DBT-GRAPH-PLAN-AUTHORITY-INTEGRATION', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'test', 'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts', 'pass', repeat(md5('dbt-graph-plan-authority:integration:799'), 2)),
  ('EVIDENCE-WEB-CODE-FILE-EDIT-POSTURE-UNIT', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'test', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts', 'pass', repeat(md5('code-file-edit-posture:unit:799'), 2)),
  ('EVIDENCE-WEB-CODE-FILE-SURFACE-PRESENTATION', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'test', 'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx', 'pass', repeat(md5('code-file-surface:presentation:799'), 2)),
  ('EVIDENCE-WEB-CODE-FILE-SURFACE-INTEGRATION', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'test', 'apps/web/src/app/views/CodeView.test.tsx', 'pass', repeat(md5('code-file-surface:integration:799'), 2)),
  ('EVIDENCE-WEB-DBT-GRAPH-SQL-AUTHORITY-LIVE', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'test', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'pass', repeat(md5('dbt-graph-sql-authority:live:799'), 2)),
  ('EVIDENCE-WEB-CODE-GRAPH-OWNED-FILE-SURFACE-LIVE', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'test', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'pass', repeat(md5('code-graph-owned-file-surface:live:799'), 2))
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  source_content_sha256 = excluded.source_content_sha256,
  recorded_at = now();

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY'
  and item_kind = 'invariant'
  and item_value = 'A valid graph-managed marker authenticates its exact payload by SHA-256; malformed or mismatched markers are divergent.';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'invariant', 'A valid graph-managed marker self-verifies exact payload integrity by SHA-256; it is not creator authentication, and malformed or mismatched markers are divergent.', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'public_api', 'createGraphManagedDbtModelSql(payload); classifyGraphModelSqlPublication({ proposedContent, currentFile })', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'transition', 'Proposed managed SQL plus optional current bytes becomes create, unchanged, replace-managed, adopt-legacy-equivalent, or conflict.', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'consumer', 'DbtGraphWorkspaceArtifactPublisher and DbtWorkspaceArtifactProjection.', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'public_api', 'publishGraphDbtWorkspaceArtifacts({ artifacts, workspaceFilesQuery, workspaceFileContentCommand })', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'transition', 'Requested artifacts become a complete prepared set, an exact conflict result, or revision-bound workspace writes.', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'consumer', 'executeCanvasPlanAction in the graph-draft Preview strategy.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'public_api', 'resolveCodeWorkspaceFileEditPosture({ authority, selectedPath, graphOwnedPaths })', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'transition', 'Explicit Canvas authority and file identity become editable or graph-owned read-only posture.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'consumer', 'CodeView route orchestration.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'public_api', 'CodeWorkspaceFileSurface(props)', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'transition', 'A supplied edit posture selects exactly one Monaco editor or viewer presentation.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'consumer', 'CodeView primary workbench surface.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:799'), 2),
  revision = revision + 1
where component_id in (
  'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
  'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
  'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
  'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE'
);

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values (
  'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
  'DbtGraphWorkspaceArtifactPublisher',
  'state-view',
  'current',
  'extract',
  'Frontend / Canvas DBT publication',
  'Preflight graph-derived DBT artifacts, bind observed revisions, and publish only after complete fail-closed classification.',
  '@dvt/web',
  '/canvas',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object(
    'architectureComponentId', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'applicationService', true,
    'ownsIoSequence', true,
    'atomicPublicationTask', 'E-WEB-DBT-ATOMIC-PUBLICATION-1'
  ),
  'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
  md5('component:DbtGraphWorkspaceArtifactPublisher:current:799')
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

update planning_query_store.frontend_component_local_components
set
  component_status = 'current',
  reuse_decision = case component_id
    when 'web.component.canvas.DbtGraphModelSqlPublicationPolicy' then 'create'
    else 'extract'
  end,
  plugin_scope = null,
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'implementationStatus', 'implemented',
    'strictBrowserProof', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
  ),
  source_path = 'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
  source_content_sha256 = md5(component_id || ':current:799'),
  updated_at = now()
where component_id in (
  'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
  'web.component.code.CodeWorkspaceFileEditPosture',
  'web.component.code.CodeWorkspaceFileSurface'
);

delete from planning_query_store.frontend_component_capability_gaps
where component_id = 'web.component.canvas.DbtGraphModelSqlPublicationPolicy'
  and gap_id = 'GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION';

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values (
  'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
  'GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION',
  'transaction-boundary',
  'planned',
  'Complete preflight prevents known divergence from starting publication, but a later compare-and-swap failure can still leave an earlier artifact written until atomic batch publication is implemented.',
  'E-WEB-DBT-ATOMIC-PUBLICATION-1',
  jsonb_build_object(
    'newDebt', false,
    'existingTask', true,
    'containment', 'complete preflight plus per-file compare-and-swap',
    'architectureOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER'
  ),
  'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
  md5('gap:dbt-graph-workspace-atomic-publication:publisher:799')
)
on conflict (component_id, gap_id) do update set
  gap_kind = excluded.gap_kind,
  gap_status = excluded.gap_status,
  description = excluded.description,
  owning_task_id = excluded.owning_task_id,
  raw_gap = excluded.raw_gap,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
    'command',
    'publishGraphDbtWorkspaceArtifacts',
    jsonb_build_object('ownership', 'exclusive', 'effects', 'workspace-file read and guarded write'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:DbtGraphWorkspaceArtifactPublisher:source:799')
  ),
  (
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
    'unit-test',
    null,
    jsonb_build_object('proves', 'complete preflight, zero writes on divergence, observed-revision binding, no-op skips, and read failure propagation'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:DbtGraphWorkspaceArtifactPublisher:test:799')
  ),
  (
    'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
    'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts',
    'query',
    'classifyGraphModelSqlPublication',
    jsonb_build_object('ownership', 'exclusive', 'pure', true),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:DbtGraphModelSqlPublicationPolicy:source:799')
  ),
  (
    'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
    'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts',
    'unit-test',
    null,
    jsonb_build_object('proves', 'create, unchanged, managed replacement, legacy-equivalent adoption, malformed marker rejection, and external divergence'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:DbtGraphModelSqlPublicationPolicy:test:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileEditPosture',
    'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts',
    'query',
    'resolveCodeWorkspaceFileEditPosture',
    jsonb_build_object('ownership', 'exclusive', 'pure', true),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:CodeWorkspaceFileEditPosture:source:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileEditPosture',
    'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts',
    'unit-test',
    null,
    jsonb_build_object('proves', 'graph-owned read-only, file-authoritative editing, unrelated fallback editing, and unresolved-path safety'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:CodeWorkspaceFileEditPosture:test:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileSurface',
    'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx',
    'presentation',
    'CodeWorkspaceFileSurface',
    jsonb_build_object('ownership', 'exclusive', 'presentationOnly', true),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:CodeWorkspaceFileSurface:source:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileSurface',
    'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object('proves', 'exactly one editor or viewer and no editable callback in graph-owned posture'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('file:CodeWorkspaceFileSurface:test:799')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'GetWorkspaceFileContent',
    'query',
    'implemented',
    jsonb_build_object('role', 'complete-preflight-input', 'ownership', 'consumed'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('rail:DbtGraphWorkspaceArtifactPublisher:Get:799')
  ),
  (
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'SaveWorkspaceFileContent',
    'command',
    'implemented',
    jsonb_build_object('role', 'revision-bound-publication', 'ownership', 'consumed'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('rail:DbtGraphWorkspaceArtifactPublisher:Save:799')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_plugin_scopes (
  component_id, plugin_id, scope_status, raw_scope, source_path,
  source_content_sha256
)
values
  ('web.component.canvas.DbtGraphWorkspaceArtifactPublisher', 'dbt', 'current', jsonb_build_object('scopeReason', 'The publisher handles graph-derived DBT workspace artifacts.'), 'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql', md5('scope:DbtGraphWorkspaceArtifactPublisher:dbt:799')),
  ('web.component.canvas.DbtGraphModelSqlPublicationPolicy', 'dbt', 'current', jsonb_build_object('scopeReason', 'The policy classifies graph-derived DBT model SQL.'), 'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql', md5('scope:DbtGraphModelSqlPublicationPolicy:dbt:799')),
  ('web.component.code.CodeWorkspaceFileEditPosture', 'dbt', 'current', jsonb_build_object('scopeReason', 'The posture distinguishes graph-owned files from a DBT project-file authority.'), 'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql', md5('scope:CodeWorkspaceFileEditPosture:dbt:799')),
  ('web.component.code.CodeWorkspaceFileSurface', 'dbt', 'current', jsonb_build_object('scopeReason', 'The surface presents a DBT workspace file in the contextual Code workbench.'), 'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql', md5('scope:CodeWorkspaceFileSurface:dbt:799'))
on conflict (component_id, plugin_id) do update set
  scope_status = excluded.scope_status,
  raw_scope = excluded.raw_scope,
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
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'EV-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
    'SaveWorkspaceFileContent',
    'graph-derived-dbt-publication',
    'All artifacts finish preflight before the first write, exact observed revisions reach SaveWorkspaceFileContent, divergent SQL produces zero writes, and unchanged content is skipped.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:DbtGraphWorkspaceArtifactPublisher:unit:799')
  ),
  (
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'EV-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-INTEGRATION',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts',
    'SaveWorkspaceFileContent',
    'canvas-preview',
    'Canvas Preview delegates publication and returns the exact localized conflict without calling Preview when model SQL diverges.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:DbtGraphWorkspaceArtifactPublisher:integration:799')
  ),
  (
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'EV-DBT-GRAPH-SQL-AUTHORITY-LIVE',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'RunDbtAuthorCodeRunLiveProof',
    'protected-live-canvas',
    'A user authors model SQL from the selected node, previews and runs it, opens generated Project Code, applies a newer external edit, and observes fail-closed Preview with the external bytes preserved.',
    jsonb_build_object('command', 'pnpm test:web:e2e:dbt-author-code-run:live', 'result', '1 passing', 'draftIntercept', false),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:DbtGraphSqlAuthority:live:799')
  ),
  (
    'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
    'EV-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts',
    'GenerateDbtWorkspaceArtifacts',
    'graph-model-sql-classification',
    'The total policy distinguishes absent, unchanged, valid managed, legacy-equivalent, malformed managed, and divergent content without I/O.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:DbtGraphModelSqlPublicationPolicy:unit:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileEditPosture',
    'EV-CODE-WORKSPACE-FILE-EDIT-POSTURE-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts',
    null,
    'code-authority-posture',
    'Editability is a total decision over explicit authority, selected path, and graph-owned identities; no path-extension heuristic participates.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/code/codeWorkspaceFileEditPosture.test.ts'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:CodeWorkspaceFileEditPosture:unit:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileSurface',
    'EV-CODE-WORKSPACE-FILE-SURFACE-PRESENTATION',
    'presentation-test',
    'current',
    'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx',
    null,
    'code-file-surface',
    'The passive surface renders exactly one Monaco editor or viewer from the supplied posture and owns no persistence decision.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/code/CodeWorkspaceFileSurface.test.tsx'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:CodeWorkspaceFileSurface:presentation:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileSurface',
    'EV-CODE-WORKSPACE-FILE-SURFACE-INTEGRATION',
    'integration-test',
    'current',
    'apps/web/src/app/views/CodeView.test.tsx',
    'GetWorkspaceFileContent',
    'code-workbench',
    'CodeView supplies explicit graph or project authority, localized status, and the existing reconciliation path only for editable files.',
    jsonb_build_object('command', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/CodeView.test.tsx'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:CodeWorkspaceFileSurface:integration:799')
  ),
  (
    'web.component.code.CodeWorkspaceFileSurface',
    'EV-CODE-GRAPH-OWNED-FILE-SURFACE-LIVE',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
    'RunDbtAuthorCodeRunLiveProof',
    'protected-live-code-workbench',
    'Project Code displays graph-generated SQL and authority guidance without an editor or Save action, while authored SQL remains byte-visible.',
    jsonb_build_object('command', 'pnpm test:web:e2e:dbt-author-code-run:live', 'result', '1 passing'),
    'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
    md5('evidence:CodeGraphOwnedFileSurface:live:799')
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

-- Extend the existing feature rails. No parallel command or query intent is
-- introduced: policy and publisher symbols belong to graph artifact
-- generation, while presentation and strict-browser helpers belong to the
-- established author-code-run proof command.
with incoming(rail_id, symbol) as (
  values
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'GRAPH_MANAGED_SQL_MARKER_PREFIX', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('value_object', 'integrity_marker'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'GRAPH_MANAGED_SQL_PATTERN', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('specification', 'integrity_guard'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'CurrentWorkspaceSqlFile', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'PublishableGraphModelSqlDecision', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('value_object', 'result_type'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'ConflictingGraphModelSqlDecision', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('value_object', 'rejection_result'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'GraphModelSqlPublicationDecision', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('result_type', 'discriminated_union'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'ParsedGraphManagedSql', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('value_object'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'parseValidGraphManagedSql', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('pure_function', 'parser'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'contentRevision', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('pure_function', 'mapper'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'createGraphManagedDbtModelSql', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('pure_function', 'serializer'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'classifyGraphModelSqlPublication', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'cqRails', jsonb_build_array('GenerateDbtWorkspaceArtifacts'), 'fowlerSignals', jsonb_build_array('specification', 'pure_function'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'PreparedArtifact', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('GetWorkspaceFileContent', 'SaveWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('value_object', 'preflight_result'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'ArtifactPreflight', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('GetWorkspaceFileContent', 'SaveWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('result_type', 'discriminated_union'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'GraphDbtWorkspaceArtifactPublicationResult', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('GetWorkspaceFileContent', 'SaveWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('result_type', 'discriminated_union'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'readOptionalWorkspaceFile', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('GetWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('gateway_adapter'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'observedRevision', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('GetWorkspaceFileContent', 'SaveWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('mapper', 'pure_function'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'preflightArtifact', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('GetWorkspaceFileContent', 'SaveWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('application_service', 'preflight'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'assertUniqueArtifactPaths', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('SaveWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('assertion', 'invariant'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts'))),
    ('local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts', jsonb_build_object('name', 'publishGraphDbtWorkspaceArtifacts', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'cqRails', jsonb_build_array('GetWorkspaceFileContent', 'SaveWorkspaceFileContent'), 'fowlerSignals', jsonb_build_array('application_service', 'unit_of_work'), 'architectureGuard', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'CodeWorkspaceFileEditPosture', 'path', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts', 'dddOwner', 'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('value_object', 'presentation_model'), 'architectureGuard', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'resolveCodeWorkspaceFileEditPosture', 'path', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts', 'dddOwner', 'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('specification', 'pure_function'), 'architectureGuard', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'CodeWorkspaceFileSurfaceProps', 'path', 'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx', 'dddOwner', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('parameter_object', 'presentation_model'), 'architectureGuard', 'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'CodeWorkspaceFileSurface', 'path', 'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx', 'dddOwner', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('presentation_component', 'passive_view'), 'architectureGuard', 'apps/web/src/app/views/code/codeMonacoEditableAccess.architecture.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx', 'apps/web/src/app/views/CodeView.test.tsx'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'AUTHORED_MODEL_SQL', 'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'dddOwner', 'DbtAuthorCodeRunBrowserProof', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('test_fixture', 'exact_bytes'), 'architectureGuard', 'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'EXTERNAL_MODEL_SQL', 'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'dddOwner', 'DbtAuthorCodeRunBrowserProof', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('test_fixture', 'conflict_evidence'), 'architectureGuard', 'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'openNodeCodeWorkbench', 'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'dddOwner', 'DbtAuthorCodeRunBrowserProof', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('test_adapter', 'user_interaction'), 'architectureGuard', 'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasNodeFloatingToolbarView.test.tsx'))),
    ('local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof', jsonb_build_object('name', 'openLiveGraphProjectCodeFile', 'path', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'dddOwner', 'DbtAuthorCodeRunBrowserProof', 'cqRails', jsonb_build_array('RunDbtAuthorCodeRunLiveProof'), 'fowlerSignals', jsonb_build_array('test_adapter', 'user_interaction'), 'architectureGuard', 'apps/web/src/app/views/code/codeMonacoEditableAccess.architecture.test.ts', 'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts', 'unitTests', jsonb_build_array('apps/web/src/app/views/CodeView.test.tsx')))
), grouped as (
  select rail_id, jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name') as symbols
  from incoming
  group by rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
          || (
            select jsonb_agg(
              (symbol_value ->> 'path') || '#' || (symbol_value ->> 'name')
            )
            from jsonb_array_elements(grouped.symbols) symbols(symbol_value)
          )
      ) refs(ref)
    ) unique_refs
  ),
  implementation_refs = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        coalesce(rail.implementation_refs, '[]'::jsonb)
          || case rail.rail_id
            when 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts' then jsonb_build_array(
              'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts',
              'apps/web/src/app/views/canvas/canvasPlanAction.ts',
              'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts',
              'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
              'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts',
              'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
              'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts',
              'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql'
            )
            else jsonb_build_array(
              'apps/web/src/app/views/CodeView.tsx',
              'apps/web/src/app/views/CodeView.test.tsx',
              'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts',
              'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts',
              'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx',
              'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx',
              'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
              'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql'
            )
          end
      ) refs(ref)
    ) unique_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
          || case rail.rail_id
            when 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts' then jsonb_build_array(
              'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts',
              'apps/web/src/app/views/canvas/canvasPlanAction.ts',
              'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts',
              'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
              'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts',
              'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
              'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts',
              'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql'
            )
            else jsonb_build_array(
              'apps/web/src/app/views/CodeView.tsx',
              'apps/web/src/app/views/CodeView.test.tsx',
              'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts',
              'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts',
              'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx',
              'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx',
              'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
              'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql'
            )
          end
      ) refs(ref)
    ) unique_refs
  ),
  architecture_guards = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
          || case rail.rail_id
            when 'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts' then jsonb_build_array(
              'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts',
              'pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'
            )
            else jsonb_build_array(
              'pnpm --filter @dvt/web test:presentation:run -- src/app/views/code/CodeWorkspaceFileSurface.test.tsx src/app/views/CodeView.test.tsx',
              'pnpm --filter @dvt/web test:architecture:run -- src/app/views/code/codeMonacoEditableAccess.architecture.test.ts'
            )
          end
      ) refs(ref)
    ) unique_refs
  ),
  completion_gate = (
    select jsonb_agg(to_jsonb(ref) order by ref)
    from (
      select distinct ref
      from jsonb_array_elements_text(
        coalesce(rail.completion_gate, '[]'::jsonb)
          || jsonb_build_array(
            'pnpm test:web:e2e:dbt-author-code-run:live',
            'pnpm docs:feature-mechanization:implementation',
            'pnpm planning:db:integrity:check',
            'pnpm verify:prepush'
          )
      ) refs(ref)
    ) unique_refs
  ),
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb) || jsonb_build_object(
      'implementationStatus', 'implemented',
      'strictBrowserProof', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
    ),
    '{symbols}',
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || grouped.symbols,
    true
  ),
  source_path = 'tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql',
  source_content_sha256 = repeat(md5(rail.rail_id || ':dbt-model-sql-authority:799'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from grouped
where rail.rail_id = grouped.rail_id;

refresh materialized view planning_query_store.component_engineering_component_tree_projection;
refresh materialized view planning_query_store.component_engineering_file_ownership_projection;

do $$
declare
  expected_components text[] := array[
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE'
  ];
  expected_frontend_components text[] := array[
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
    'web.component.code.CodeWorkspaceFileEditPosture',
    'web.component.code.CodeWorkspaceFileSurface'
  ];
  expected_symbols text[] := array[
    'GRAPH_MANAGED_SQL_MARKER_PREFIX',
    'GRAPH_MANAGED_SQL_PATTERN',
    'CurrentWorkspaceSqlFile',
    'PublishableGraphModelSqlDecision',
    'ConflictingGraphModelSqlDecision',
    'GraphModelSqlPublicationDecision',
    'ParsedGraphManagedSql',
    'parseValidGraphManagedSql',
    'contentRevision',
    'createGraphManagedDbtModelSql',
    'classifyGraphModelSqlPublication',
    'PreparedArtifact',
    'ArtifactPreflight',
    'GraphDbtWorkspaceArtifactPublicationResult',
    'readOptionalWorkspaceFile',
    'observedRevision',
    'preflightArtifact',
    'assertUniqueArtifactPaths',
    'publishGraphDbtWorkspaceArtifacts',
    'CodeWorkspaceFileEditPosture',
    'resolveCodeWorkspaceFileEditPosture',
    'CodeWorkspaceFileSurfaceProps',
    'CodeWorkspaceFileSurface',
    'AUTHORED_MODEL_SQL',
    'EXTERNAL_MODEL_SQL',
    'openNodeCodeWorkbench',
    'openLiveGraphProjectCodeFile'
  ];
  incomplete_component_count integer;
  current_frontend_component_count integer;
  mapped_file_count integer;
  duplicate_file_count integer;
  false_leaf_rail_count integer;
  publisher_rail_count integer;
  current_evidence_count integer;
  declared_symbol_count integer;
begin
  if not exists (
    select 1
    from architecture.design
    where design_id = 'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722'
      and status = 'implemented'
  ) then
    raise exception 'DBT model SQL authority containment design is not implemented';
  end if;

  select count(*) into incomplete_component_count
  from architecture.component_maturity_query maturity
  where maturity.component_id = any(expected_components)
    and coalesce(array_length(maturity.missing_reasons, 1), 0) > 0;

  if incomplete_component_count <> 0 then
    raise exception 'DBT model SQL containment left % immature architecture components', incomplete_component_count;
  end if;

  select count(*) into current_frontend_component_count
  from planning_query_store.frontend_component_local_components component
  where component.component_id = any(expected_frontend_components)
    and component.component_status = 'current';

  if current_frontend_component_count <> cardinality(expected_frontend_components) then
    raise exception 'DBT model SQL containment frontend components are not current: % of %', current_frontend_component_count, cardinality(expected_frontend_components);
  end if;

  select count(*) into mapped_file_count
  from planning_query_store.frontend_component_local_files file
  where file.component_id = any(expected_frontend_components);

  if mapped_file_count <> 8 then
    raise exception 'DBT model SQL containment file ownership is incomplete: % of 8', mapped_file_count;
  end if;

  select count(*) into duplicate_file_count
  from (
    select file.file_path
    from planning_query_store.frontend_component_file_query file
    where file.file_path in (
      'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
      'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
      'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts',
      'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts',
      'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts',
      'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts',
      'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx',
      'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx'
    )
    group by file.file_path
    having count(distinct file.component_id) <> 1
  ) duplicate_claims;

  if duplicate_file_count <> 0 then
    raise exception 'DBT model SQL containment has % duplicate frontend file ownership claims', duplicate_file_count;
  end if;

  select count(*) into false_leaf_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id in (
    'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
    'web.component.code.CodeWorkspaceFileEditPosture',
    'web.component.code.CodeWorkspaceFileSurface'
  );

  if false_leaf_rail_count <> 0 then
    raise exception 'Pure or passive DBT model SQL containment leaves claim % product rails', false_leaf_rail_count;
  end if;

  select count(*) into publisher_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
    and (rail_name, rail_kind) in (
      ('GetWorkspaceFileContent', 'query'),
      ('SaveWorkspaceFileContent', 'command')
    )
    and rail_status = 'implemented';

  if publisher_rail_count <> 2 then
    raise exception 'DBT graph workspace artifact publisher does not own its two consumed rails';
  end if;

  if exists (
    select 1
    from planning_query_store.command_query_rail_query
    where lower(rail_name) in (
      'generatedbtworkspaceartifacts',
      'getworkspacefilecontent',
      'saveworkspacefilecontent',
      'rundbtauthorcoderunliveproof'
    )
      and is_duplicate
  ) then
    raise exception 'DBT model SQL containment introduced a duplicate command/query rail';
  end if;

  select count(*) into current_evidence_count
  from planning_query_store.frontend_component_validation_evidence evidence
  where evidence.component_id = any(expected_frontend_components)
    and evidence.evidence_status = 'current';

  if current_evidence_count <> 8 then
    raise exception 'DBT model SQL containment relational evidence is incomplete: % of 8', current_evidence_count;
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_capability_gaps
    where component_id = 'web.component.canvas.DbtGraphModelSqlPublicationPolicy'
      and gap_id = 'GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION'
  ) or not exists (
    select 1
    from planning_query_store.frontend_component_capability_gaps
    where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
      and gap_id = 'GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION'
      and owning_task_id = 'E-WEB-DBT-ATOMIC-PUBLICATION-1'
      and gap_status = 'planned'
  ) then
    raise exception 'Atomic publication gap is not owned by the artifact publisher and its existing task';
  end if;

  if exists (
    select 1
    from planning_query_store.governance_component_local_semantic_items
    where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY'
      and item_value like '%authenticates its exact payload%'
  ) then
    raise exception 'Integrity marker is still misrepresented as creator authentication';
  end if;

  select count(distinct symbol.value ->> 'name') into declared_symbol_count
  from planning_query_store.feature_mechanization_local_rails rail
  cross join lateral jsonb_array_elements(
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
  ) symbol(value)
  where rail.rail_id in (
    'local#E-CANVAS-NODE-PRESENTATION-TRUTH-1#query#generatedbtworkspaceartifacts',
    'local#E-DBT-CODE-WORKING-TREE-SYNC-20260712#command#rundbtauthorcoderunliveproof'
  )
    and symbol.value ->> 'name' = any(expected_symbols);

  if declared_symbol_count <> cardinality(expected_symbols) then
    raise exception 'DBT model SQL containment feature mechanization is incomplete: % of % symbols', declared_symbol_count, cardinality(expected_symbols);
  end if;
end
$$;
