import { describe, expect, it } from 'vitest';

import {
  applyCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
  hasCanvasInspectorNodeDraftChanges,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import type { CanonicalNode } from '../../types/canonical';

function buildNode(): CanonicalNode {
  return {
    id: 'node_1',
    name: 'orders_source',
    description: 'Source table',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

describe('canvasInspectorAuthoringModel', () => {
  it('creates a semantic inspector draft from the selected canonical node', () => {
    expect(createCanvasInspectorNodeDraft(buildNode())).toEqual({
      name: 'orders_source',
      description: 'Source table',
    });
  });

  it('rejects blank node names', () => {
    expect(
      validateCanvasInspectorNodeDraft({
        name: '   ',
        description: '',
      })
    ).toEqual({
      name: 'Node name is required.',
    });
  });

  it('tracks dirty state and applies the edited fields back into the canonical node', () => {
    const node = buildNode();
    const draft = {
      name: 'orders_source_v2',
      description: 'Renamed in inspector',
    };

    expect(hasCanvasInspectorNodeDraftChanges(node, draft)).toBe(true);
    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'orders_source_v2',
      description: 'Renamed in inspector',
    });
  });

  it('normalizes empty descriptions back to undefined', () => {
    expect(
      applyCanvasInspectorNodeDraft(buildNode(), {
        name: 'orders_source',
        description: '   ',
      }).description
    ).toBeUndefined();
  });
});
