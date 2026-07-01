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
        kind: 'dbt:source',
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
        kind: 'dbt:source',
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

  it('keeps model names readable without inventing missing relation metadata', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'orders_model',
        kind: 'dbt:model',
        metadata: {},
        data: {},
      })
    ).toEqual({
      title: 'Orders Model',
      technicalName: 'orders_model',
    });
  });
});
