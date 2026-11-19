/**
 * Owned concern: prove the compiler input, planner identity, persisted artifact and Run binding
 * agree at the file Preview boundary. Storage captures the actual planner output.
 */
import {
  RUN_REJECTIONS,
  createDefaultStepTypeRegistry,
  parseExecutionSelection,
  parsePlanRef,
  type ExecutionPlan,
  type RunParameterOverride,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { PlannerFacade } from '@dvt/planner';
import { describe, expect, it, vi } from 'vitest';

import { buildEnvironmentAccessScope } from '../../../src/application/ports/accessDecision.js';
import { DbtRunExecutionContextPreparer } from '../../../src/application/services/dbt/DbtRunExecutionContextPreparer.js';
import { resolveDbtPlanExecutionBinding } from '../../../src/application/services/dbtPlanExecutionBinding.js';
import { PreviewPlanUseCase } from '../../../src/application/services/PreviewPlanUseCase.js';
import { EnvironmentId, ProjectId } from '../../../src/domain/auth/types.js';

import {
  buildContext,
  buildProjection,
  buildService,
  GRAPH_SOURCE,
  MODEL_ID,
  PROVENANCE,
} from './resolveAuthorizedPreviewSelection.fixtures.js';

const projection = buildProjection();
const model = projection.nodes.find((node) => node.uniqueId === MODEL_ID)!;
const parameterized = {
  ...projection,
  nodes: [
    {
      ...model,
      runParameters: [
        {
          name: 'minimum_amount',
          type: 'integer' as const,
          defaultValue: 0,
          enabledBy: 'use_minimum',
          enabledByDefault: true,
        },
      ],
    },
  ],
};
const input = {
  graphSource: GRAPH_SOURCE,
  selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
  provenance: PROVENANCE,
  targetAdapter: 'temporal',
};
const runBinding = (plan: ExecutionPlan): ReturnType<typeof resolveDbtPlanExecutionBinding> =>
  resolveDbtPlanExecutionBinding({
    plan,
    targetAdapter: 'temporal',
    executionTarget: PROVENANCE.executionTarget,
  });

function createPreview(): {
  compile(overrides: RunParameterOverride[], environment?: string): Promise<ExecutionPlan>;
  preview: PreviewPlanUseCase;
  compiler: ReturnType<typeof buildService>['dbtCompilation'];
} {
  const { service, dbtCompilation } = buildService(parameterized);
  const capturedAtStorage = new Error('Captured at persistence boundary.');
  const storePlanArtifact = vi
    .fn<ConstructorParameters<typeof PreviewPlanUseCase>[0]['planStore']['storePlanArtifact']>()
    .mockRejectedValue(capturedAtStorage);
  const preview = new PreviewPlanUseCase({
    planner: new PlannerFacade(),
    previewSelectionResolver: service,
    planStore: {
      storePlanArtifact,
      getPlanRecordByRef: vi.fn(),
      getStoredPlanValidationRecord: vi.fn(),
      markStoredPlanArtifactValid: vi.fn(),
      markStoredPlanArtifactInvalid: vi.fn(),
    },
    planValidator: { materializeAndValidatePlan: vi.fn() },
  });
  return {
    preview,
    compiler: dbtCompilation,
    async compile(parameterOverrides, environment = 'env-a') {
      const context = buildContext();
      await expect(
        preview.execute(
          { ...input, parameterOverrides },
          {
            ...context,
            scope: buildEnvironmentAccessScope(
              context.scope.tenantId,
              ProjectId.unsafe('project-a'),
              EnvironmentId.unsafe(environment)
            ),
          }
        )
      ).rejects.toBe(capturedAtStorage);
      return storePlanArtifact.mock.lastCall![0].buildResult.plan;
    },
  };
}

describe('dbt parameters at Preview admission and Run binding', () => {
  it('identifies a malformed declaration on a selected model before native compilation', async () => {
    const { service, dbtCompilation } = buildService({
      ...projection,
      nodes: [{ ...model, runParameterError: 'invalid_declaration' }],
    });
    const admission = await service.execute(input, buildContext());
    expect(admission).toMatchObject({
      ok: false,
      rejection: {
        cause: 'dbt_project_parameters_invalid',
        reason: expect.stringContaining('config.meta.dvt.run_parameters'),
      },
    });
    if (!admission.ok) expect(admission.rejection.reason).toContain('models/orders.sql');
    expect(dbtCompilation.execute).not.toHaveBeenCalled();
  });
  it('compiles and binds the same native values, isolating distinct inputs and scopes', async () => {
    const { compile, compiler } = createPreview();
    const inheritedZero = await compile([]);
    const explicitZero = await compile([{ name: 'minimum_amount', value: 0 }]);
    const off = await compile([{ name: 'minimum_amount', enabled: false }]);
    const seven = await compile([{ name: 'minimum_amount', value: 7 }]);
    const otherEnvironment = await compile([], 'env-b');
    expect(explicitZero.metadata.planId).toBe(inheritedZero.metadata.planId);
    expect(
      new Set([explicitZero, off, seven, otherEnvironment].map((p) => p.metadata.planId)).size
    ).toBe(4);
    const nativeValues = compiler.execute.mock.calls.map(([request]) => request.dbtVariablesJson);
    expect(nativeValues).toEqual([
      '{"minimum_amount":0,"use_minimum":true}',
      '{"minimum_amount":0,"use_minimum":true}',
      '{"use_minimum":false}',
      '{"minimum_amount":7,"use_minimum":true}',
      '{"minimum_amount":0,"use_minimum":true}',
    ]);
    [inheritedZero, explicitZero, off, seven, otherEnvironment].forEach((plan, index) => {
      expect(plan.steps).toMatchObject([
        {
          stepId: MODEL_ID,
          stepTypeConfig: { custom: { dbtStepSelector: { uniqueId: MODEL_ID } } },
        },
      ]);
      expect(runBinding(plan)).toMatchObject({ ok: true, dbtVariablesJson: nativeValues[index] });
    });
    const altered = { ...off, observability: seven.observability! };
    expect(runBinding(altered)).toEqual({ ok: false, ...RUN_REJECTIONS.dbtProvenanceInvalid });
    expect(runBinding({ ...off, metadata: otherEnvironment.metadata })).toEqual({
      ok: false,
      ...RUN_REJECTIONS.dbtProvenanceInvalid,
    });
  });

  it('refuses unknown overrides and client-supplied binding evidence before the compiler runs', async () => {
    const { preview, compiler } = createPreview();
    for (const command of [
      { ...input, parameterOverrides: [{ name: 'foreign', value: 8 }] },
      {
        ...input,
        observability: {
          extra: { planPreviewProvenance: { ...PROVENANCE, dbtVariablesJson: '{"foreign":8}' } },
        },
      },
      {
        ...input,
        graphSource: {
          ...GRAPH_SOURCE,
          nodes: GRAPH_SOURCE.nodes.map((node) => ({
            ...node,
            stepTypeConfig: { parameterSetSha256: 'a'.repeat(64) },
          })),
        },
      },
    ]) {
      await expect(preview.execute(command, buildContext())).resolves.toMatchObject({
        kind: 'selection-rejected',
        rejection: { cause: 'dbt_project_parameters_invalid' },
      });
    }
    expect(compiler.execute).not.toHaveBeenCalled();
  });

  it('prepares a retry from the old accepted plan even after another value is compiled', async () => {
    const { compile, compiler } = createPreview();
    const original = await compile([{ name: 'minimum_amount', value: 0 }]);
    const target = PROVENANCE.executionTarget;
    const scope = original.metadata.ownership!;
    const bundleSha = 'c'.repeat(64);
    const build = vi.fn().mockResolvedValue({
      ok: true,
      contentSetSha256: PROVENANCE.contentSetSha256,
      projectBundleRef: {
        kind: 'dbt-project-bundle',
        tenantId: scope.tenantId,
        uri: 'file:///orders.bundle',
        sha256: bundleSha,
      },
    });
    const preparer = new DbtRunExecutionContextPreparer({
      bundleBuilder: { build },
      stepTypeRegistry: createDefaultStepTypeRegistry(),
      executionTargetResolver: { resolve: () => target },
      executionConnectionBindingVerifier: { verify: vi.fn().mockResolvedValue(true) },
      warehouseConnectionCatalog: {
        getConnection: vi.fn().mockResolvedValue({
          id: target.connectionRef.connectionId,
          type: 'postgres',
          name: 'warehouse',
          database: 'analytics',
          credentialRef: target.credentialRef,
          sourceObjects: [],
        }),
        createConnection: vi.fn(),
        renameConnection: vi.fn(),
        listConnections: vi.fn(),
        listSourceObjects: vi.fn(),
      },
    });
    const invocation = {
      scope,
      plan: original,
      runId: 'run-original',
      targetAdapter: 'temporal' as const,
      planRef: parsePlanRef({
        uri: `dvt-plan://postgres/${original.metadata.planId}`,
        schemaVersion: original.metadata.schemaVersion,
        sha256: sha256HexUtf8(JSON.stringify(original)),
        planId: original.metadata.planId,
        planVersion: original.metadata.planVersion,
      }),
    };
    const first = await preparer.prepare(invocation);
    expect(first).toMatchObject({
      ok: true,
      context: { dbtVariablesJson: '{"minimum_amount":0,"use_minimum":true}' },
    });
    await compile([{ name: 'minimum_amount', value: 7 }]);
    expect(await preparer.prepare(invocation)).toEqual(first);
    expect(compiler.execute).toHaveBeenCalledTimes(2);
    expect(build).toHaveBeenCalledTimes(2);
  });
});
