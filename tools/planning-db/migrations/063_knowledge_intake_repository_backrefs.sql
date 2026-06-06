create table if not exists planning_query_store.knowledge_intake_repository_references (
  reference_id text primary key,
  target_document_path text not null,
  source_path text not null,
  relation_type text not null,
  line_number integer not null,
  sample_text text not null,
  source_content_sha256 text not null,
  raw_reference jsonb not null default '{}'::jsonb
);

create index if not exists knowledge_intake_repository_references_target_idx
  on planning_query_store.knowledge_intake_repository_references(target_document_path);

create index if not exists knowledge_intake_repository_references_source_idx
  on planning_query_store.knowledge_intake_repository_references(source_path);

create or replace view planning_query_store.knowledge_intake_repository_reference_query as
select
  target_document.document_path,
  reference.relation_type,
  reference.source_path as reference_path,
  ownership.leaf_component_id as reference_component_id,
  ownership.file_role as reference_file_role,
  coalesce(nullif(source_document.title, ''), reference.source_path) as reference_title,
  coalesce(source_document.document_type, 'repository_file') as reference_document_type,
  coalesce(
    source_document.source_content_sha256,
    reference.source_content_sha256
  ) as reference_source_content_sha256,
  reference.line_number,
  reference.sample_text
from planning_query_store.knowledge_intake_repository_references reference
join planning_query_store.knowledge_documents target_document
  on target_document.document_path = reference.target_document_path
left join planning_query_store.knowledge_documents source_document
  on source_document.document_path = reference.source_path
left join planning_query_store.component_engineering_file_ownership_query ownership
  on ownership.file_path = reference.source_path
where reference.source_path not like 'buzon/%';

create or replace view planning_query_store.knowledge_intake_retirement_query as
with intake_documents as (
  select
    document_id,
    document_path,
    document_type,
    title,
    status,
    planning_type,
    owner,
    nullif(
      coalesce(
        raw_frontmatter ->> 'canonical_disposition',
        raw_frontmatter ->> 'canonicalDisposition'
      ),
      ''
    ) as canonical_disposition,
    source_content_sha256
  from planning_query_store.knowledge_documents
  where document_path like 'buzon/%'
),
reference_counts as (
  select
    document.document_id,
    count(reference.reference_id)::int as inbound_reference_count
  from intake_documents document
  join planning_query_store.knowledge_intake_repository_references reference
    on reference.target_document_path = document.document_path
  where reference.source_path not like 'buzon/%'
  group by document.document_id
),
action_counts as (
  select
    action.source_document_id as document_id,
    count(*)::int as action_count,
    count(*) filter (
      where lower(coalesce(action.status, '')) not in (
        'deferred',
        'done',
        'rejected',
        'resolved',
        'superseded'
      )
    )::int as open_action_count
  from planning_query_store.knowledge_action_items action
  group by action.source_document_id
),
classified as (
  select
    document.document_id,
    document.document_path,
    document.document_type,
    document.title,
    document.status,
    document.planning_type,
    document.owner,
    document.canonical_disposition,
    coalesce(reference_counts.inbound_reference_count, 0)::int as inbound_reference_count,
    coalesce(action_counts.action_count, 0)::int as action_count,
    coalesce(action_counts.open_action_count, 0)::int as open_action_count,
    case
      when document.canonical_disposition is not null then 'canonized'
      when coalesce(action_counts.open_action_count, 0) > 0 then 'open-actions'
      when coalesce(reference_counts.inbound_reference_count, 0) > 0 then 'referenced'
      else 'unclassified'
    end as retirement_state,
    document.source_content_sha256
  from intake_documents document
  left join reference_counts
    on reference_counts.document_id = document.document_id
  left join action_counts
    on action_counts.document_id = document.document_id
)
select
  document_id,
  document_path,
  document_type,
  title,
  status,
  planning_type,
  owner,
  canonical_disposition,
  inbound_reference_count,
  action_count,
  open_action_count,
  retirement_state,
  'pnpm planning:db:query knowledge-intake --state ' || quote_literal(retirement_state)
    || ' --path ' || quote_literal(document_path) || ' --limit 30' as suggested_query,
  source_content_sha256
from classified;
