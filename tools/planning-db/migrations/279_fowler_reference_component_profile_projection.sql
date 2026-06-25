-- Keep component-profile Fowler references on DB-owned materialized ownership
-- facts. The previous reference view joined the live ownership view for every
-- Fowler reference read, making component-profile unusable during DB-first
-- component mapping.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-FOWLER-REFERENCE-PROFILE-PROJECTION-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB Fowler reference profile projection',
  'Architecture / Planning DB',
  'review',
  'component-profile is the operator entry point for DB-first component mapping. Fowler reference evidence must resolve component ownership through the materialized ownership projection rather than recomputing local ownership pattern matching for every profile read.',
  'evolutionary_architecture',
  'ListComponentProfile;ListFowlerAnalysisReferences;RefreshComponentFileOwnershipMaterializedProjection',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

create index if not exists knowledge_intake_repository_references_target_lookup_idx
  on planning_query_store.knowledge_intake_repository_references (
    target_document_path,
    source_path,
    relation_type
  );

create index if not exists knowledge_document_links_to_from_lookup_idx
  on planning_query_store.knowledge_document_links (
    to_document_id,
    from_document_id,
    relation_type
  );

create index if not exists fowler_analysis_reference_resolutions_lookup_idx
  on planning_query_store.fowler_analysis_reference_resolutions (
    document_path,
    reference_path,
    relation_type
  );

create or replace view planning_query_store.fowler_analysis_reference_query as
with accepted_targets as materialized (
  select
    target.document_path,
    min(target.target_path) as canonical_target_path
  from planning_query_store.fowler_analysis_canonical_targets target
  where target.target_status = 'accepted'
  group by target.document_path
),
imported_references as materialized (
  select
    document.document_path,
    'repository_path_reference'::text as reference_kind,
    reference.relation_type,
    reference.source_path as reference_path,
    ownership.leaf_component_id as reference_component_id,
    ownership.file_role as reference_file_role,
    reference.sample_text,
    reference.source_content_sha256
  from planning_query_store.fowler_analysis_document_query document
  join planning_query_store.knowledge_intake_repository_references reference
    on reference.target_document_path = document.document_path
  left join planning_query_store.component_engineering_file_ownership_projection ownership
    on ownership.file_path = reference.source_path
  where reference.source_path not like 'buzon/%'

  union all

  select
    document.document_path,
    'knowledge_document_link'::text as reference_kind,
    link.relation_type,
    source_document.document_path as reference_path,
    ownership.leaf_component_id as reference_component_id,
    ownership.file_role as reference_file_role,
    source_document.title as sample_text,
    source_document.source_content_sha256
  from planning_query_store.fowler_analysis_document_query document
  join planning_query_store.knowledge_document_links link
    on link.to_document_id = document.document_id
  join planning_query_store.knowledge_documents source_document
    on source_document.document_id = link.from_document_id
  left join planning_query_store.component_engineering_file_ownership_projection ownership
    on ownership.file_path = source_document.document_path
  where source_document.document_path not like 'buzon/%'
),
classified as (
  select
    reference.document_path,
    reference.reference_kind,
    reference.relation_type,
    reference.reference_path,
    target.canonical_target_path,
    coalesce(resolution.resolution_status, 'pending') as resolution_status,
    case
      when resolution.resolution_status in ('resolved', 'obsolete', 'replaced')
        then 'resolved'
      else 'live'
    end as reference_state,
    reference.reference_component_id,
    reference.reference_file_role,
    reference.sample_text,
    reference.source_content_sha256
  from imported_references reference
  left join accepted_targets target
    on target.document_path = reference.document_path
  left join planning_query_store.fowler_analysis_reference_resolutions resolution
    on resolution.document_path = reference.document_path
   and resolution.reference_path = reference.reference_path
   and resolution.relation_type = reference.relation_type
)
select
  document_path,
  reference_kind,
  relation_type,
  reference_path,
  canonical_target_path,
  resolution_status,
  reference_state,
  reference_component_id,
  reference_file_role,
  sample_text,
  source_content_sha256
from classified;
