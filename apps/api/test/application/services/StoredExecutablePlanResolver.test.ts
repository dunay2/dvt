import { createHash } from 'node:crypto';

import {
  asNonBlankString,
  type IStepTypeRegistry,
  type PlanRef,
  type ScopedPlanRef,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { StoredExecutablePlanResolver } from '../../../src/application/services/StoredExecutablePlanResolver.js';

const EXECUTABLE_PLAN_TEXT = JSON.stringify({
  metadata: {
    planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    planVersion: '1.0',
    schemaVersion: 'v1.2',
    contractVersion: '1.0.0',
    inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    createdAtIso: '2026-03-01T00:00:00.000Z',
  },
  steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
});

const PLAN_REF: PlanRef = {
  uri: asNonBlankString(
    'dvt-plan://postgres/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  ),
  sha256: asNonBlankString(createHash('sha256').update(EXECUTABLE_PLAN_TEXT).digest('hex')),
  schemaVersion: asNonBlankString('v1.2'),
  planId: asNonBlankString('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
  planVersion: asNonBlankString('1.0'),
};

const SCOPED_PLAN_REF: ScopedPlanRef = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'prod',
  planRef: PLAN_REF,
};

describe('StoredExecutablePlanResolver', () => {
  it('parses executable bytes for stored dvt-plan refs', async () => {
    const fetcher = {
      fetchStoredPlanArtifact: vi.fn(async () => ({
        bytes: Buffer.from(EXECUTABLE_PLAN_TEXT, 'utf8'),
        executionPolicy: {},
      })),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });

    const plan = await resolver.fetch(SCOPED_PLAN_REF);

    expect(plan).toEqual({
      metadata: {
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAtIso: '2026-03-01T00:00:00.000Z',
      },
      steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
    });
    expect(fetcher.fetchStoredPlanArtifact).toHaveBeenCalledWith(SCOPED_PLAN_REF);
  });

  it('rejects stored dvt-plan refs when the executable bytes do not match the ref hash', async () => {
    const fetcher = {
      fetchStoredPlanArtifact: vi.fn(async () => ({
        bytes: Buffer.from(`${EXECUTABLE_PLAN_TEXT}\n`, 'utf8'),
        executionPolicy: {},
      })),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });

    await expect(resolver.fetch(SCOPED_PLAN_REF)).rejects.toThrow(
      'PLAN_INTEGRITY_VALIDATION_FAILED'
    );
  });

  it('rejects stored dvt-plan refs when persisted metadata does not match the ref', async () => {
    const mismatchedText = JSON.stringify({
      metadata: {
        planId: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAtIso: '2026-03-01T00:00:00.000Z',
      },
      steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
    });
    const fetcher = {
      fetchStoredPlanArtifact: vi.fn(async () => ({
        bytes: Buffer.from(mismatchedText, 'utf8'),
        executionPolicy: {},
      })),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });
    const planRef = {
      ...PLAN_REF,
      sha256: asNonBlankString(createHash('sha256').update(mismatchedText).digest('hex')),
    };

    await expect(resolver.fetch({ ...SCOPED_PLAN_REF, planRef })).rejects.toThrow(
      'PLAN_REF_MISMATCH: planId'
    );
  });

  it('accepts custom step kinds when an explicit stepTypeRegistry is injected', async () => {
    const executablePlanText = JSON.stringify({
      metadata: {
        ...JSON.parse(EXECUTABLE_PLAN_TEXT).metadata,
      },
      steps: [{ stepId: 'step-1', kind: 'SPARK_SQL', dependsOn: [] }],
    });
    const fetcher = {
      fetchStoredPlanArtifact: vi.fn(async () => ({
        bytes: Buffer.from(executablePlanText, 'utf8'),
        executionPolicy: {},
      })),
    };
    const resolver = new StoredExecutablePlanResolver({
      fetcher: fetcher as never,
      stepTypeRegistry: makeRegistryForKind('SPARK_SQL'),
    });
    const planRef = {
      ...PLAN_REF,
      sha256: asNonBlankString(createHash('sha256').update(executablePlanText).digest('hex')),
    };

    await expect(resolver.fetch({ ...SCOPED_PLAN_REF, planRef })).resolves.toMatchObject({
      steps: [{ stepId: 'step-1', kind: 'SPARK_SQL', dependsOn: [] }],
    });
  });

  it('preserves external planRef behavior for non-dvt-plan schemes', async () => {
    const fetcher = {
      fetchStoredPlanArtifact: vi.fn(async () => ({
        bytes: new Uint8Array(),
        executionPolicy: {},
      })),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });

    const plan = await resolver.fetch({
      ...SCOPED_PLAN_REF,
      planRef: {
        ...PLAN_REF,
        uri: asNonBlankString('https://plans.example.com/plan-1.json'),
      },
    });

    expect(plan).toEqual({
      metadata: {
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: PLAN_REF.sha256,
        createdAtIso: expect.any(String),
      },
      steps: [],
    });
    expect(fetcher.fetchStoredPlanArtifact).not.toHaveBeenCalled();
  });
});

function makeRegistryForKind(kind: string): IStepTypeRegistry {
  return {
    isKnown(candidate: string): boolean {
      return candidate === kind;
    },
    validate(candidate: string): { success: true; data: Record<string, unknown> } {
      if (candidate !== kind) {
        throw new Error(`unexpected kind validation request: ${candidate}`);
      }
      return { success: true, data: {} };
    },
    getKinds(): readonly string[] {
      return [kind];
    },
  };
}
