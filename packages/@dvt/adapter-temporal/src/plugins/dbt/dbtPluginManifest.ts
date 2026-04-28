/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginManifest.ts
 * @ownedConcern Declare the Temporal DBT plugin manifest and its step-kind to CLI-command map
 * @baseline ADR-0003: Execution Model
 * @decision Keep DBT plan-step support in one plugin-owned manifest instead of scattered allowlists
 * @consequence DBT can evolve like SQL or future plugins without changing Temporal core dispatch
 */
export const DBT_PLUGIN_ID = 'dbt' as const;

export const TEMPORAL_DBT_PLUGIN_STEP_KINDS = ['DBT_MODEL', 'DBT_TEST', 'DBT_SNAPSHOT'] as const;

export type TemporalDbtPluginStepKind = (typeof TEMPORAL_DBT_PLUGIN_STEP_KINDS)[number];

export type DbtCliSubcommand = 'run' | 'test' | 'snapshot';

const DBT_CLI_SUBCOMMAND_BY_STEP_KIND = {
  DBT_MODEL: 'run',
  DBT_TEST: 'test',
  DBT_SNAPSHOT: 'snapshot',
} as const satisfies Record<TemporalDbtPluginStepKind, DbtCliSubcommand>;

export function resolveDbtCliSubcommand(stepKind: string): DbtCliSubcommand {
  const subcommand = DBT_CLI_SUBCOMMAND_BY_STEP_KIND[stepKind as TemporalDbtPluginStepKind];
  if (subcommand === undefined) {
    throw new Error(`DBT_CLI_STEP_KIND_UNSUPPORTED:${stepKind}`);
  }

  return subcommand;
}
