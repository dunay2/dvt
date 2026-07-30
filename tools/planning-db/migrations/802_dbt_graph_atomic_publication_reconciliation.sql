-- Reconcile the DB-first component and rail model with the protected atomic
-- graph DBT artifact publication command implemented by this branch.

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
  'local#E-WEB-DBT-ATOMIC-PUBLICATION-1#command#publishgraphdbtworkspaceartifacts',
  'E-WEB-DBT-ATOMIC-PUBLICATION-1',
  'implemented',
  'PublishGraphDbtWorkspaceArtifacts',
  'publishgraphdbtworkspaceartifacts',
  'command',
  'GraphDbtWorkspaceArtifactPublication',
  'implemented',
  jsonb_build_array(
    'apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts#PublishGraphDbtWorkspaceArtifactsCommand',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts#publishGraphDbtWorkspaceArtifacts'
  ),
  jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
    'apps/api/src/application/ports/graphDbtWorkspaceArtifactPublication.ts',
    'apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts',
    'apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.ts',
    'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts',
    'apps/web/src/app/ports/graphDbtWorkspaceArtifactPublication.ts',
    'apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.ts',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
    'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql'
  ),
  jsonb_build_array(
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/evidence/ED-20260729-graph-dbt-atomic-publication.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/adr/ADR-0060-dbt-project-authoring-authority.md'
  ),
  jsonb_build_array(
    'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
    'apps/api/src/application/ports/graphDbtWorkspaceArtifactPublication.ts',
    'apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts',
    'apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.ts',
    'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts',
    'apps/web/src/app/ports/graphDbtWorkspaceArtifactPublication.ts',
    'apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.ts',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
    'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql'
  ),
  jsonb_build_array(
    'packages/@dvt/contracts/test/graph-dbt-workspace-artifact-publication.contract.test.ts',
    'apps/api/test/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.test.ts',
    'apps/api/test/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.test.ts',
    'apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.test.ts',
    'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
    'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/contracts test',
    'pnpm --filter dvt-api test',
    'pnpm --filter @dvt/web test:unit:run',
    'pnpm test:web:e2e:dbt-author-code-run:live',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql',
  repeat(md5('PublishGraphDbtWorkspaceArtifacts:implemented:802'), 2),
  jsonb_build_object(
    'name', 'PublishGraphDbtWorkspaceArtifacts',
    'type', 'command',
    'boundedContext', 'dbt graph workspace publication',
    'dddObject', 'GraphDbtWorkspaceArtifactPublication',
    'applicationPort', 'IPublishGraphDbtWorkspaceArtifactsCommand via IWorkspaceFileBatchMutationPort',
    'adapterSurface', 'POST /workspace/dbt/graph-artifacts/publications',
    'scopeAndAuthorization', 'workspace:files:save, tenant/project/environment scope and idempotency key',
    'negativeTests', jsonb_build_array(
      'reject unauthenticated or unauthorized workspace scope',
      'reject invalid or incomplete artifact sets',
      'return one conflict without partial writes',
      'replay an equivalent idempotency key without a second mutation'
    )
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'E-WEB-DBT-ATOMIC-PUBLICATION-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Publish the complete graph-derived DBT workspace artifact set through one protected, revision-bound, idempotent batch command.',
    'componentGuides', jsonb_build_array(
      'docs/adr/ADR-0060-dbt-project-authoring-authority.md',
      'docs/evidence/ED-20260729-graph-dbt-atomic-publication.md'
    ),
    'userStories', jsonb_build_array(
      'A Canvas Preview publishes either the complete DBT artifact snapshot or no file changes.',
      'A newer workspace revision produces one actionable conflict without partial publication.',
      'A confirmed pre-marker model replacement remains bound to the exact observed and proposed content.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/adr/ADR-0060-dbt-project-authoring-authority.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtWorkspaceArtifactPublication.v1.ts',
      'apps/api/src/application/ports/graphDbtWorkspaceArtifactPublication.ts',
      'apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts',
      'apps/api/src/entrypoints/http/graphDbtWorkspaceArtifactPublicationRoutes.ts',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts',
      'apps/web/src/app/ports/graphDbtWorkspaceArtifactPublication.ts',
      'apps/web/src/app/services/dbtProject/graphDbtWorkspaceArtifactPublication.api.ts',
      'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'a browser loop over SaveWorkspaceFileContent',
      'a second workspace-file store',
      'a fake success or partial-write recovery path'
    ),
    'domainObjects', jsonb_build_array(
      'GraphDbtWorkspaceArtifactPublication',
      'GraphDbtWorkspaceArtifactPublicationItem',
      'WorkspaceFileBatchMutation'
    ),
    'fowlerSignals', jsonb_build_array(
      'unit_of_work',
      'command',
      'gateway',
      'optimistic_offline_lock',
      'idempotent_receiver'
    ),
    'architectureGuards', jsonb_build_array(
      'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
      'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'
    ),
    'cypressFlows', jsonb_build_array(
      'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
    ),
    'completionGate', jsonb_build_array(
      'pnpm --filter @dvt/contracts test',
      'pnpm --filter dvt-api test',
      'pnpm --filter @dvt/web test',
      'pnpm test:web:e2e:dbt-author-code-run:live',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'PublishGraphDbtWorkspaceArtifacts',
        'type', 'command',
        'dddOwner', 'GraphDbtWorkspaceArtifactPublication'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'DBT-ATOMIC-PUBLICATION',
        'redTest', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
        'expectedFailure', 'Sequential writes can leave earlier artifacts committed after a later conflict.',
        'patchSurfaces', jsonb_build_array(
          'apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts',
          'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts'
        ),
        'greenTest', 'apps/api/test/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.test.ts'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'PublishGraphDbtWorkspaceArtifactsCommand',
        'path', 'apps/api/src/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.ts',
        'dddOwner', 'GraphDbtWorkspaceArtifactPublication',
        'cqRails', jsonb_build_array('PublishGraphDbtWorkspaceArtifacts'),
        'fowlerSignals', jsonb_build_array('command', 'unit_of_work'),
        'architectureGuard', 'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/api/test/application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.test.ts'
        )
      ),
      jsonb_build_object(
        'name', 'publishGraphDbtWorkspaceArtifacts',
        'path', 'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts',
        'dddOwner', 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
        'cqRails', jsonb_build_array(
          'GetWorkspaceFileContent',
          'PublishGraphDbtWorkspaceArtifacts'
        ),
        'fowlerSignals', jsonb_build_array('application_service', 'preflight'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts',
          'apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts'
        )
      )
    )
  ),
  0,
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

