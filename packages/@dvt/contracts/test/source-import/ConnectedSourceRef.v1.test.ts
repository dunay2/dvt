import { describe, expect, it } from 'vitest';

import {
  CONNECTED_SOURCE_REF_SCHEMA_VERSION,
  CONNECTION_REF_SCHEMA_VERSION,
  ConnectedSourceRefSchema,
  ConnectionRefSchema,
} from '../../src/contracts/source-import/ConnectedSourceRef.v1.js';

const connectionRef = {
  schemaVersion: 'connection-ref.v1' as const,
  connectionId: 'warehouse-prod',
  provider: 'postgres',
};

describe('ConnectedSourceRef v1', () => {
  it('qualifies one physical source object through one explicit connection', () => {
    expect(CONNECTION_REF_SCHEMA_VERSION).toBe('connection-ref.v1');
    expect(CONNECTED_SOURCE_REF_SCHEMA_VERSION).toBe('connected-source-ref.v1');
    expect(ConnectionRefSchema.parse(connectionRef)).toEqual(connectionRef);
    expect(
      ConnectedSourceRefSchema.parse({
        schemaVersion: 'connected-source-ref.v1',
        connectionRef,
        sourceObjectId: 'relation/analytics/public/orders',
      })
    ).toEqual({
      schemaVersion: 'connected-source-ref.v1',
      connectionRef,
      sourceObjectId: 'relation/analytics/public/orders',
    });
  });

  it('rejects blank identities, unsupported versions, and secret-shaped extras', () => {
    expect(() => ConnectionRefSchema.parse({ ...connectionRef, connectionId: '  ' })).toThrow();
    expect(() => ConnectionRefSchema.parse({ ...connectionRef, schemaVersion: 'v2' })).toThrow();
    expect(() => ConnectionRefSchema.parse({ ...connectionRef, password: 'secret' })).toThrow();
    expect(() =>
      ConnectedSourceRefSchema.parse({
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: { ...connectionRef, connectionString: 'postgres://secret' },
        sourceObjectId: 'relation/analytics/public/orders',
      })
    ).toThrow();
    expect(() =>
      ConnectedSourceRefSchema.parse({
        schemaVersion: 'connected-source-ref.v1',
        connectionRef,
        sourceObjectId: '',
        token: 'secret',
      })
    ).toThrow();
  });
});
