import type { PlanRecord } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { StoredPlanRunExecutionContextRequirementResolver } from '../../../src/application/services/StoredPlanRunExecutionContextRequirementResolver.js';

const metadata = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
  planId: 'a'.repeat(64),
};

describe('StoredPlanRunExecutionContextRequirementResolver', () => {
  it('derives required context from the canonical plugin requirement policy', async () => {
    const resolver = new StoredPlanRunExecutionContextRequirementResolver(
      { getPlanRecord: vi.fn().mockResolvedValue(recordFor(['dbt:model'])) },
      {
        pluginRequirements: [
          {
            pluginId: 'dbt',
            stepKinds: ['dbt:model'],
            assertPluginContextAllowed: vi.fn(),
          },
        ],
      }
    );

    await expect(resolver.resolve(metadata)).resolves.toBe('required');
  });

  it('reports not-required for plans outside every registered plugin requirement', async () => {
    const resolver = new StoredPlanRunExecutionContextRequirementResolver(
      { getPlanRecord: vi.fn().mockResolvedValue(recordFor(['sql'])) },
      {
        pluginRequirements: [
          {
            pluginId: 'dbt',
            stepKinds: ['dbt:model'],
            assertPluginContextAllowed: vi.fn(),
          },
        ],
      }
    );

    await expect(resolver.resolve(metadata)).resolves.toBe('not_required');
  });

  it('fails closed with unknown when the canonical plan cannot be read', async () => {
    const resolver = new StoredPlanRunExecutionContextRequirementResolver(
      { getPlanRecord: vi.fn().mockRejectedValue(new Error('storage unavailable')) },
      { pluginRequirements: [] }
    );

    await expect(resolver.resolve(metadata)).resolves.toBe('unknown');
  });
});

function recordFor(stepKinds: readonly string[]): PlanRecord {
  return {
    ...metadata,
    canonicalPlanJson: JSON.stringify({
      metadata: {
        planId: metadata.planId,
        planVersion: '1.0',
        schemaVersion: '1.0',
        contractVersion: '1.0.0',
        inputHashSha256: 'b'.repeat(64),
        createdAtIso: '2026-08-02T00:00:00.000Z',
      },
      steps: stepKinds.map((kind, index) => ({
        stepId: `step-${index + 1}`,
        kind,
        dependsOn: [],
      })),
    }),
    canonicalHash: 'c'.repeat(64),
    planVersion: '1.0',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    sourceRef: 'test://stored-plan',
    state: 'ACTIVE',
    createdAtIso: '2026-08-02T00:00:00.000Z',
    updatedAtIso: '2026-08-02T00:00:00.000Z',
  };
}
