import { asIsoUtcString } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import type { SourceDataSample } from '../../ports/workspace';
import {
  projectCanvasSourceDataSample,
  resolveCanvasSourceDataSampleError,
  resolveCanvasSourceDataSampleTarget,
} from './canvasSourceDataSample';

describe('Source Preview output projection', () => {
  const sample: SourceDataSample = {
    contractVersion: 1,
    connectionId: 'warehouse',
    objectId: 'relation/dvt/raw/orders',
    columns: [
      { name: 'order_id', type: 'text', nullable: false },
      { name: 'client_id', type: 'text', nullable: false },
      { name: 'customer', type: 'text', nullable: true },
      { name: 'amount', type: 'numeric', nullable: true },
    ],
    rows: [{ values: ['1', 'C-001', 'Ada', '125.50'] }],
    limit: 20,
    truncated: false,
    provenance: {
      mode: 'live',
      sourceRefs: [
        {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/raw/orders',
        },
      ],
      queriedAt: asIsoUtcString('2026-09-28T10:00:00.000Z'),
      limit: 20,
      navigation: 'bounded-first-page',
    },
  };

  it('shows only selected Source outputs, in selected order, without mutating the physical sample', () => {
    const before = JSON.stringify(sample);
    const projected = projectCanvasSourceDataSample(sample, ['amount', 'customer']);
    expect(projected.columns.map((column) => column.name)).toEqual(['amount', 'customer']);
    expect(projected.rows).toEqual([{ values: ['125.50', 'Ada'] }]);
    expect(JSON.stringify(sample)).toBe(before);
  });

  it('fails closed if a selected output is absent from the physical sample', () => {
    expect(() => projectCanvasSourceDataSample(sample, ['customer', 'missing'])).toThrow(
      'Selected Source output is absent from the sample.'
    );
  });
});

describe('canvas source data sample projection', () => {
  it('admits only governed relational imported sources', () => {
    expect(
      resolveCanvasSourceDataSampleTarget({
        name: 'orders',
        status: 'idle',
        metadata: {
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'postgresql-local',
              provider: 'postgres',
            },
            sourceObjectId: 'relation/dvt/public/orders',
          },
        },
      })
    ).toEqual({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
      nodeName: 'orders',
    });

    expect(
      resolveCanvasSourceDataSampleTarget({
        name: 'model_orders',
        status: 'idle',
        metadata: {},
      })
    ).toBeNull();
  });

  it('preserves stable query failure reasons and hides unknown failures', () => {
    expect(
      resolveCanvasSourceDataSampleError(
        new WarehouseSourceDataSampleQueryError('publication_changed'),
        'orders'
      )
    ).toEqual({ status: 'error', nodeName: 'orders', reason: 'unavailable' });
    expect(
      resolveCanvasSourceDataSampleError(
        new WarehouseSourceDataSampleQueryError('source_object_not_found'),
        'orders'
      )
    ).toEqual({
      status: 'error',
      nodeName: 'orders',
      reason: 'source_object_not_found',
    });
    expect(resolveCanvasSourceDataSampleError(new Error('secret'), 'orders')).toEqual({
      status: 'error',
      nodeName: 'orders',
      reason: 'unknown',
    });
  });
});
