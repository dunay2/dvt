-- DVT-GOVERNANCE-REFRESH-RUN-LEDGER
-- Records governance refresh executions through a DB-first write rail.

create table if not exists planning_query_store.governance_refresh_runs (
  run_id text primary key,
  actor text not null,
  command_name text not null default 'pnpm governance:refresh',
  source_ref text not null,
  source_content_sha256 text not null,
  run_state text not null,
  max_passes integer not null,
  generation_passes integer,
  stabilized boolean,
  error_summary text not null default '',
  revision integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  constraint governance_refresh_runs_state_check check (
    run_state in ('accepted', 'passed', 'failed')
  ),
  constraint governance_refresh_runs_max_passes_check check (max_passes >= 1),
  constraint governance_refresh_runs_generation_passes_check check (
    generation_passes is null or generation_passes >= 0
  ),
  constraint governance_refresh_runs_revision_check check (revision >= 0),
  constraint governance_refresh_runs_source_hash_check check (
    source_content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint governance_refresh_runs_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index if not exists governance_refresh_runs_state_idx
  on planning_query_store.governance_refresh_runs (run_state, started_at desc);

create table if not exists planning_query_store.governance_refresh_run_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null,
  actor text not null,
  run_id text not null references planning_query_store.governance_refresh_runs(run_id) on delete cascade,
  source_ref text not null,
  source_content_sha256 text not null,
  expected_revision integer,
  previous_revision integer not null,
  resulting_revision integer not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint governance_refresh_run_operations_type_check check (
    operation_type in ('governance_refresh_run_record')
  ),
  constraint governance_refresh_run_operations_revision_check check (
    previous_revision >= -1 and resulting_revision >= 0
  ),
  constraint governance_refresh_run_operations_source_hash_check check (
    source_content_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint governance_refresh_run_operations_payload_object_check check (
    jsonb_typeof(payload) = 'object'
  )
);

create index if not exists governance_refresh_run_operations_run_idx
  on planning_query_store.governance_refresh_run_operations (run_id, created_at desc);

create table if not exists planning_query_store.governance_refresh_stage_runs (
  stage_run_id text primary key,
  run_id text not null references planning_query_store.governance_refresh_runs(run_id) on delete cascade,
  stage_group text not null,
  pass_number integer not null,
  stage_index integer not null,
  stage_id text not null,
  stage_script text not null,
  args jsonb not null default '[]'::jsonb,
  env jsonb not null default '{}'::jsonb,
  stage_state text not null,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint governance_refresh_stage_runs_group_check check (
    stage_group in ('generation', 'database')
  ),
  constraint governance_refresh_stage_runs_pass_check check (pass_number >= 1),
  constraint governance_refresh_stage_runs_index_check check (stage_index >= 1),
  constraint governance_refresh_stage_runs_state_check check (
    stage_state in ('planned', 'passed', 'failed', 'skipped')
  ),
  constraint governance_refresh_stage_runs_args_array_check check (jsonb_typeof(args) = 'array'),
  constraint governance_refresh_stage_runs_env_object_check check (jsonb_typeof(env) = 'object'),
  constraint governance_refresh_stage_runs_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint governance_refresh_stage_runs_unique_stage check (length(stage_id) > 0)
);

create index if not exists governance_refresh_stage_runs_run_idx
  on planning_query_store.governance_refresh_stage_runs (
    run_id,
    stage_group,
    pass_number,
    stage_index
  );

create or replace view planning_query_store.governance_refresh_run_query as
select
  run.run_id,
  run.run_state,
  run.actor,
  run.command_name,
  run.source_ref,
  run.source_content_sha256,
  run.max_passes,
  run.generation_passes,
  run.stabilized,
  run.error_summary,
  run.revision,
  run.started_at,
  run.completed_at,
  coalesce(stage_rollup.stage_count, 0)::integer as stage_count,
  coalesce(stage_rollup.failed_stage_count, 0)::integer as failed_stage_count,
  coalesce(stage_rollup.generation_stage_count, 0)::integer as generation_stage_count,
  coalesce(stage_rollup.database_stage_count, 0)::integer as database_stage_count,
  run.payload
from planning_query_store.governance_refresh_runs run
left join (
  select
    stage.run_id,
    count(*) as stage_count,
    count(*) filter (where stage.stage_state = 'failed') as failed_stage_count,
    count(*) filter (where stage.stage_group = 'generation') as generation_stage_count,
    count(*) filter (where stage.stage_group = 'database') as database_stage_count
  from planning_query_store.governance_refresh_stage_runs stage
  group by stage.run_id
) stage_rollup
  on stage_rollup.run_id = run.run_id;
