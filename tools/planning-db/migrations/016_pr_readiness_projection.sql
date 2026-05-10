create table if not exists planning_query_store.pr_readiness_checks (
  readiness_id text primary key,
  base_ref text not null,
  head_ref text not null,
  source_path text not null,
  source_content_sha256 text not null,
  effective_arc_level text not null,
  is_arc boolean not null,
  blocking boolean not null,
  requirements jsonb not null default '{}'::jsonb,
  required_checks jsonb not null default '[]'::jsonb,
  recommended_guides jsonb not null default '[]'::jsonb,
  changed_files jsonb not null default '[]'::jsonb,
  evidence_docs jsonb not null default '[]'::jsonb,
  risk_updates jsonb not null default '[]'::jsonb,
  trigger_hits jsonb not null default '[]'::jsonb,
  missing_requirements jsonb not null default '[]'::jsonb,
  raw_readiness jsonb not null,
  imported_at timestamptz not null default now()
);

create or replace view planning_query_store.pr_readiness_query as
select
  readiness_id,
  base_ref,
  head_ref,
  source_path,
  source_content_sha256,
  effective_arc_level,
  is_arc,
  blocking,
  requirements,
  required_checks,
  recommended_guides,
  changed_files,
  jsonb_array_length(changed_files)::int as changed_file_count,
  evidence_docs,
  jsonb_array_length(evidence_docs)::int as evidence_doc_count,
  risk_updates,
  jsonb_array_length(risk_updates)::int as risk_update_count,
  trigger_hits,
  jsonb_array_length(trigger_hits)::int as trigger_count,
  missing_requirements,
  jsonb_array_length(missing_requirements)::int as missing_requirement_count,
  coalesce((requirements ->> 'evidenceDoc')::boolean, false) as requires_evidence_doc,
  jsonb_array_length(evidence_docs) > 0 as has_evidence_doc,
  case
    when coalesce((requirements ->> 'evidenceDoc')::boolean, false)
      and jsonb_array_length(evidence_docs) = 0 then 'missing'
    when coalesce((requirements ->> 'evidenceDoc')::boolean, false) then 'present'
    else 'not-required'
  end as evidence_doc_status,
  coalesce((requirements ->> 'riskUpdate')::boolean, false) as requires_risk_update,
  jsonb_array_length(risk_updates) > 0 as has_risk_update,
  case
    when coalesce((requirements ->> 'riskUpdate')::boolean, false)
      and jsonb_array_length(risk_updates) = 0 then 'missing'
    when coalesce((requirements ->> 'riskUpdate')::boolean, false) then 'present'
    else 'not-required'
  end as risk_update_status,
  raw_readiness,
  imported_at
from planning_query_store.pr_readiness_checks;
