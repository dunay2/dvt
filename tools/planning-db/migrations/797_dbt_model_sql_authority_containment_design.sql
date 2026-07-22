-- Design the graph-owned DBT model SQL containment before runtime changes.
-- This slice reuses the existing artifact, file-read, and file-write rails.

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
  'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722',
  'E-WEB-DBT-MODEL-SQL-AUTHORITY-1',
  'DBT graph model SQL authority containment',
  'Frontend / Canvas and Code workbench',
  'review',
  'A graph-draft Canvas and Project Code currently expose two writable representations of the same DBT model SQL. Preview reads the latest workspace-file revision immediately before writing, so an external or Project Code edit can be accepted as the expected revision and silently overwritten. Containment makes generated graph-owned SQL self-identifying, preflights every model SQL artifact before publication, and presents graph-owned project files as read-only without changing file-authoritative DBT projects.',
  'hidden_authority',
  'GenerateDbtWorkspaceArtifacts;GetWorkspaceFileContent;SaveWorkspaceFileContent',
  null
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'decision', 'ADR-0060', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION', 'may_reference', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'component', 'SYS-WEB-VIEWS-CODE', 'may_update', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'query', 'GenerateDbtWorkspaceArtifacts', 'may_reference', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'query', 'GetWorkspaceFileContent', 'may_reference', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'command', 'SaveWorkspaceFileContent', 'may_reference', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/canvasDbtWorkspaceArtifacts.ts', 'may_update', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/canvas/canvasPlanAction.ts', 'may_update', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx', 'may_create', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'path', 'apps/web/src/app/views/code/CodeView.tsx', 'may_update', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'test', 'TEST-WEB-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'test', 'TEST-WEB-CODE-WORKSPACE-FILE-SURFACE', 'must_prove', true),
  ('DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722', 'test', 'TEST-WEB-CANVAS-DBT-MODEL-SQL-DIVERGENCE', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, maturity_score, parent_component_id
)
values
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'DBT graph model SQL publication policy',
    'module',
    'application',
    'DbtGraphModelSqlPublicationPolicy',
    'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts',
    'createGraphManagedDbtModelSql;classifyGraphModelSqlPublication',
    'browser',
    'critical',
    'proposed',
    70,
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION'
  ),
  (
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'Code workspace file surface',
    'ui-view',
    'ui',
    'CodeWorkspaceFileSurface',
    'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx',
    'CodeWorkspaceFileSurface;resolveCodeWorkspaceFileEditPosture',
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

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values
  (
    'RESP-WEB-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'Classify graph-owned DBT model SQL as absent, unchanged, safely replaceable, legacy-equivalent, or divergent before any workspace artifact is written.',
    'The graph-owned SQL marker, divergence, or publication concurrency policy changes.',
    'DbtGraphModelSqlPublicationPolicy',
    'proposed'
  ),
  (
    'RESP-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'Render exactly one editor or viewer from an explicit workspace-file authority posture without owning persistence, reconciliation, or DBT projection policy.',
    'The Code workbench file interaction or authority explanation changes.',
    'CodeWorkspaceFileSurface',
    'proposed'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_port (
  port_id, component_id, port_name, port_kind, direction, negative_tests, status
)
values
  (
    'PORT-WEB-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'classifyGraphModelSqlPublication',
    'query',
    'inbound',
    array[
      'a divergent Project Code edit is silently overwritten',
      'a malformed graph-managed marker is accepted',
      'one model file is written before another model divergence is detected',
      'a revision is refreshed after preflight and masks a concurrent edit'
    ],
    'proposed'
  ),
  (
    'PORT-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'renderWorkspaceFile',
    'ui-action',
    'inbound',
    array[
      'a graph-owned generated DBT file is editable in Project Code',
      'a file-authoritative DBT project is rendered read-only',
      'editor and viewer render simultaneously',
      'authority posture is inferred from file extension alone'
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
    'REL-WEB-DBT-SQL-PUBLICATION-GUARDS-ARTIFACT-PROJECTION',
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'guards',
    'outbound',
    'sync',
    'Preview publishes a graph-derived model over a newer file representation.',
    'authorized graph-draft Canvas scope',
    jsonb_build_array('canvasPlanAction', 'buildDbtWorkspaceArtifacts'),
    'proposed'
  ),
  (
    'REL-WEB-CODE-VIEW-CONTAINS-WORKSPACE-FILE-SURFACE',
    'SYS-WEB-VIEWS-CODE',
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'contains',
    'outbound',
    'sync',
    'CodeView embeds authority policy inside route orchestration or renders two competing file surfaces.',
    'authorized workspace file read or write scope',
    jsonb_build_array('CodeView'),
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
    'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY',
    'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql',
    repeat(md5('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY:797'), 2),
    0,
    'DBT graph model SQL publication policy',
    'component',
    'SYS-WEB-CANVAS-DBT-MODEL-ARTIFACT-PROJECTION',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Own graph-managed SQL serialization and total pre-publication divergence classification.',
    'DbtGraphModelSqlPublicationPolicy',
    'GenerateDbtWorkspaceArtifacts;GetWorkspaceFileContent;SaveWorkspaceFileContent',
    'codex'
  ),
  (
    'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE',
    'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql',
    repeat(md5('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE:797'), 2),
    0,
    'Code workspace file surface',
    'component',
    'SYS-WEB-VIEWS-CODE',
    'SYS-DVT',
    'SYS-WEB',
    'review',
    false,
    'Own passive editor-versus-viewer rendering from an explicit authority posture.',
    'CodeWorkspaceFileSurface',
    'GetWorkspaceFileContent;SaveWorkspaceFileContent',
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

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'invariant', 'A valid graph-managed marker authenticates its exact payload by SHA-256; malformed or mismatched markers are divergent.', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'invariant', 'Every DBT model SQL artifact is preflighted before the first workspace-file write begins.', 1),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'invariant', 'The expected content revision used by SaveWorkspaceFileContent is the revision observed during preflight.', 2),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'non_goal', 'Adopt a graph-draft Canvas into file authority or implement atomic multi-file publication.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'invariant', 'Graph-owned generated DBT files render read-only and explain graph-draft authority with localized copy.', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'invariant', 'File-authoritative DBT project files retain the existing revision-guarded editor and reconciliation behavior.', 1),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'non_goal', 'Persist content, reconcile DBT semantics, or derive model SQL.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'owns', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts', 0),
  ('SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'owns', 'apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts', 1),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'owns', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.ts', 0),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'owns', 'apps/web/src/app/views/code/codeWorkspaceFileEditPosture.test.ts', 1),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'owns', 'apps/web/src/app/views/code/CodeWorkspaceFileSurface.tsx', 2),
  ('SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'owns', 'apps/web/src/app/views/code/CodeWorkspaceFileSurface.test.tsx', 3)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.frontend_component_local_components (
  component_id, component_name, component_kind, component_status,
  reuse_decision, frontend_owner, responsibility, package_name, route_scope,
  plugin_scope, capability_gaps, evidence_refs, raw_component, source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.DbtGraphModelSqlPublicationPolicy',
    'DbtGraphModelSqlPublicationPolicy',
    'query-view',
    'planned',
    'create',
    'Frontend / Canvas DBT publication',
    'Classify graph-owned model SQL publication without I/O or presentation.',
    '@dvt/web',
    '/canvas',
    'dbt',
    jsonb_build_array('implementation and negative evidence pending'),
    '[]'::jsonb,
    jsonb_build_object('architectureComponentId', 'SYS-WEB-CANVAS-DBT-GRAPH-MODEL-SQL-PUBLICATION-POLICY', 'pure', true, 'authority', 'graph-draft'),
    'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql',
    md5('component:DbtGraphModelSqlPublicationPolicy:planned:797')
  ),
  (
    'web.component.code.CodeWorkspaceFileSurface',
    'CodeWorkspaceFileSurface',
    'state-view',
    'planned',
    'extract',
    'Frontend / Code workbench',
    'Render one editor or viewer from an explicit workspace-file authority posture.',
    '@dvt/web',
    '/code;/canvas',
    'dbt;dvt',
    jsonb_build_array('implementation and presentation evidence pending'),
    '[]'::jsonb,
    jsonb_build_object('architectureComponentId', 'SYS-WEB-CODE-WORKSPACE-FILE-SURFACE', 'presentationOnly', true, 'stateOwner', false),
    'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql',
    md5('component:CodeWorkspaceFileSurface:planned:797')
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

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  ('web.component.canvas.DbtGraphModelSqlPublicationPolicy', 'GenerateDbtWorkspaceArtifacts', 'query', 'planned', jsonb_build_object('role', 'projection-input', 'ownership', 'consumed'), 'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql', md5('rail:DbtGraphModelSqlPublicationPolicy:Generate:797')),
  ('web.component.canvas.DbtGraphModelSqlPublicationPolicy', 'GetWorkspaceFileContent', 'query', 'planned', jsonb_build_object('role', 'preflight-input', 'ownership', 'consumed'), 'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql', md5('rail:DbtGraphModelSqlPublicationPolicy:Get:797')),
  ('web.component.canvas.DbtGraphModelSqlPublicationPolicy', 'SaveWorkspaceFileContent', 'command', 'planned', jsonb_build_object('role', 'guarded-publication', 'ownership', 'consumed'), 'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql', md5('rail:DbtGraphModelSqlPublicationPolicy:Save:797')),
  ('web.component.code.CodeWorkspaceFileSurface', 'GetWorkspaceFileContent', 'query', 'planned', jsonb_build_object('role', 'presentation-input', 'ownership', 'consumed'), 'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql', md5('rail:CodeWorkspaceFileSurface:Get:797')),
  ('web.component.code.CodeWorkspaceFileSurface', 'SaveWorkspaceFileContent', 'command', 'planned', jsonb_build_object('role', 'editable-mode-only', 'ownership', 'delegated'), 'tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql', md5('rail:CodeWorkspaceFileSurface:Save:797'))
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

do $$
declare
  canonical_rail_count integer;
  scoped_product_rail_count integer;
begin
  select count(*) into canonical_rail_count
  from planning_query_store.command_query_rail_query
  where (rail_name, rail_type) in (
    ('GenerateDbtWorkspaceArtifacts', 'query'),
    ('GetWorkspaceFileContent', 'query'),
    ('SaveWorkspaceFileContent', 'command')
  )
    and rail_status <> 'retired';

  if canonical_rail_count <> 3 then
    raise exception 'DBT model SQL containment requires exactly three existing canonical rails, found %', canonical_rail_count;
  end if;

  select count(*) into scoped_product_rail_count
  from architecture.design_scope
  where design_id = 'DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722'
    and subject_kind in ('command', 'query')
    and subject_id not in (
      'GenerateDbtWorkspaceArtifacts',
      'GetWorkspaceFileContent',
      'SaveWorkspaceFileContent'
    );

  if scoped_product_rail_count <> 0 then
    raise exception 'DBT model SQL containment introduced a parallel product rail';
  end if;
end
$$;
