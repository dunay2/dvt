/**
 * @file packages/@dvt/temporal-dbt-plugin/src/index.ts
 * @ownedConcern Publish the concrete DBT Temporal step plugin package API
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Keep DBT runner and manifest ownership outside the generic Temporal adapter package
 * @consequence Worker and API composition consume DBT semantics from the DBT plugin package
 * @version 1.0.0
 */
export type {
  DbtPluginExecutionInput,
  DbtPluginRunner,
  DbtStepActivityDeps,
} from './dbtPluginTypes.js';
export { DbtStepActivity, createDbtStepActivityRegistry } from './DbtStepActivity.js';
export {
  DBT_PLUGIN_ID,
  TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS,
  resolveDbtCliSubcommand,
  type DbtCliSubcommand,
  type TemporalDbtPluginExecutableStepKind,
} from './dbtPluginManifest.js';
export { DbtCliPluginRunner, assertDbtCliAvailable } from './DbtCliPluginRunner.js';
