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

type BindingDependencies = ConstructorParameters<typeof DbtRunExecutionContextBindingUseCase>[0];

const PLAN_ID = 'd'.repeat(64);
const PROJECT_REVISION = '1'.repeat(64);
const BUNDLE_SHA = '2'.repeat(64);
const TARGET = {
  provider: 'temporal',
  adapter: 'postgres',
  targetName: 'production',
  credentialRef: 'vault:dbt/production',
} as const;
const PLAN_REF = parsePlanRef({
  uri: 'dvt-plan://postgres/dbt-plan-1',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});
const RUN_CONTEXT_REF = parseRunExecutionContextRef({
  uri: 'file:///run-contexts/context.json',
  sha256: '3'.repeat(64),
  schemaVersion: 'v1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});

describe('DbtRunExecutionContextBindingUseCase', () => {
  it('orchestrates a revision-bound bundle and server-owned run context before dispatch', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = {
      build: vi.fn(async () => ({
        ok: true as const,
        contentSetSha256: PROJECT_REVISION,
        projectBundleRef: {
          uri: `file:///bundles/tenants/tenant-1/${BUNDLE_SHA}`,
          kind: 'dbt-project-bundle' as const,
          sha256: BUNDLE_SHA,
          tenantId: 'tenant-1',
        },
      })),
    };
    const contextWriter = {
      write: vi.fn(async () => ({ ok: true as const, ref: RUN_CONTEXT_REF })),
    };
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate,
      planMaterializer: makePlanMaterializer('DBT_MODEL', DBT_PROVENANCE),
      bundleBuilder,
      contextWriter,
      executionTargetResolver: { resolve: () => TARGET },
    });

    const result = await useCase.execute({ ...buildCommand(), planRef: PLAN_REF }, buildContext());

    expect(result).toMatchObject({ ok: true, value: { kind: 'accepted' } });
    expect(bundleBuilder.build).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-1', projectId: 'proj-1', environmentId: 'env-1' },
      projectRoot: 'analytics',
      expectedContentSetSha256: PROJECT_REVISION,
    });
    expect(contextWriter.write).toHaveBeenCalledWith({
      runId: 'run-test-1',
      context: expect.objectContaining({
        planSha256: PLAN_REF.sha256,
        pluginContexts: {
          dbt: expect.objectContaining({
            targetProfile: 'production',
            credentialRef: 'vault:dbt/production',
          }),
        },
      }),
    });
    expect(delegate.execute).toHaveBeenCalledWith(
      expect.objectContaining({ runExecutionContextRef: RUN_CONTEXT_REF }),
      expect.any(Object)
    );
  });

  it('rejects a changed project before writing context or dispatching', async () => {
    const delegate = makeDelegate();
    const contextWriter = { write: vi.fn() };
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate,
      planMaterializer: makePlanMaterializer('DBT_MODEL', DBT_PROVENANCE),
      bundleBuilder: {
        build: vi.fn(async () => ({
          ok: false as const,
          reason: 'revision_mismatch' as const,
          expectedContentSetSha256: PROJECT_REVISION,
          actualContentSetSha256: '9'.repeat(64),
        })),
      },
      contextWriter,
      executionTargetResolver: { resolve: () => TARGET },
    });

    const result = await useCase.execute({ ...buildCommand(), planRef: PLAN_REF }, buildContext());

    expect(result).toMatchObject({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        reason: 'The DBT project changed after Preview. Run Preview again before Run.',
      },
    });
    expect(contextWriter.write).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('delegates non-DBT plans without creating DBT artifacts', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = { build: vi.fn() };
    const command = { ...buildCommand(), planRef: PLAN_REF };
    const context = buildContext();
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate,
      planMaterializer: makePlanMaterializer(undefined, undefined),
      bundleBuilder,
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
    });

    await useCase.execute(command, context);

    expect(delegate.execute).toHaveBeenCalledWith(command, context);
    expect(bundleBuilder.build).not.toHaveBeenCalled();
  });

  it('reports an unavailable bundle store without dispatching', async () => {
    const delegate = makeDelegate();
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate,
      planMaterializer: makePlanMaterializer('DBT_MODEL', DBT_PROVENANCE),
      bundleBuilder: {
        build: vi.fn(async () => ({
          ok: false as const,
          reason: 'artifact_store_unavailable' as const,
        })),
      },
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
    });

    const result = await useCase.execute({ ...buildCommand(), planRef: PLAN_REF }, buildContext());

    expect(result).toMatchObject({
      value: { reason: 'The DBT project bundle artifact store is not configured.' },
    });
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});

const DBT_PROVENANCE = {
  kind: 'dbt-project-files',
  canvasId: 'analytics-canvas',
  projectRoot: 'analytics',
  contentSetSha256: PROJECT_REVISION,
  analysisSha256: '4'.repeat(64),
  dbtVersion: '1.10.0',
  selectedUniqueIds: ['model.analytics.orders'],
  executionTarget: TARGET,
} as const;

function makeDelegate(): BindingDependencies['delegate'] {
  return {
    execute: vi.fn(async () => ({
      ok: true as const,
      value: { kind: 'accepted' as const, runId: 'run-test-1', accepted: true as const },
    })),
  };
}

function makePlanMaterializer(
  stepKind: string | undefined,
  provenance: unknown
): BindingDependencies['planMaterializer'] {
  return {
    materialize: vi.fn(async () => ({
      executionPolicy: {},
      plan: parseExecutionPlan({
        metadata: {
          planId: PLAN_ID,
          planVersion: '1.0',
          schemaVersion: '1.0',
          contractVersion: '1.0.0',
          inputHashSha256: '5'.repeat(64),
          createdAtIso: '2026-07-15T00:00:00.000Z',
        },
        steps:
          stepKind === undefined
            ? []
            : [
                {
                  stepId: 'model.analytics.orders',
                  kind: stepKind,
                  dependsOn: [],
                  stepTypeConfig: {},
                },
              ],
        ...(provenance === undefined
          ? {}
          : { observability: { extra: { planPreviewProvenance: provenance } } }),
      }),
    })),
  };
}

function buildCommand(): StartRunCommand {
  return {
    runId: 'run-test-1',
    targetAdapter: 'temporal',
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['model.analytics.orders'],
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
