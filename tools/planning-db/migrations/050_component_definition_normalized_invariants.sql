create or replace function planning_query_store.assert_governance_component_local_definition_invariants(
  target_component_id text
)
returns void
language plpgsql
as $$
declare
  local_definition record;
  missing_semantic_items text[];
begin
  if target_component_id is null then
    return;
  end if;

  select
    component_id,
    status,
    children_required
  into local_definition
  from planning_query_store.governance_component_local_definitions
  where component_id = target_component_id;

  if not found then
    return;
  end if;

  if local_definition.children_required is not true
    and not exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns pattern
      where pattern.component_id = local_definition.component_id
        and pattern.pattern_kind = 'owns'
    )
  then
    raise exception using
      errcode = '23514',
      message = format(
        'Governance component %s must declare owns or children_required true.',
        local_definition.component_id
      ),
      constraint = 'governance_component_local_definition_ownership_invariants';
  end if;

  if exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns pattern
      where pattern.component_id = local_definition.component_id
        and pattern.pattern_kind = 'excludes'
    )
    and not exists (
      select 1
      from planning_query_store.governance_component_local_ownership_patterns pattern
      where pattern.component_id = local_definition.component_id
        and pattern.pattern_kind = 'owns'
    )
  then
    raise exception using
      errcode = '23514',
      message = format(
        'Governance component %s cannot declare excludes without owns.',
        local_definition.component_id
      ),
      constraint = 'governance_component_local_definition_exclusion_invariants';
  end if;

  if local_definition.status = 'canonical' then
    select array_agg(required.item_kind order by required.item_order)
    into missing_semantic_items
    from (
      select *
      from (
        values
          (1, 'public_api'::text),
          (2, 'invariant'::text),
          (3, 'transition'::text),
          (4, 'consumer'::text)
      ) as required(item_order, item_kind)
      where item_kind in ('public_api', 'invariant', 'transition', 'consumer')
    ) required
    where not exists (
      select 1
      from planning_query_store.governance_component_local_semantic_items item
      where item.component_id = local_definition.component_id
        and item.item_kind = required.item_kind
    );

    if coalesce(array_length(missing_semantic_items, 1), 0) > 0 then
      raise exception using
        errcode = '23514',
        message = format(
          'Canonical governance component %s is missing semantic metadata: %s.',
          local_definition.component_id,
          array_to_string(missing_semantic_items, ', ')
        ),
        constraint = 'governance_component_local_definition_canonical_semantic_invariants';
    end if;
  end if;
end;
$$;

create or replace function planning_query_store.check_governance_component_local_definition_invariants()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    perform planning_query_store.assert_governance_component_local_definition_invariants(
      OLD.component_id
    );
    return OLD;
  end if;

  if TG_OP = 'UPDATE' and OLD.component_id is distinct from NEW.component_id then
    perform planning_query_store.assert_governance_component_local_definition_invariants(
      OLD.component_id
    );
  end if;

  perform planning_query_store.assert_governance_component_local_definition_invariants(
    NEW.component_id
  );
  return NEW;
end;
$$;

drop trigger if exists governance_component_local_definitions_invariants
  on planning_query_store.governance_component_local_definitions;

create constraint trigger governance_component_local_definitions_invariants
after insert or update or delete
on planning_query_store.governance_component_local_definitions
deferrable initially deferred
for each row
execute function planning_query_store.check_governance_component_local_definition_invariants();

drop trigger if exists governance_component_local_ownership_patterns_invariants
  on planning_query_store.governance_component_local_ownership_patterns;

create constraint trigger governance_component_local_ownership_patterns_invariants
after insert or update or delete
on planning_query_store.governance_component_local_ownership_patterns
deferrable initially deferred
for each row
execute function planning_query_store.check_governance_component_local_definition_invariants();

drop trigger if exists governance_component_local_semantic_items_invariants
  on planning_query_store.governance_component_local_semantic_items;

create constraint trigger governance_component_local_semantic_items_invariants
after insert or update or delete
on planning_query_store.governance_component_local_semantic_items
deferrable initially deferred
for each row
execute function planning_query_store.check_governance_component_local_definition_invariants();
