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

function buildImportedWarehouseSourceNode(metadata?: Record<string, unknown>): CanonicalNode {
  return {
    id: 'src_warehouse_prod_analytics_erp_orders',
    name: 'src_warehouse_prod_analytics_erp_orders',
    description: 'Imported source for analytics.erp.orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'erp'],
    path: 'models/sources/src_erp.yml',
    metadata: {
      sourceName: 'warehouse_prod_analytics_erp',
      tableName: 'orders',
      database: 'analytics',
      schema: 'erp',
      columns: [{ name: 'id', type: 'number', nullable: false }],
      ...(metadata ?? {}),
    },
  };
}

describe('canvasInspectorAuthoringModel', () => {
  it('creates a semantic inspector draft from the selected canonical node', () => {
    expect(createCanvasInspectorNodeDraft(buildNode())).toEqual({
      name: 'orders_source',
      description: 'Source table',
      tags: [],
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
        tags: [],
      })
    ).toEqual({
      name: 'node_name_required',
    });
  });

  it('tracks dirty state and applies the edited fields back into the canonical node', () => {
    const node = buildNode();
    const draft = {
      name: 'orders_source_v2',
      description: 'Renamed in inspector',
      tags: ['finance', 'critical'],
    };

    expect(hasCanvasInspectorNodeDraftChanges(node, draft)).toBe(true);
    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'orders_source_v2',
      description: 'Renamed in inspector',
      tags: ['finance', 'critical'],
    });
  });

  it('normalizes empty descriptions back to undefined', () => {
    expect(
      applyCanvasInspectorNodeDraft(buildNode(), {
        name: 'orders_source',
        description: '   ',
        tags: [],
      }).description
    ).toBeUndefined();
  });

  it('normalizes tag edits before applying them to the canonical node', () => {
    expect(
      applyCanvasInspectorNodeDraft(buildNode(), {
        name: 'orders_source',
        description: 'Source table',
        tags: [' finance ', 'critical', 'finance', ''],
      }).tags
    ).toEqual(['finance', 'critical']);
  });

  it('keeps dbt model SQL ownership outside the route-owned generic inspector draft', () => {
    expect(
      validateCanvasInspectorNodeDraft({
        name: 'Orders Model',
        description: '',
        tags: [],
        dbt: {
          packageName: 'analytics',
          sourceName: 'raw',
          schemaName: 'raw',
          tableName: 'orders',
          materialized: 'view',
          selectedSourceId: 'source-orders',
        },
      })
    ).toEqual({});
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
      tags: ['authoring'],
      dvt: {
        kind: 'source',
        schema: 'analytics',
        table: 'orders',
        alias: 'raw_orders',
      },
    });
  });

  it('creates DVT source authoring metadata from imported warehouse source metadata', () => {
    expect(createCanvasInspectorNodeDraft(buildImportedWarehouseSourceNode())).toEqual({
      name: 'src_warehouse_prod_analytics_erp_orders',
      description: 'Imported source for analytics.erp.orders',
      tags: ['source', 'erp'],
      dvt: {
        kind: 'source',
        schema: 'erp',
        table: 'orders',
        alias: 'warehouse_prod_analytics_erp',
      },
    });
  });

  it('applies imported warehouse source edits without dropping server-owned metadata', () => {
    const node = buildImportedWarehouseSourceNode();
    const draft = {
      name: 'Warehouse Orders',
      description: 'Curated source',
      tags: ['source', 'finance'],
      dvt: {
        kind: 'source' as const,
        schema: 'warehouse_raw',
        table: 'orders_final',
        alias: 'orders_src',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'Warehouse Orders',
      description: 'Curated source',
      tags: ['source', 'finance'],
      metadata: {
        ...node.metadata,
        config: {
          schema: 'warehouse_raw',
          table: 'orders_final',
          alias: 'orders_src',
        },
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
      tags: ['published'],
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
      tags: ['published'],
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
