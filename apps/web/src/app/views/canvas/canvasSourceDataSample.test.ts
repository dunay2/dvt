import { describe, expect, it } from 'vitest';

import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import {
  resolveCanvasSourceDataSampleError,
  resolveCanvasSourceDataSampleTarget,
} from './canvasSourceDataSample';

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
