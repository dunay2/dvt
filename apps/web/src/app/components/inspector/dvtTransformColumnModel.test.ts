import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  buildDvtTransformColumnOptions,
  readDvtSelectedColumnRefs,
} from './dvtTransformColumnModel';

function node(id: string, name: string, metadata?: CanonicalNode['metadata']): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dvt',
    kind: id.startsWith('transform') ? 'dvt:sql_transform' : 'dvt:source',
    role: id.startsWith('transform') ? 'transform' : 'input',
    status: 'idle',
    tags: [],
    metadata,
  };
}

function edge(sourceId: string, targetId: string): CanonicalEdge {
  return {
    id: `${sourceId}-${targetId}`,
    sourceId,
    targetId,
    relation: 'lineage',
  };
}

describe('dvtTransformColumnModel', () => {
  it('projects selectable upstream columns from connected source metadata', () => {
    const transform = node('transform-clean-orders', 'Clean orders', {
      config: {
        selectedColumns: ['source-orders.order_id'],
      },
    });
    const source = node('source-orders', 'Orders source', {
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer', type: 'text', nullable: true },
      ],
    });

    expect(
      buildDvtTransformColumnOptions({
        node: transform,
        nodes: [source, transform],
        edges: [edge(source.id, transform.id)],
        selectedColumnRefs: readDvtSelectedColumnRefs(transform.metadata),
      })
    ).toEqual([
      {
        columnName: 'order_id',
        columnRef: 'source-orders.order_id',
        dataType: 'integer',
        nullable: false,
        selected: true,
        sourceNodeId: 'source-orders',
        sourceNodeName: 'Orders source',
      },
      {
        columnName: 'customer',
        columnRef: 'source-orders.customer',
        dataType: 'text',
        nullable: true,
        selected: false,
        sourceNodeId: 'source-orders',
        sourceNodeName: 'Orders source',
      },
    ]);
  });

  it('does not fabricate column options when upstream metadata is absent', () => {
    const transform = node('transform-clean-orders', 'Clean orders');
    const source = node('source-orders', 'Orders source');

    expect(
      buildDvtTransformColumnOptions({
        node: transform,
        nodes: [source, transform],
        edges: [edge(source.id, transform.id)],
        selectedColumnRefs: [],
      })
    ).toEqual([]);
  });
});
