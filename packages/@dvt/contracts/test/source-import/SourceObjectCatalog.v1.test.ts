import { describe, expect, it } from 'vitest';

import {
  SOURCE_OBJECT_CATALOG_CONTRACT_VERSION,
  SourceObjectCatalogResponseSchema,
  SourceObjectListSchema,
  SourceObjectSchema,
  SourceObjectSelectionListSchema,
  SourceObjectSelectionSchema,
  buildRelationalSourceObjectId,
  isRelationalSourceObject,
  type SourceObject,
} from '../../src/contracts/source-import/SourceObjectCatalog.v1.js';

const measuredMetricEvidence = {
  observedAt: '2026-07-10T21:00:00.000Z',
  observationScope: { kind: 'snapshot' as const },
  rowCount: {
    value: 3,
    provenance: 'measured' as const,
    method: 'data-scan' as const,
    confidence: 'exact' as const,
  },
  byteSize: {
    value: 96,
    provenance: 'estimated' as const,
    method: 'schema-width' as const,
    confidence: 'low' as const,
    basis: 'logical-payload' as const,
  },
};

function sourceObject(locator: SourceObject['locator']): SourceObject {
  return {
    objectId:
      locator.kind === 'relation'
        ? buildRelationalSourceObjectId(locator)
        : `fixture:${locator.kind}`,
    displayName: `Fixture ${locator.kind}`,
    locator,
    metricEvidence:
      locator.kind === 'stream'
        ? {
            ...measuredMetricEvidence,
            observationScope: {
              kind: 'window' as const,
              startedAt: '2026-07-10T20:00:00.000Z',
              endedAt: '2026-07-10T21:00:00.000Z',
            },
          }
        : measuredMetricEvidence,
  };
}

