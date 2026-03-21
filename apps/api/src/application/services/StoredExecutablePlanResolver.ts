import type { IPlanFetcher as IStoredPlanFetcher, PlanRef } from '@dvt/contracts';
import type { ExecutionPlan } from '@dvt/engine';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

export class StoredExecutablePlanResolver {
  public constructor(
    private readonly deps: {
      readonly fetcher: IStoredPlanFetcher;
    }
  ) {}

  public async fetch(planRef: PlanRef): Promise<ExecutionPlan> {
    if (!planRef.uri.startsWith('dvt-plan://')) {
      return {
        metadata: {
          planId: planRef.planId,
          planVersion: planRef.planVersion,
          schemaVersion: planRef.schemaVersion,
          contractVersion: '1.0.0',
          ...(planRef.requiresCapabilities !== undefined
            ? { requiresCapabilities: planRef.requiresCapabilities }
            : {}),
        },
        steps: [],
      };
    }

    const bytes = await this.deps.fetcher.fetch(planRef);
    return parseStoredExecutablePlan(bytes);
  }
}
