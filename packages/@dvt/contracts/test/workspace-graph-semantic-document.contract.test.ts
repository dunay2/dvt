import { Buffer } from 'node:buffer';

import { base64Bytes, sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
} from '../src/index.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

function buildDraft(transformAuthoring: unknown): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { id: 'canvas-1', kind: 'transformation', title: 'Transform canvas' },
    nodeIds: ['transform-node'],
    nodePositions: { 'transform-node': { x: 10, y: 20 } },
    nodes: [
      {
        id: 'transform-node',
        name: 'Transform',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: { transformAuthoring },
      },
    ],
    edges: [],
  };
}

describe('Workspace graph semantic document admission', () => {
  it('accepts the current canonical Transform authority', () => {
    const semanticDocument = buildDvtSubstraitSemanticDocumentFixture();

    expect(
      WorkspaceGraphAuthoringDraftSchema.safeParse(
        buildDraft({ version: 'v1', mode: 'substrait', semanticDocument })
      ).success
    ).toBe(true);
  });

  it('rejects a corrupted Transform authority before persistence', () => {
    const semanticDocument = buildDvtSubstraitSemanticDocumentFixture();
    const corruptBytes = base64Bytes(semanticDocument.semanticPlan.bytesBase64);
    corruptBytes[0] = 0xff;
    const corruptSha = sha256Hex(corruptBytes);
    const corruptDocument = {
      ...semanticDocument,
      semanticPlan: {
        ...semanticDocument.semanticPlan,
        bytesBase64: Buffer.from(corruptBytes).toString('base64'),
        sha256: corruptSha,
      },
      sidecar: { ...semanticDocument.sidecar, semanticPlanSha256: corruptSha },
    };

    expect(
      WorkspaceGraphAuthoringDraftSchema.safeParse(
        buildDraft({ version: 'v1', mode: 'substrait', semanticDocument: corruptDocument })
      ).success
    ).toBe(false);
  });

  it('rejects legacy Transform semantic authority instead of falling back', () => {
    expect(
      WorkspaceGraphAuthoringDraftSchema.safeParse(
        buildDraft({ version: 'v1', mode: 'visual', recipe: { outputs: [] } })
      ).success
    ).toBe(false);
  });
});
