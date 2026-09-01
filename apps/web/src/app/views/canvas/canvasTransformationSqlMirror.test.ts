import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  buildDvtSqlTransformMetadata,
  readTransformationSqlMirrorState,
  resolveExecutableSqlText,
} from './canvasTransformationSqlMirror';

function transformNode(metadata: CanonicalNode['metadata']): CanonicalNode {
  return {
    id: 'transform',
    name: 'Transform',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

describe('canvasTransformationSqlMirror', () => {
  it('classifies a draft-only transform as dirty and executable from draft SQL', () => {
    const node = transformNode({
      sql: 'select order_id from raw.orders',
      config: { dialect: 'postgres', sql: 'select order_id from raw.orders' },
    });

    expect(readTransformationSqlMirrorState(node)).toEqual({
      status: 'draft_dirty',
      draftSql: 'select order_id from raw.orders',
      compiledSql: null,
      executableSql: 'select order_id from raw.orders',
    });
    expect(resolveExecutableSqlText(node)).toEqual({
      ok: true,
      sql: 'select order_id from raw.orders',
    });
  });

  it('classifies a compiled-only transform as clean and executable from compiled SQL', () => {
    const node = transformNode({
      compiledSql: 'select order_id from analytics.orders',
      config: { dialect: 'postgres' },
    });

    expect(readTransformationSqlMirrorState(node)).toEqual({
      status: 'clean',
      draftSql: null,
      compiledSql: 'select order_id from analytics.orders',
      executableSql: 'select order_id from analytics.orders',
    });
    expect(resolveExecutableSqlText(node)).toEqual({
      ok: true,
      sql: 'select order_id from analytics.orders',
    });
  });

  it('fails closed when draft and compiled SQL coexist', () => {
    const node = transformNode({
      sql: 'select * from {{ ref("orders") }}',
      compiledSql: 'select * from analytics.orders',
      config: { dialect: 'postgres', sql: 'select * from {{ ref("orders") }}' },
    });

    expect(readTransformationSqlMirrorState(node)).toEqual({
      status: 'invalid_ambiguous',
      draftSql: 'select * from {{ ref("orders") }}',
      compiledSql: 'select * from analytics.orders',
      executableSql: null,
    });
    expect(resolveExecutableSqlText(node)).toEqual({
      ok: false,
      message:
        'Preview graph artifact cannot choose between draft SQL and compiled SQL for transform node transform. Re-apply the SQL edit or regenerate compiled SQL before preview.',
    });
  });

  it('builds edit metadata that mirrors draft SQL into config and drops stale compiled SQL', () => {
    const node = transformNode({
      sql: 'select stale_column from old_orders',
      compiledSql: 'select stale_column from old_orders',
      config: {
        dialect: 'postgres',
        sql: 'select stale_column from old_orders',
      },
      owner: 'finance',
      transformLineageProvenance: {
        version: 'v1',
        outputs: [],
        filters: [],
      },
    });

    expect(buildDvtSqlTransformMetadata(node, 'select order_id from raw.orders')).toEqual({
      owner: 'finance',
      sql: 'select order_id from raw.orders',
      config: {
        dialect: 'postgres',
        sql: 'select order_id from raw.orders',
      },
    });
  });
});
