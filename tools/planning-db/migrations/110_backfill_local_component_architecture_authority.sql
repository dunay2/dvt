-- Promote DB-local component splits into first-class architecture authority.
-- The rows are derived from existing Planning DB component definitions and
-- file ownership facts: no alternate inventory or placeholder file map is
-- introduced here.

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
  'PLANNING-DB-LOCAL-COMPONENT-AUTHORITY-BACKFILL-20260617',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Backfill architecture authority for Planning DB local component splits',
  'Architecture / Planning DB',
  'implemented',
  'Local component splits already own tracked files through Planning DB ownership. This design promotes those facts into architecture.component, component relations, and validation evidence so component-integrity can treat the database as the coherent component map.',
  'hidden_authority',
  'ValidateComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

with active_local_components as (
  select
    component_id,
    name,
    parent_id,
    owned_concern,
    ddd_owner,
    cq_rails
  from planning_query_store.governance_component_local_definitions
  where status not in ('superseded', 'legacy')
),
required_semantics as (
  select
    component_id,
    item_kind,
    item_value
  from active_local_components component
  cross join lateral (
    values
      (
        'public_api'::text,
        case
          when nullif(btrim(component.cq_rails), '') is not null
            and component.cq_rails !~* '^none($|[[:space:]]|[-:])'
            then 'Command/query rail(s): ' || component.cq_rails
          else 'Planning DB component profile: ' || component.component_id
        end
      ),
      (
        'invariant'::text,
        'Tracked files claimed by ' || component.component_id ||
          ' must resolve to this component in component_engineering_file_ownership_query without parent fallback drift.'
      ),
      (
        'transition'::text,
        'review -> implemented requires component-profile, component-drift, rail-duplicates, and planning:db:integrity:check to pass for this boundary.'
      ),
      (
        'consumer'::text,
        'Planning DB component-profile/component-integrity readers and parent component ' ||
          component.parent_id || ' consume this boundary.'
      )
  ) semantic_item(item_kind, item_value)
)
insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  required_semantics.component_id,
  required_semantics.item_kind,
  required_semantics.item_value,
  100
from required_semantics
where not exists (
  select 1
  from planning_query_store.governance_component_local_semantic_items existing_item
  where existing_item.component_id = required_semantics.component_id
    and existing_item.item_kind = required_semantics.item_kind
)
on conflict (component_id, item_kind, item_value) do nothing;

with owned_files as (
  select
    coalesce(ownership.leaf_component_id, ownership.owning_unit) as component_id,
    min(ownership.file_path) as repo_path,
    min(ownership.file_path) filter (where ownership.file_role = 'test') as test_path,
    count(*)::int as file_count
  from planning_query_store.component_engineering_file_ownership_query ownership
  group by coalesce(ownership.leaf_component_id, ownership.owning_unit)
),
architecture_candidates as (
  select
    component.component_id,
    component.name,
    component.parent_id,
    component.status,
    component.owned_concern,
    component.ddd_owner,
    component.cq_rails,
    owned_files.repo_path,
    owned_files.test_path,
    owned_files.file_count,
    case
      when component.component_id like '%-PORTS-%'
        or component.name ~* '(^|[[:space:]])port($|[[:space:]])'
        then 'port'
      when component.component_id like '%-ADAPTER%'
        then 'adapter'
      when component.component_id like '%-SERVICES-%'
        then 'service'
      when component.component_id like '%-PACKAGE-%'
        then 'package'
      when component.component_id like 'SYS-WEB-VIEW-%'
        or component.component_id like 'SYS-WEB-CANVAS-%'
        then 'ui-view'
      when component.component_id like 'SYS-WORKER-%'
        then 'workflow'
      else 'module'
    end as component_kind,
    case
      when component.component_id like '%CONTRACT%'
        then 'contracts'
      when component.component_id like 'SYS-WEB-VIEW-%'
        or component.component_id like 'SYS-WEB-CANVAS-%'
        then 'ui'
      when component.component_id like '%-PORTS-%'
        or component.component_id like '%-QUERIES-%'
        then 'application'
      when component.component_id like '%-SERVICES-%'
        or component.component_id like '%-ADAPTER%'
        then 'adapter'
      when component.component_id like '%TOOLING%'
        or component.component_id like '%CONFIG%'
        then 'infra'
      else 'application'
    end as component_layer
  from planning_query_store.governance_component_local_definitions component
  join owned_files
    on owned_files.component_id = component.component_id
  left join architecture.component existing_component
    on existing_component.component_id = component.component_id
  where component.status not in ('superseded', 'legacy')
    and existing_component.component_id is null
),
architecture_rows as (
  select
    candidate.component_id,
    candidate.name,
    candidate.component_kind,
    candidate.component_layer,
    candidate.ddd_owner as owner,
    candidate.repo_path,
    candidate.owned_concern as public_contract,
    case
      when candidate.repo_path like 'apps/web/%' then 'browser'
      when candidate.repo_path like 'packages/%' then 'node'
      when candidate.repo_path like 'scripts/%' then 'node'
      when candidate.repo_path like 'tools/%' then 'node'
      else 'none'
    end as runtime,
    'medium'::text as criticality,
    case candidate.status
      when 'canonical' then 'implemented'
      when 'drift' then 'drift'
      else 'review'
    end as status,
    case
      when candidate.parent_id is not null
        and candidate.parent_id <> ''
        and candidate.parent_id <> candidate.component_id
        and (
          exists (
            select 1
            from architecture.component parent_component
            where parent_component.component_id = candidate.parent_id
          )
          or exists (
            select 1
            from architecture_candidates parent_candidate
            where parent_candidate.component_id = candidate.parent_id
          )
        )
        then candidate.parent_id
      else null
    end as parent_component_id
  from architecture_candidates candidate
)
insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
select
  component_id,
  name,
  component_kind,
  component_layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
