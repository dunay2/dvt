-- The generated adapter index imported the Temporal dbt plugin package as a
-- source-level unit even though it owns a package boundary. Normalize that
-- imported row to a component so file ownership resolves to the plugin leaf
-- rather than falling through to SYS-ADAPTERS-ROOT.

update planning_query_store.governance_components component
set
  name = 'Temporal dbt plugin adapter package',
  level = 'component',
  status = 'review',
  governance_state = 'review',
  canonical_role = 'none',
  evidence_state = 'review-required',
  is_drift = false,
  is_legacy = false,
  children_required = false,
  ddd_owner = 'TemporalDbtPluginAdapter',
  cq_rails = 'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
  governance_refs = jsonb_build_array(
    'docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md',
    'docs/architecture/command-query-rail-governance.md'
  ),
  fowler_signals = jsonb_build_array('plugin_boundary', 'package_boundary', 'semantic_encapsulation'),
  raw_component = jsonb_set(
    component.raw_component || jsonb_build_object(
      'name',
      'Temporal dbt plugin adapter package',
      'level',
      'component',
      'status',
      'review',
      'governanceState',
      'review',
      'evidenceState',
      'review-required',
      'dddOwner',
      'TemporalDbtPluginAdapter',
      'cqRails',
      'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
      'reconciledBy',
      '149_adapter_imported_unit_level_reconciliation'
    ),
    '{unitReferences}',
    (
      select jsonb_agg(
        case
          when ref.value->>'id' = 'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN'
            then ref.value || jsonb_build_object(
              'name',
              'Temporal dbt plugin adapter package',
              'level',
              'component',
              'status',
              'review'
            )
          when ref.value->>'id' = 'SYS-ADAPTERS-ROOT'
            then ref.value || jsonb_build_object(
              'name',
              'Adapter packages root component',
              'level',
              'component'
            )
          else ref.value
        end
        order by ref.ordinality
      )
      from jsonb_array_elements(component.raw_component->'unitReferences')
        with ordinality as ref(value, ordinality)
    )
  )
where component.component_id = 'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN';

update planning_query_store.governance_components component
set
  name = 'Adapter packages root component',
  raw_component = jsonb_set(
    component.raw_component || jsonb_build_object(
      'name',
      'Adapter packages root component',
      'reconciledBy',
      '149_adapter_imported_unit_level_reconciliation'
    ),
    '{unitReferences}',
    (
      select jsonb_agg(
        case
          when ref.value->>'id' = 'SYS-ADAPTERS-ROOT'
            then ref.value || jsonb_build_object(
              'name',
              'Adapter packages root component',
              'level',
              'component'
            )
          else ref.value
        end
        order by ref.ordinality
      )
      from jsonb_array_elements(component.raw_component->'unitReferences')
        with ordinality as ref(value, ordinality)
    )
  )
where component.component_id = 'SYS-ADAPTERS-ROOT';

update planning_query_store.governance_components component
set
  raw_component = jsonb_set(
    component.raw_component,
    '{unitReferences}',
    (
      select jsonb_agg(
        case
          when ref.value->>'id' = 'SYS-ADAPTERS-ROOT'
            then ref.value || jsonb_build_object(
              'name',
              'Adapter packages root component',
              'level',
              'component'
            )
          else ref.value
        end
        order by ref.ordinality
      )
      from jsonb_array_elements(component.raw_component->'unitReferences')
        with ordinality as ref(value, ordinality)
    )
  )
where component.raw_component ? 'unitReferences'
  and exists (
    select 1
    from jsonb_array_elements(component.raw_component->'unitReferences') as ref(value)
    where ref.value->>'id' = 'SYS-ADAPTERS-ROOT'
  );
