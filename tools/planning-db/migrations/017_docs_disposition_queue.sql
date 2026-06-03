create table if not exists planning_query_store.doc_disposition_documents (
  document_path text primary key,
  title text,
  status text,
  planning_type text,
  owner text,
  is_active boolean not null,
  is_archive boolean not null,
  pending_marker_count integer not null default 0,
  task_like_reference_count integer not null default 0,
  source_content_sha256 text not null,
  raw_frontmatter jsonb not null default '{}'::jsonb,
  raw_document jsonb not null,
  imported_at timestamptz not null default now()
);

create table if not exists planning_query_store.doc_disposition_markers (
  marker_id text primary key,
  document_path text not null references planning_query_store.doc_disposition_documents(document_path) on delete cascade,
  marker_kind text not null,
  occurrence_count integer not null,
  sample_lines jsonb not null default '[]'::jsonb,
  source_content_sha256 text not null,
  raw_marker jsonb not null,
  imported_at timestamptz not null default now()
);

create index if not exists doc_disposition_markers_document_path_idx
  on planning_query_store.doc_disposition_markers(document_path);

create index if not exists doc_disposition_markers_marker_kind_idx
  on planning_query_store.doc_disposition_markers(marker_kind);

create table if not exists planning_query_store.doc_task_like_references (
  reference_id text primary key,
  document_path text not null references planning_query_store.doc_disposition_documents(document_path) on delete cascade,
  reference_text text not null,
  reference_prefix text not null,
  classification text not null,
  registered_planning_task boolean not null default false,
  occurrence_count integer not null,
  sample_lines jsonb not null default '[]'::jsonb,
  source_content_sha256 text not null,
  raw_reference jsonb not null,
  imported_at timestamptz not null default now()
);

create index if not exists doc_task_like_references_document_path_idx
  on planning_query_store.doc_task_like_references(document_path);

create index if not exists doc_task_like_references_classification_idx
  on planning_query_store.doc_task_like_references(classification);

create index if not exists doc_task_like_references_prefix_idx
  on planning_query_store.doc_task_like_references(reference_prefix);

create table if not exists planning_query_store.doc_disposition_actions (
  action_id text primary key,
  priority text not null,
  action_kind text not null,
  document_path text not null references planning_query_store.doc_disposition_documents(document_path) on delete cascade,
  reference_text text,
  reason text not null,
  blocking boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  source_content_sha256 text not null,
  raw_action jsonb not null,
  imported_at timestamptz not null default now()
);

create index if not exists doc_disposition_actions_priority_idx
  on planning_query_store.doc_disposition_actions(priority);

create index if not exists doc_disposition_actions_kind_idx
  on planning_query_store.doc_disposition_actions(action_kind);

create index if not exists doc_disposition_actions_document_path_idx
  on planning_query_store.doc_disposition_actions(document_path);

create or replace view planning_query_store.doc_disposition_document_query as
select
  document_path,
  title,
  status,
  planning_type,
  owner,
  is_active,
  is_archive,
  pending_marker_count,
  task_like_reference_count,
  source_content_sha256,
  raw_frontmatter,
  raw_document,
  imported_at
from planning_query_store.doc_disposition_documents;

create or replace view planning_query_store.doc_task_reference_query as
select
  reference_id,
  document_path,
  reference_text,
  reference_prefix,
  classification,
  registered_planning_task,
  occurrence_count,
  sample_lines,
  source_content_sha256,
  raw_reference,
  imported_at
from planning_query_store.doc_task_like_references;

create or replace view planning_query_store.doc_disposition_action_query as
select
  action.action_id,
  action.priority,
  action.action_kind,
  action.document_path,
  document.status as document_status,
  document.planning_type,
  document.is_active,
  action.reference_text,
  action.reason,
  action.blocking,
  action.evidence,
  action.source_content_sha256,
  action.raw_action,
  action.imported_at
from planning_query_store.doc_disposition_actions action
join planning_query_store.doc_disposition_documents document
  on document.document_path = action.document_path;
