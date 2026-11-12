/**
 * Owned concern: describe browser runtime commands and complete, disjoint shard partitions.
 * @baseline GH-3881: the existing evidence plan and runtime contracts retain their identities.
 * @decision Consume an admitted capability and specs; leave ownership and execution to their owners.
 * @consequence This module never reads Git or starts a process; invalid shard inputs still reject.
 */
import type { WebCypressCapability } from './cypress.catalog';

export type WebCypressCommand = Readonly<{
  capability: WebCypressCapability;
  command: string;
  env: Readonly<Record<string, string | undefined>>;
  specPaths: readonly string[];
}>;

export function buildBrowserCommand(
  capability: WebCypressCapability,
  specPaths: readonly string[]
): WebCypressCommand {
  const command =
    capability === 'controlled'
      ? `pnpm run test:e2e:native --browser chrome --spec ${specPaths.map((path) => path.slice('apps/web/'.length)).join(',')}`
      : `pnpm run test:e2e:selected-closure:live --spec ${specPaths.join(',')}`;
  return {
    capability,
    command,
    specPaths,
    env: {
      DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME: 'native',
      DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME:
        capability === 'controlled' ? undefined : capability,
    },
  };
}

export type WebCypressShard = Readonly<{ index: number; count: number }>;

export function selectWebCypressShard(
  command: WebCypressCommand,
  shard?: WebCypressShard
): WebCypressCommand | undefined {
  if (shard === undefined) return command;
  if (command.capability !== 'available' && command.capability !== 'controlled') {
    throw new Error('Browser shards require the controlled or available capability.');
  }
  const { index, count } = shard;
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(count) || index < 1 || count < index) {
    throw new Error(
      'Browser shard requires positive safe integers with index no greater than count.'
    );
  }
  if (command.specPaths.length === 0) throw new Error('Cannot partition empty browser evidence.');
  const specPaths = command.specPaths.filter((_, position) => position % count === index - 1);
  if (specPaths.length === 0 && command.capability === 'controlled') return undefined;
  if (specPaths.length === 0) throw new Error('Cannot execute an empty browser shard.');
  return buildBrowserCommand(command.capability, specPaths);
}
