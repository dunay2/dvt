/**
 * Owned concern: partition an already validated Web test plan for hosted execution.
 * @decision Place primary and admitted Canvas commands in existing groups with native Presentation shards.
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
  return commands.flatMap((entry) =>
    entry.kind === 'shell'
      ? selectCompleteVitestPartition(entry, group)
      : selectExactVitestPartition(entry, group)
  );
}

function selectCompleteVitestPartition(
  entry: Extract<WebVitestChangedCommandPlanEntry, { kind: 'shell' }>,
  group: WebVitestExecutionGroup
): WebVitestChangedCommandPlanEntry[] {
  const command = entry.command;
  const directGroups = new Map([
    [WEB_VITEST_CHANGED_SUITE_COMMANDS.unit, 'unit'],
    [WEB_VITEST_CHANGED_SUITE_COMMANDS.architecture, 'architecture'],
    [WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-unit'], 'unit'],
  ]);
  const direct = directGroups.get(command);
  if (direct) return group === direct ? [entry] : [];
  if (
    [
      WEB_VITEST_CHANGED_SUITE_COMMANDS.presentation,
      WEB_VITEST_CHANGED_SUITE_COMMANDS['canvas-presentation'],
    ].includes(command)
  ) {
    return group.startsWith('presentation-')
      ? [{ ...entry, command: `${command} --shard=${group.slice(-1)}/3` }]
      : [];
  }
  return group === 'changed' ? [entry] : [];
}

function selectExactVitestPartition(
  entry: Extract<WebVitestChangedCommandPlanEntry, { kind: 'vitest-files' }>,
  group: WebVitestExecutionGroup
): WebVitestChangedCommandPlanEntry[] {
  const suite = /^vitest\.(?:canvas-)?(unit|architecture|presentation)\.config\.ts$/.exec(
    entry.config
  )?.[1];
  if (!suite) return group === 'changed' ? [entry] : [];
  if (suite !== 'presentation') return group === suite ? [entry] : [];
  if (!group.startsWith('presentation-')) return [];
  const index = Number(group.slice(-1)) - 1;
  const filePaths = [...entry.filePaths].sort().filter((_, position) => position % 3 === index);
  return filePaths.length > 0 ? [{ ...entry, filePaths }] : [];
}

/** Project the admitted plan once for hosted matrix discovery. */
export function describeWebVitestExecutionPartitions(
  commands: readonly WebVitestChangedCommandPlanEntry[]
): ReadonlyArray<
  Readonly<{
    group: WebVitestExecutionGroup;
    commands: readonly WebVitestChangedCommandPlanEntry[];
  }>
> {
  return WEB_VITEST_EXECUTION_GROUPS.map((group) => ({
    group,
    commands: selectWebVitestExecutionPartition(commands, group),
  })).filter((partition) => partition.commands.length > 0);
}