from architecture_rows
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select
  'PLANNING-DB-LOCAL-COMPONENT-AUTHORITY-BACKFILL-20260617',
  'component',
  component.component_id,
  'may_update',
  true
from planning_query_store.governance_component_local_definitions component
where component.status not in ('superseded', 'legacy')
on conflict (design_id, subject_kind, subject_id, scope_kind) do nothing;

with local_components as (
  select
    component.component_id,
    component.owned_concern,
    component.ddd_owner,
    coalesce(
      (
        select item.item_value
        from planning_query_store.governance_component_local_semantic_items item
        where item.component_id = component.component_id
          and item.item_kind = 'reason_to_change'
        order by item.item_order, item.item_value
        limit 1
      ),
      'Ownership, command/query rail, or source path boundary changes for ' ||
        component.component_id || '.'
    ) as reason_to_change
  from planning_query_store.governance_component_local_definitions component
  join architecture.component architecture_component
    on architecture_component.component_id = component.component_id
  where component.status not in ('superseded', 'legacy')
)
insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || local_components.component_id,
  local_components.component_id,
  local_components.owned_concern,
  local_components.reason_to_change,
  local_components.ddd_owner,
  'implemented'
from local_components
on conflict (responsibility_id) do update set
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

with relation_candidates as (
  select
    child.parent_id as source_component_id,
    child.component_id as target_component_id,
    'REL-LOCAL-CONTAINS-' ||
      upper(substr(md5(child.parent_id || '->' || child.component_id), 1, 16)) as relation_id,
    jsonb_build_array(child.source_path, coalesce(min(ownership.file_path), child.source_path)) as source_refs
  from planning_query_store.governance_component_local_definitions child
  join architecture.component source_component
    on source_component.component_id = child.parent_id
  join architecture.component target_component
    on target_component.component_id = child.component_id
  left join planning_query_store.component_engineering_file_ownership_query ownership
    on coalesce(ownership.leaf_component_id, ownership.owning_unit) = child.component_id
  where child.status not in ('superseded', 'legacy')
    and child.parent_id <> child.component_id
    and child.parent_id <> ''
    and not exists (
      select 1
      from architecture.component_relation existing_relation
      where existing_relation.source_component_id = child.parent_id
        and existing_relation.target_component_id = child.component_id
        and existing_relation.relation_type = 'contains'
    )
  group by child.parent_id, child.component_id, child.source_path
)
insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  relation_id,
  source_component_id,
  target_component_id,
  'contains',
  'outbound',
  'build_time',
  'Component profile becomes incomplete if the child boundary is removed or remapped without a governed Planning DB component update.',
  'repo-local Planning DB architecture authority',
  source_refs,
  'implemented'
from relation_candidates
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select
  'PLANNING-DB-LOCAL-COMPONENT-AUTHORITY-BACKFILL-20260617',
  'relation',
  relation.relation_id,
  'may_update',
  true
from architecture.component_relation relation
where relation.relation_id like 'REL-LOCAL-CONTAINS-%'
on conflict (design_id, subject_kind, subject_id, scope_kind) do nothing;

with owned_files as (
  select
    coalesce(ownership.leaf_component_id, ownership.owning_unit) as component_id,
    min(ownership.file_path) filter (where ownership.file_role = 'test') as test_path
  from planning_query_store.component_engineering_file_ownership_query ownership
  group by coalesce(ownership.leaf_component_id, ownership.owning_unit)
),
test_candidates as (
  select
    component.component_id,
    'TEST-' || regexp_replace(component.component_id, '[^A-Z0-9]+', '-', 'g') as test_id,
    coalesce(owned_files.test_path, 'scripts/planning-db-query.test.cjs') as test_path,
    'pnpm planning:db:query component-profile ' || component.component_id ||
      ' --no-refresh && pnpm planning:db:query component-integrity --component ' ||
      component.component_id || ' --no-refresh' as validation_command
  from planning_query_store.governance_component_local_definitions component
  join architecture.component architecture_component
    on architecture_component.component_id = component.component_id
  left join owned_files
    on owned_files.component_id = component.component_id
  where component.status not in ('superseded', 'legacy')
)
insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  test_id,
  component_id,
  test_path,
  'architecture',
  'boundary',
  true,
  validation_command
from test_candidates
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select
  'PLANNING-DB-LOCAL-COMPONENT-AUTHORITY-BACKFILL-20260617',
  'test',
  component_test.test_id,
  'may_update',
  true
from architecture.component_test component_test
where component_test.test_id like 'TEST-SYS-%'
on conflict (design_id, subject_kind, subject_id, scope_kind) do nothing;