delete from planning_query_store.frontend_component_local_cq_rails
where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
  and rail_name = 'SaveWorkspaceFileContent';

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
    jsonb_build_object(
      'usage', 'read exact current bytes and revision before classification',
      'ownership', 'consumes'
    ),
    'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql',
    md5('rail:DbtGraphWorkspaceArtifactPublisher:Get:802')
  ),
  (
    'web.component.canvas.DbtGraphWorkspaceArtifactPublisher',
    'PublishGraphDbtWorkspaceArtifacts',
    'command',
    'implemented',
    jsonb_build_object(
      'usage', 'submit one complete revision-bound artifact publication intent',
      'ownership', 'consumes'
    ),
    'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql',
    md5('rail:DbtGraphWorkspaceArtifactPublisher:PublishAtomic:802')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_components
set
  responsibility = 'Preflight graph-derived DBT artifacts, bind exact observed revisions, and delegate one complete publication intent to the protected atomic command.',
  raw_component = coalesce(raw_component, '{}'::jsonb) || jsonb_build_object(
    'ownsIoSequence', false,
    'atomicPublicationTask', 'E-WEB-DBT-ATOMIC-PUBLICATION-1',
    'atomicPublicationStatus', 'implemented',
    'cqRails', jsonb_build_array(
      'GetWorkspaceFileContent',
      'PublishGraphDbtWorkspaceArtifacts'
    )
  ),
  source_path = 'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql',
  source_content_sha256 = md5(component_id || ':atomic:802'),
  updated_at = now()
where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher';

update planning_query_store.frontend_component_capability_gaps
set
  gap_status = 'closed',
  description = 'Closed by the protected PublishGraphDbtWorkspaceArtifacts command and one server-owned workspace-file batch mutation.',
  raw_gap = coalesce(raw_gap, '{}'::jsonb) || jsonb_build_object(
    'closedByRail', 'PublishGraphDbtWorkspaceArtifacts',
    'evidence', 'docs/evidence/ED-20260729-graph-dbt-atomic-publication.md'
  ),
  source_path = 'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql',
  source_content_sha256 = md5('gap:dbt-graph-workspace-atomic-publication:closed:802'),
  updated_at = now()
where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
  and gap_id = 'GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION';

update planning_query_store.frontend_component_validation_evidence
set
  rail_name = 'PublishGraphDbtWorkspaceArtifacts',
  proves = case evidence_id
    when 'EV-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-UNIT'
      then 'Complete preflight produces one revision-bound atomic publication request; conflicts return without partial workspace writes.'
    when 'EV-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-INTEGRATION'
      then 'Canvas Preview delegates one atomic publication command and does not invoke Preview after a publication conflict.'
    else proves
  end,
  source_path = 'tools/planning-db/migrations/802_dbt_graph_atomic_publication_reconciliation.sql',
  source_content_sha256 = md5(evidence_id || ':atomic:802'),
  updated_at = now()
where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
  and evidence_id in (
    'EV-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-UNIT',
    'EV-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER-INTEGRATION'
  );

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER'
  and item_kind in ('public_api', 'transition');

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'public_api',
    'publishGraphDbtWorkspaceArtifacts({ artifacts, workspaceFilesQuery, publicationCommand, replacementAuthorizations })',
    0
  ),
  (
    'SYS-WEB-CANVAS-DBT-GRAPH-WORKSPACE-ARTIFACT-PUBLISHER',
    'transition',
    'Requested artifacts become a complete preflight result, a revision-bound confirmation request, one atomic publication receipt, or one typed conflict.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

do $$
declare
  canonical_rail_count integer;
  component_rail_count integer;
  obsolete_component_rail_count integer;
  open_gap_count integer;
begin
  select count(*) into canonical_rail_count
  from planning_query_store.command_query_rail_query
  where rail_name = 'PublishGraphDbtWorkspaceArtifacts'
    and rail_type = 'command'
    and rail_status = 'implemented';

  if canonical_rail_count <> 1 then
    raise exception 'PublishGraphDbtWorkspaceArtifacts must resolve to exactly one implemented command, found %', canonical_rail_count;
  end if;

  select count(*) into component_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
    and (rail_name, rail_kind) in (
      ('GetWorkspaceFileContent', 'query'),
      ('PublishGraphDbtWorkspaceArtifacts', 'command')
    )
    and rail_status = 'implemented';

  if component_rail_count <> 2 then
    raise exception 'DbtGraphWorkspaceArtifactPublisher must consume its query and atomic command exactly once';
  end if;

  select count(*) into obsolete_component_rail_count
  from planning_query_store.frontend_component_local_cq_rails
  where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
    and rail_name = 'SaveWorkspaceFileContent'
    and rail_status <> 'retired';

  if obsolete_component_rail_count <> 0 then
    raise exception 'DbtGraphWorkspaceArtifactPublisher still claims the single-file save command';
  end if;

  select count(*) into open_gap_count
  from planning_query_store.frontend_component_capability_gaps
  where component_id = 'web.component.canvas.DbtGraphWorkspaceArtifactPublisher'
    and gap_id = 'GAP-DBT-GRAPH-WORKSPACE-ATOMIC-PUBLICATION'
    and gap_status <> 'closed';

  if open_gap_count <> 0 then
    raise exception 'DBT graph workspace atomic publication gap remains open';
  end if;
end
$$;
