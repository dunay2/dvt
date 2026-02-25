/**
 * @baseline ADR-0003
 */
import type { IsoUtcString } from '@dvt/contracts';
export interface IClock {
  nowIsoUtc(): IsoUtcString;
}
export declare function parseIsoUtcToEpochMs(iso: IsoUtcString): number;
export declare function epochMsToIsoUtc(ms: number): IsoUtcString;
/**
 * Deterministic, Date-free clock for tests and workflows.
 * Each call returns base + n ms as strict ISO UTC string.
 */
export declare class SequenceClock implements IClock {
  private counter;
  private readonly baseEpochMs;
  constructor(baseIsoUtc?: IsoUtcString);
  nowIsoUtc(): IsoUtcString;
}
//# sourceMappingURL=clock.d.ts.map
