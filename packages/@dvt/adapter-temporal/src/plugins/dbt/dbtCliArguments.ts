/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliArguments.ts
 * @ownedConcern Translate DBT plugin step metadata into DBT CLI arguments
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Resolve DBT command arguments from the DBT plugin manifest
 * @consequence Step-kind command ownership stays in the DBT plugin boundary
 * @version 1.0.0
 */
import { resolveDbtCliSubcommand } from './dbtPluginManifest.js';

export function buildDbtCliArgs(
  stepKind: string,
  stepId: string,
  targetProfile: string | undefined
): readonly string[] {
  const subcommand = resolveDbtCliSubcommand(stepKind);
  return [
    subcommand,
    '--select',
    stepId,
    ...(typeof targetProfile === 'string' && targetProfile.trim().length > 0
      ? ['--target', targetProfile]
      : []),
  ];
}
