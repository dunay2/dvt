import { describe, expect, it } from 'vitest';

import { PlannerFacade } from '../../src/application/PlannerFacade.js';
import { PlannerErrorCode } from '../../src/domain/errors.js';

const BASE_SELECTION = { selectedNodeIds: ['model.project.a'] };

const BASE_GRAPH_SOURCE = {
  kind: 'generic-graph-v1' as const,
  sourceFamily: 'dbt',
  sourceVersion: '1.0',
  nodes: [{ nodeId: 'model.project.a', stepKind: 'DBT_MODEL', dependsOn: [] }],
};

async function expectInvalidInput(
  promise: Promise<unknown>,
  messageFragment: string
): Promise<void> {
  await promise.then(
    () => {
      throw new Error('expected PlannerFacade.buildPlan to reject');
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error & { code?: string }).code).toBe(PlannerErrorCode.INVALID_INPUT);
      expect((error as Error).message).toContain(messageFragment);
    }
  );
}

describe('PlannerFacade - canonical graph source boundary', () => {
  it('propagates GRAPH_CYCLE for cyclic selected nodes at public boundary', async () => {
    const facade = new PlannerFacade();
    await expect(
      facade.buildPlan({
        graphSource: {
          ...BASE_GRAPH_SOURCE,
          nodes: [
            { nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: ['b'] },
            { nodeId: 'b', stepKind: 'DBT_MODEL', dependsOn: ['a'] },
          ],
        },
        selection: { selectedNodeIds: ['a', 'b'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.GRAPH_CYCLE });
  });

  it('keeps success path for acyclic selection when unrelated cycle exists', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({
      graphSource: {
        ...BASE_GRAPH_SOURCE,
        nodes: [
          { nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: ['b'] },
          { nodeId: 'b', stepKind: 'DBT_MODEL', dependsOn: ['a'] },
          { nodeId: 'x', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'y', stepKind: 'DBT_MODEL', dependsOn: ['x'] },
        ],
      },
      selection: { selectedNodeIds: ['y'], includeUpstream: true },
    });
    expect(result.plan.steps.map((step) => step.stepId)).toEqual(['x', 'y']);
  });

  it('projects deterministic RUN, SKIP and PARTIAL decisions from the selected closure', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({
      graphSource: {
        ...BASE_GRAPH_SOURCE,
        nodes: [
          { nodeId: 'model.project.base', stepKind: 'DBT_MODEL', dependsOn: [] },
          {
            nodeId: 'model.project.selected',
            stepKind: 'DBT_MODEL',
            dependsOn: ['model.project.base'],
          },
        ],
      },
      selection: {
        selectedNodeIds: ['model.project.base', 'model.project.selected'],
      },
      decisionScope: {
        nodeIds: ['model.project.selected', 'model.project.skipped', 'model.project.base'],
        requestedRootNodeIds: ['model.project.selected'],
      },
    });

    expect(result.plan.decisions).toEqual([
      {
        subjectId: 'selection',
        subjectKind: 'selection',
        status: 'PARTIAL',
        reasonCode: 'BOUNDED_SELECTION',
        includedNodeIds: ['model.project.base', 'model.project.selected'],
        excludedNodeIds: ['model.project.skipped'],
      },
      {
        subjectId: 'model.project.base',
        subjectKind: 'node',
        status: 'RUN',
        reasonCode: 'SELECTED_CLOSURE',
      },
      {
        subjectId: 'model.project.selected',
        subjectKind: 'node',
        status: 'RUN',
        reasonCode: 'SELECTED_ROOT',
      },
      {
        subjectId: 'model.project.skipped',
        subjectKind: 'node',
        status: 'SKIP',
        reasonCode: 'OUTSIDE_SELECTED_CLOSURE',
      },
    ]);
  });

  it('preserves legacy plan payloads when no authorized decision scope is provided', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({
      graphSource: BASE_GRAPH_SOURCE,
      selection: BASE_SELECTION,
    });

    expect(result.plan).not.toHaveProperty('decisions');
  });

  it('accepts graphSource as canonical planner ingress', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({
      graphSource: BASE_GRAPH_SOURCE,
      selection: BASE_SELECTION,
    });
    expect(result.plan).toBeDefined();
  });

  it('rejects malformed graphSource at the application boundary', async () => {
    const facade = new PlannerFacade();
    await expectInvalidInput(
      facade.buildPlan({
        graphSource: {
          kind: 'legacy-graph',
          sourceFamily: 'dbt',
          sourceVersion: '1.0',
          nodes: [{ nodeId: 'model.project.a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        } as unknown as typeof BASE_GRAPH_SOURCE,
        selection: BASE_SELECTION,
      }),
      'graphSource failed contract validation'
    );
  });

  it('rejects the retired environment field at the Planner boundary', async () => {
    const facade = new PlannerFacade();
    const input = {
      graphSource: BASE_GRAPH_SOURCE,
      selection: BASE_SELECTION,
      environment: { environmentId: 'prod', vars: { full_refresh: false } },
    } as unknown as Parameters<PlannerFacade['buildPlan']>[0];

    await expectInvalidInput(facade.buildPlan(input), 'Planner input failed contract validation');
  });

  it('supports non-DBT graphSource when stepFactory is injected', async () => {
    const customStepRegistry = {
      validate: (kind: string) =>
        kind === 'API_CALL'
          ? { success: true as const, data: {} }
          : {
              success: false as const,
              error: `UNKNOWN_STEP_KIND[${kind}]: step kind is not registered in the canonical registry.`,
            },
      isKnown: (kind: string) => kind === 'API_CALL',
      getKinds: () => ['API_CALL'],
    };

    const facade = new PlannerFacade({
      stepFactory: (node) => ({
        stepId: node.nodeId,
        kind: node.stepKind,
        dependsOn: [...node.dependsOn],
      }),
      stepTypeRegistry: customStepRegistry,
    });

    const result = await facade.buildPlan({
      graphSource: {
        ...BASE_GRAPH_SOURCE,
        nodes: [{ nodeId: 'service.notify', stepKind: 'API_CALL', dependsOn: [] }],
      },
      selection: { selectedNodeIds: ['service.notify'] },
    });

    expect(result.plan.steps[0]).toMatchObject({
      stepId: 'service.notify',
      kind: 'API_CALL',
      dependsOn: [],
    });
  });

  it('preserves observability passthrough fields without treating reserved keys generically', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({
      graphSource: BASE_GRAPH_SOURCE,
      selection: BASE_SELECTION,
      observability: {
        correlationId: 'corr-123',
        tags: { tenant: 'tenant-1' },
        extra: { traceSampled: true },
        ignoredUndefined: undefined,
      },
    });

    expect(result.plan.observability).toMatchObject({
      correlationId: 'corr-123',
      tags: { tenant: 'tenant-1' },
      extra: expect.objectContaining({ traceSampled: true }),
    });
    expect(result.plan.observability).not.toHaveProperty('ignoredUndefined');
  });

  it('keeps plan identity stable when only source provenance fields change', async () => {
    const facade = new PlannerFacade();

    const first = await facade.buildPlan({
      graphSource: {
        ...BASE_GRAPH_SOURCE,
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
      },
      selection: BASE_SELECTION,
    });

    const second = await facade.buildPlan({
      graphSource: {
        ...BASE_GRAPH_SOURCE,
        sourceFamily: 'custom-import',
        sourceVersion: '2026-04-10',
      },
      selection: BASE_SELECTION,
    });

    expect(first.plan.metadata.planId).toBe(second.plan.metadata.planId);
    expect(first.plan.metadata.inputHashSha256).toBe(second.plan.metadata.inputHashSha256);
  });
});

describe('PlannerFacade - fail closed on non-canonical ingress', () => {
  it('rejects when no graph source is provided', async () => {
    const facade = new PlannerFacade();
    await expectInvalidInput(
      facade.buildPlan({ selection: BASE_SELECTION } as never),
      'graphSource failed contract validation'
    );
  });

  it('rejects manifestRef at the canonical planner boundary', async () => {
    const facade = new PlannerFacade();
    await expectInvalidInput(
      facade.buildPlan({
        manifestRef: { uri: 's3://bucket/manifest.json', sha256: 'a'.repeat(64) },
        selection: BASE_SELECTION,
      } as never),
      'Planner input failed contract validation'
    );
  });
});
