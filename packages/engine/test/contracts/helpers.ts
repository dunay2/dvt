import type { IRawPlanFetcher } from '../../src/security/planIntegrity.js';
import type { PlanRef } from '../src/contracts/types.js';

export class InMemoryPlanFetcher implements IRawPlanFetcher {
  constructor(private readonly map: ReadonlyMap<string, Uint8Array>) {}

  async fetch(planRef: PlanRef): Promise<Uint8Array> {
    const v = this.map.get(planRef.uri);
    if (!v) {
      throw new Error(`PLAN_NOT_FOUND: ${planRef.uri}`);
    }
    return v;
  }
}

export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
