-- Reconcile the imported Temporal dbt plugin package after migration 148
-- materialized it as a governed adapter leaf. The generated file index already
-- names SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN as owning_unit, but it still leaves
-- component_unit at SYS-ADAPTERS-ROOT. That makes the files fail the
-- leaf-component invariant even though the package boundary is real.

with temporal_dbt_plugin_files as (
  select
    coalesce(jsonb_agg(file.path order by file.path), '[]'::jsonb) as owned_paths,
    count(*)::int as file_count
  from planning_query_store.governance_files file
  where file.path like 'packages/@dvt/temporal-dbt-plugin/%'
)
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
  file_count = greatest(component.file_count, temporal_dbt_plugin_files.file_count),
  ddd_owner = 'TemporalDbtPluginAdapter',
  cq_rails = 'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
  owns = temporal_dbt_plugin_files.owned_paths,
  governance_refs = jsonb_build_array(
    'docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
  ),
  fowler_signals = jsonb_build_array(
    'plugin_boundary',
    'package_boundary',
    'semantic_encapsulation'
  ),
  raw_component = jsonb_set(
    component.raw_component || jsonb_build_object(
      'name',
      'Temporal dbt plugin adapter package',
      'level',
      'component',
      'status',
      'review',
      'childrenRequired',
      false,
      'fileCount',
      greatest(component.file_count, temporal_dbt_plugin_files.file_count),
      'dddOwner',
      'TemporalDbtPluginAdapter',
      'cqRails',
      'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
      'ownedConcern',
      'Owns the Temporal dbt plugin package, CLI runner, dbt step activity, plugin manifest, process/materializer helpers, package config, and plugin tests.',
      'responsibilities',
      jsonb_build_array(
        'Run dbt steps from Temporal through an explicit plugin package instead of coupling the Temporal adapter runtime to dbt CLI internals.'
      ),
      'reasonsToChange',
      jsonb_build_array(
        'Temporal dbt plugin runner, dbt CLI argument/failure policy, project materializer, step activity, manifest, package config, or plugin tests change.'
      ),
      'publicApi',
      jsonb_build_array(
        'RunTemporalDbtPlugin',
        'MaterializeTemporalDbtProject',
        'ReadTemporalDbtPluginManifest'
      ),
      'invariants',
      jsonb_build_array(
        'Temporal dbt plugin files resolve to SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN as the leaf component, never to SYS-ADAPTERS-ROOT.'
      ),
      'transitions',
      jsonb_build_array(
        'review -> implemented after component-quality has no direct Temporal dbt plugin files owned by SYS-ADAPTERS-ROOT and plugin tests remain green.'
      ),
      'consumers',
      jsonb_build_array(
        'Temporal adapter activity dispatch, Temporal workflow runtime, and dbt project execution flows'
      ),
      'governance',
      jsonb_build_array(
        'docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md',
        'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md',
        'docs/architecture/command-query-rail-governance.md',
        'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
      ),
      'fowlerSignals',
      jsonb_build_array(
        'plugin_boundary',
        'package_boundary',
        'semantic_encapsulation'
      ),
      'reconciledBy',
      '150_temporal_dbt_plugin_imported_leaf_reconciliation'
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
              'review',
              'ownedConcern',
              'Owns the Temporal dbt plugin package, CLI runner, dbt step activity, plugin manifest, process/materializer helpers, package config, and plugin tests.',
              'responsibilities',
              jsonb_build_array(
                'Run dbt steps from Temporal through an explicit plugin package instead of coupling the Temporal adapter runtime to dbt CLI internals.'
              ),
              'reasonsToChange',
              jsonb_build_array(
                'Temporal dbt plugin runner, dbt CLI argument/failure policy, project materializer, step activity, manifest, package config, or plugin tests change.'
              ),
              'publicApi',
              jsonb_build_array(
                'RunTemporalDbtPlugin',
                'MaterializeTemporalDbtProject',
                'ReadTemporalDbtPluginManifest'
              ),
              'invariants',
              jsonb_build_array(
                'Temporal dbt plugin files resolve to SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN as the leaf component, never to SYS-ADAPTERS-ROOT.'
              ),
              'transitions',
              jsonb_build_array(
                'review -> implemented after component-quality has no direct Temporal dbt plugin files owned by SYS-ADAPTERS-ROOT and plugin tests remain green.'
              ),
              'consumers',
              jsonb_build_array(
                'Temporal adapter activity dispatch, Temporal workflow runtime, and dbt project execution flows'
              ),
              'governance',
              jsonb_build_array(
                'docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md',
                'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md',
                'docs/architecture/command-query-rail-governance.md',
                'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
              ),
              'fowlerSignals',
              jsonb_build_array(
                'plugin_boundary',
                'package_boundary',
                'semantic_encapsulation'
              )
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
from temporal_dbt_plugin_files
where component.component_id = 'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN';

update planning_query_store.governance_files file
set
  component_unit = 'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
  owner_level = 'component',
  ddd_owner = 'TemporalDbtPluginAdapter',
  cq_rails = 'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
  governance_refs = jsonb_build_array(
    'docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md'
  ),
  raw_file = file.raw_file || jsonb_build_object(
    'componentUnit',
    'SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN',
    'ownerLevel',
    'component',
    'dddOwner',
    'TemporalDbtPluginAdapter',
    'cqRails',
    'RunTemporalDbtPlugin;MaterializeTemporalDbtProject;ReadTemporalDbtPluginManifest',
    'reconciledBy',
    '150_temporal_dbt_plugin_imported_leaf_reconciliation'
  )
where file.path like 'packages/@dvt/temporal-dbt-plugin/%';
