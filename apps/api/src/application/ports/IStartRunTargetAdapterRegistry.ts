import type { StartRunTargetAdapter } from './startRunCommandContract.js';

export interface IStartRunTargetAdapterRegistry {
  isSupported(value: string): value is StartRunTargetAdapter;
  listSupported(): ReadonlyArray<StartRunTargetAdapter>;
}
