import { describe, expect, it, vi } from 'vitest';

import { PlannerFacade } from '../../src/application/PlannerFacade.js';
import { PlannerErrorCode } from '../../src/domain/errors.js';
import type { IArtifactResolver } from '../../src/ports/IArtifactResolver.js';

const BASE_SELECTION = { selectedNodeIds: ['model.project.a'] };

const BASE_GRAPH_SOURCE = {
  kind: 'generic-graph-v1' as const,
  sourceFamily: 'dbt',
  sourceVersion: '1.0',
  nodes: [{ nodeId: 'model.project.a', stepKind: 'DBT_MODEL', dependsOn: [] }],
};

const BASE_MANIFEST_REF = { uri: 's3://bucket/manifest.json', sha256: 'a'.repeat(64) };

function makeResolver(graphSource: unknown = BASE_GRAPH_SOURCE): IArtifactResolver {
  return { resolveGraphSource: vi.fn().mockResolvedValue(graphSource) };
}

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

describe('PlannerFacade - graph source routing', () => {
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
  it('accepts graphSource as sole graph source', async () => {
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

  it('resolves manifestRef via IArtifactResolver and builds plan', async () => {
    const resolver = makeResolver(BASE_GRAPH_SOURCE);
    const facade = new PlannerFacade({ resolver });
    const result = await facade.buildPlan({
      manifestRef: BASE_MANIFEST_REF,
      selection: BASE_SELECTION,
    });
    expect(resolver.resolveGraphSource).toHaveBeenCalledWith(BASE_MANIFEST_REF);
    expect(result.plan).toBeDefined();
  });

  it('strips environment context before delegating', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({
      graphSource: BASE_GRAPH_SOURCE,
      selection: BASE_SELECTION,
      environment: { environmentId: 'prod', targetProfile: 'prod-profile' },
    });
    expect(result.plan).toBeDefined();
  });

  it('supports non-DBT graphSource when stepFactory is injected', async () => {
    const facade = new PlannerFacade({
      stepFactory: (node) => ({
        stepId: node.nodeId,
        kind: node.stepKind,
        dependsOn: [...node.dependsOn],
      }),
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
});

describe('PlannerFacade - one-active-source rule', () => {
  it('rejects when no graph source is provided', async () => {
    const facade = new PlannerFacade();
    await expectInvalidInput(
      facade.buildPlan({ selection: BASE_SELECTION } as never),
      'Planner input failed contract validation'
    );
  });

  it('rejects manifestRef + graphSource', async () => {
    const facade = new PlannerFacade({ resolver: makeResolver() });
    await expectInvalidInput(
      facade.buildPlan({
        manifestRef: BASE_MANIFEST_REF,
        graphSource: BASE_GRAPH_SOURCE,
        selection: BASE_SELECTION,
      }),
      'Planner input failed contract validation'
    );
  });
});

describe('PlannerFacade - resolver requirements', () => {
  it('validates manifestRefCacheSize even when resolver is not configured', () => {
    expect(() => new PlannerFacade({ manifestRefCacheSize: -1 })).toThrow(
      'manifestRefCacheSize must be a non-negative integer.'
    );
  });

  it('rejects manifestRef when no resolver is configured', async () => {
    const facade = new PlannerFacade();
    await expect(
      facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION })
    ).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_INPUT,
      message: expect.stringContaining('no IArtifactResolver is configured'),
    });
  });

  it('propagates resolver rejection', async () => {
    const resolver: IArtifactResolver = {
      resolveGraphSource: vi.fn().mockRejectedValue(new Error('fetch failed')),
    };
    const facade = new PlannerFacade({ resolver });
    await expect(
      facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION })
    ).rejects.toThrow('fetch failed');
  });

  it('rejects malformed graphSource returned by resolver', async () => {
    const resolver = makeResolver({
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: '1.0',
      nodes: [{ nodeId: 'x', dependsOn: [] }],
    });
    const facade = new PlannerFacade({ resolver });
    await expectInvalidInput(
      facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION }),
      'graphSource failed contract validation'
    );
  });

  it('caches repeated manifestRef resolution by default', async () => {
    const resolver = makeResolver(BASE_GRAPH_SOURCE);
    const facade = new PlannerFacade({ resolver });

    await facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION });
    await facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION });

    expect(resolver.resolveGraphSource).toHaveBeenCalledTimes(1);
  });

  it('disables manifestRef cache when manifestRefCacheSize is zero', async () => {
    const resolver = makeResolver(BASE_GRAPH_SOURCE);
    const facade = new PlannerFacade({ resolver, manifestRefCacheSize: 0 });

    await facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION });
    await facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION });

    expect(resolver.resolveGraphSource).toHaveBeenCalledTimes(2);
  });

  it('evicts least-recently-used manifestRef entries when cache is full', async () => {
    const resolver = makeResolver(BASE_GRAPH_SOURCE);
    const facade = new PlannerFacade({ resolver, manifestRefCacheSize: 1 });
    const altManifestRef = { uri: 's3://bucket/manifest-alt.json', sha256: 'b'.repeat(64) };

    await facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION });
    await facade.buildPlan({ manifestRef: altManifestRef, selection: BASE_SELECTION });
    await facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION });

    expect(resolver.resolveGraphSource).toHaveBeenCalledTimes(3);
  });
});
