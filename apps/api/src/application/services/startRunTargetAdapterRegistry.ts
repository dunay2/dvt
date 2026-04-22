/**
 * Owned concern: expose the implemented adapter truth for `startRun`.
 * This registry is the filter that turns discovered provider IDs into the
 * canonical start-run adapter set supported by the API boundary.
 */
import {
  SUPPORTED_START_RUN_TARGET_ADAPTERS,
  type StartRunTargetAdapter,
} from '@dvt/contracts';

import type { IStartRunTargetAdapterRegistry } from '../ports/IStartRunTargetAdapterRegistry.js';

export function createStartRunTargetAdapterRegistryFromValues(
  values: Iterable<string>
): IStartRunTargetAdapterRegistry {
  const allowedSet = new Set(SUPPORTED_START_RUN_TARGET_ADAPTERS);
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
  createStartRunTargetAdapterRegistryFromValues(SUPPORTED_START_RUN_TARGET_ADAPTERS);
