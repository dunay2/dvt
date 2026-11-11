/**
 * Owned concern: partition an already validated Web test plan for hosted execution.
 * @decision Reuse complete primary commands and native Presentation shards; retain other batches once.
 * @consequence Partitioning cannot change path admission, suite ownership or local coverage.
 */
import {
  WEB_VITEST_CHANGED_SUITE_COMMANDS,
  type WebVitestChangedCommandPlanEntry,
} from '../vitest/commands';

export const WEB_VITEST_EXECUTION_GROUPS = [
  'unit',
  'architecture',
  'presentation-1',
  'presentation-2',
  'presentation-3',
  'changed',
] as const;
export type WebVitestExecutionGroup = (typeof WEB_VITEST_EXECUTION_GROUPS)[number];

export function isWebVitestExecutionGroup(value: string): value is WebVitestExecutionGroup {
  return WEB_VITEST_EXECUTION_GROUPS.some((group) => group === value);
}

export function selectWebVitestExecutionPartition(
  commands: readonly WebVitestChangedCommandPlanEntry[],
  group?: WebVitestExecutionGroup
): readonly WebVitestChangedCommandPlanEntry[] {
  if (group === undefined) return commands;
  return commands.flatMap((entry) => {
    if (entry.kind === 'shell') {
      for (const primary of ['unit', 'architecture'] as const) {
        if (entry.command === WEB_VITEST_CHANGED_SUITE_COMMANDS[primary])
          return group === primary ? [entry] : [];
      }
      if (entry.command === WEB_VITEST_CHANGED_SUITE_COMMANDS.presentation) {
        return group.startsWith('presentation-')
          ? [{ ...entry, command: `${entry.command} --shard=${group.slice(-1)}/3` }]
          : [];
      }
    }
    // Focus suites and exact-file batches retain their own execution context and run once.
    return group === 'changed' ? [entry] : [];
  });
}
