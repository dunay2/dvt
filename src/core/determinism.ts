import { DeterminismConfig } from '../contracts/types';

export interface ClockService {
  now(): number;
}

export interface PRNGService {
  next(): number;
}

export function createDefaultClock(): ClockService {
  return { now: () => Date.now() };
}

export function createSeededPRNG(): PRNGService {
  let state = 12345;
  return {
    next(): number {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    }
  };
}

export function createDeterminismConfig(
  clock: ClockService = createDefaultClock(),
  prng: PRNGService = createSeededPRNG()
): DeterminismConfig {
  return { clock, prng };
}
