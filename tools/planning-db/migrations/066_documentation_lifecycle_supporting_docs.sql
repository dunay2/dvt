create or replace view planning_query_store.documentation_lifecycle_query as
with action_counts as (
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
knowledge_reference_counts as (
  select
    link.to_document_id as document_id,
    count(*)::int as inbound_knowledge_reference_count
  from planning_query_store.knowledge_document_links link
  group by link.to_document_id
),
repository_reference_counts as (
  select
    document.document_id,
    count(reference.reference_id)::int as inbound_repository_reference_count
  from planning_query_store.knowledge_documents document
  join planning_query_store.knowledge_intake_repository_references reference
    on reference.target_document_path = document.document_path
  where reference.source_path not like 'buzon/%'
  group by document.document_id
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
    document.mandatory,
    nullif(
      coalesce(
        document.raw_frontmatter ->> 'canonical_disposition',
        document.raw_frontmatter ->> 'canonicalDisposition'
      ),
      ''
    ) as canonical_disposition,
    nullif(
      trim(both '-' from regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(coalesce(document.title, document.document_path)),
            '(20[0-9]{6}|20[0-9]{2}-[0-9]{2}-[0-9]{2})',
            ' ',
            'g'
          ),
          '(fowler analysis|user stories|closeout|component|proposal|plan|canon|implementation)',
          ' ',
          'g'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      ''
    ) as subject_key,
    case
      when document.document_path like 'buzon/%' then 'intake'
      when document.document_path like 'docs/archive/%' then 'archive'
      when document.document_path like 'docs/planning/proposals/%' then 'proposal'
      when document.document_type = 'closeout' then 'closeout'
      when document.document_type in ('architecture_user_stories') then 'supporting'
      when document.document_type in (
        'adr',
        'architecture',
        'architecture_component',
        'concept',
        'contract',
        'guide',
        'runbook'
      ) then 'canonical'
      else 'indexed'
    end as canonicality,
    coalesce(action_counts.action_count, 0)::int as action_count,
    coalesce(action_counts.open_action_count, 0)::int as open_action_count,
    coalesce(reference_counts.inbound_knowledge_reference_count, 0)::int
      as inbound_knowledge_reference_count,
    coalesce(repository_counts.inbound_repository_reference_count, 0)::int
      as inbound_repository_reference_count,
    document.source_content_sha256
  from planning_query_store.knowledge_documents document
  left join action_counts
    on action_counts.document_id = document.document_id
  left join knowledge_reference_counts reference_counts
    on reference_counts.document_id = document.document_id
  left join repository_reference_counts repository_counts
    on repository_counts.document_id = document.document_id
),
stateful as (
  select
    classified.*,
    case
      when lower(coalesce(classified.status, '')) in ('rejected', 'discarded', 'disposable')
        or classified.document_path like 'docs/planning/proposals/disposable/%'
        then 'discarded'
      when lower(coalesce(classified.status, '')) = 'superseded'
        or classified.document_path like 'docs/planning/proposals/superseded/%'
        then 'superseded'
      when classified.document_path like 'docs/archive/%' then 'archived'
      when classified.canonicality = 'intake'
        and classified.canonical_disposition is not null
        then 'canonized'
      when classified.canonicality = 'intake'
        and classified.open_action_count > 0
        then 'open-actions'
      when classified.canonicality = 'intake'
        and (
          classified.inbound_knowledge_reference_count > 0
          or classified.inbound_repository_reference_count > 0
        )
        then 'referenced'
      when classified.canonicality = 'intake' then 'unclassified'
      when classified.canonicality = 'closeout' then 'closed'
      when classified.canonicality = 'proposal'
        and lower(coalesce(classified.status, '')) in ('accepted', 'implemented', 'closed')
        then 'implemented'
      when classified.canonicality = 'proposal' then 'proposed'
      when classified.canonicality in ('canonical', 'supporting') then 'active'
      else 'indexed'
    end as lifecycle_state
  from classified
),
peer_counts as (
  select
    subject_key,
    count(*)::int as subject_document_count,
    count(*) filter (where canonicality = 'canonical')::int as canonical_counterpart_count,
    count(*) filter (where canonicality = 'proposal')::int as proposal_counterpart_count,
    count(*) filter (where canonicality = 'closeout')::int as closeout_counterpart_count,
    count(*) filter (where canonicality = 'intake')::int as intake_counterpart_count
  from stateful
  where subject_key is not null
  group by subject_key
)
select
  stateful.document_id,
  stateful.document_path,
  stateful.document_type,
  stateful.title,
  stateful.status,
  stateful.planning_type,
  stateful.owner,
  stateful.mandatory,
  stateful.canonicality,
  stateful.lifecycle_state,
  coalesce(stateful.canonical_disposition, '') as canonical_disposition,
  stateful.subject_key,
  coalesce(peer_counts.subject_document_count, 1)::int as subject_document_count,
  greatest(coalesce(peer_counts.subject_document_count, 1) - 1, 0)::int as duplicate_count,
  (coalesce(peer_counts.subject_document_count, 1) > 1) as is_duplicate,
  coalesce(peer_counts.canonical_counterpart_count, 0)::int as canonical_counterpart_count,
  coalesce(peer_counts.proposal_counterpart_count, 0)::int as proposal_counterpart_count,
  coalesce(peer_counts.closeout_counterpart_count, 0)::int as closeout_counterpart_count,
  coalesce(peer_counts.intake_counterpart_count, 0)::int as intake_counterpart_count,
  stateful.action_count,
  stateful.open_action_count,
  stateful.inbound_knowledge_reference_count,
  stateful.inbound_repository_reference_count,
  case
    when stateful.canonicality = 'proposal'
      and stateful.lifecycle_state not in ('discarded', 'superseded', 'archived')
      and coalesce(peer_counts.canonical_counterpart_count, 0) = 0
      then 'proposal_missing_canonical'
    when stateful.canonicality = 'proposal'
      and stateful.lifecycle_state = 'implemented'
      and coalesce(peer_counts.closeout_counterpart_count, 0) = 0
      then 'implemented_proposal_missing_closeout'
    when stateful.canonicality = 'intake'
      and stateful.lifecycle_state = 'unclassified'
      then 'intake_unclassified'
    when coalesce(peer_counts.canonical_counterpart_count, 0) > 1
      then 'canonical_duplicate'
    else 'none'
  end as lifecycle_gap_kind,
  'pnpm planning:db:query documentation-lifecycle --path '
    || quote_literal(stateful.document_path) || ' --limit 30' as suggested_query,
  stateful.source_content_sha256
from stateful
left join peer_counts
  on peer_counts.subject_key = stateful.subject_key;
