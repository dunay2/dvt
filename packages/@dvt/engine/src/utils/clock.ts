/**
 * @baseline ADR-0003
 */
import {
  asIsoUtcString,
  epochMsToIsoUtc,
  parseIsoUtcToEpochMs,
  type IsoUtcString,
} from '@dvt/contracts';

export interface IClock {
  nowIsoUtc(): IsoUtcString;
}

export { epochMsToIsoUtc, parseIsoUtcToEpochMs };

/**
 * Deterministic, Date-free clock for tests and workflows.
 * Each call returns base + n ms as strict ISO UTC string.
 */
export class SequenceClock implements IClock {
  private counter = 0;
  private readonly baseEpochMs: number;

  constructor(baseIsoUtc: IsoUtcString = asIsoUtcString('2026-02-12T00:00:00.000Z')) {
    this.baseEpochMs = parseIsoUtcToEpochMs(baseIsoUtc);
  }

  nowIsoUtc(): IsoUtcString {
    const ms = this.baseEpochMs + this.counter;
    this.counter += 1;
    return epochMsToIsoUtc(ms);
  }
}
