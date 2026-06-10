drop view if exists planning_query_store.fowler_analysis_duplicate_intent_query;
drop view if exists planning_query_store.fowler_analysis_intended_work_query;

create or replace view planning_query_store.fowler_analysis_intended_work_query as
with accepted_targets as (
  select distinct on (target.document_path)
    target.document_path,
    target.target_path as canonical_target_path,
    target.target_status as canonical_target_status
  from planning_query_store.fowler_analysis_canonical_targets target
  where target.target_status = 'accepted'
  order by target.document_path, target.linked_at desc, target.target_path
),
source_actions as (
  select
    document.document_id,
    document.document_path,
    document.document_type,
    document.title,
    document.document_class,
    document.work_state,
    document.subject_key,
    target.canonical_target_path,
    action.action_id,
    action.summary,
    action.status as action_status,
    action.required,
    action.line_number,
    document.source_content_sha256,
    lower(coalesce(action.status, '')) not in (
      'deferred',
      'done',
      'rejected',
      'resolved',
      'superseded'
    ) as is_open_action
  from planning_query_store.fowler_analysis_work_query document
  join planning_query_store.knowledge_action_items action
    on action.source_document_id = document.document_id
  left join accepted_targets target
    on target.document_path = document.document_path
),
normalized_actions as (
  select
    source_actions.*,
    nullif(
      trim(regexp_replace(source_actions.summary, '\s+', ' ', 'g')),
      ''
    ) as intent_summary,
    nullif(
      trim(both '-' from regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                lower(source_actions.summary),
                '(`|\*\*|\*|\[|\]|\(|\)|:)',
                ' ',
                'g'
              ),
              '(20[0-9]{6}|20[0-9]{2}-[0-9]{2}-[0-9]{2})',
              ' ',
              'g'
            ),
            '(^|[^a-z0-9])(task|step|phase|stage|fowler|analysis|review|plan|proposal|closeout|required|todo|fix|qa)([^a-z0-9]|$)',
            ' ',
            'g'
          ),
          '(^|[^a-z0-9])[a-z]+-[0-9]+([^a-z0-9]|$)',
          ' ',
          'g'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      ''
    ) as intent_key
  from source_actions
),
intent_rollup as (
  select
    normalized_actions.intent_key,
    count(*)::int as duplicate_action_count,
    count(*) filter (where normalized_actions.is_open_action)::int
      as duplicate_open_action_count,
    count(distinct normalized_actions.document_path)::int as duplicate_document_count,
    count(*) filter (where normalized_actions.required)::int as duplicate_required_action_count
  from normalized_actions
  where normalized_actions.intent_key is not null
  group by normalized_actions.intent_key
)
select
  normalized_actions.action_id,
  normalized_actions.document_id,
  normalized_actions.document_path,
  normalized_actions.document_type,
  normalized_actions.title,
  normalized_actions.document_class,
  normalized_actions.work_state,
  normalized_actions.subject_key,
  normalized_actions.canonical_target_path,
  normalized_actions.intent_key,
  normalized_actions.intent_summary,
  normalized_actions.summary,
  normalized_actions.action_status,
  normalized_actions.required,
  normalized_actions.line_number,
  coalesce(intent_rollup.duplicate_action_count, 1)::int as duplicate_action_count,
  coalesce(intent_rollup.duplicate_open_action_count, 0)::int as duplicate_open_action_count,
  coalesce(intent_rollup.duplicate_document_count, 1)::int as duplicate_document_count,
  coalesce(intent_rollup.duplicate_required_action_count, 0)::int
    as duplicate_required_action_count,
  (
    coalesce(intent_rollup.duplicate_action_count, 1) > 1
    or coalesce(intent_rollup.duplicate_document_count, 1) > 1
  ) as is_duplicate_intent,
  case
    when normalized_actions.intent_key is null then 'unclassified_intent'
    when coalesce(intent_rollup.duplicate_open_action_count, 0) > 1
      and coalesce(intent_rollup.duplicate_document_count, 1) > 1
      then 'duplicate_open_intent'
    when coalesce(intent_rollup.duplicate_action_count, 1) > 1
      then 'duplicate_resolved_intent'
    when normalized_actions.is_open_action then 'open_intent'
    else 'resolved_intent'
  end as intent_state,
  'pnpm planning:db:query fowler-analysis-intent --path '
    || quote_literal(normalized_actions.document_path)
    || ' --limit 30' as suggested_query,
  normalized_actions.source_content_sha256
