-- Correct the initial containment design after SRP review, before the
-- implementation is closed. Pure policies and passive views do not claim the
-- product rails executed by their orchestration hosts.

delete from architecture.design_scope
where design_id = 'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722'
  and subject_kind = 'path'
  and subject_id = 'apps/web/src/app/views/code/CodeView.tsx';

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/CodeView.tsx', 'may_update', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'test', 'TEST-WEB-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'test', 'TEST-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, maturity_score, parent_component_id
)
values
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'DBT graph workspace artifact publisher',
    'service',
    'application',
    'DbtGraphWorkspaceArtifactPublisher',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
    'publishGraphDbtWorkspaceArtifacts',
    'browser',
    'critical',
    'proposed',
    70,
    'SYS-WEB-CANVAS-GRAPH-SURFACE'
  ),
  (
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'Code workspace file edit posture',
    'module',
    'ui',
    'CodeWorkspaceFileEditPosture',
    'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts',
    'resolveCodeWorkspaceFileEditPosture',
    'browser',
    'high',
    'proposed',
    70,
    'SYS-WEB-VIEWS-CODE'
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
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

update architecture.component
set
  parent_component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY';

update architecture.component
set
  public_contract = 'CodeWorkspaceFileSurface',
  updated_at = now()
where component_id = 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE';

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values
  (
    'RESP-WEB-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'Preflight every graph-derived DBT workspace artifact, bind the observed revisions, reject any model SQL divergence, and publish only after the complete preflight succeeds.',
    'The graph-derived workspace publication sequence, revision binding, or cross-artifact fail-closed policy changes.',
    'DbtGraphWorkspaceArtifactPublisher',
    'proposed'
  ),
  (
    'RESP-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'Resolve editable versus graph-owned read-only posture from explicit Canvas authority and graph-owned file identity.',
    'The workspace-file authority or editability decision changes.',
    'CodeWorkspaceFileEditPosture',
    'proposed'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.component_responsibility
set
  responsibility = 'Render exactly one editor or viewer from a supplied workspace-file edit posture without deriving authority, persistence, reconciliation, or DBT projection policy.',
  reason_to_change = 'The passive Code workspace-file visual surface changes.'
where responsibility_id = 'RESP-WEB-CODE-WORKSPACE-FILE-SURFACE';

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction, negative_tests, status
)
values
  (
    'PORT-WEB-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'publishGraphDbtWorkspaceArtifacts',
    'command',
    'inbound',
    array[
      'one artifact is written before a later model SQL divergence is discovered',
      'the expected revision is refreshed after preflight and masks a concurrent edit',
      'a file read failure is misclassified as absence',
      'a divergent path is omitted from the rejection result'
    ],
    'proposed'
  ),
  (
    'PORT-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'resolveCodeWorkspaceFileEditPosture',
    'query',
    'inbound',
    array[
      'graph-owned generated SQL is editable',
      'file-authoritative DBT SQL is read-only',
      'an unrelated fallback file is treated as graph-owned'
    ],
    'proposed'
  )
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-WEB-GRAPH-SURFACE-USES-DBT-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'depends_on',
    'outbound',
    'async',
    'Canvas preview bypasses the guarded graph-derived workspace publication boundary.',
    'authorized graph-draft Canvas scope',
    jsonb_build_array('executeCanvasPlanAction'),
    'proposed'
  ),
  (
    'REL-WEB-DBT-ARTIFACT-PUBLISHER-USES-SQL-POLICY',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'depends_on',
    'outbound',
    'sync',
    'The publisher reimplements or bypasses model SQL divergence classification.',
    'authorized graph-draft Canvas scope',
    jsonb_build_array('publishGraphDbtWorkspaceArtifacts', 'classifyGraphModelSqlPublication'),
    'proposed'
  ),
  (
    'REL-WEB-DBT-ARTIFACT-PUBLISHER-CONSUMES-PROJECTION',
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'depends_on',
    'outbound',
    'sync',
    'Publication invents DBT model content instead of consuming the canonical graph projection.',
    'authorized graph-draft Canvas scope',
    jsonb_build_array('DbtWorkspaceArtifact'),
    'proposed'
  ),
  (
    'REL-WEB-CODE-VIEW-USES-FILE-EDIT-POSTURE',
    'SYS-WEB-VIEWS-CODE',
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'depends_on',
    'outbound',
    'sync',
    'CodeView infers editability ad hoc from route or file extension.',
    'authorized workspace file scope',
    jsonb_build_array('CodeView', 'resolveCodeWorkspaceFileEditPosture'),
    'proposed'
  ),
  (
    'REL-WEB-CODE-FILE-SURFACE-RENDERS-POSTURE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'consumes',
    'outbound',
    'sync',
    'The passive surface derives a second authority policy.',
    'not_applicable',
    jsonb_build_array('CodeWorkspaceFileSurfaceProps.posture'),
    'proposed'
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

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql',
    repeat(md5('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER:798'), 2),
    0,
    'DBT graph workspace artifact publisher',
    'component',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    true,
    'Own all-artifact preflight, observed-revision binding, and guarded graph-derived workspace publication.',
    'DbtGraphWorkspaceArtifactPublisher',
    'GetWorkspaceFileContent;SaveWorkspaceFileContent',
    'codex'
  ),
  (
    'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE',
    'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql',
    repeat(md5('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE:798'), 2),
    0,
    'Code workspace file edit posture',
    'component',
    'SYS-WEB-VIEWS-CODE',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Own the pure authority-to-editability decision without rendering or I/O.',
    'CodeWorkspaceFileEditPosture',
    '',
    'codex'
  )
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
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

