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
    link.to_document_id as document_id,
    count(*)::int as inbound_reference_count
  from planning_query_store.knowledge_document_links link
  group by link.to_document_id
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
