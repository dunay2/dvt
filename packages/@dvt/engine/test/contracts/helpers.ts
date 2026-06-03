import type { IStoredPlanArtifactReader, StoredPlanArtifact } from '@dvt/artifacts';
import type { ScopedPlanRef } from '@dvt/contracts';

export class InMemoryPlanFetcher implements IStoredPlanArtifactReader {
  constructor(private readonly map: ReadonlyMap<string, Uint8Array>) {}

  async getStoredPlanValidationRecord(): Promise<undefined> {
    return undefined;
  }

  async fetchStoredPlanArtifact(input: ScopedPlanRef): Promise<StoredPlanArtifact> {
    const v = this.map.get(input.planRef.uri);
    if (!v) {
      throw new Error(`PLAN_NOT_FOUND: ${input.planRef.uri}`);
    }
    return {
      bytes: v,
      executionPolicy: {},
    };
  }

  async fetchStoredPlanArtifactForValidation(input: ScopedPlanRef): Promise<StoredPlanArtifact> {
    return this.fetchStoredPlanArtifact(input);
  }
}

export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
