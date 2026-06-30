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
        database: '',
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
        database: '',
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
        database: 'analytics',
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
        database: 'warehouse_prod',
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
          database: 'warehouse_prod',
          schema: 'warehouse_raw',
          table: 'orders_final',
          alias: 'orders_src',
        },
      },
    });
  });

  it('does not persist an empty DVT source database override', () => {
    const node = buildDvtNode('dvt:source', {
      config: {
        owner: 'finance',
        database: 'analytics_prod',
        schema: 'raw',
        table: 'orders',
        alias: 'orders',
      },
    });
    const draft = {
      name: 'Orders source',
      description: '',
      tags: ['authoring'],
      dvt: {
        kind: 'source' as const,
        database: '   ',
        schema: 'raw',
        table: 'orders',
        alias: 'orders',
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      name: 'Orders source',
      description: undefined,
      tags: ['authoring'],
      metadata: {
        config: {
          owner: 'finance',
          schema: 'raw',
          table: 'orders',
          alias: 'orders',
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
        database: 'analytics_prod',
        schema: 'marts',
        table: 'fct_orders',
        materialization: 'table',
        writeMode: 'replace',
        partitionStrategy: 'daily_by_order_date',
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
          database: 'analytics_prod',
          schema: 'marts',
          table: 'fct_orders',
          materialization: 'table',
          writeMode: 'replace',
          partitionStrategy: 'daily_by_order_date',
        },
      },
    });
  });

  it('clears optional DVT target metadata when the inspector draft blanks it out', () => {
    const node = buildDvtNode('dvt:sink', {
      config: {
        owner: 'finance',
        database: 'analytics_prod',
        schema: 'marts',
        table: 'fct_orders',
        materialization: 'table',
        writeMode: 'replace',
        partitionStrategy: 'daily_by_order_date',
      },
    });
    const draft = {
      name: 'orders_sink',
      description: '',
      tags: ['published'],
      dvt: {
        kind: 'sink' as const,
        database: '   ',
        schema: 'marts',
        table: 'fct_orders',
        materialization: 'table',
        writeMode: 'replace',
        partitionStrategy: '   ',
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

  it('clears stale compiled SQL when applying DVT SQL transform edits', () => {
    const node = buildDvtNode('dvt:sql_transform', {
      sql: 'select stale_column from old_orders',
      compiledSql: 'select stale_column from old_orders',
      config: {
        dialect: 'postgres',
        sql: 'select stale_column from old_orders',
      },
    });
    const draft = {
      name: 'Clean orders',
      description: '',
      tags: ['authoring'],
      dvt: {
        kind: 'sql_transform' as const,
        sql: 'select order_id from raw.orders',
        selectedColumns: [],
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      description: undefined,
      metadata: {
        config: {
          dialect: 'postgres',
          sql: 'select order_id from raw.orders',
        },
        sql: 'select order_id from raw.orders',
      },
    });
  });

  it('applies DVT SQL transform selected columns into metadata config', () => {
    const node = buildDvtNode('dvt:sql_transform', {
      config: {
        dialect: 'postgres',
        sql: 'select * from raw.orders',
        selectedColumns: ['stale-source.legacy_id'],
      },
    });
    const draft = {
      name: 'Clean orders',
      description: '',
      tags: ['authoring'],
      dvt: {
        kind: 'sql_transform' as const,
        sql: 'select order_id, customer from raw.orders',
        selectedColumns: ['source-orders.order_id', 'source-orders.customer'],
      },
    };

    expect(applyCanvasInspectorNodeDraft(node, draft)).toEqual({
      ...node,
      description: undefined,
      metadata: {
        config: {
          dialect: 'postgres',
          sql: 'select order_id, customer from raw.orders',
          selectedColumns: ['source-orders.order_id', 'source-orders.customer'],
        },
        sql: 'select order_id, customer from raw.orders',
      },
    });
  });
});
