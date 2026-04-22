/**
 * Owned concern: expose the runtime-supported adapter registry used by the
 * start-run application boundary.
 */
import type { StartRunTargetAdapter } from '@dvt/contracts';

export interface IStartRunTargetAdapterRegistry {
  isSupported(value: string): value is StartRunTargetAdapter;
  listSupported(): ReadonlyArray<StartRunTargetAdapter>;
}
