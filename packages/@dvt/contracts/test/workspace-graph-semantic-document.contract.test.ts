import { Buffer } from 'node:buffer';

import { base64Bytes, sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
} from '../src/index.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

function buildDraft(transformAuthoring: unknown, kind: string): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { id: 'canvas-1', kind: 'transformation', title: 'Transform canvas' },
    nodeIds: ['transform-node'],
    nodePositions: { 'transform-node': { x: 10, y: 20 } },
    nodes: [
      {
        id: 'transform-node',
        name: 'Transform',
        pluginId: 'dvt',
        kind,
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: { transformAuthoring },
      },
    ],
    edges: [],
  };
}

describe.each(['transform', 'dvt:transform'])(
  'Workspace graph %s semantic document admission',
  (kind) => {
    it('accepts the current canonical Transform authority', () => {
      const semanticDocument = buildDvtSubstraitSemanticDocumentFixture();

      expect(
        WorkspaceGraphAuthoringDraftSchema.safeParse(
          buildDraft({ version: 'v1', mode: 'substrait', semanticDocument }, kind)
        ).success
      ).toBe(true);
    });

    it('preserves the canonicalized Transform authority in the parsed draft', () => {
      const semanticDocument = buildDvtSubstraitSemanticDocumentFixture();
      const relations = semanticDocument.sidecar.relations.map((relation, index) =>
        index === 0 ? { ...relation, displayName: '  customers  ' } : relation
      );

      const parsed = WorkspaceGraphAuthoringDraftSchema.parse(
        buildDraft(
          {
            version: 'v1',
            mode: 'substrait',
            semanticDocument: {
              ...semanticDocument,
              sidecar: { ...semanticDocument.sidecar, relations },
            },
          },
          kind
        )
      );

      const transformAuthoring = parsed.nodes[0]?.metadata?.['transformAuthoring'] as {
        semanticDocument: { sidecar: { relations: Array<{ displayName?: string }> } };
      };
      expect(transformAuthoring.semanticDocument.sidecar.relations[0]?.displayName).toBe(
        'customers'
      );
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
          buildDraft({ version: 'v1', mode: 'substrait', semanticDocument: corruptDocument }, kind)
        ).success
      ).toBe(false);
    });

    it('rejects legacy Transform semantic authority instead of falling back', () => {
      expect(
        WorkspaceGraphAuthoringDraftSchema.safeParse(
          buildDraft({ version: 'v1', mode: 'visual', recipe: { outputs: [] } }, kind)
        ).success
      ).toBe(false);
    });
  }
);

it('keeps foreign plugin transform metadata outside DVT semantic authority', () => {
  const draft = buildDraft({ opaque: 'foreign-authority' }, 'transform');
  draft.nodes[0]!.pluginId = 'foreign-plugin';
  expect(WorkspaceGraphAuthoringDraftSchema.parse(draft)).toEqual(draft);
});
