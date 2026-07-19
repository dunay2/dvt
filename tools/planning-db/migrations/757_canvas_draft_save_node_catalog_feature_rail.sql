-- Associate in-flight local-node reconciliation with the existing canonical
-- SaveWorkspaceGraphDraft command. This is a feature-to-rail mapping, not a
-- second command or persistence path.

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name,
  rail_type, ddd_owner, rail_status, symbol_refs, implementation_refs,
  documentation_refs, governing_sources, allowed_implementation_surfaces,
  architecture_guards, completion_gate, source_path, source_content_sha256,
  raw_rail, raw_manifest, revision, created_by
)
select
  'local#E-CANVAS-WORKFLOW-E2E-USABILITY-20260601#command#saveworkspacegraphdraft',
  source.feature_id,
  source.mechanization_status,
  'SaveWorkspaceGraphDraft',
  'saveworkspacegraphdraft',
  'command',
  'WorkspaceGraphAuthoringDraft',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#localNodeCatalogsEqual'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession.types.ts',
    'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
    'tools/planning-db/migrations/757_canvas_draft_save_node_catalog_feature_rail.sql'
  ),
  source.documentation_refs,
  source.governing_sources,
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession.types.ts',
    'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
    'tools/planning-db/migrations/757_canvas_draft_save_node_catalog_feature_rail.sql'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/canvasDraftSession.test.ts',
    'pnpm --filter @dvt/web test:e2e:source-import:live',
    'pnpm docs:feature-mechanization:implementation'
  ),
  'tools/planning-db/migrations/757_canvas_draft_save_node_catalog_feature_rail.sql',
  repeat(md5('E-CANVAS-WORKFLOW-E2E-USABILITY-20260601:SaveWorkspaceGraphDraft:757'), 2),
  jsonb_build_object(
    'name', 'SaveWorkspaceGraphDraft',
    'type', 'command',
    'dddOwner', 'WorkspaceGraphAuthoringDraft',
    'status', 'implemented',
    'componentRole', 'CanvasDraftSessionState acknowledges the durable result without owning transport.'
  ),
  source.raw_manifest || jsonb_build_object(
    'allowedImplementationSurfaces', jsonb_build_array(
      'apps/web/src/app/views/canvas/canvasDraftPersistenceRuntime.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.types.ts',
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
      'apps/web/src/app/views/canvas/canvasDraftSession.test.ts',
      'tools/planning-db/migrations/757_canvas_draft_save_node_catalog_feature_rail.sql'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'AdoptExternalCanvasDraftRevision',
        'type', 'command',
        'dddOwner', 'CanvasDraftSessionMachine',
        'status', 'implemented'
      ),
      jsonb_build_object(
        'name', 'SaveWorkspaceGraphDraft',
        'type', 'command',
        'dddOwner', 'WorkspaceGraphAuthoringDraft',
        'status', 'implemented'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'localNodeCatalogsEqual',
        'path', 'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts',
        'dddOwner', 'CanvasDraftSessionState',
        'cqRails', jsonb_build_array('SaveWorkspaceGraphDraft'),
        'fowlerSignals', jsonb_build_array('explicit_authority', 'temporal_coupling_guard'),
        'architectureGuard', 'apps/web/src/app/views/canvas/canvasDraftSession.architecture.test.ts',
        'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasDraftSession.test.ts'
        )
      )
    )
  ),
  source.revision + 1,
  'codex'
from planning_query_store.feature_mechanization_local_rails source
where source.feature_id = 'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601'
  and source.rail_name = 'AdoptExternalCanvasDraftRevision'
  and source.rail_type = 'command'
limit 1
on conflict (rail_id) do update set
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

do $$
declare
  save_symbol_count integer;
begin
  select count(*) into save_symbol_count
  from planning_query_store.feature_mechanization_local_rails rails
  where rails.feature_id = 'E-CANVAS-WORKFLOW-E2E-USABILITY-20260601'
    and rails.rail_name = 'SaveWorkspaceGraphDraft'
    and rails.rail_type = 'command'
    and rails.ddd_owner = 'WorkspaceGraphAuthoringDraft'
    and coalesce(rails.symbol_refs, '[]'::jsonb) ?
      'apps/web/src/app/views/canvas/canvasDraftSessionMachine.ts#localNodeCatalogsEqual';

  if save_symbol_count <> 1 then
    raise exception 'SaveWorkspaceGraphDraft local-node reconciliation symbol is not mapped exactly once';
  end if;
end
$$;
