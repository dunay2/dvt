create table if not exists planning_query_store.repository_commands (
  command_id text primary key,
  command_type text not null,
  command_name text,
  command_path text,
  command_text text,
  domain text not null,
  sensitivity text not null,
  runtime_fanout boolean not null default false,
  changed_file_validation_relevant boolean not null default true,
  referenced_files jsonb not null default '[]'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  raw_command jsonb not null,
  imported_at timestamptz not null default now()
);

alter table planning_query_store.repository_commands
  drop constraint if exists repository_commands_command_type_check;

alter table planning_query_store.repository_commands
  add constraint repository_commands_command_type_check
  check (command_type in ('package_script', 'command_file'));

create index if not exists repository_commands_domain_type_idx
  on planning_query_store.repository_commands (domain, command_type);

create index if not exists repository_commands_runtime_fanout_idx
  on planning_query_store.repository_commands (runtime_fanout);

create or replace view planning_query_store.repository_command_query as
select
  command_id,
  command_type,
  command_name,
  command_path,
  command_text,
  domain,
  sensitivity,
  runtime_fanout,
  changed_file_validation_relevant,
  referenced_files,
  jsonb_array_length(referenced_files) as referenced_file_count,
  source_path,
  source_content_sha256,
  imported_at
from planning_query_store.repository_commands;
