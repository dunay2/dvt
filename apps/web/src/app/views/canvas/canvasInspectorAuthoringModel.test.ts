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

function buildDvtNode(
  kind: 'dvt:source' | 'dvt:sql_transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `node_${kind.replace('dvt:', '')}`,
    name: kind === 'dvt:sql_transform' ? 'Clean orders' : 'Orders',
    pluginId: 'dvt',
    kind,
    role: kind === 'dvt:source' ? 'input' : kind === 'dvt:sink' ? 'output' : 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

describe('canvasInspectorAuthoringModel', () => {
  it('creates a semantic inspector draft from the selected canonical node', () => {
    expect(createCanvasInspectorNodeDraft(buildNode())).toEqual({
      name: 'orders_source',
      description: 'Source table',
      dvt: {
        kind: 'source',
        schema: 'public',
        table: 'orders_source',
        alias: 'orders_source',
      },
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

  it('creates DVT source authoring metadata from existing node config', () => {
    expect(
      createCanvasInspectorNodeDraft(
        buildDvtNode('dvt:source', {
          config: {
            schema: 'analytics',
            table: 'orders',
            alias: 'raw_orders',
          },
        })
      )
    ).toEqual({
      name: 'Orders',
      description: '',
      dvt: {
        kind: 'source',
        schema: 'analytics',
        table: 'orders',
        alias: 'raw_orders',
      },
    });
  });

  it('applies DVT sink metadata into metadata.config without dropping existing config', () => {
    const node = buildDvtNode('dvt:sink', {
      config: {
        owner: 'finance',
      },
    });
    const draft = {
      name: 'orders_sink',
      description: '',
      dvt: {
        kind: 'sink' as const,
        schema: 'marts',
        table: 'fct_orders',
        materialization: 'table',
        writeMode: 'replace',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'orders_sink',
      description: undefined,
      metadata: {
        config: {
          owner: 'finance',
          schema: 'marts',
          table: 'fct_orders',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    });
  });
});
