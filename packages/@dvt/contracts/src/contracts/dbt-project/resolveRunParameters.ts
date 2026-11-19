/**
 * Owned concern: resolve declared business inputs for one authorized execution selection.
 * @baseline ADR-0071: the plan binds effective values independently of how the operator chose them.
 */
import { jcsCanonicalize } from '@dvt/crypto';

import {
  acceptsRunParameterValue,
  RunParameterDefinitionsSchema,
  RunParameterOverridesSchema,
  type RunParameterDefinition,
  type RunParameterOverride,
  type RunParameterScalar,
} from './RunParameters.v1.js';

type DefaultSource = 'default' | 'project' | 'environment';
export type ResolvedRunParameter = Readonly<{
  name: string;
  enabled: boolean;
  enabledBy?: string;
  value?: RunParameterScalar;
  source: DefaultSource | 'run';
}>;

export function mergeRunParameterDefinitions(
  groups: readonly (readonly RunParameterDefinition[])[]
): RunParameterDefinition[] {
  const byName = new Map<string, RunParameterDefinition>();
  for (const group of groups) {
    for (const entry of group) {
      const existing = byName.get(entry.name);
      if (existing && jcsCanonicalize(existing) !== jcsCanonicalize(entry)) {
        throw new Error('Conflicting run parameter declarations: ' + entry.name);
      }
      byName.set(entry.name, entry);
    }
  }
  const result = [...byName.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
  return result.length ? RunParameterDefinitionsSchema.parse(result) : result;
}

export function getRunParameterDefault(
  entry: RunParameterDefinition,
  environmentId: string
): { value?: RunParameterScalar; source: DefaultSource } {
  if (entry.environmentDefaults && Object.hasOwn(entry.environmentDefaults, environmentId)) {
    return { source: 'environment', value: entry.environmentDefaults[environmentId]! };
  }
  if (entry.projectDefault !== undefined) return { source: 'project', value: entry.projectDefault };
  return entry.defaultValue === undefined
    ? { source: 'default' }
    : { source: 'default', value: entry.defaultValue };
}

export function resolveRunParameters(
  definitions: readonly RunParameterDefinition[],
  overrides: readonly RunParameterOverride[],
  environmentId: string
): ResolvedRunParameter[] {
  const declared = definitions.length ? RunParameterDefinitionsSchema.parse(definitions) : [];
  const changes = new Map(
    RunParameterOverridesSchema.parse(overrides).map((change) => [change.name, change])
  );
  const rows = declared.map((entry) => {
    const change = changes.get(entry.name);
    changes.delete(entry.name);
    if (!entry.enabledBy && change?.enabled !== undefined)
      throw new Error('Parameter has no enable flag: ' + entry.name);
    const enabled = !entry.enabledBy || (change?.enabled ?? entry.enabledByDefault ?? false);
    const effective =
      change?.value === undefined
        ? getRunParameterDefault(entry, environmentId)
        : { source: 'run' as const, value: change.value };
    if (
      (enabled && effective.value === undefined) ||
      (change?.value !== undefined && !enabled) ||
      (effective.value !== undefined && !acceptsRunParameterValue(entry, effective.value))
    ) {
      throw new Error('Invalid or missing run parameter: ' + entry.name);
    }
    return {
      name: entry.name,
      enabled,
      ...(entry.enabledBy ? { enabledBy: entry.enabledBy } : {}),
      ...effective,
    };
  });
  if (changes.size) throw new Error('Undeclared run parameter.');
  return rows;
}

export function projectDbtRunVariables(
  rows: readonly ResolvedRunParameter[]
): Record<string, RunParameterScalar> {
  const variables: Record<string, RunParameterScalar> = {};
  for (const row of rows) {
    if (row.enabledBy) variables[row.enabledBy] = row.enabled;
    if (row.enabled && row.value !== undefined) variables[row.name] = row.value;
  }
  return variables;
}
