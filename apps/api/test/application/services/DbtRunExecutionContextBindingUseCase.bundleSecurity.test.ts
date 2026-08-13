import {
  parseExecutionSelection,
  parseExecutionPlan,
  parsePlanRef,
  parseRunExecutionContextRef,
  type StartRunCommand,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { DbtRunExecutionContextBindingUseCase } from '../../../src/application/services/DbtRunExecutionContextBindingUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

import { buildAuthorizedContext } from './engineStartRunUseCase.test.support.js';

describe('DBT runtime binding security boundary', () => {
  it('rejects caller-provided DBT run context references before artifact creation', async () => {
    const delegate = { execute: vi.fn() };
    const bundleBuilder = { build: vi.fn() };
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate,
      planMaterializer: {
        materialize: vi.fn(async () => ({
          executionPolicy: {},
          plan: buildDbtPlan(),
        })),
      },
      bundleBuilder,
      contextWriter: { write: vi.fn() },
      executionTargetResolver: {
        resolve: () => ({
          provider: 'temporal',
          adapter: 'postgres',
          targetName: 'production',
          credentialRef: 'vault:dbt/production',
        }),
      },
    });

    const result = await useCase.execute(
      {
        ...buildCommand(),
        runExecutionContextRef: parseRunExecutionContextRef({
          uri: 'file:///caller/run-context.json',
          sha256: '7'.repeat(64),
          schemaVersion: 'v1.0',
          planId: '9'.repeat(64),
          planVersion: '1.0',
        }),
      },
      buildContext()
    );

    expect(result).toMatchObject({
      value: {
        kind: 'plan_rejected',
        reason:
          'Caller-provided run execution context references are not accepted for DBT execution.',
      },
    });
    expect(bundleBuilder.build).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});

function buildDbtPlan(): ReturnType<typeof parseExecutionPlan> {
  return parseExecutionPlan({
    metadata: {
      planId: '9'.repeat(64),
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: '1'.repeat(64),
      createdAtIso: '2026-07-15T00:00:00.000Z',
    },
    steps: [{ stepId: 'model.analytics.orders', kind: 'DBT_MODEL', dependsOn: [] }],
  });
}

function buildCommand(): StartRunCommand {
  return {
    runId: 'run-security-test',
    targetAdapter: 'temporal',
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['model.analytics.orders'],
    }),
    planRef: parsePlanRef({
      uri: 'dvt-plan://postgres/dbt-security-plan',
      sha256: '8'.repeat(64),
      schemaVersion: '1.0',
      planId: '9'.repeat(64),
      planVersion: '1.0',
    }),
  };
}

function buildContext(): ReturnType<typeof buildAuthorizedContext> {
  return {
    ...buildAuthorizedContext('tenant-1'),
    scope: {
      resource: 'environment',
      tenantId: TenantId.unsafe('tenant-1'),
      projectId: ProjectId.unsafe('proj-1'),
      environmentId: EnvironmentId.unsafe('env-1'),
    },
    authorizedAt: new Date('2026-07-15T00:00:00.000Z'),
  };
}
