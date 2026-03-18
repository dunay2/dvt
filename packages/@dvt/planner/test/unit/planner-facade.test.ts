import { describe, expect, it, vi } from 'vitest';

import { PlannerFacade } from '../../src/application/PlannerFacade.js';
import { PlannerErrorCode } from '../../src/domain/errors.js';
import type { IArtifactResolver } from '../../src/ports/IArtifactResolver.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_SELECTION = { selectedNodeIds: ['model.project.a'] };

const BASE_NODES = [{ nodeId: 'model.project.a', resourceType: 'model', dependsOn: [] }];

const BASE_MANIFEST = {
  nodes: {
    'model.project.a': { resource_type: 'model', depends_on: { nodes: [] } },
  },
};

const BASE_MANIFEST_REF = { uri: 's3://bucket/manifest.json', sha256: 'a'.repeat(64) };

function makeResolver(manifest: unknown = BASE_MANIFEST): IArtifactResolver {
  return { resolveManifest: vi.fn().mockResolvedValue(manifest) };
}

// ── Graph source routing ──────────────────────────────────────────────────────

describe('PlannerFacade — graph source routing', () => {
  it('accepts nodes as sole graph source', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({ nodes: BASE_NODES, selection: BASE_SELECTION });
    expect(result.plan).toBeDefined();
  });

  it('accepts manifest as sole graph source', async () => {
    const facade = new PlannerFacade();
    const result = await facade.buildPlan({ manifest: BASE_MANIFEST, selection: BASE_SELECTION });
    expect(result.plan).toBeDefined();
  });

  it('resolves manifestRef via IArtifactResolver and builds plan', async () => {
    const resolver = makeResolver(BASE_MANIFEST);
    const facade = new PlannerFacade({ resolver });
    const result = await facade.buildPlan({
      manifestRef: BASE_MANIFEST_REF,
      selection: BASE_SELECTION,
    });
    expect(resolver.resolveManifest).toHaveBeenCalledWith(BASE_MANIFEST_REF);
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

// ── One-active-source rule ────────────────────────────────────────────────────

describe('PlannerFacade — one-active-source rule', () => {
  it('rejects manifestRef + manifest', async () => {
    const facade = new PlannerFacade({ resolver: makeResolver() });
    await expect(
      facade.buildPlan({
        manifestRef: BASE_MANIFEST_REF,
        manifest: BASE_MANIFEST,
        selection: BASE_SELECTION,
      })
    ).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_INPUT,
      message: expect.stringContaining('One-active-source rule violation'),
    });
  });

  it('rejects manifestRef + nodes', async () => {
    const facade = new PlannerFacade({ resolver: makeResolver() });
    await expect(
      facade.buildPlan({
        manifestRef: BASE_MANIFEST_REF,
        nodes: BASE_NODES,
        selection: BASE_SELECTION,
      })
    ).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_INPUT,
      message: expect.stringContaining('One-active-source rule violation'),
    });
  });

  it('rejects manifest + nodes', async () => {
    const facade = new PlannerFacade();
    await expect(
      facade.buildPlan({ manifest: BASE_MANIFEST, nodes: BASE_NODES, selection: BASE_SELECTION })
    ).rejects.toMatchObject({ code: PlannerErrorCode.INVALID_INPUT });
  });

  it('rejects all three sources simultaneously', async () => {
    const facade = new PlannerFacade({ resolver: makeResolver() });
    await expect(
      facade.buildPlan({
        manifestRef: BASE_MANIFEST_REF,
        manifest: BASE_MANIFEST,
        nodes: BASE_NODES,
        selection: BASE_SELECTION,
      })
    ).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_INPUT,
      message: expect.stringContaining('One-active-source rule violation'),
    });
  });
});

// ── Resolver requirements ─────────────────────────────────────────────────────

describe('PlannerFacade — resolver requirements', () => {
  it('rejects manifestRef when no resolver is configured', async () => {
    const facade = new PlannerFacade(); // no resolver
    await expect(
      facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION })
    ).rejects.toMatchObject({
      code: PlannerErrorCode.INVALID_INPUT,
      message: expect.stringContaining('no IArtifactResolver is configured'),
    });
  });

  it('propagates resolver rejection', async () => {
    const resolver: IArtifactResolver = {
      resolveManifest: vi.fn().mockRejectedValue(new Error('fetch failed')),
    };
    const facade = new PlannerFacade({ resolver });
    await expect(
      facade.buildPlan({ manifestRef: BASE_MANIFEST_REF, selection: BASE_SELECTION })
    ).rejects.toThrow('fetch failed');
  });
});
