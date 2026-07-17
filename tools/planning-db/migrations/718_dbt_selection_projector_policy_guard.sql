-- Relate the DBT authoring projector architecture guard to the canonical
-- execution-selection policy instead of requiring duplicated step-kind literals.

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
  'projector-policy-architecture-test',
  null,
  jsonb_build_object(
    'ownership', 'shared-evidence',
    'purpose', 'prove the DBT projector consumes the canonical executable-step-kind policy without duplicating its vocabulary'
  ),
  'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql',
  md5('selection:projector-policy-guard:718')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values (
  'SYS-WEB-CANVAS-EXECUTION-SELECTION',
  'VAL-WEB-DBT-SELECTION-PROJECTOR-POLICY',
  'architecture-test', 'current',
  'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts',
  'CollectCanvasExecutionSelection',
  'dbt-projector-step-kind-policy',
  'The DBT planner projector delegates executable step-kind classification to the canonical selection policy.',
  jsonb_build_object('singleClassificationAuthority', true, 'duplicatedStepKindMap', false),
  'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql',
  md5('validation:dbt-selection-projector-policy:718')
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

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(implementation_ref order by implementation_ref)
    from (
      select distinct value as implementation_ref
      from jsonb_array_elements_text(implementation_refs)
      union
      select 'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql'
    ) normalized_implementation_refs
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(surface order by surface)
    from (
      select distinct value as surface
      from jsonb_array_elements_text(allowed_implementation_surfaces)
      union
      select 'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'
      union
      select 'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql'
    ) normalized_surfaces
  ),
  raw_manifest = jsonb_set(
    raw_manifest,
    '{allowedImplementationSurfaces}',
    (
      select jsonb_agg(surface order by surface)
      from (
        select distinct value as surface
        from jsonb_array_elements_text(raw_manifest->'allowedImplementationSurfaces')
        union
        select 'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'
        union
        select 'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql'
      ) normalized_manifest_surfaces
    )
  ),
  source_path = 'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql',
  source_content_sha256 = repeat(md5('CollectCanvasExecutionSelection:projector-policy-guard:718'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql',
  source_content_sha256 = repeat(md5('SYS-WEB-CANVAS-EXECUTION-SELECTION:projector-policy-guard:718'), 2),
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

update planning_query_store.frontend_component_local_components
set
  source_path = 'tools/planning-db/migrations/718_dbt_selection_projector_policy_guard.sql',
  source_content_sha256 = md5('frontend:CanvasExecutionSelection:projector-policy-guard:718'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION';

do $$
declare
  mapped_guard_count integer;
  policy_evidence_count integer;
begin
  select count(*) into mapped_guard_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and file_path = 'apps/web/src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts'
    and file_role = 'projector-policy-architecture-test';

  select count(*) into policy_evidence_count
  from planning_query_store.frontend_component_validation_evidence
  where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION'
    and evidence_id = 'VAL-WEB-DBT-SELECTION-PROJECTOR-POLICY'
    and evidence_status = 'current';

  if mapped_guard_count <> 1 then
    raise exception 'DBT selection projector-policy guard must be mapped exactly once, found %', mapped_guard_count;
  end if;

  if policy_evidence_count <> 1 then
    raise exception 'DBT selection projector-policy evidence must be current exactly once, found %', policy_evidence_count;
  end if;
end $$;