describe('SourceObjectCatalog v1', () => {
  it.each<SourceObject['locator']>([
    {
      kind: 'relation',
      catalog: 'analytics',
      schema: 'public',
      name: 'orders',
      relationType: 'table',
    },
    { kind: 'file', path: 'landing/orders.parquet', format: 'parquet' },
    { kind: 'endpoint', resource: 'orders-v1', protocol: 'https' },
    { kind: 'stream', resource: 'orders.events', protocol: 'kafka' },
  ])('accepts a complete $kind source object', (locator) => {
    expect(SourceObjectSchema.parse(sourceObject(locator)).locator).toEqual(locator);
  });

  it('builds a stable collision-safe relational object id', () => {
    expect(
      buildRelationalSourceObjectId({
        kind: 'relation',
        catalog: 'Analytics / EU',
        schema: 'Sales',
        name: 'Order Lines',
        relationType: 'view',
      })
    ).toBe('relation/Analytics%20%2F%20EU/Sales/Order%20Lines');
  });

  it('preserves opaque physical identifiers and rejects a mismatched relational object id', () => {
    const locator = {
      kind: 'relation' as const,
      catalog: 'Analytics',
      schema: ' Sales ',
      name: 'Order Lines ',
      relationType: 'table' as const,
    };
    const objectId = buildRelationalSourceObjectId(locator);

    expect(SourceObjectSchema.parse({ ...sourceObject(locator), objectId }).locator).toEqual(
      locator
    );
    expect(() =>
      SourceObjectSchema.parse({ ...sourceObject(locator), objectId: 'relation/wrong/id' })
    ).toThrow();
  });

  it('narrows relational catalog objects without inspecting display labels', () => {
    const relation = SourceObjectSchema.parse(
      sourceObject({
        kind: 'relation',
        catalog: 'analytics',
        schema: 'public',
        name: 'orders',
        relationType: 'table',
      })
    );

    expect(isRelationalSourceObject(relation)).toBe(true);
    expect(
      isRelationalSourceObject(
        SourceObjectSchema.parse(
          sourceObject({ kind: 'file', path: 'landing/orders.json', format: 'json' })
        )
      )
    ).toBe(false);
  });

  it('keeps import selections object-id-only', () => {
    expect(
      SourceObjectSelectionSchema.parse({ objectId: 'relation/analytics/public/orders' })
    ).toEqual({ objectId: 'relation/analytics/public/orders' });
    expect(() =>
      SourceObjectSelectionSchema.parse({
        objectId: 'relation/analytics/public/orders',
        database: 'analytics',
        schema: 'public',
        table: 'orders',
      })
    ).toThrow();
  });

  it('carries an explicit contract version on catalog query responses', () => {
    const relation = sourceObject({
      kind: 'relation',
      catalog: 'analytics',
      schema: 'public',
      name: 'orders',
      relationType: 'table',
    });

    expect(
      SourceObjectCatalogResponseSchema.parse({
        contractVersion: SOURCE_OBJECT_CATALOG_CONTRACT_VERSION,
        objects: [relation],
      })
    ).toEqual({ contractVersion: 1, objects: [relation] });
    expect(() => SourceObjectCatalogResponseSchema.parse([relation])).toThrow();
    expect(() =>
      SourceObjectCatalogResponseSchema.parse({ contractVersion: 2, objects: [relation] })
    ).toThrow();
  });

  it('rejects duplicate object identities in one import selection', () => {
    const selection = { objectId: 'relation/analytics/public/orders' };

    expect(() => SourceObjectSelectionListSchema.parse([selection, selection])).toThrow();
  });

  it('rejects duplicate object identities in one catalog response', () => {
    const relation = sourceObject({
      kind: 'relation',
      catalog: 'analytics',
      schema: 'public',
      name: 'orders',
      relationType: 'table',
    });

    expect(() => SourceObjectListSchema.parse([relation, relation])).toThrow();
  });

  it('requires bounded metric windows for streams and snapshot metrics for relations', () => {
    const stream = sourceObject({
      kind: 'stream',
      resource: 'orders.events',
      protocol: 'kafka',
    });
    const relation = sourceObject({
      kind: 'relation',
      catalog: 'analytics',
      schema: 'public',
      name: 'orders',
      relationType: 'table',
    });

    expect(SourceObjectSchema.parse(stream).metricEvidence.observationScope.kind).toBe('window');
    expect(() =>
      SourceObjectSchema.parse({
        ...stream,
        metricEvidence: measuredMetricEvidence,
      })
    ).toThrow();
    expect(() =>
      SourceObjectSchema.parse({
        ...relation,
        metricEvidence: stream.metricEvidence,
      })
    ).toThrow();
  });

  it('models composite constraints without claiming per-column uniqueness', () => {
    const locator = {
      kind: 'relation' as const,
      catalog: 'analytics',
      schema: 'public',
      name: 'orders',
      relationType: 'table' as const,
    };
    const relation = {
      ...sourceObject(locator),
      objectId: buildRelationalSourceObjectId(locator),
      columns: [
        { name: 'tenant_id', type: 'uuid', nullable: false, primaryKey: true },
        { name: 'order_id', type: 'bigint', nullable: false, primaryKey: true },
      ],
      constraints: [
        {
          name: 'orders_pkey',
          kind: 'primary-key' as const,
          columns: ['tenant_id', 'order_id'],
        },
      ],
    };

    expect(SourceObjectSchema.parse(relation).constraints).toEqual(relation.constraints);
    expect(() =>
      SourceObjectSchema.parse({
        ...relation,
        constraints: [{ kind: 'unique', columns: ['missing_column'] }],
      })
    ).toThrow();
  });

  it('rejects incomplete or semantically impossible metric evidence', () => {
    expect(() =>
      SourceObjectSchema.parse({
        ...sourceObject({ kind: 'file', path: 'landing/orders.parquet', format: 'parquet' }),
        metricEvidence: {
          ...measuredMetricEvidence,
          byteSize: {
            value: 96,
            provenance: 'measured',
            method: 'schema-width',
            confidence: 'exact',
            basis: 'logical-payload',
          },
        },
      })
    ).toThrow();
  });
});
