import { describe, expect, it, vi } from 'vitest';

import { PlannerFacade } from '../../src/application/PlannerFacade.js';
import { PlannerErrorCode } from '../../src/domain/errors.js';
import type { IArtifactResolver } from '../../src/ports/IArtifactResolver.js';

const BASE_SELECTION = { selectedNodeIds: ['model.project.a'] };

const BASE_NODES = [{ nodeId: 'model.project.a', resourceType: 'model', dependsOn: [] }];

const BASE_GRAPH_SOURCE = { kind: 'normalized-graph-v1' as const, nodes: BASE_NODES };

const BASE_MANIFEST = {
  nodes: {
    'model.project.a': { resource_type: 'model', depends_on: { nodes: [] } },
  },
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
  it('accepts nodes as sole graph source', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({ nodes: BASE_NODES, selection: BASE_SELECTION });
    expect(result.plan).toBeDefined();
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
          nodes: BASE_NODES,
        } as unknown as typeof BASE_GRAPH_SOURCE,
        selection: BASE_SELECTION,
      }),
      'graphSource failed contract validation'
    );
  });

  it('accepts manifest as sole graph source', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({ manifest: BASE_MANIFEST, selection: BASE_SELECTION });
    expect(result.plan).toBeDefined();
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
      nodes: BASE_NODES,
      selection: BASE_SELECTION,
      environment: { environmentId: 'prod', targetProfile: 'prod-profile' },
    });
    expect(result.plan).toBeDefined();
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

  it('rejects manifestRef + manifest', async () => {
    const facade = new PlannerFacade({ resolver: makeResolver() });
    await expectInvalidInput(
      facade.buildPlan({
        manifestRef: BASE_MANIFEST_REF,
        manifest: BASE_MANIFEST,
        selection: BASE_SELECTION,
      }),
      'Planner input failed contract validation'
    );
  });

  it('rejects manifestRef + nodes', async () => {
    const facade = new PlannerFacade({ resolver: makeResolver() });
    await expectInvalidInput(
      facade.buildPlan({
        manifestRef: BASE_MANIFEST_REF,
        nodes: BASE_NODES,
        selection: BASE_SELECTION,
      }),
      'Planner input failed contract validation'
    );
  });

  it('rejects graphSource + nodes', async () => {
    const facade = new PlannerFacade();
    await expectInvalidInput(
      facade.buildPlan({
        graphSource: BASE_GRAPH_SOURCE,
        nodes: BASE_NODES,
        selection: BASE_SELECTION,
      }),
      'Planner input failed contract validation'
    );
  });

  it('rejects manifest + nodes', async () => {
    const facade = new PlannerFacade();
    await expectInvalidInput(
      facade.buildPlan({ manifest: BASE_MANIFEST, nodes: BASE_NODES, selection: BASE_SELECTION }),
      'Planner input failed contract validation'
    );
  });

  it('rejects all three sources simultaneously', async () => {
    const facade = new PlannerFacade({ resolver: makeResolver() });
    await expectInvalidInput(
      facade.buildPlan({
        manifestRef: BASE_MANIFEST_REF,
        manifest: BASE_MANIFEST,
        nodes: BASE_NODES,
        selection: BASE_SELECTION,
      }),
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
    const resolver = makeResolver({ kind: 'legacy-graph', nodes: BASE_NODES });
    const facade = new PlannerFacade({ resolver });
    await expectInvalidInput(
      facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION }),
      'graphSource failed contract validation'
    );
  });
});
