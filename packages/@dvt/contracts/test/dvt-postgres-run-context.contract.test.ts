import { describe, expect, it } from 'vitest';

import { ContractValidationError, parseRunExecutionContext } from '../src/index.js';

const BASE_CONTEXT = {
  schemaVersion: 'v1.0',
  planId: 'a'.repeat(64),
  planVersion: '1.0',
  planSha256: 'b'.repeat(64),
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
  targetAdapter: 'temporal',
  createdAtIso: '2026-09-15T00:00:00.000Z',
  createdBy: 'operator-a',
} as const;

describe('DVT PostgreSQL run context', () => {
  it('accepts one governed connection and credential reference', () => {
    const context = parseRunExecutionContext({
      ...BASE_CONTEXT,
      pluginContexts: {
        'dvt-postgres': {
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-a',
            provider: 'postgres',
          },
          credentialRef: 'postgres:warehouse-a',
        },
      },
    });

    expect(context.pluginContexts['dvt-postgres']).toEqual({
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-a',
        provider: 'postgres',
      },
      credentialRef: 'postgres:warehouse-a',
    });
  });

  it('rejects an incomplete DVT PostgreSQL context', () => {
    expect(() =>
      parseRunExecutionContext({
        ...BASE_CONTEXT,
        pluginContexts: {
          'dvt-postgres': {
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-a',
              provider: 'postgres',
            },
          },
        },
      })
    ).toThrow(ContractValidationError);
  });
});
