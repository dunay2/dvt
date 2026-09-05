import { describe, expect, it } from 'vitest';

import { buildGraphNodeTitlePresentation } from './graphNodeTitlePresentation';

describe('buildGraphNodeTitlePresentation', () => {
  it('humanizes source relation context while preserving the technical node name', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'source_1_raw.source_1',
        kind: 'dvt:source',
        metadata: {
          database: 'postgres',
          schema: 'public',
          table: 'source_1',
        },
      })
    ).toEqual({
      title: 'Postgres · public',
      technicalName: 'source_1_raw.source_1',
    });
  });

  it('humanizes dbt source names from source and table metadata', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'source.raw.orders',
        kind: 'dvt:source',
        metadata: {
          sourceName: 'raw',
          tableName: 'orders',
        },
        data: {},
      })
    ).toEqual({
      title: 'Raw Orders',
      technicalName: 'source.raw.orders',
    });
  });

  it('humanizes dbt source names from nested dbt metadata', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'source.raw.orders',
        kind: 'dvt:source',
        metadata: {
          dbt: {
            sourceName: 'raw',
            tableName: 'orders',
          },
        },
        data: {},
      })
    ).toEqual({
      title: 'Raw Orders',
      technicalName: 'source.raw.orders',
    });
  });

  it('uses relation metadata from node data when canonical metadata is absent', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'postgres_public_orders',
        kind: 'dvt:source',
        metadata: {},
        data: {
          database: 'postgres',
          schema: 'public',
          table: 'orders',
        },
      })
    ).toEqual({
      title: 'Postgres · public',
      technicalName: 'postgres_public_orders',
    });
  });

  it('prefers explicit source table identity over schema identity for imported sources', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'src_erp_orders',
        kind: 'dvt:source',
        metadata: {
          database: 'RAW',
          schema: 'ERP',
          config: {
            sourceName: 'erp',
            tableName: 'orders',
          },
        },
      })
    ).toEqual({
      title: 'ERP Orders',
      technicalName: 'src_erp_orders',
    });
  });

  it('uses warehouse source relation identity instead of generated dbt source names', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'src_local_postgres_dvt_public_source_1',
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        metadata: {
          database: 'dvt',
          schema: 'public',
          sourceName: 'local_postgres_dvt_public',
          tableName: 'source_1',
        },
      })
    ).toEqual({
      title: 'source_1',
      technicalName: 'src_local_postgres_dvt_public_source_1',
    });
  });

  it('uses the canonical warehouse connection provider for imported source titles', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'src_local_postgres_dvt_public_source_1',
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        metadata: {
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'local-postgres',
              provider: 'postgres',
            },
            sourceObjectId: 'relation/dvt/public/source_1',
          },
          connectionName: 'Local Postgres proof',
          database: 'dvt',
          schema: 'public',
          sourceName: 'local_postgres_dvt_public',
          tableName: 'source_1',
        },
      })
    ).toEqual({
      title: 'source_1',
      technicalName: 'src_local_postgres_dvt_public_source_1',
    });
  });

  it('prefers the physical warehouse identifier over the normalized YAML table alias', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'src_warehouse_public_order_items',
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        metadata: {
          database: 'warehouse',
          schema: 'public',
          tableName: 'order_items',
          tableIdentifier: 'Order-Items',
        },
      })
    ).toEqual({
      title: 'Order-Items',
      technicalName: 'src_warehouse_public_order_items',
    });
  });

  it('keeps same-schema warehouse source cards distinct with exact table identifiers', () => {
    const buildTitle = (tableName: string): string =>
      buildGraphNodeTitlePresentation({
        nodeName: `src_local_postgres_dvt_${tableName}`,
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        metadata: {
          database: 'dvt',
          schema: 'dvt',
          tableName,
        },
      }).title;

    expect([buildTitle('auth_audit_events'), buildTitle('email_outbox')]).toEqual([
      'auth_audit_events',
      'email_outbox',
    ]);
  });

  it('falls back to provider and schema when a warehouse source table is unavailable', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'src_local_postgres_dvt_public',
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        metadata: {
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'local-postgres',
              provider: 'postgres',
            },
            sourceObjectId: 'schema/dvt/public',
          },
          database: 'dvt',
          schema: 'public',
        },
      })
    ).toEqual({
      title: 'Postgres · public',
      technicalName: 'src_local_postgres_dvt_public',
    });
  });

  it('keeps model names readable without inventing missing relation metadata', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'orders_model',
        kind: 'dvt:transform',
        metadata: {},
        data: {},
      })
    ).toEqual({
      title: 'Orders Model',
      technicalName: 'orders_model',
    });
  });

  it('does not append the node kind to model card titles', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'model_1',
        kind: 'dvt:transform',
        metadata: {},
        data: {},
      })
    ).toEqual({
      title: 'Model 1',
      technicalName: 'model_1',
    });
  });
});
