import type { CanonicalNode } from '../../types/canonical';

export function buildDvtNode(
  kind: 'dvt:source' | 'dvt:transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `dvt-${kind.replace('dvt:', '').replace('_', '-')}`,
    name: kind === 'dvt:transform' ? 'Clean Orders' : 'Orders',
    pluginId: 'dvt',
    kind,
    role: kind === 'dvt:source' ? 'input' : kind === 'dvt:sink' ? 'output' : 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

export function buildImportedWarehouseSourceNode(): CanonicalNode {
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
    },
  };
}

export function buildJoinWarehouseSourceNode(args: {
  id: string;
  table: string;
  columns: readonly string[];
  connectionId?: string;
}): CanonicalNode {
  return {
    id: args.id,
    name: args.table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      sourceName: args.table,
      tableName: args.table,
      schema: 'public',
      columns: args.columns.map((name) => ({ name, type: 'string', nullable: false })),
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: args.connectionId ?? 'warehouse-main',
        },
        sourceObjectId: `public.${args.table}`,
      },
    },
  };
}
