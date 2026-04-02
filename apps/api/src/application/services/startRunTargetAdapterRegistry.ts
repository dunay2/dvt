import type { IStartRunTargetAdapterRegistry } from '../ports/IStartRunTargetAdapterRegistry.js';
import {
  START_RUN_TARGET_ADAPTER,
  type StartRunTargetAdapter,
} from '../ports/startRunCommandContract.js';

const START_RUN_TARGET_ADAPTER_VALUES: readonly StartRunTargetAdapter[] = [
  START_RUN_TARGET_ADAPTER.temporal,
  START_RUN_TARGET_ADAPTER.mock,
] as const;

export function createStartRunTargetAdapterRegistryFromValues(
  values: Iterable<string>
): IStartRunTargetAdapterRegistry {
  const allowedSet = new Set(START_RUN_TARGET_ADAPTER_VALUES);
  const supported = [...new Set(values)].filter((value): value is StartRunTargetAdapter =>
    allowedSet.has(value as StartRunTargetAdapter)
  );
  const supportedSet = new Set(supported);

  return {
    isSupported(value: string): value is StartRunTargetAdapter {
      return supportedSet.has(value as StartRunTargetAdapter);
    },
    listSupported(): ReadonlyArray<StartRunTargetAdapter> {
      return [...supported];
    },
  };
}

export const DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY: IStartRunTargetAdapterRegistry =
  createStartRunTargetAdapterRegistryFromValues(START_RUN_TARGET_ADAPTER_VALUES);
