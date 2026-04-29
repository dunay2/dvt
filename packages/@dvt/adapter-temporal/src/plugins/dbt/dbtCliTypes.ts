/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliTypes.ts
 * @ownedConcern Share DBT CLI runner helper contracts inside the DBT plugin boundary
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Keep DBT CLI helper contracts plugin-local instead of leaking them into core dispatch
 * @consequence The DBT runner can be decomposed without creating new Temporal core dependencies
 * @version 1.0.0
 */
import type { DbtPluginExecutionInput } from './dbtPluginTypes.js';

export interface MaterializedDbtProject {
  readonly projectDir: string;
  cleanup(): Promise<void>;
}

export type DbtProjectMaterializer = (
  input: DbtPluginExecutionInput
) => Promise<MaterializedDbtProject>;

export interface DbtCliCommandOptions {
  readonly cwd: string;
}

export interface DbtCliCommandOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export type DbtCliCommandRunner = (
  dbtBin: string,
  args: readonly string[],
  options: DbtCliCommandOptions
) => Promise<DbtCliCommandOutput>;
