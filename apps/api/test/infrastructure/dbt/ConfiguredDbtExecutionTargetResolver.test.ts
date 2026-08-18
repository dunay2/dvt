import { describe, expect, it } from 'vitest';

import { ConfiguredDbtExecutionTargetResolver } from '../../../src/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.js';

describe('ConfiguredDbtExecutionTargetResolver', () => {
  it('returns only the complete server-owned target identity', () => {
    const resolver = new ConfiguredDbtExecutionTargetResolver({
      enabled: true,
      provider: 'temporal',
      adapter: 'postgres',
      targetName: 'production',
      connectionId: 'warehouse-production',
      credentialRef: 'env:DBT_PROFILES_DIR',
    });

    expect(resolver.resolve()).toEqual({
      provider: 'temporal',
      adapter: 'postgres',
      targetName: 'production',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-production',
        provider: 'postgres',
      },
      resolutionSource: 'environment-default',
      credentialRef: 'env:DBT_PROFILES_DIR',
    });
  });

  it('returns unavailable when runtime execution is disabled or wholly unconfigured', () => {
    expect(
      new ConfiguredDbtExecutionTargetResolver({
        enabled: false,
        provider: 'temporal',
        adapter: 'postgres',
        targetName: 'production',
        connectionId: 'warehouse-production',
        credentialRef: 'env:DBT_PROFILES_DIR',
      }).resolve()
    ).toBeNull();
    expect(
      new ConfiguredDbtExecutionTargetResolver({ enabled: true, provider: 'temporal' }).resolve()
    ).toBeNull();
  });

  it('fails fast for partial or value-shaped credential configuration', () => {
    expect(
      () =>
        new ConfiguredDbtExecutionTargetResolver({
          enabled: true,
          provider: 'temporal',
          adapter: 'postgres',
          connectionId: 'warehouse-production',
        })
    ).toThrow('all be configured together');
    expect(
      () =>
        new ConfiguredDbtExecutionTargetResolver({
          enabled: true,
          provider: 'temporal',
          adapter: 'postgres',
          targetName: 'production',
          connectionId: 'warehouse-production',
          credentialRef: 'postgres://user:secret@db',
        })
    ).toThrow('credentialRef');
  });
});