update planning_query_store.governance_component_local_definitions
set
  parent_id = 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
  cq_rails = '',
  source_path = 'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql',
  source_content_sha256 = repeat(md5(component_id || ':srp:798'), 2)
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY';

update planning_query_store.governance_component_local_definitions
set
  cq_rails = '',
  owned_concern = 'Own passive editor-versus-viewer rendering from a supplied authority posture.',
  source_path = 'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql',
  source_content_sha256 = repeat(md5(component_id || ':srp:798'), 2)
where component_id = 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'invariant', 'Every artifact read and classification completes before the first SaveWorkspaceFileContent command.', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'invariant', 'Each save uses the exact revision observed during the complete preflight.', 1),
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'non_goal', 'Provide atomic multi-file commit semantics; that remains owned by E-WEB-DBT-ATOMIC-PUBLICATION-1.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'invariant', 'Edit posture is a total function of explicit authority, selected path, and graph-owned path identity.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'non_goal', 'Render a file surface or persist content.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE'
  and pattern in (
    'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts',
    'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts'
  );

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'owns', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER', 'owns', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts', 1),
  ('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'owns', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'owns', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values (
  'web.component.code.CodeWorkspaceFileEditPosture',
  'CodeWorkspaceFileEditPosture',
  'state-view',
  'planned',
  'extract',
  'Frontend / Code workbench',
  'Resolve workspace-file editability from explicit Canvas authority without rendering or I/O.',
  '@dvt/web',
  '/code;/canvas',
  null,
  '[]'::jsonb,
  '[]'::jsonb,
  jsonb_build_object('architectureComponentId', 'SYS-WEB-CODE-WORKSPACE-FILE-EDIT-POSTURE', 'pure', true, 'presentationOnly', false),
  'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql',
  md5('component:CodeWorkspaceFileEditPosture:planned:798')
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
  responsibility = 'Render exactly one editor or viewer from a supplied workspace-file edit posture.',
  plugin_scope = null,
  source_path = 'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql',
  source_content_sha256 = md5('component:CodeWorkspaceFileSurface:srp:798'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkspaceFileSurface';

delete from planning_query_store.frontend_component_local_cq_rails
where component_id in (
  'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
  'web.component.code.CodeWorkspaceFileSurface',
  'web.component.code.CodeWorkspaceFileEditPosture'
);

insert into planning_query_store.frontend_component_plugin_scopes (
  component_id, plugin_id, scope_status, raw_scope, source_path,
  source_content_sha256
)
values
  ('web.component.canvas.DbtGraphModelSqlPublicationPolicy', 'dbt', 'planned', jsonb_build_object('scopeReason', 'The policy classifies graph-derived DBT model SQL only.'), 'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql', md5('scope:DbtGraphModelSqlPublicationPolicy:dbt:798')),
  ('web.component.code.CodeWorkspaceFileSurface', 'dbt', 'planned', jsonb_build_object('scopeReason', 'The surface presents DBT project files in the contextual Code workbench.'), 'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql', md5('scope:CodeWorkspaceFileSurface:dbt:798')),
  ('web.component.code.CodeWorkspaceFileEditPosture', 'dbt', 'planned', jsonb_build_object('scopeReason', 'The posture distinguishes graph-owned and DBT project-file authority.'), 'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql', md5('scope:CodeWorkspaceFileEditPosture:dbt:798'))
on conflict (component_id, plugin_id) do update set
  scope_status = excluded.scope_status,
  raw_scope = excluded.raw_scope,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_capability_gaps (
  component_id, gap_id, gap_kind, gap_status, description, owning_task_id,
  raw_gap, source_path, source_content_sha256
)
values (
  'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
  'GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION',
  'transaction-boundary',
  'planned',
  'Preflight and compare-and-swap contain silent overwrites, but a later save conflict can still leave an earlier artifact written until atomic batch publication is implemented.',
  'E-WEB-DBT-ATOMIC-PUBLICATION-1',
  jsonb_build_object('newDebt', false, 'existingTask', true, 'containment', 'complete-preflight plus per-file compare-and-swap'),
  'tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql',
  md5('gap:dbt-graph-workspace-atomic-publication:798')
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

do $$
declare
  false_leaf_rail_count integer;
begin
  select count(*) into false_leaf_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id in (
    'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
    'web.component.code.CodeWorkspaceFileSurface',
    'web.component.code.CodeWorkspaceFileEditPosture'
  );

  if false_leaf_rail_count <> 0 then
    raise exception 'Passive or pure leaf components still claim product rails: %', false_leaf_rail_count;
  end if;
end
$$;