from normalized_actions
left join intent_rollup
  on intent_rollup.intent_key = normalized_actions.intent_key;

create or replace view planning_query_store.fowler_analysis_duplicate_intent_query as
with duplicate_groups as (
  select
    intent.intent_key,
    min(intent.canonical_target_path) filter (where intent.canonical_target_path is not null)
      as canonical_target_path,
    count(*)::int as duplicate_action_count,
    count(*) filter (where intent.action_status not in (
      'deferred',
      'done',
      'rejected',
      'resolved',
      'superseded'
    ))::int as duplicate_open_action_count,
    count(distinct intent.document_path)::int as duplicate_document_count,
    count(*) filter (where intent.required)::int as duplicate_required_action_count,
    min(intent.document_path) as sample_document_path,
    (array_agg(intent.summary order by intent.document_path, intent.line_number, intent.action_id))[1]
      as sample_summary,
    (array_agg(intent.title order by intent.document_path, intent.line_number, intent.action_id))[1]
      as sample_title,
    max(intent.source_content_sha256) as source_content_sha256
  from planning_query_store.fowler_analysis_intended_work_query intent
  where intent.intent_key is not null
    and intent.is_duplicate_intent is true
  group by intent.intent_key
)
select
  duplicate_groups.intent_key,
  case
    when duplicate_groups.duplicate_open_action_count > 0 then 'open_duplicate'
    else 'resolved_duplicate'
  end as duplicate_state,
  duplicate_groups.duplicate_action_count,
  duplicate_groups.duplicate_open_action_count,
  duplicate_groups.duplicate_document_count,
  duplicate_groups.duplicate_required_action_count,
  duplicate_groups.canonical_target_path,
  duplicate_groups.sample_document_path,
  duplicate_groups.sample_summary,
  duplicate_groups.sample_title,
  'pnpm planning:db:query fowler-analysis-intent --duplicates true --state duplicate_open_intent --limit 30'
    as suggested_query,
  duplicate_groups.source_content_sha256
from duplicate_groups;

insert into planning_query_store.db_governance_surfaces (
  surface_name,
  canonical_source,
  write_rail,
  write_rail_kind,
  read_query_rail,
  projection,
  validation,
  migration_state,
  source_ref,
  source_content_sha256,
  revision,
  updated_by,
  raw_surface
)
values (
  'Fowler analysis intended work duplicates',
  'planning_query_store.knowledge_action_items joined to planning_query_store.fowler_analysis_work_query',
  'Import knowledge documents through pnpm governance:refresh or pnpm governance:db:import',
  'import',
  'pnpm planning:db:query fowler-analysis-intent; pnpm planning:db:query fowler-analysis-duplicates',
  'planning_query_store.fowler_analysis_intended_work_query; planning_query_store.fowler_analysis_duplicate_intent_query',
  'node --test scripts/planning-db-migrate.test.cjs scripts/planning-db-query.test.cjs',
  'Hybrid indexed',
  'tools/planning-db/migrations/075_fowler_analysis_intent_duplicates.sql',
  repeat('0', 64),
  0,
  'migration',
  jsonb_build_object(
    'authority', 'db_projection',
    'rail', 'QueryFowlerAnalysisWorkQueue',
    'fowlerSignal', 'Duplicate semantics',
    'views', jsonb_build_array(
      'fowler_analysis_intended_work_query',
      'fowler_analysis_duplicate_intent_query'
    )
  )
)
on conflict (surface_name) do update
set
  canonical_source = excluded.canonical_source,
  write_rail = excluded.write_rail,
  write_rail_kind = excluded.write_rail_kind,
  read_query_rail = excluded.read_query_rail,
  projection = excluded.projection,
  validation = excluded.validation,
  migration_state = excluded.migration_state,
  source_ref = excluded.source_ref,
  source_content_sha256 = excluded.source_content_sha256,
  revision = planning_query_store.db_governance_surfaces.revision + 1,
  updated_by = excluded.updated_by,
  updated_at = now(),
  raw_surface = excluded.raw_surface;
