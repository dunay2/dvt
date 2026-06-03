create extension if not exists pgcrypto;

create or replace function planning_query_store.sha256_text(value text)
returns text
language sql
immutable
strict
as $$
  select encode(digest(convert_to(value, 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function planning_query_store.stable_jsonb_text(value jsonb)
returns text
language sql
immutable
strict
as $$
  select case jsonb_typeof(value)
    when 'null' then 'null'
    when 'boolean' then value::text
    when 'number' then value::text
    when 'string' then to_jsonb(value #>> '{}')::text
    when 'array' then '[' || coalesce((
      select string_agg(
        planning_query_store.stable_jsonb_text(element),
        ','
        order by ordinality
      )
      from jsonb_array_elements(value) with ordinality as items(element, ordinality)
    ), '') || ']'
    when 'object' then '{' || coalesce((
      select string_agg(
        to_jsonb(key)::text || ':' || planning_query_store.stable_jsonb_text(entry_value),
        ','
        order by key
      )
      from jsonb_each(value) as entries(key, entry_value)
    ), '') || '}'
  end
$$;

create or replace view planning_query_store.governance_file_hash_projection as
with base as (
  select
    gf.path,
    gf.file_id as stored_file_id,
    gf.path_hash as stored_path_hash,
    gf.content_hash,
    gf.governance_hash as stored_governance_hash,
    gf.state_fingerprint as stored_state_fingerprint,
    gf.owning_unit,
    gf.root_unit,
    gf.domain_unit,
    gf.component_unit,
    gf.owner_level,
    gf.unit_status,
    gf.governance_state,
    gf.canonical_role,
    gf.evidence_state,
    gf.is_drift,
    gf.is_legacy,
    gf.ddd_owner,
    gf.cq_rails,
    gf.governance_refs,
    gf.raw_file,
    gf.source_path,
    gf.source_content_sha256,
    planning_query_store.sha256_text('dvt:file-path:v1:' || gf.path) as derived_path_hash,
    'F-' || upper(substr(planning_query_store.sha256_text('dvt:file:v1:' || gf.path), 1, 12)) as derived_file_id
  from planning_query_store.governance_files gf
),
payloads as (
  select
    base.*,
    planning_query_store.stable_jsonb_text(jsonb_build_object(
      'canonicalRole', canonical_role,
      'componentUnit', component_unit,
      'cqRails', cq_rails,
      'dddOwner', ddd_owner,
      'domainUnit', domain_unit,
      'evidenceState', evidence_state,
      'governance', governance_refs,
      'governanceState', governance_state,
      'isDrift', is_drift,
      'isLegacy', is_legacy,
      'ownerLevel', owner_level,
      'owningUnit', owning_unit,
      'rootUnit', root_unit,
      'unitPath', coalesce(raw_file -> 'unitPath', '[]'::jsonb),
      'unitStatus', unit_status
    )) as governance_payload_text
  from base
),
derived as (
  select
    payloads.*,
    planning_query_store.sha256_text(governance_payload_text) as derived_governance_hash
  from payloads
)
select
  path,
  stored_file_id,
  derived_file_id,
  stored_path_hash,
  derived_path_hash,
  content_hash,
  stored_governance_hash,
  derived_governance_hash,
  stored_state_fingerprint,
  planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(jsonb_build_object(
    'contentHash', content_hash,
    'governanceHash', derived_governance_hash,
    'pathHash', derived_path_hash
  ))) as derived_state_fingerprint,
  owning_unit,
  root_unit,
  domain_unit,
  component_unit,
  source_path,
  source_content_sha256
from derived;

create or replace view planning_query_store.governance_file_hash_drift as
select *
from planning_query_store.governance_file_hash_projection
where stored_file_id is distinct from derived_file_id
  or stored_path_hash is distinct from derived_path_hash
  or stored_governance_hash is distinct from derived_governance_hash
  or stored_state_fingerprint is distinct from derived_state_fingerprint;
