import type { PlanRef, StoredPlanArtifact } from '@dvt/contracts';

import type { IRawPlanFetcher } from '../../src/security/planIntegrity.js';

export class InMemoryPlanFetcher implements IRawPlanFetcher {
  constructor(private readonly map: ReadonlyMap<string, Uint8Array>) {}

  async fetch(planRef: PlanRef): Promise<StoredPlanArtifact> {
    const v = this.map.get(planRef.uri);
    if (!v) {
      throw new Error(`PLAN_NOT_FOUND: ${planRef.uri}`);
    }
    return {
      bytes: v,
      executionPolicy: {},
    };
  }
}

export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
