/**
 * @baseline ADR-0043: Plan Record, Plan Store, And Artifacts Ownership
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type { RunExecutionPolicy } from '@dvt/contracts';
import type { IPlanIntegrityValidator } from '@dvt/engine';
import { describe, expect, it } from 'vitest';

import { createScopedTemporalPlanArtifactReader } from '../src/activities/temporalPlanArtifactReader.js';

import {
  createExecutionPlan,
  createPlanRef,
  createResolvedRunContext,
} from './helpers/contractFixtures.js';

const BASE_PLAN = createExecutionPlan({
  steps: [
    {
      stepId: 'step-1',
      kind: 'NOOP',
      dependsOn: [],
    },
  ],
});

const PLAN = {
  ...BASE_PLAN,
  metadata: {
    ...BASE_PLAN.metadata,
    ownership: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
    },
  },
};

const PLAN_REF = createPlanRef({
  uri: 'memory://plans/plan-1.json',
  sha256: 'a'.repeat(64),
  planId: PLAN.metadata.planId,
});

const EXECUTION_POLICY = {} satisfies RunExecutionPolicy;

describe('Temporal plan artifact reader', () => {
  it('fetches plans for engine dispatch only when plan ownership matches the run context', async () => {
    const reader = createScopedTemporalPlanArtifactReader({
      fetcher: createUnusedFetcher(),
      integrity: createIntegrityValidator(PLAN),
    });

    await expect(
      reader.fetchForEngineDispatch({
        planRef: PLAN_REF,
        ctx: createResolvedRunContext({
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          runId: 'run-1',
        }),
      })
    ).resolves.toEqual({
      plan: PLAN,
      executionPolicy: EXECUTION_POLICY,
    });
  });

  it('rejects cross-scope dispatch materialization after integrity validation', async () => {
    const reader = createScopedTemporalPlanArtifactReader({
      fetcher: createUnusedFetcher(),
      integrity: createIntegrityValidator(PLAN),
    });

    await expect(
      reader.fetchForEngineDispatch({
        planRef: PLAN_REF,
        ctx: createResolvedRunContext({
          tenantId: 'tenant-b',
          projectId: 'project-a',
          environmentId: 'prod',
          runId: 'run-1',
        }),
      })
    ).rejects.toThrow('PLAN_SCOPE_MISMATCH');
  });

  it('rejects dispatch materialization when the plan carries no ownership tuple', async () => {
    const unownedPlan = createExecutionPlan({
      steps: [
        {
          stepId: 'step-1',
          kind: 'NOOP',
          dependsOn: [],
        },
      ],
    });
    const reader = createScopedTemporalPlanArtifactReader({
      fetcher: createUnusedFetcher(),
      integrity: createIntegrityValidator(unownedPlan),
    });

    await expect(
      reader.fetchForEngineDispatch({
        planRef: PLAN_REF,
        ctx: createResolvedRunContext({
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          runId: 'run-1',
        }),
      })
    ).rejects.toThrow('PLAN_SCOPE_MISSING');
  });
});

function createUnusedFetcher(): IStoredPlanArtifactReader {
  return {
    getStoredPlanValidationRecord: async () => undefined,
    fetchStoredPlanArtifact: async () => {
      throw new Error('fetcher should only be consumed by the integrity validator');
    },
    fetchStoredPlanArtifactForValidation: async () => {
      throw new Error('fetcher should only be consumed by the integrity validator');
    },
  };
}

function createIntegrityValidator(
  plan: Awaited<ReturnType<IPlanIntegrityValidator['fetchAndValidate']>>['plan']
): IPlanIntegrityValidator {
  return {
    fetchAndValidate: async () => ({
      plan,
      executionPolicy: EXECUTION_POLICY,
    }),
  };
}
