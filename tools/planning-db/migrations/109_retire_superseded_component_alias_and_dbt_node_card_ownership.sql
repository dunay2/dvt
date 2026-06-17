-- Superseded component aliases are valid architecture history, but they must
-- not be forced to claim files or children after the real component has taken
-- ownership. Keep active/review/canonical components strict while allowing a
-- retired alias to remain queryable without creating false filesystem drift.

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

  if local_definition.status <> 'superseded'
    and local_definition.children_required is not true
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

  if local_definition.status <> 'superseded'
    and exists (
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

update planning_query_store.governance_component_local_definitions
set
  children_required = false,
  owned_concern = 'Deprecated source import dialog alias retained for history; active ownership belongs to SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD and its leaf components.',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
  source_content_sha256 = 'da1ebd18144461ce6a450ff31a2d61bbb8e5ebbfba5b34ead01dae24a3c7b482',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG'
  and status = 'superseded';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-MENU'
  and pattern_kind = 'owns'
  and pattern = 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx';

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL'
  and pattern_kind = 'owns'
  and pattern = 'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-WEB-CANVAS-DBT-NODE-CARD',
    'owns',
    'apps/web/src/app/components/canvas/DbtNodeComponent*',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU',
    'excludes',
    'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL',
    'excludes',
    'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    0
  ),
  (
    'SYS-WEB-CANVAS-NODE-RENDERING-COMPONENTS',
    'excludes',
    'apps/web/src/app/components/canvas/DbtNodeComponent*',
    0
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

update planning_query_store.governance_component_local_definitions
set
  owned_concern = 'Owns node-specific actions without claiming DBT node card rendering, which is owned by SYS-WEB-CANVAS-DBT-NODE-CARD.',
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
  source_content_sha256 = 'da1ebd18144461ce6a450ff31a2d61bbb8e5ebbfba5b34ead01dae24a3c7b482',
  revision = revision + 1
where component_id = 'SYS-WEB-CANVAS-NODE-CONTEXT-MENU';

update planning_query_store.governance_component_local_definitions
set
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
  source_content_sha256 = 'da1ebd18144461ce6a450ff31a2d61bbb8e5ebbfba5b34ead01dae24a3c7b482',
  revision = revision + 1
where component_id in (
  'SYS-WEB-CANVAS-DBT-NODE-CARD',
  'SYS-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL',
  'SYS-WEB-CANVAS-NODE-RENDERING-COMPONENTS'
);
