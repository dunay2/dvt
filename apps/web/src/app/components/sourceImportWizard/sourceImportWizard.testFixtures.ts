import { buildRelationalSourceObjectId } from '@dvt/contracts';

import type { SourceObjectMetricEvidence } from '../../ports/workspace';
import type { SelectableRelationalSourceObject, SelectableSourceObject } from './types';

export function buildSourceImportTestMetricEvidence(
  rowCount = 1500,
  byteSize = 4096000,
  provenance: 'measured' | 'estimated' = 'measured'
): SourceObjectMetricEvidence {
  const rowCountMetric = {
    value: rowCount,
    provenance: 'estimated' as const,
    method: provenance === 'measured' ? ('provider-statistics' as const) : ('query-plan' as const),
    confidence: provenance === 'measured' ? ('medium' as const) : ('low' as const),
  };
  return provenance === 'measured'
    ? {
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: rowCountMetric,
        byteSize: {
          value: byteSize,
          provenance: 'measured',
          method: 'provider-storage-metadata',
          confidence: 'exact',
          basis: 'physical-allocation',
        },
      }
    : {
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: rowCountMetric,
        byteSize: {
          value: byteSize,
          provenance: 'estimated',
          method: 'schema-width',
          confidence: 'low',
          basis: 'logical-payload',
        },
      };
}

type SourceImportTestRelationalObjectOverrides = Omit<
  Partial<SelectableRelationalSourceObject>,
  'locator'
> & {
  readonly database?: string;
  readonly schema?: string;
  readonly table?: string;
  readonly locator?: SelectableRelationalSourceObject['locator'];
};

export function buildSourceImportTestObject(
  overrides: SourceImportTestRelationalObjectOverrides = {}
): SelectableRelationalSourceObject {
  const {
    database = 'RAW',
    schema = 'ERP',
    table = 'ORDERS',
    locator: locatorOverride,
    ...sourceObjectOverrides
  } = overrides;
  const locator =
    locatorOverride ??
    ({ kind: 'relation', catalog: database, schema, name: table, relationType: 'table' } as const);
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: locator.name,
    locator,
    selected: false,
    metricEvidence: buildSourceImportTestMetricEvidence(),
    columns: [],
    ...sourceObjectOverrides,
  };
}

type SourceImportTestObjectOverrides = Omit<
  Partial<SelectableSourceObject>,
  'locator' | 'objectId'
>;

export function buildSourceImportTestFileObject(
  overrides: SourceImportTestObjectOverrides & {
    readonly objectId?: string;
    readonly path?: string;
    readonly format?: 'parquet' | 'json' | 'csv' | 'avro' | 'orc' | 'other';
  } = {}
): SelectableSourceObject {
  const {
    objectId,
    path = '/landing/orders.parquet',
    format = 'parquet',
    ...sourceObjectOverrides
  } = overrides;
  return {
    objectId: objectId ?? `file:${path}`,
    displayName: 'orders.parquet',
    locator: { kind: 'file', path, format },
    selected: false,
    metricEvidence: buildSourceImportTestMetricEvidence(),
    columns: [],
    ...sourceObjectOverrides,
  };
}

export function buildSourceImportTestEndpointObject(
  overrides: SourceImportTestObjectOverrides & {
    readonly objectId?: string;
    readonly resource?: string;
    readonly protocol?: 'http' | 'https';
  } = {}
): SelectableSourceObject {
  const {
    objectId,
    resource = '//api.example.test/orders',
    protocol = 'https',
    ...sourceObjectOverrides
  } = overrides;
  return {
    objectId: objectId ?? `endpoint:${protocol}:${resource}`,
    displayName: 'Orders API',
    locator: { kind: 'endpoint', protocol, resource },
    selected: false,
    metricEvidence: buildSourceImportTestMetricEvidence(),
    columns: [],
    ...sourceObjectOverrides,
  };
}

export function buildSourceImportTestStreamObject(
  overrides: SourceImportTestObjectOverrides & {
    readonly objectId?: string;
    readonly resource?: string;
    readonly protocol?: 'kafka' | 'pulsar' | 'other';
  } = {}
): SelectableSourceObject {
  const {
    objectId,
    resource = 'orders.created',
    protocol = 'kafka',
    ...sourceObjectOverrides
  } = overrides;
  return {
    objectId: objectId ?? `stream:${protocol}:${resource}`,
    displayName: 'Orders created',
    locator: { kind: 'stream', protocol, resource },
    selected: false,
    metricEvidence: buildSourceImportTestMetricEvidence(),
    columns: [],
    ...sourceObjectOverrides,
  };
}
